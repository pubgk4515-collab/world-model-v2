/**
 * expert_rain.js – Rain Expert (Liquid FM Synthesis & Lookahead Scheduling)
 *
 * Implements rain using true liquid physics: each drop is a short sine sweep
 * (“plop”) layered with a heavily low‑pass filtered noise splash (“impact”).
 * Scheduling uses a sample‑accurate lookahead loop (setInterval) that pre‑
 * programmes drop start times directly on the audio thread, bypassing the
 * jitter and phasing of standard setTimeout.
 *
 * This module satisfies the MoE World Model contract:
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

    // Unique identifier – used on the DOM card
    this.id = crypto.randomUUID?.() ?? this._fallbackUUID();

    // ── World State ──────────────────────────────────────────────────
    this.globalPressure = 0.5;       // 0–1
    this.localDensity  = 0.5;       // 0–1 (from card slider)
    this.enclosure     = 'open';    // informational

    // ── Scheduler State ──────────────────────────────────────────────
    this._isDestroyed      = false;
    this._schedulerInterval = null;  // setInterval handle
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
  //  Public Lifecycle API
  // -------------------------------------------------------------------

  /**
   * Updates world state and restarts scheduling to match.
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
   * Returns the expert’s UI card HTML string.
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
      console.warn('RainExpert: density-slider not found in card');
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

    // Start the engine immediately
    this._startScheduler();
  }

  /**
   * Stops the scheduler and cleans up all resources.
   */
  destroy() {
    if (this._isDestroyed) return;
    this._isDestroyed = true;
    this._stopScheduler();
    console.log(`RainExpert ${this.id}: destroyed`);
  }

  // -------------------------------------------------------------------
  //  Lookahead Scheduler (setInterval)
  // -------------------------------------------------------------------

  _startScheduler() {
    this._stopScheduler();
    if (!this._isDestroyed) {
      // Run every 100 ms, each tick schedules drops for the next 150 ms
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
   * Called every 100 ms.  Computes how many drops should occur in the
   * upcoming 150 ms window and schedules them with exact AudioContext times.
   */
  _schedulerTick() {
    if (this._isDestroyed) {
      this._stopScheduler();
      return;
    }

    const intensity = this.globalPressure * this.localDensity;
    const dropsPerSec = 5 + intensity * 195;        // 5 → 200
    const lookahead = 0.15;                          // seconds

    // Expected number of drops in this window
    const expected = dropsPerSec * lookahead;
    // Integer part plus stochastic fractional remainder
    const integerPart = Math.floor(expected);
    const fractional = expected - integerPart;
    const dropCount = integerPart + (Math.random() < fractional ? 1 : 0);

    const now = this.audioCtx.currentTime;

    for (let i = 0; i < dropCount; i++) {
      // Random start time within the next `lookahead` seconds
      const startTime = now + Math.random() * lookahead;
      this._spawnDrop(startTime);
    }
  }

  // -------------------------------------------------------------------
  //  Liquid FM Drop Synthesis
  // -------------------------------------------------------------------

  /**
   * Creates a single rain drop at the exact audio time given.
   *
   * Each drop consists of:
   *   - A sine‑wave “plop” with a rapid downward pitch sweep.
   *   - A short, low‑pass filtered noise “splash”.
   * Both are spatialised with a random X‑pan and distance‑dependent volume.
   *
   * @param {number} startTime – absolute AudioContext time
   */
  _spawnDrop(startTime) {
    const ctx = this.audioCtx;

    // ── Random spatial parameters ──────────────────────────────────
    const distance = Math.random();               // 0 (near) … 1 (far)
    const pan      = Math.random() * 2 - 1;       // -1 … +1

    // ── Volume based on distance, global pressure & local density ─
    let volume = (1 - distance) * this.globalPressure * this.localDensity * 0.45;
    volume = Math.max(0.005, Math.min(0.7, volume));

    // ── Stereo panner node (shared by both components) ────────────
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;

    // ── Master Gain for the whole drop (distance + volume) ──────
    const dropGain = ctx.createGain();
    dropGain.gain.value = 0;
    // Soft attack 5 ms, then exponential decay over 0.05‑0.1 s
    const attackEnd = startTime + 0.005;
    const decayEnd  = attackEnd + 0.05 + Math.random() * 0.05;
    dropGain.gain.setValueAtTime(0, startTime);
    dropGain.gain.linearRampToValueAtTime(volume, attackEnd);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, decayEnd);

    // ── Plop (sine sweep) ────────────────────────────────────────
    const plopOsc = ctx.createOscillator();
    plopOsc.type = 'sine';
    // Start frequency 800‑1200 Hz, end frequency 300‑400 Hz
    const startFreq = 800 + Math.random() * 400;
    const endFreq   = 300 + Math.random() * 100;
    plopOsc.frequency.setValueAtTime(startFreq, startTime);
    plopOsc.frequency.exponentialRampToValueAtTime(endFreq, startTime + 0.015);
    // Oscillator stops after the sweep has finished; we stop it a bit later
    const plopStopTime = startTime + 0.018;
    plopOsc.start(startTime);
    plopOsc.stop(plopStopTime);

    // ── Impact (filtered noise splash) ───────────────────────────
    const noiseBuffer = this._createWhiteNoiseBuffer(0.03, ctx.sampleRate);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 800;          // remove high‑end hiss
    lowpass.Q.value = 0.2;                  // subtle, no resonance

    // Gain envelope for splash (very short)
    const splashGain = ctx.createGain();
    splashGain.gain.setValueAtTime(0, startTime);
    splashGain.gain.linearRampToValueAtTime(volume * 0.6, attackEnd);
    splashGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.035);

    // Connect splash chain
    noiseSource.connect(lowpass);
    lowpass.connect(splashGain);
    splashGain.connect(panner);

    noiseSource.start(startTime);
    noiseSource.stop(startTime + 0.04);

    // ── Connect plop chain ───────────────────────────────────────
    plopOsc.connect(panner);

    // ── Panner → dropGain → master ───────────────────────────────
    panner.connect(dropGain);
    dropGain.connect(this.masterDestination);

    // ── Cleanup when the drop ends ───────────────────────────────
    // We use the latest stop time among all sources.
    const finalStop = Math.max(plopStopTime, startTime + 0.04);
    const cleanupTimer = setTimeout(() => {
      plopOsc.disconnect();
      noiseSource.disconnect();
      lowpass.disconnect();
      splashGain.disconnect();
      panner.disconnect();
      dropGain.disconnect();
    }, (finalStop - ctx.currentTime + 0.02) * 1000);

    // Prevent orphan timer if destroyed mid‑flight
    this._allTimeouts = this._allTimeouts || [];
    this._allTimeouts.push(cleanupTimer);
  }

  /**
   * Creates a mono AudioBuffer of white noise with the given duration.
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

  // -------------------------------------------------------------------
  //  Additional cleanup of all timeouts in destroy
  // -------------------------------------------------------------------
  destroy() {
    // Override to clear all cleanup timers as well
    if (this._isDestroyed) return;
    this._isDestroyed = true;
    this._stopScheduler();

    // Clear any still‑pending cleanup timeouts from individual drops
    if (this._allTimeouts) {
      this._allTimeouts.forEach(id => clearTimeout(id));
      this._allTimeouts = [];
    }
    console.log(`RainExpert ${this.id}: destroyed`);
  }
}
