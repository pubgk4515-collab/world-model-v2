/**
 * expert_rain.js – Rain Expert (Granular Swarm Synthesis)
 *
 * PURE particle‑based rain with no continuous bed.  A recursive scheduler
 * spawns bursts of soft, water‑like splashes with randomised spatial
 * placement, distance‑dependent filtering (lowpass only, no metallic
 * ringing), and realistic exponential decay envelopes.
 *
 * Fulfills the MoE World Model contract:
 *   constructor(audioCtx, destinationNode)
 *   onWorldStateUpdate(state)
 *   getUICard()
 *   bindCardControls(cardElement)
 *   destroy()
 */

export default class RainExpert {
  /**
   * @param {AudioContext} audioCtx        – shared AudioContext
   * @param {AudioNode}    destinationNode – master bus input
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

    // Unique identifier – used for DOM card and logging
    this.id = crypto.randomUUID?.() ?? this._fallbackUUID();

    // ── World State ──────────────────────────────────────────────────
    this.globalPressure = 0.5;       // 0‑1
    this.localDensity = 0.5;        // 0‑1
    this.enclosure = 'open';        // currently informational

    // ── Scheduler Housekeeping ──────────────────────────────────────
    this._isDestroyed = false;
    this._schedulerTimeout = null;  // main loop timer
    this._allTimeouts = [];         // tracks all nested timeouts for cleanup
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
   * Updates internal state from the Router Console.
   * Immediately re‑tunes the swarm scheduler to the new intensity.
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
   * Contains a density slider and a remove button.
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
   * Binds the density slider and starts the granular swarm.
   * Called by app.js after the card is injected into the DOM.
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

    // Kick off the engine immediately
    this._startScheduler();
  }

  /**
   * Stops all scheduling, clears timeouts.
   */
  destroy() {
    if (this._isDestroyed) return;
    this._isDestroyed = true;
    this._stopScheduler();
    // No persistent audio nodes to disconnect – all drops self‑clean.
    console.log(`RainExpert ${this.id}: destroyed`);
  }

  // -------------------------------------------------------------------
  //  Swarm Scheduler (recursive)
  // -------------------------------------------------------------------

  _startScheduler() {
    this._stopScheduler();
    if (!this._isDestroyed) {
      this._scheduleLoop();
    }
  }

  _restartScheduler() {
    this._startScheduler();
  }

  _stopScheduler() {
    if (this._schedulerTimeout) {
      clearTimeout(this._schedulerTimeout);
      this._schedulerTimeout = null;
    }
    // Clear any auxiliary timeouts (just in case)
    this._allTimeouts.forEach(id => clearTimeout(id));
    this._allTimeouts = [];
  }

  /**
   * Main recursive loop.  Computes intensity‑driven burst size and
   * interval, then spawns a whole swarm of drops in one tick.
   */
  _scheduleLoop() {
    if (this._isDestroyed) return;

    const intensity = this.globalPressure * this.localDensity;

    // ── Burst count per tick ───────────────────────────────────────
    // At intensity 0 → 1‑2 drops, at intensity 1 → 25 drops.
    const base = 1 + Math.floor(intensity * 24);
    const burstCount = Math.floor(base + Math.random() * 2);

    // ── Interval between ticks ─────────────────────────────────────
    // 50 ms (intensity 0) → 15 ms (intensity 1)
    const intervalMs = 50 - 35 * intensity;

    // ── Spawn the swarm ────────────────────────────────────────────
    for (let i = 0; i < burstCount; i++) {
      // Schedule each drop with a tiny random stagger (< 50 ms)
      // so they never fall exactly on the same sample.
      const now = this.audioCtx.currentTime;
      const stagger = Math.random() * 0.05;
      this._spawnDrop(now + stagger);
    }

    // Schedule next tick
    this._schedulerTimeout = setTimeout(() => this._scheduleLoop(), intervalMs);
    this._allTimeouts.push(this._schedulerTimeout);
  }

  // -------------------------------------------------------------------
  //  Single Drop Synthesis (water physics)
  // -------------------------------------------------------------------

  /**
   * Creates a single raindrop with spatial depth, soft water envelope,
   * and pure lowpass filtering (no metallic bandpass).
   *
   * @param {number} startTime – absolute AudioContext time for this drop
   */
  _spawnDrop(startTime) {
    const ctx = this.audioCtx;

    // ── Spatial Parameters ──────────────────────────────────────────
    const distance = Math.random();              // 0 (near) … 1 (far)
    const pan = Math.random() * 2 - 1;           // -1 … 1

    // ── Distance‑based volume ──────────────────────────────────────
    const distanceVolume = 1 - Math.pow(distance, 0.5);  // strong inverse curve
    let volume = distanceVolume
      * this.globalPressure
      * this.localDensity
      * 0.45;
    volume = Math.max(0.005, Math.min(0.65, volume));

    // ── Water Envelope (soft attack, fast decay) ───────────────────
    const attackTime = 0.005 + Math.random() * 0.01;   // 5–15 ms
    const decayTime = 0.05 + Math.random() * 0.07;     // 50–120 ms
    const peakTime = startTime + attackTime;
    const endTime = peakTime + decayTime;

    // ── Lowpass Filter (NO bandpass, NO metallic ringing) ─────────
    // Q kept very low (0.1–0.5) to avoid resonance
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    // Far drops are lower (800 Hz), near drops higher (4000 Hz)
    lowpass.frequency.value = 800 + (1 - distance) * 3200;
    lowpass.Q.value = 0.1 + Math.random() * 0.4;

    // ── Stereo Panner ──────────────────────────────────────────────
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;

    // ── Gain envelope ──────────────────────────────────────────────
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    // Soft linear attack
    gainNode.gain.linearRampToValueAtTime(volume, peakTime);
    // Exponential decay to silence
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

    // ── Noise Buffer (white noise, shaped later by lowpass) ───────
    const buffer = this._createNoiseBuffer(
      Math.max(0.04, attackTime + decayTime + 0.02),
      ctx.sampleRate
    );
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // ── Audio Graph ───────────────────────────────────────────────
    source.connect(lowpass);
    lowpass.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(this.masterDestination);

    source.start(startTime);
    source.stop(endTime + 0.005);

    // Automatic teardown when the source stops
    source.onended = () => {
      source.disconnect();
      lowpass.disconnect();
      panner.disconnect();
      gainNode.disconnect();
    };
  }

  /**
   * Creates a short white‑noise buffer. No pre‑filtering – the lowpass
   * in the audio graph handles the brownish/pink character.
   */
  _createNoiseBuffer(durationSec, sampleRate) {
    const len = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = this.audioCtx.createBuffer(1, len, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
