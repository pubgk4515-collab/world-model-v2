/**
 * expert_wind.js
 * ============================================================
 * Symbiote Studio · Ultra Atmospheric Wind Expert
 * ============================================================
 *
 * GOAL:
 * Real moving air.
 *
 * NOT:
 * - TV static
 * - earthquake rumble
 * - fake storm hiss
 * - harsh white noise
 *
 * FEATURES:
 * - Brown/Pink airflow synthesis
 * - Resonant cavity whistles
 * - Procedural gust evolution
 * - Crossfaded seamless looping
 * - Stereo atmospheric drift
 * - Dynamic turbulence
 * - Soft breeze → violent storm scaling
 * - Zero external assets
 *
 * ARCHITECTURE:
 * Air Bed
 * → Turbulence
 * → Resonant Cavities
 * → Pressure Body
 * → Stereo Drift
 *
 */

export default class WindExpert {

  constructor(audioCtx, masterBus) {

    this.ctx = audioCtx;
    this.masterBus = masterBus;

    this.id =
      crypto.randomUUID?.() ||
      Math.random().toString(36).slice(2);

    this.state = {

      intensity: 0.28,
      texture: 0.42,
      resonance: 0.45,
      movement: 0.55,
      width: 0.72,

      enclosure: "open",
      pressure: 0.5
    };

    this.nodes = {};
    this.modulators = [];
    this.noiseSources = [];

    this.build();
    this.start();
  }

  /* ============================================================
     BUILD ENGINE
  ============================================================ */

