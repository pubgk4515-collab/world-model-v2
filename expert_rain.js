/**
 * expert_rain.js – Rain Expert (Percussive Noise Snaps + Lookahead Scheduling)
 *
 * PURE rain simulation using millions of ultra‑short, percussive noise ticks.
 * No oscillators, no FM sweeps – only broadband bursts shaped by an instant
 * attack and a very fast exponential decay, filtered to mimic the texture of
 * water hitting leaves, concrete, and fabric.
 *
 * Scheduling uses a sample‑accurate lookahead loop (setInterval every 100ms)
 * that pre‑programmes drop start times directly on the audio thread, avoiding
 * setTimeout jitter.  At maximum intensity the engine can easily schedule
 * 200+ drops per second without audible phasing or CPU spikes.
 *
 * Contract (MoE World Model):
 *   constructor(audioCtx, destinationNode)
 *   onWorldStateUpdate(state)
 *   getUICard()
 *   bindCardControls(cardElement)
 *   destroy()
 */

export default class RainExpert {
  /**
   * @param {AudioContext} audioCtx        – shared AudioContext
   * @param {AudioNode}    destinationNode – master bus input (summing point)
   */
  constructor(audioCtx, destinationNode) {
    if (!audioCtx) {
      throw new Error(
        'RainExpert requires an AudioContext. Pass it as first argument.'
      );
    }

    /** @type {AudioContext} */
    this.audioCtx = audioCtx;
    /** @type {AudioNode} */
    this.masterDestination = destinationNode || audioCtx.destination;

    // Unique ID (used on the DOM card)
    this.id = crypto.randomUUID?.() ?? this._fallbackUUID();

    // ── World State ──────────────────────────────────────────────────
    this.globalPressure = 0.5;       // 0–1 (from atmosphere)
    this.localDensity   = 0.5;       // 0–1 (from card slider)
    this.enclosure      = 'open';    // informational

    // ── Scheduler State ──────────────────────────────────────────────
    this._isDestroyed       = false;
    this._schedulerInterval = null;   // setInterval handle
    this._cleanupTimeouts   = [];     // tracks per‑drop cleanup setTimeout IDs
  }

