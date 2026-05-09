/**
 * expert_rain.js – Rain Expert for Symbiote Studio MoE World Model
 *
 * Exports a single class `RainExpert` that powers a diffuse, realistic rain field
 * with spatial depth (near/far), air absorption filtering, stereo panning, and
 * a dynamic scheduler that reacts to world pressure and local density.
 *
 * Lifecycle:
 *   constructor(audioCtx, destinationNode)  – receives shared audio context
 *     and the master bus node (from app.js).
 *   onWorldStateUpdate(state)               – updates global pressure & enclosure.
 *   getUICard()                             – returns card HTML string.
 *   bindCardControls(cardElement)           – wires up the density slider.
 *   destroy()                               – stops all scheduled timers and frees
 *                                             any persistent resources.
 *
 * DSP core:
 *   - Every drop is a short burst of white noise shaped by an exponential decay
 *     envelope.
 *   - Distance (0 = near, 1 = far) controls: volume (inverse law), bandpass
 *     frequency (near → high/crisp, far → low/muffled), and subtle duration
 *     shortening.
 *   - StereoPannerNode distributes drops across the X‑axis randomly.
 *   - Scheduler adapts intensity = globalPressure * localDensity. High intensity
 *     spawns more drops with a bias toward distant drops, creating a continuous
 *     bed of rain while keeping near‑field percussive drops audible.
 */

export default class RainExpert {
  /**
   * @param {AudioContext} audioCtx       – shared AudioContext from app.js
   * @param {AudioNode}    destinationNode – master bus node (usually an
   *     AudioGainNode acting as the summing mixer)
   */
  constructor(audioCtx, destinationNode) {
    // Allow graceful degradation if called without arguments (for incremental
    // integration with current app.js – should be passed in production).
    if (!audioCtx) {
      throw new Error(
        'RainExpert requires an AudioContext. Pass it as first argument.'
      );
    }

    this.audioCtx = audioCtx;
    this.masterDestination = destinationNode || audioCtx.destination;

    // Unique identifier – used for DOM mapping
    this.id = crypto.randomUUID?.() ?? this._fallbackUUID();

    // World state
    this.globalPressure = 0.5;          // from onWorldStateUpdate
    this.localDensity = 0.5;           // from the card’s density slider
    this.enclosure = 'open';           // stored but currently not used in
                                       // perceptual processing

    // Scheduler housekeeping
    this._isDestroyed = false;
    this._scheduleTimeout = null;      // latest setTimeout id for main loop
    this._auxTimeouts = [];            // IDs of any auxiliary timeouts (bursts)

    // No persistent audio nodes besides those created per drop; all
    // per‑drop nodes are disconnected on ended automatically.
  }