  build() {

    const ctx = this.ctx;

    /* ------------------------------------------------------------
       MASTER
    ------------------------------------------------------------ */

    this.output = ctx.createGain();
    this.output.gain.value = 0;

    this.output.connect(this.masterBus);

    /* ------------------------------------------------------------
       MAIN MIX
    ------------------------------------------------------------ */

    this.mainMix = ctx.createGain();
    this.mainMix.gain.value = 1;

    this.mainMix.connect(this.output);

    /* ------------------------------------------------------------
       AIRFLOW BED
    ------------------------------------------------------------ */

    this.airNoise = this.createPinkNoise();

    this.airGain = ctx.createGain();
    this.airGain.gain.value = 0.12;

    this.airHP = ctx.createBiquadFilter();
    this.airHP.type = "highpass";
    this.airHP.frequency.value = 280;

    this.airLP = ctx.createBiquadFilter();
    this.airLP.type = "lowpass";
    this.airLP.frequency.value = 4200;

    this.airNoise.connect(this.airGain);
    this.airGain.connect(this.airHP);
    this.airHP.connect(this.airLP);

    /* ------------------------------------------------------------
       TURBULENCE
    ------------------------------------------------------------ */

    this.turbulenceNoise = this.createPinkNoise();

    this.turbulenceGain = ctx.createGain();
    this.turbulenceGain.gain.value = 0.03;

    this.turbulenceBandA =
      ctx.createBiquadFilter();

    this.turbulenceBandA.type =
      "bandpass";

    this.turbulenceBandA.frequency.value =
      700;

    this.turbulenceBandA.Q.value =
      0.8;

    this.turbulenceBandB =
      ctx.createBiquadFilter();

    this.turbulenceBandB.type =
      "bandpass";

    this.turbulenceBandB.frequency.value =
      1300;

    this.turbulenceBandB.Q.value =
      1.2;

    this.turbulenceNoise.connect(
      this.turbulenceGain
    );

    this.turbulenceGain.connect(
      this.turbulenceBandA
    );

    this.turbulenceGain.connect(
      this.turbulenceBandB
    );

    /* ------------------------------------------------------------
       RESONANT CAVITIES
       (THE MAGIC)
    ------------------------------------------------------------ */

    this.resonanceBus =
      ctx.createGain();

    this.resonanceBus.gain.value =
      0.16;

    this.resonators = [];

    const cavityFreqs = [
      320,
      470,
      620,
      780,
      940
    ];

    cavityFreqs.forEach((freq, i) => {

      const bp =
        ctx.createBiquadFilter();

      bp.type =
        "bandpass";

      bp.frequency.value =
        freq;

      bp.Q.value =
        14;

      const gain =
        ctx.createGain();

      gain.gain.value =
        0.04;

      this.turbulenceBandA.connect(bp);
      bp.connect(gain);
      gain.connect(this.resonanceBus);

      this.resonators.push({
        filter: bp,
        gain
      });

      /* slow drift */

      const lfo =
        ctx.createOscillator();

      const depth =
        ctx.createGain();

      lfo.frequency.value =
        0.008 + i * 0.003;

      depth.gain.value =
        20 + i * 4;

      lfo.connect(depth);
      depth.connect(bp.frequency);

      lfo.start();

      this.modulators.push({
        osc: lfo,
        gain: depth
      });
    });

    /* ------------------------------------------------------------
       PRESSURE BODY
    ------------------------------------------------------------ */

    this.bodyNoise =
      this.createBrownNoise();

    this.bodyGain =
      ctx.createGain();

    this.bodyGain.gain.value =
      0.015;

    this.bodyHP =
      ctx.createBiquadFilter();

    this.bodyHP.type =
      "highpass";

    this.bodyHP.frequency.value =
      90;

    this.bodyLow =
      ctx.createBiquadFilter();

    this.bodyLow.type =
      "lowpass";

    this.bodyLow.frequency.value =
      420;

    this.bodyNoise.connect(
      this.bodyGain
    );

    this.bodyGain.connect(
      this.bodyHP
    );

    this.bodyHP.connect(
      this.bodyLow
    );

    /* ------------------------------------------------------------
       COMB AIR RESONANCE
    ------------------------------------------------------------ */

    this.delay =
      ctx.createDelay(0.1);

    this.delay.delayTime.value =
      0.012;

    this.feedback =
      ctx.createGain();

    this.feedback.gain.value =
      0.18;

    this.resonanceBus.connect(
      this.delay
    );

    this.delay.connect(
      this.feedback
    );

    this.feedback.connect(
      this.delay
    );

    /* ------------------------------------------------------------
       STEREO FIELD
    ------------------------------------------------------------ */

    this.stereo =
      ctx.createStereoPanner();

    this.stereo.pan.value =
      0;

    /* ------------------------------------------------------------
       FINAL TONE SHAPER
    ------------------------------------------------------------ */

    this.finalHP =
      ctx.createBiquadFilter();

    this.finalHP.type =
      "highpass";

    this.finalHP.frequency.value =
      120;

    this.finalLP =
      ctx.createBiquadFilter();

    this.finalLP.type =
      "lowpass";

    this.finalLP.frequency.value =
      9000;

    /* ------------------------------------------------------------
       CONNECT GRAPH
    ------------------------------------------------------------ */

    this.airLP.connect(this.mainMix);

    this.turbulenceBandA.connect(
      this.mainMix
    );

    this.turbulenceBandB.connect(
      this.mainMix
    );

    this.resonanceBus.connect(
      this.mainMix
    );

    this.delay.connect(
      this.mainMix
    );

    this.bodyLow.connect(
      this.mainMix
    );

    this.mainMix.connect(
      this.finalHP
    );

    this.finalHP.connect(
      this.finalLP
    );

    this.finalLP.connect(
      this.stereo
    );

    this.stereo.connect(
      this.output
    );

    /* ------------------------------------------------------------
       ATMOSPHERIC MOVEMENT
    ------------------------------------------------------------ */

    this.panLFO =
      ctx.createOscillator();

    this.panDepth =
      ctx.createGain();

    this.panLFO.frequency.value =
      0.018;

    this.panDepth.gain.value =
      0.12;

    this.panLFO.connect(
      this.panDepth
    );

    this.panDepth.connect(
      this.stereo.pan
    );

    this.panLFO.start();

    this.modulators.push({
      osc: this.panLFO,
      gain: this.panDepth
    });

    /* ------------------------------------------------------------
       GUST ENGINE
    ------------------------------------------------------------ */

    this.startGustEngine();

    /* ------------------------------------------------------------
       INITIAL UPDATE
    ------------------------------------------------------------ */

    this.updateDSP();
  }