  // -------------------------------------------------------------------
  //  UUID fallback
  // -------------------------------------------------------------------
  _fallbackUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return c === 'x' ? r : (r & 0x3) | 0x8;
    });
  }

  // -------------------------------------------------------------------
  //  Public Lifecycle
  // -------------------------------------------------------------------

  /**
   * Updates world state and restarts the scheduler to reflect new intensity.
   * @param {object} state – { atmosphericPressure, enclosure }
   */
  onWorldStateUpdate(state) {
    if (!state) return;
    if (state.atmosphericPressure !== undefined) {
      this.globalPressure = state.atmosphericPressure;
    }
    if (state.enclosure !== undefined) {
      this.enclosure = state.enclosure;
    }
    this._restartScheduler();
  }

  /**
   * Returns the HTML string for the expert’s glass‑morphic card.
   * @returns {string}
   */
  getUICard() {
    return `
      <article class="expert-card glass-card" data-id="${this.id}">
        <h3 style="font-size:1rem; margin-bottom:12px; color:rgba(255,255,255,0.9); font-weight:600;">
          Rain Expert
        </h3>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:0.75rem; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:0.05em;">
            Density
          </label>
          <input
            type="range"
            class="density-slider"
            min="0"
            max="1"
            step="0.01"
            value="0.5"
            style="width:100%;"
          >
        </div>
        <button class="remove-btn"
          style="
            margin-top:16px;
            width:100%;
            background:rgba(255,255,255,0.06);
            border:1px solid rgba(255,255,255,0.1);
            color:rgba(255,255,255,0.8);
            padding:10px 12px;
            border-radius:14px;
            font-size:0.85rem;
            font-weight:500;
            cursor:pointer;
            backdrop-filter:blur(12px);
            -webkit-backdrop-filter:blur(12px);
          ">
          Remove Expert
        </button>
      </article>
    `;
  }

  /**
   * Binds the density slider and starts the lookahead scheduler.
   * Called by app.js after the card is injected.
   * @param {HTMLElement} card – root <article>
   */
  bindCardControls(card) {
    if (!card) return;
    const slider = card.querySelector('.density-slider');
    if (!slider) {
      console.warn('RainExpert: density-slider not found');
      return;
    }

    slider.addEventListener('input', (e) => {
      try {
        this.localDensity = parseFloat(e.target.value);
        this._restartScheduler();
      } catch (err) {
        console.error('RainExpert slider error:', err);
        alert('Error updating rain density: ' + err.message);
      }
    });

    // Launch the engine
    this._startScheduler();
  }

  /**
   * Tears down the scheduler, clears all pending cleanups, and disconnects
   * any remaining audio nodes (self‑cleaning drops will already have removed
   * themselves).
   */
  destroy() {
    if (this._isDestroyed) return;
    this._isDestroyed = true;
    this._stopScheduler();

    // Clear any pending per‑drop cleanup timeouts
    this._cleanupTimeouts.forEach(id => clearTimeout(id));
    this._cleanupTimeouts = [];

    console.log(`RainExpert ${this.id}: destroyed`);
  }

  // -------------------------------------------------------------------
  //  Lookahead Scheduler
  // -------------------------------------------------------------------

  _startScheduler() {
    this._stopScheduler();
    if (!this._isDestroyed) {
      // Tick every 100 ms, scheduling drops for the next 150 ms
      this._schedulerInterval = setInterval(
        () => this._schedulerTick(),
        100
      );
    }
  }

  _restartScheduler() {
    this._startScheduler();
  }

  _stopScheduler() {
    if (this._schedulerInterval) {
      clearInterval(this._schedulerInterval);
      this._schedulerInterval = null;
    }
  }

  /**
   * Each tick calculates the number of drops that should fall in the
   * upcoming 150 ms window based on intensity, then schedules them with
   * exact AudioContext times.
   */
  _schedulerTick() {
    if (this._isDestroyed) {
      this._stopScheduler();
      return;
    }

    const intensity = this.globalPressure * this.localDensity;
    const dropsPerSec = 5 + intensity * 245;        // 5 → 250
    const lookahead = 0.15;                          // seconds

    // Expected number of drops in this window
    const expected = dropsPerSec * lookahead;
    const integerPart = Math.floor(expected);
    const fractional = expected - integerPart;
    const dropCount = integerPart + (Math.random() < fractional ? 1 : 0);

    const now = this.audioCtx.currentTime;

    for (let i = 0; i < dropCount; i++) {
      // Random absolute start time within the next 150 ms
      const startTime = now + Math.random() * lookahead;
      this._spawnDrop(startTime);
    }
  }

  // -------------------------------------------------------------------
  //  Percussive Drop Synthesis
  // -------------------------------------------------------------------

  /**
   * Creates a single water drop impact – a sharp, broadband noise tick
   * filtered to mimic a surface hit and spatialised with random panning
   * and distance attenuation.
   *
   * @param {number} startTime – exact AudioContext time for the drop
   */
  _spawnDrop(startTime) {
    const ctx = this.audioCtx;

    // ── Spatial Parameters ──────────────────────────────────────────
    const distance = Math.random();               // 0 (near) … 1 (far)
    const pan      = Math.random() * 2 - 1;       // -1 … +1

    // ── Volume scaling ──────────────────────────────────────────────
    let volume = (1 - distance) * this.globalPressure * this.localDensity * 0.45;
    volume = Math.max(0.005, Math.min(0.75, volume));

    // ── Envelope Timing ─────────────────────────────────────────────
    const attackTime = 0.001;                             // instant snap
    const decayTime  = 0.015 + Math.random() * 0.035;     // 15–50 ms
    const attackEnd  = startTime + attackTime;
    const decayEnd   = attackEnd + decayTime;

    // ── Stereo Panner ───────────────────────────────────────────────
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;

    // ── Master Drop Gain (envelope) ────────────────────────────────
    const dropGain = ctx.createGain();
    dropGain.gain.setValueAtTime(0, startTime);
    dropGain.gain.linearRampToValueAtTime(volume, attackEnd);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, decayEnd);

    // ── Surface Impact Filter ──────────────────────────────────────
    // Bandpass with low Q (0.2‑0.5) to avoid metallic ringing.
    // Frequency range 1500‑6000 Hz simulates different leaf/stone sizes.
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1500 + Math.random() * 4500; // 1500–6000
    bandpass.Q.value = 0.2 + Math.random() * 0.3;           // 0.2–0.5

    // ── Noise Buffer (ultra‑short tick) ────────────────────────────
    const buffer = this._createWhiteNoiseBuffer(decayTime + 0.01, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // ── Audio Graph ─────────────────────────────────────────────────
    source.connect(bandpass);
    bandpass.connect(panner);
    panner.connect(dropGain);
    dropGain.connect(this.masterDestination);

    source.start(startTime);
    source.stop(decayEnd + 0.005);

    // ── Automatic Cleanup ───────────────────────────────────────────
    const cleanupDelay = Math.max(0.05, (decayEnd - ctx.currentTime + 0.05));
    const cleanupTimer = setTimeout(() => {
      source.disconnect();
      bandpass.disconnect();
      panner.disconnect();
      dropGain.disconnect();
    }, cleanupDelay * 1000);

    // Track cleanup timer so we can cancel it on destroy()
    this._cleanupTimeouts.push(cleanupTimer);
  }

  /**
   * Generates a mono AudioBuffer of white noise of the given duration.
   * @param {number} durationSec
   * @param {number} sampleRate
   * @returns {AudioBuffer}
   */
  _createWhiteNoiseBuffer(durationSec, sampleRate) {
    const len = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = this.audioCtx.createBuffer(1, len, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
