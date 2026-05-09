/**
 * expert_rain.js
 * Procedural Acoustic World Simulator
 *
 * ------------------------------------------------------------
 * PHILOSOPHY
 * ------------------------------------------------------------
 *
 * THIS ENGINE DOES NOT SYNTHESIZE:
 * - wind
 * - atmospheric hiss
 * - broadband noise wash
 *
 * THIS ENGINE ONLY SYNTHESIZES:
 * - stochastic water impacts
 * - overlapping microdroplets
 * - dense rainfall particle fields
 *
 * ------------------------------------------------------------
 * CORE IDEA
 * ------------------------------------------------------------
 *
 * Rain is NOT a looping noise texture.
 *
 * Rain is:
 * millions of tiny transient impacts.
 *
 * Heavy rain emerges naturally from:
 * - increased droplet density
 * - overlapping microevents
 * - stochastic timing
 *
 * NOT from:
 * - hiss
 * - oscillators
 * - LFO pulsing
 *
 * ------------------------------------------------------------
 * ARCHITECTURE
 * ------------------------------------------------------------
 *
 * Instead of:
 * 1 drop = 1 event
 *
 * We use:
 * 1 burst = many droplets
 *
 * This allows:
 * - extremely dense rain
 * - realistic overlap
 * - browser-safe CPU usage
 */

export default class RainExpert {

  constructor(audioCtx, destinationNode) {

    if (!audioCtx) {
      throw new Error(
        "RainExpert requires AudioContext."
      );
    }

    this.audioCtx = audioCtx;

    this.destination =
      destinationNode ||
      audioCtx.destination;

    this.id =
      crypto.randomUUID?.() ||
      `rain-${Date.now()}`;

    /**
     * --------------------------------------------------------
     * State
     * --------------------------------------------------------
     */

    this.globalPressure = 0.5;

    this.localDensity = 0.5;

    this.enclosure = "open";

    this._destroyed = false;

    /**
     * Burst scheduler
     */

    this._burstTimer = null;

    /**
     * Master output
     */

    this.masterGain =
      this.audioCtx.createGain();

    this.masterGain.gain.value = 0.85;

    this.masterGain.connect(
      this.destination
    );
  }

  /* ============================================================
   * Utility
   * ========================================================== */

  clamp(v, min, max) {
    return Math.min(
      max,
      Math.max(min, v)
    );
  }

  random(min, max) {
    return Math.random() * (max - min) + min;
  }

  /* ============================================================
   * Intensity
   * ========================================================== */

  getIntensity() {

    return this.clamp(
      this.globalPressure *
      this.localDensity,
      0,
      1
    );
  }

  /* ============================================================
   * Burst Scheduler
   * ========================================================== */

  start() {

    this.stop();

    this._scheduleBurst();
  }

  stop() {

    if (this._burstTimer) {

      clearTimeout(
        this._burstTimer
      );

      this._burstTimer = null;
    }
  }

  _scheduleBurst() {

    if (this._destroyed) {
      return;
    }

    const intensity =
      this.getIntensity();

    /**
     * --------------------------------------------------------
     * Burst frequency
     * --------------------------------------------------------
     *
     * Light rain:
     * sparse bursts
     *
     * Heavy rain:
     * extremely dense bursts
     */

    const burstRate =
      6 +
      Math.pow(intensity, 2.2) * 140;

    /**
     * Poisson timing
     */

    const delaySec =
      -Math.log(
        1 - Math.random()
      ) / burstRate;

    this._burstTimer =
      setTimeout(() => {

        if (this._destroyed) {
          return;
        }

        this._spawnBurst(
          intensity
        );

        this._scheduleBurst();

      }, delaySec * 1000);
  }

  /* ============================================================
   * Burst Generation
   * ========================================================== */

  _spawnBurst(intensity) {

    /**
     * --------------------------------------------------------
     * Drops per burst
     * --------------------------------------------------------
     */

    const drops =
      Math.floor(
        1 +
        Math.pow(
          intensity,
          1.7
        ) * 36
      );

    for (let i = 0; i < drops; i++) {

      /**
       * Micro-jitter inside burst
       */

      const offset =
        Math.random() * 0.03;

      setTimeout(() => {

        if (!this._destroyed) {
          this._spawnDrop(
            intensity
          );
        }

      }, offset * 1000);
    }
  }

  /* ============================================================
   * Single Droplet
   * ========================================================== */

