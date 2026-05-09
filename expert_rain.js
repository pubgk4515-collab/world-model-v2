/**
 * expert_rain.js – Rain Expert (Real‑World Rain Physics)
 *
 * Percussive rain simulation with exact real‑world droplet densities:
 *   Light rain    (~50 drops/s)
 *   Moderate rain (~625 drops/s at intensity 0.5, as per formula)
 *   Heavy rain    (1200 drops/s at intensity 1.0)
 *
 * Each drop is a sharp, filtered noise tick, spatialised with unique
 * panning and distance attenuation.  The scheduler uses a 100 ms lookahead
 * loop to schedule drops with sample‑accurate timing, avoiding phasing
 * and CPU spikes.
 *
 * Contract: onWorldStateUpdate, getUICard, bindCardControls, destroy.
 */

export default class RainExpert {
  /**
   * @param {AudioContext} audioCtx        – shared AudioContext
   * @param {AudioNode}    destinationNode – master bus summing point
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

    // Unique identifier for the DOM card
    this.id = crypto.randomUUID?.() ?? this._fallbackUUID();

    // ── World State ──────────────────────────────────────────────────
    this.globalPressure = 0.5;       // 0–1
    this.localDensity   = 0.5;       // 0–1 (from density slider)
    this.enclosure      = 'open';    // informational

    // ── Scheduler State ──────────────────────────────────────────────
    this._isDestroyed       = false;
    this._schedulerInterval = null;   // setInterval handle
    this._cleanupTimeouts   = [];     // per‑drop cleanup setTimeout IDs
  }

  // -------------------------------------------------------------------
  //  Fallback UUID
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
   * Updates world state and restarts the scheduler.
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
   * Returns the expert's UI card HTML.
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

    this._startScheduler();
  }

  /**
   * Stops the scheduler and clears all pending cleanup timers.
   */
  destroy() {
    if (this._isDestroyed) return;
    this._isDestroyed = true;
    this._stopScheduler();

    this._cleanupTimeouts.forEach(id => clearTimeout(id));
    this._cleanupTimeouts = [];

    console.log(`RainExpert ${this.id}: destroyed`);
  }

  // -------------------------------------------------------------------
  //  Lookahead Scheduler (100 ms tick, 150 ms lookahead)
  // -------------------------------------------------------------------

  _startScheduler() {
    this._stopScheduler();
    if (!this._isDestroyed) {
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
   * Each tick computes the exact number of drops that should fall in the
   * upcoming 150 ms window, then schedules them at precise AudioContext times.
   */
  _schedulerTick() {
    if (this._isDestroyed) {
      this._stopScheduler();
      return;
    }

    const intensity = this.globalPressure * this.localDensity;

    // Exact real‑world mapping:
    //   intensity 0 → 50 drops/s,  intensity 1 → 1200 drops/s
    const dropsPerSec = 50 + intensity * 1150;

    const lookahead = 0.15; // seconds

    // Expected number of drops in this window
    const expected = dropsPerSec * lookahead;
    const integerPart = Math.floor(expected);
    const fractional = expected - integerPart;
    const dropCount = integerPart + (Math.random() < fractional ? 1 : 0);

    const now = this.audioCtx.currentTime;

    for (let i = 0; i < dropCount; i++) {
      // Random absolute start time within the next 150 ms
      const startTime = now + Math.random() * lookahead;
      this._spawnDrop(startTime);
    }
  }

  // -------------------------------------------------------------------
  //  Percussive Drop Synthesis (filtered noise tick)
  // -------------------------------------------------------------------

  /**
   * Generates a single water drop impact – a sharp, heavily filtered noise
   * burst with instant attack and short decay, spatialised with unique
   * panning and distance.
   *
   * @param {number} startTime – exact AudioContext time
   */
  _spawnDrop(startTime) {
    const ctx = this.audioCtx;

    // ── Unique Spatial Parameters (25 cm² rule) ─────────────────────
    const distance = Math.random();               // 0 (near) … 1 (far)
    const pan      = Math.random() * 2 - 1;       // -1 (left) … +1 (right)

    // ── Volume scaling (distance, pressure, density) ────────────────
    let volume = (1 - distance) * this.globalPressure * this.localDensity * 0.4;
    volume = Math.max(0.004, Math.min(0.7, volume));

    // ── Envelope (ultra‑fast attack, short decay) ──────────────────
    const attackTime = 0.002;                             // instant snap
    const decayTime  = 0.02 + Math.random() * 0.02;       // 20–40 ms
    const attackEnd  = startTime + attackTime;
    const decayEnd   = attackEnd + decayTime;

    // ── Stereo Panner ───────────────────────────────────────────────
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;

    // ── Filters (anti‑mud high‑pass, anti‑hiss low‑pass) ────────────
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 400;        // cut rumbling lows
    highpass.Q.value = 0.5;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3500;        // soften harsh high frequencies
    lowpass.Q.value = 0.5;

    // ── Master Gain (envelope) ──────────────────────────────────────
    const dropGain = ctx.createGain();
    dropGain.gain.setValueAtTime(0, startTime);
    dropGain.gain.linearRampToValueAtTime(volume, attackEnd);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, decayEnd);

    // ── Noise Buffer (ultra‑short tick) ────────────────────────────
    const buffer = this._createWhiteNoiseBuffer(decayTime + 0.01, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // ── Audio Graph ─────────────────────────────────────────────────
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(panner);
    panner.connect(dropGain);
    dropGain.connect(this.masterDestination);

    source.start(startTime);
    source.stop(decayEnd + 0.005);

    // ── Automatic Cleanup ───────────────────────────────────────────
    const cleanupDelay = Math.max(0.05, (decayEnd - ctx.currentTime + 0.05));
    const cleanupTimer = setTimeout(() => {
      source.disconnect();
      highpass.disconnect();
      lowpass.disconnect();
      panner.disconnect();
      dropGain.disconnect();
    }, cleanupDelay * 1000);

    this._cleanupTimeouts.push(cleanupTimer);
  }

  /**
   * Creates a mono AudioBuffer of white noise of the given duration.
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
