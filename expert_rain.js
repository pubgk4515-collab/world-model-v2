/**
 * expert_rain.js – Rain Expert (Professional Two‑Layer Model)
 *
 * Exports a default class `RainExpert` that generates realistic, diffuse rain
 * using a continuous noise bed (the distant roar) and a stochastic near‑field
 * drop scheduler.  The dual‑layer approach eliminates the “machine‑gun”
 * rhythm that emerges from naive periodic spawning, producing natural
 * rainfall even at extreme intensity.
 *
 * Lifecycle (matches the MoE World Model contract):
 *   constructor(audioCtx, destinationNode)  – shared AudioContext & master bus
 *   onWorldStateUpdate(state)               – updates global pressure/enclosure
 *   getUICard()                             – card HTML string
 *   bindCardControls(cardElement)           – wires density slider & starts engine
 *   destroy()                               – stops bed, clears timeouts
 */

export default class RainExpert {
  /**
   * @param {AudioContext} audioCtx        – shared AudioContext from app.js
   * @param {AudioNode}    destinationNode – master bus (summing point)
   */
  constructor(audioCtx, destinationNode) {
    if (!audioCtx) {
      throw new Error(
        'RainExpert requires an AudioContext. Pass it as first argument.'
      );
    }

    /** @type {AudioContext} */
    this.audioCtx = audioCtx;
    /** @type {AudioNode} – master bus input */
    this.masterDestination = destinationNode || audioCtx.destination;

    // Unique identifier (used for DOM and logging)
    this.id = crypto.randomUUID?.() ?? this._fallbackUUID();

    // ── World State ──────────────────────────────────────────────────
    this.globalPressure = 0.5;       // 0‑1 from atmosphere slider
    this.localDensity = 0.5;        // 0‑1 from the card’s density slider
    this.enclosure = 'open';        // currently informational

    // ── Continuous Rain Bed (Layer 1) ───────────────────────────────
    /**
     * Looping buffer source of white noise, filtered to a low roar,
     * connected to a dedicated GainNode that is faded in/out with intensity.
     */
    this.bedSource = null;
    this.bedFilter = null;
    this.bedGain = null;

    // ── Stochastic Drop Scheduler (Layer 2) ────────────────────────
    this._isDestroyed = false;
    this._dropTimeout = null;       // current setTimeout for next drop
    this._allAuxTimeouts = [];      // any additional per‑drop delays (unused now)

    // Initialise the continuous bed (audio nodes are created but silent)
    this._createRainBed();
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
  //  Layer 1: Continuous Noise Bed
  // -------------------------------------------------------------------
  /**
   * Creates a looping white‑noise buffer, routes it through a low‑pass
   * filter (brown/pink character) and a GainNode.
   * The buffer is started immediately; the GainNode controls audibility.
   */
  _createRainBed() {
    const ctx = this.audioCtx;
    const sampleRate = ctx.sampleRate;
    const duration = 2.0; // seconds – long enough to avoid audible looping

    // Generate white noise buffer
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;  // uniform [-1, 1]
    }

    // Buffer source (looping)
    this.bedSource = ctx.createBufferSource();
    this.bedSource.buffer = buffer;
    this.bedSource.loop = true;

    // Low‑pass filter – heavy muffling for a distant roar
    this.bedFilter = ctx.createBiquadFilter();
    this.bedFilter.type = 'lowpass';
    this.bedFilter.frequency.value = 450;   // Hz – deep rumble
    this.bedFilter.Q.value = 0.7;

    // Gain node (volume controlled by intensity)
    this.bedGain = ctx.createGain();
    this.bedGain.gain.value = 0;            // silent until needed

    // Connect chain: source → filter → gain → master bus
    this.bedSource.connect(this.bedFilter);
    this.bedFilter.connect(this.bedGain);
    this.bedGain.connect(this.masterDestination);

    // Start looping immediately (will stay silent while gain is 0)
    this.bedSource.start();
  }