  _spawnDrop(intensity) {

    const ctx =
      this.audioCtx;

    const now =
      ctx.currentTime;

    /**
     * --------------------------------------------------------
     * Distance
     * --------------------------------------------------------
     */

    const distance =
      Math.random();

    /**
     * --------------------------------------------------------
     * Duration
     * --------------------------------------------------------
     *
     * REAL rain transients:
     * very short.
     */

    let duration =
      this.random(
        0.004,
        0.045
      );

    /**
     * Distant droplets
     * slightly softer/longer.
     */

    duration +=
      distance * 0.03;

    /**
     * --------------------------------------------------------
     * Frequency
     * --------------------------------------------------------
     */

    const nearFreq =
      this.random(
        2200,
        4800
      );

    const farFreq =
      this.random(
        700,
        1600
      );

    const frequency =
      farFreq +
      (1 - distance) *
      (nearFreq - farFreq);

    /**
     * --------------------------------------------------------
     * Resonance
     * --------------------------------------------------------
     */

    const Q =
      this.random(
        0.4,
        3.2
      );

    /**
     * --------------------------------------------------------
     * Volume
     * --------------------------------------------------------
     */

    let volume =
      (1 - distance) *
      0.16 *
      intensity;

    /**
     * Random microvariation
     */

    volume *=
      this.random(
        0.6,
        1.4
      );

    /**
     * Clamp
     */

    volume =
      this.clamp(
        volume,
        0.0005,
        0.22
      );

    /**
     * --------------------------------------------------------
     * Stereo Position
     * --------------------------------------------------------
     */

    const pan =
      this.random(-1, 1);

    /**
     * --------------------------------------------------------
     * Noise Source
     * --------------------------------------------------------
     */

    const buffer =
      this._createNoiseBuffer(
        duration
      );

    const source =
      ctx.createBufferSource();

    source.buffer = buffer;

    /**
     * --------------------------------------------------------
     * Filtering
     * --------------------------------------------------------
     */

    const bandpass =
      ctx.createBiquadFilter();

    bandpass.type =
      "bandpass";

    bandpass.frequency.value =
      frequency;

    bandpass.Q.value =
      Q;

    /**
     * --------------------------------------------------------
     * Panning
     * --------------------------------------------------------
     */

    const panner =
      ctx.createStereoPanner();

    panner.pan.value = pan;

    /**
     * --------------------------------------------------------
     * Envelope
     * --------------------------------------------------------
     */

    const gain =
      ctx.createGain();

    gain.gain.setValueAtTime(
      0.0001,
      now
    );

    /**
     * Fast attack
     */

    gain.gain.linearRampToValueAtTime(
      volume,
      now + 0.002
    );

    /**
     * Exponential decay
     */

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration
    );

    /**
     * --------------------------------------------------------
     * Routing
     * --------------------------------------------------------
     */

    source.connect(
      bandpass
    );

    bandpass.connect(
      panner
    );

    panner.connect(
      gain
    );

    gain.connect(
      this.masterGain
    );

    /**
     * --------------------------------------------------------
     * Playback
     * --------------------------------------------------------
     */

    source.start(now);

    source.stop(
      now + duration + 0.01
    );

    /**
     * --------------------------------------------------------
     * Cleanup
     * --------------------------------------------------------
     */

    source.onended = () => {

      try {

        source.disconnect();
        bandpass.disconnect();
        panner.disconnect();
        gain.disconnect();

      } catch (_) {}
    };
  }

  /* ============================================================
   * Noise Buffer
   * ========================================================== */

  _createNoiseBuffer(duration) {

    const sr =
      this.audioCtx.sampleRate;

    const length =
      Math.max(
        1,
        Math.floor(sr * duration)
      );

    const buffer =
      this.audioCtx.createBuffer(
        1,
        length,
        sr
      );

    const data =
      buffer.getChannelData(0);

    /**
     * Very short white noise burst
     */

    for (let i = 0; i < length; i++) {

      /**
       * Tiny decay shaping
       */

      const env =
        1 -
        (i / length);

      data[i] =
        (Math.random() * 2 - 1)
        * env;
    }

    return buffer;
  }

  /* ============================================================
   * World State Updates
   * ========================================================== */

  onWorldStateUpdate(state) {

    if (!state) {
      return;
    }

    if (
      typeof state.atmosphericPressure
      === "number"
    ) {
      this.globalPressure =
        this.clamp(
          state.atmosphericPressure,
          0,
          1
        );
    }

    if (
      typeof state.enclosure
      === "string"
    ) {
      this.enclosure =
        state.enclosure;
    }
  }

  /* ============================================================
   * UI
   * ========================================================== */

  getUICard() {

    return `
      <article
        class="expert-card glass-card"
        data-id="${this.id}"
      >
        <h3
          style="
            font-size:1rem;
            margin-bottom:12px;
            color:rgba(255,255,255,0.9);
            font-weight:600;
          "
        >
          Rain Expert
        </h3>

        <div
          style="
            display:flex;
            flex-direction:column;
            gap:8px;
          "
        >
          <label
            style="
              font-size:0.75rem;
              color:rgba(255,255,255,0.5);
              text-transform:uppercase;
              letter-spacing:0.05em;
            "
          >
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

        <button
          class="remove-btn"
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
          "
        >
          Remove Expert
        </button>
      </article>
    `;
  }

  bindCardControls(card) {

    const slider =
      card.querySelector(
        ".density-slider"
      );

    if (slider) {

      slider.addEventListener(
        "input",
        (e) => {

          this.localDensity =
            parseFloat(
              e.target.value
            );
        }
      );
    }

    this.start();
  }

  /* ============================================================
   * Destroy
   * ========================================================== */

  destroy() {

    this._destroyed = true;

    this.stop();

    try {

      this.masterGain.disconnect();

    } catch (_) {}

    console.log(
      `[RainExpert] Destroyed ${this.id}`
    );
  }
}