  /* ============================================================
     START
  ============================================================ */

  start() {

    const now =
      this.ctx.currentTime;

    this.output.gain.setValueAtTime(
      0,
      now
    );

    this.output.gain.linearRampToValueAtTime(
      0.85,
      now + 4
    );
  }

  /* ============================================================
     NOISE GENERATORS
  ============================================================ */

  createPinkNoise() {

    const ctx = this.ctx;

    const buffer =
      ctx.createBuffer(
        1,
        ctx.sampleRate * 6,
        ctx.sampleRate
      );

    const data =
      buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < data.length; i++) {

      const white =
        Math.random() * 2 - 1;

      b0 =
        0.99886 * b0 +
        white * 0.0555179;

      b1 =
        0.99332 * b1 +
        white * 0.0750759;

      b2 =
        0.96900 * b2 +
        white * 0.1538520;

      b3 =
        0.86650 * b3 +
        white * 0.3104856;

      b4 =
        0.55000 * b4 +
        white * 0.5329522;

      b5 =
        -0.7616 * b5 -
        white * 0.0168980;

      const pink =
        b0 + b1 + b2 +
        b3 + b4 + b5 +
        b6 + white * 0.5362;

      b6 =
        white * 0.115926;

      data[i] =
        pink * 0.08;
    }

    const source =
      this.ctx.createBufferSource();

    source.buffer =
      buffer;

    source.loop =
      true;

    source.start();

    this.noiseSources.push(source);