  /**
   * Updates bedGain based on current intensity.
   * Intensity = globalPressure * localDensity.
   * Mapping: < 0.2 → 0, then linear to 0.28 at 1.0.
   */
  _updateBedGain() {
    if (!this.bedGain) return;
    const intensity = this.globalPressure * this.localDensity;
    // Ramp smoothly: start at threshold 0.2, max 0.28 (prevents overwhelming)
    if (intensity < 0.18) {
      this.bedGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.02);
    } else {
      const t = Math.min(1, (intensity - 0.18) / 0.82); // 0→1 from 0.18→1.0
      const target = t * 0.28;
      this.bedGain.gain.linearRampToValueAtTime(target, this.audioCtx.currentTime + 0.05);
    }
  }

  // -------------------------------------------------------------------
  //  Layer 2: Stochastic Near‑Field Drops
  // -------------------------------------------------------------------

  /**
   * Recursive drop scheduler using a Poisson‑distributed inter‑arrival time
   * to prevent any rhythmic regularity.
   * @param {number} intensity – current intensity (0‑1)
   */
  _scheduleNextDrop(intensity) {
    if (this._isDestroyed) return;

    // Poisson rate: max ~28 drops/sec at full intensity, minimum 2 drops/sec
    const rate = 2 + intensity * 26;
    // Exponential inter‑arrival time: -ln(1-U)/λ, U uniform [0,1)
    const delaySec = -Math.log(1 - Math.random()) / rate;

    // Spawn a single drop after the computed delay
    this._dropTimeout = setTimeout(() => {
      if (this._isDestroyed) return;
      this._spawnDrop(intensity);          // the drop itself
      this._scheduleNextDrop(intensity);   // schedule the next
    }, delaySec * 1000);

    this._allAuxTimeouts.push(this._dropTimeout);
  }

  /**
   * Creates a single raindrop with full spatial depth processing.
   * At high intensity, this layer focuses exclusively on near‑field
   * crisp impacts; the bed covers the distant roar.
   * @param {number} intensity – overall intensity (0‑1)
   */
  _spawnDrop(intensity) {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // ── Distance determination ─────────────────────────────────────
    let distance;
    // At low intensity (< 0.3) we allow mid/far drops for sparse realism.
    // At high intensity (≥ 0.7) we restrict to near‑field (0‑0.25) so they
    // cut through the bed.
    if (intensity < 0.3) {
      distance = Math.random();                       // 0‑1 full range
    } else if (intensity < 0.7) {
      // Blend: near probability increases linearly
      const nearProb = 0.3 + (intensity - 0.3) * 1.75; // 0.3→1.0
      if (Math.random() < nearProb) {
        distance = Math.random() * 0.25;             // near
      } else {
        distance = 0.25 + Math.random() * 0.75;      // mid‑far
      }
    } else {
      // High intensity: almost exclusively near (0‑0.25)
      distance = Math.random() * 0.25;
    }

    // ── Volume (inverse distance, but reduced when bed is active) ──
    const baseVol = 1 - Math.pow(distance, 0.6);
    // Global scaling: individual drops become quieter as intensity rises,
    // because the bed fills the space. At intensity 1, drop volume ~60% of nominal.
    const intensityScaling = 1 - intensity * 0.4;
    let volume = baseVol * this.globalPressure * this.localDensity * 0.45 * intensityScaling;
    volume = Math.max(0.005, Math.min(0.7, volume));

    // ── Air Absorption & Distance EQ ──────────────────────────────
    const nearFreq = 2200 + Math.random() * 4800;  // 2200‑7000 Hz
    const farFreq  = 280 + Math.random() * 520;    // 280‑800 Hz
    const freq = farFreq + (1 - distance) * (nearFreq - farFreq);
    const Q = 0.15 + Math.random() * 1.35;        // gentle bandpass

    // ── Panning (X‑axis) ──────────────────────────────────────────
    const panValue = Math.random() * 2 - 1;        // -1 .. 1

    // ── Drop Duration ─────────────────────────────────────────────
    let dur = 0.055 + Math.random() * 0.175;       // 55‑230 ms
    if (distance > 0.7) dur *= 0.8;

    // ── Create audio graph for this drop ─────────────────────────
    const buffer = this._createNoiseBuffer(dur, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = freq;
    bandpass.Q.value = Q;

    const panner = ctx.createStereoPanner();
    panner.pan.value = panValue;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    // Connect: source → bandpass → panner → gain → master bus
    source.connect(bandpass);
    bandpass.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(this.masterDestination);

    source.start(now);
    source.stop(now + dur + 0.005);

    // Automatic cleanup when the drop finishes
    source.onended = () => {
      source.disconnect();
      bandpass.disconnect();
      panner.disconnect();
      gainNode.disconnect();
    };
  }

  /**
   * Generates a mono AudioBuffer of white noise with the given duration.
   * @param {number} durationSec
   * @param {number} sampleRate
   * @returns {AudioBuffer}
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

  // -------------------------------------------------------------------
  //  Scheduler controls
  // -------------------------------------------------------------------
  /** Stops any pending drop timer and restarts with current intensity. */
  _restartDropScheduler() {
    this._stopDropScheduler();
    if (!this._isDestroyed) {
      const intensity = this.globalPressure * this.localDensity;
      this._scheduleNextDrop(intensity);
    }
  }

  _stopDropScheduler() {
    if (this._dropTimeout) {
      clearTimeout(this._dropTimeout);
      this._dropTimeout = null;
    }
    // Clear any other stray timeouts (though we only keep one now)
    this._allAuxTimeouts.forEach(id => clearTimeout(id));
    this._allAuxTimeouts = [];
  }

  // -------------------------------------------------------------------
  //  Public Lifecycle Methods
  // -------------------------------------------------------------------

  /**
   * Updates internal state from the global Router Console.
   * Immediately adjusts bed gain and re‑balances the drop scheduler.
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
    this._updateBedGain();
    this._restartDropScheduler();
  }

  /**
   * Returns the HTML string for the expert’s UI card.
   * Identical aesthetic to the original, with a density slider and remove button.
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
   * Binds the density slider and starts the two‑layer engine.
   * Called by app.js after the card is injected.
   * @param {HTMLElement} card – the root <article> element
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
        this._updateBedGain();
        this._restartDropScheduler();
      } catch (err) {
        console.error('RainExpert density slider error:', err);
        alert('Error updating rain density: ' + err.message);
      }
    });

    // Initial kick‑off (bed is already running silent, and drops begin)
    this._updateBedGain();
    this._restartDropScheduler();
  }

  /**
   * Tears down the entire expert: stops the bed, kills all timers,
   * disconnects persistent audio nodes. After this call, the instance
   * is no longer usable.
   */
  destroy() {
    if (this._isDestroyed) return;
    this._isDestroyed = true;

    // Stop and disconnect the continuous bed
    if (this.bedSource) {
      try { this.bedSource.stop(); } catch (e) { /* already stopped */ }
      this.bedSource.disconnect();
    }
    if (this.bedFilter) {
      this.bedFilter.disconnect();
    }
    if (this.bedGain) {
      this.bedGain.disconnect();
    }

    // Clear all timeouts
    this._stopDropScheduler();

    console.log(`RainExpert ${this.id}: destroyed`);
  }
}