  /**
   * Fallback UUID generator for environments without crypto.randomUUID.
   */
  _fallbackUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Receives updates from the global Router Console.
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
    // The scheduler will naturally pick up the new values on its next tick.
  }

  /**
   * Returns a pure HTML string for the expert’s UI card.
   * The card uses the global `.glass-card` class for the Symbiote frosted‑glass
   * aesthetic and contains a density slider and a remove button.
   * @returns {string}
   */
  getUICard() {
    // Inline styles are minimal; all main styling lives in index.html.
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
   * Binds event listeners inside the card DOM element.
   * The density slider triggers a scheduler restart so that the new density
   * is immediately reflected in drop rate and balance.
   * @param {HTMLElement} card – the root `<article>` element
   */
  bindCardControls(card) {
    if (!card) return;
    const slider = card.querySelector('.density-slider');
    if (!slider) {
      console.warn('RainExpert: density-slider not found inside card');
      return;
    }

    slider.addEventListener('input', (e) => {
      try {
        this.localDensity = parseFloat(e.target.value);
        this._restartScheduler();
      } catch (err) {
        console.error('RainExpert density slider error:', err);
        alert('Error updating rain density: ' + err.message);
      }
    });

    // After binding, kick off the rain scheduler for the first time.
    this._startScheduler();
  }

  // -----------------------------------------------------------------------
  //  Scheduler
  // -----------------------------------------------------------------------

  /**
   * Stops any running scheduling loop and starts a fresh one.
   * Call when density or pressure changes.
   */
  _restartScheduler() {
    this._startScheduler();
  }

  _startScheduler() {
    if (this._isDestroyed) return;
    this._stopScheduler();
    this._scheduleLoop();
  }

  _stopScheduler() {
    if (this._scheduleTimeout) {
      clearTimeout(this._scheduleTimeout);
      this._scheduleTimeout = null;
    }
    // Clear any lingering auxiliary burst timeouts
    this._auxTimeouts.forEach((id) => clearTimeout(id));
    this._auxTimeouts = [];
  }

  /**
   * Main recursive loop. Calculates current intensity, spawns one primary drop
   * with a distance bias, optionally adds a burst of extra far drops, then
   * schedules the next cycle.
   */
  _scheduleLoop() {
    if (this._isDestroyed) return;

    const intensity = this.globalPressure * this.localDensity;
    // Primary drop: distance bias shifts with intensity
    this._spawnDrop(intensity, false);

    // Burst of extra far‑field drops when intensity exceeds 0.6
    if (intensity > 0.6) {
      const burstCount = Math.floor((intensity - 0.5) * 5); // 0‑2 extra drops
      for (let i = 0; i < burstCount; i++) {
        const timeoutId = setTimeout(() => {
          if (this._isDestroyed) return;
          this._spawnDrop(1, true); // force far distance
        }, Math.random() * 30);      // 0‑30 ms staggering
        this._auxTimeouts.push(timeoutId);
      }
    }

    // Dynamic interval: 250 ms base, shortened by intensity
    const baseDelay = 0.25;          // seconds
    const minDelay = 0.04;          // approx 25 drops/sec at max intensity
    const delay = Math.max(minDelay, baseDelay * (1 - intensity * 0.85));

    this._scheduleTimeout = setTimeout(() => this._scheduleLoop(), delay * 1000);
  }

  // -----------------------------------------------------------------------
  //  Drop Synthesis (Depth of Field)
  // -----------------------------------------------------------------------

  /**
   * Spawns a single raindrop with full spatial depth processing.
   * @param {number} intensity – global intensity (used for distance bias)
   * @param {boolean} forceFar – if true, distance is forced to 0.7 – 1.0
   */
  _spawnDrop(intensity = 1, forceFar = false) {
    if (this._isDestroyed || !this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // ── Distance (0 = near, 1 = far) ────────────────────────────────
    let distance;
    if (forceFar) {
      distance = 0.7 + Math.random() * 0.3;        // 0.7 – 1.0
    } else {
      // Probability of a near drop: higher when intensity is low,
      // lower when intensity is high (to maintain crisp percussive strikes)
      const nearProb = 0.4 * (1 - intensity) + 0.1; // 0.1 – 0.4
      if (Math.random() < nearProb) {
        distance = Math.random() * 0.3;             // 0.0 – 0.3
      } else {
        distance = 0.3 + Math.random() * 0.7;       // 0.3 – 1.0
      }
    }

    // ── Volume (inverse distance law) ──────────────────────────────
    // 1 at distance 0, approaching 0 at distance 1
    const distanceVolume = 1 - Math.pow(distance, 0.6);
    let volume = distanceVolume * this.globalPressure * this.localDensity * 0.5;
    volume = Math.max(0.008, Math.min(0.8, volume)); // keep within safe bounds

    // ── Air Absorption Bandpass ────────────────────────────────────
    const nearFreq = 2000 + Math.random() * 4000; // 2000 – 6000 Hz
    const farFreq = 300 + Math.random() * 500;    // 300 – 800 Hz
    const freq = farFreq + (1 - distance) * (nearFreq - farFreq);
    const Q = 0.15 + Math.random() * 1.35;        // 0.15 – 1.5

    // ── Stereo Panning (X‑axis) ────────────────────────────────────
    const panValue = Math.random() * 2 - 1;        // -1 (L) to +1 (R)

    // ── Drop Duration ──────────────────────────────────────────────
    let dur = 0.06 + Math.random() * 0.18;         // 60 – 240 ms
    if (distance > 0.7) dur *= 0.8;                // far drops are shorter

    // ── Noise Buffer ───────────────────────────────────────────────
    const buffer = this._createNoiseBuffer(dur, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // ── Audio Graph ────────────────────────────────────────────────
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = freq;
    bandpass.Q.value = Q;

    const panner = ctx.createStereoPanner();
    panner.pan.value = panValue;

    const gainNode = ctx.createGain();
    // Start at computed volume, then exponential decay to silence
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    // Connect chain: source → bandpass → panner → gain → master bus
    source.connect(bandpass);
    bandpass.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(this.masterDestination);

    // ── Playback & Automatic Cleanup ───────────────────────────────
    source.start(now);
    source.stop(now + dur + 0.01); // tiny padding to avoid clicks

    // When the source finishes, disconnect all per‑drop nodes so they
    // can be garbage collected.
    source.onended = () => {
      // It is safe to call disconnect even if already stopped.
      source.disconnect();
      bandpass.disconnect();
      panner.disconnect();
      gainNode.disconnect();
    };
  }

  /**
   * Creates an AudioBuffer filled with white noise of the given duration.
   * @param {number} duration – in seconds
   * @param {number} sampleRate
   * @returns {AudioBuffer}
   */
  _createNoiseBuffer(duration, sampleRate) {
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1; // uniform distribution [-1, 1]
    }
    return buffer;
  }

  /**
   * Stops all scheduling and disconnects any persistent resources.
   * Afterwards the instance should be discarded.
   */
  destroy() {
    this._isDestroyed = true;
    this._stopScheduler();
    // No persistent audio nodes owned by this class – all drops clean
    // themselves up after playback. We simply cancel any pending timeouts.
    console.log(`RainExpert ${this.id}: destroyed`);
  }
}