    return source;
  }

  createBrownNoise() {

    const ctx =
      this.ctx;

    const buffer =
      ctx.createBuffer(
        1,
        ctx.sampleRate * 6,
        ctx.sampleRate
      );

    const data =
      buffer.getChannelData(0);

    let lastOut = 0;

    for (let i = 0; i < data.length; i++) {

      const white =
        Math.random() * 2 - 1;

      lastOut =
        (lastOut +
          0.02 * white) / 1.02;

      data[i] =
        lastOut * 3.5;
    }

    const source =
      ctx.createBufferSource();

    source.buffer =
      buffer;

    source.loop =
      true;

    source.start();

    this.noiseSources.push(source);

    return source;
  }

  /* ============================================================
     GUST EVOLUTION
  ============================================================ */

  startGustEngine() {

    const evolve = () => {

      const now =
        this.ctx.currentTime;

      const intensity =
        this.state.intensity;

      const gust =
        intensity *
        (0.5 + Math.random() * 0.8);

      /* airflow */

      this.airGain.gain.cancelScheduledValues(now);

      this.airGain.gain.linearRampToValueAtTime(
        0.02 + gust * 0.22,
        now + 4 + Math.random() * 4
      );

      /* turbulence */

      this.turbulenceGain.gain.cancelScheduledValues(now);

      this.turbulenceGain.gain.linearRampToValueAtTime(
        gust * 0.09,
        now + 5
      );

      /* body */

      this.bodyGain.gain.cancelScheduledValues(now);

      this.bodyGain.gain.linearRampToValueAtTime(
        gust * 0.045,
        now + 6
      );

      /* stereo motion */

      this.panDepth.gain.cancelScheduledValues(now);

      this.panDepth.gain.linearRampToValueAtTime(
        0.02 + gust * 0.26,
        now + 8
      );

      /* resonance bloom */

      this.resonanceBus.gain.cancelScheduledValues(now);

      this.resonanceBus.gain.linearRampToValueAtTime(
        0.03 + gust * 0.24,
        now + 6
      );

      /* next cycle */

      const next =
        5000 +
        Math.random() * 7000;

      this.gustTimer =
        setTimeout(
          evolve,
          next
        );
    };

    evolve();
  }

  /* ============================================================
     DSP UPDATE
  ============================================================ */

  updateDSP() {

    const now =
      this.ctx.currentTime;

    const intensity =
      this.state.intensity;

    const texture =
      this.state.texture;

    const resonance =
      this.state.resonance;

    const movement =
      this.state.movement;

    /* low intensity = soft breeze */

    this.airLP.frequency.setTargetAtTime(
      2600 + texture * 5000,
      now,
      1.5
    );

    this.airHP.frequency.setTargetAtTime(
      260 - intensity * 120,
      now,
      1.5
    );

    /* resonance */

    this.resonators.forEach((r, i) => {

      r.gain.gain.setTargetAtTime(
        0.01 +
        resonance * 0.06,
        now,
        2
      );

      r.filter.Q.setTargetAtTime(
        10 +
        resonance * 12,
        now,
        2
      );
    });

    /* storm body */

    this.bodyLow.frequency.setTargetAtTime(
      220 + intensity * 260,
      now,
      2
    );

    /* stereo */

    this.panDepth.gain.setTargetAtTime(
      0.03 +
      movement * 0.24,
      now,
      2
    );
  }

  /* ============================================================
     UI
  ============================================================ */

  getUICard() {

    return `
      <article
        class="expert-card glass"
        data-id="${this.id}"
      >

        <div class="expert-head">

          <div>

            <div class="expert-kicker">
              ATMOSPHERE • WIND
            </div>

            <h3 class="expert-title">
              Atmospheric Wind
            </h3>

          </div>

          <button class="remove-btn">
            Remove
          </button>

        </div>

        <div class="expert-grid">

          <label class="expert-control">

            <span>Intensity</span>

            <input
              class="wind-intensity"
              type="range"
              min="0"
              max="100"
              value="28"
            />

          </label>

          <label class="expert-control">

            <span>Texture</span>

            <input
              class="wind-texture"
              type="range"
              min="0"
              max="100"
              value="42"
            />

          </label>

          <label class="expert-control">

            <span>Resonance</span>

            <input
              class="wind-resonance"
              type="range"
              min="0"
              max="100"
              value="45"
            />

          </label>

          <label class="expert-control">

            <span>Movement</span>

            <input
              class="wind-movement"
              type="range"
              min="0"
              max="100"
              value="55"
            />

          </label>

        </div>

      </article>
    `;
  }

  bindCardControls(card) {

    card
      .querySelector(".wind-intensity")
      .addEventListener("input", e => {

        this.state.intensity =
          e.target.value / 100;

        this.updateDSP();
      });

    card
      .querySelector(".wind-texture")
      .addEventListener("input", e => {

        this.state.texture =
          e.target.value / 100;

        this.updateDSP();
      });

    card
      .querySelector(".wind-resonance")
      .addEventListener("input", e => {

        this.state.resonance =
          e.target.value / 100;

        this.updateDSP();
      });

    card
      .querySelector(".wind-movement")
      .addEventListener("input", e => {

        this.state.movement =
          e.target.value / 100;

        this.updateDSP();
      });
  }

  /* ============================================================
     WORLD STATE
  ============================================================ */

  onWorldStateUpdate(state) {

    this.state.enclosure =
      state.enclosure;

    this.state.pressure =
      state.atmosphericPressure;

    const now =
      this.ctx.currentTime;

    if (state.enclosure === "indoor") {

      this.finalLP.frequency.setTargetAtTime(
        2400,
        now,
        3
      );
    }

    else if (
      state.enclosure === "umbrella"
    ) {

      this.finalLP.frequency.setTargetAtTime(
        4200,
        now,
        3
      );
    }

    else {

      this.finalLP.frequency.setTargetAtTime(
        9000,
        now,
        3
      );
    }
  }

  /* ============================================================
     DESTROY
  ============================================================ */

  destroy() {

    clearTimeout(
      this.gustTimer
    );

    this.noiseSources.forEach(s => {
      try {
        s.stop();
        s.disconnect();
      } catch {}
    });

    this.modulators.forEach(m => {
      try {
        m.osc.stop();
        m.osc.disconnect();
      } catch {}
    });

    this.output.gain.linearRampToValueAtTime(
      0,
      this.ctx.currentTime + 2
    );

    setTimeout(() => {

      try {
        this.output.disconnect();
      } catch {}

    }, 2500);
  }
        }
