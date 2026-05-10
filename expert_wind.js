/**
 * expert_wind.js
 * =========================================================
 * Symbiote Studio · Ultra Atmospheric Wind Expert
 * ---------------------------------------------------------
 * Procedural wind synthesis designed for:
 * - sleep ambience
 * - cinematic environments
 * - natural airflow perception
 * - realistic gentle breeze → storm evolution
 *
 * NO prerecorded samples.
 * NO AI generation.
 * ONLY Web Audio API.
 *
 * Philosophy:
 * Real wind is:
 * - filtered turbulence
 * - moving air masses
 * - resonant cavities
 * - evolving pressure
 * - slow spatial motion
 *
 * NOT:
 * - TV static
 * - white noise hiss
 * - earthquake rumble
 * - fake cinematic bass
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
      resonance: 0.35,
      movement: 0.50,
      width: 0.70
    };

    this.nodes = {};
    this.modulation = [];
    this.noiseSources = [];

    this._buildEngine();
    this._startAtmosphere();
  }

  /* ======================================================
     ENGINE
  ====================================================== */

  _buildEngine() {

    const ctx = this.ctx;

    /* --------------------------------------------------
       MASTER
    -------------------------------------------------- */

    this.nodes.output = ctx.createGain();
    this.nodes.output.gain.value = 0;

    this.nodes.output.connect(this.masterBus);

    /* --------------------------------------------------
       NOISE BUFFERS
    -------------------------------------------------- */

    const pinkBuffer =
      this._createPinkNoiseBuffer(8);

    const brownBuffer =
      this._createBrownNoiseBuffer(8);

    /* --------------------------------------------------
       BASE AIRFLOW
    -------------------------------------------------- */

    const baseSource =
      this._createLoopingNoise(pinkBuffer);

    const baseHP =
      ctx.createBiquadFilter();

    baseHP.type = 'highpass';
    baseHP.frequency.value = 180;
    baseHP.Q.value = 0.7;

    const baseLP =
      ctx.createBiquadFilter();

    baseLP.type = 'lowpass';
    baseLP.frequency.value = 4500;
    baseLP.Q.value = 0.3;

    const baseGain =
      ctx.createGain();

    baseGain.gain.value = 0.05;

    baseSource.connect(baseHP);
    baseHP.connect(baseLP);
    baseLP.connect(baseGain);

    /* --------------------------------------------------
       AIR TEXTURE
    -------------------------------------------------- */

    const textureSource =
      this._createLoopingNoise(pinkBuffer);

    const textureBand =
      ctx.createBiquadFilter();

    textureBand.type = 'bandpass';
    textureBand.frequency.value = 1200;
    textureBand.Q.value = 1.8;

    const textureGain =
      ctx.createGain();

    textureGain.gain.value = 0.02;

    textureSource.connect(textureBand);
    textureBand.connect(textureGain);

    /* --------------------------------------------------
       PRESSURE BODY
       (low-mid air mass, NOT sub bass)
    -------------------------------------------------- */

    const bodySource =
      this._createLoopingNoise(brownBuffer);

    const bodyHP =
      ctx.createBiquadFilter();

    bodyHP.type = 'highpass';
    bodyHP.frequency.value = 90;

    const bodyLP =
      ctx.createBiquadFilter();

    bodyLP.type = 'lowpass';
    bodyLP.frequency.value = 380;

    const bodyGain =
      ctx.createGain();

    bodyGain.gain.value = 0.01;

    bodySource.connect(bodyHP);
    bodyHP.connect(bodyLP);
    bodyLP.connect(bodyGain);

    /* --------------------------------------------------
       RESONANT FLUTE CAVITIES
    -------------------------------------------------- */

    const resonanceInput =
      ctx.createGain();

    textureGain.connect(resonanceInput);

    const resonances = [];

    const resonanceFreqs = [
      320,
      470,
      720,
      980
    ];

    resonanceFreqs.forEach((freq) => {

      const bp =
        ctx.createBiquadFilter();

      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 14;

      const gain =
        ctx.createGain();

      gain.gain.value = 0.012;

      resonanceInput.connect(bp);
      bp.connect(gain);

      resonances.push({
        filter: bp,
        gain
      });
    });

    /* --------------------------------------------------
       STEREO FIELD
    -------------------------------------------------- */

    const merger =
      ctx.createGain();

    baseGain.connect(merger);
    textureGain.connect(merger);
    bodyGain.connect(merger);

    resonances.forEach(r => {
      r.gain.connect(merger);
    });

    const stereo =
      ctx.createStereoPanner();

    merger.connect(stereo);
    stereo.connect(this.nodes.output);

    /* --------------------------------------------------
       STORE
    -------------------------------------------------- */

    this.nodes.baseGain = baseGain;
    this.nodes.textureGain = textureGain;
    this.nodes.bodyGain = bodyGain;

    this.nodes.baseLP = baseLP;
    this.nodes.baseHP = baseHP;

    this.nodes.textureBand =
      textureBand;

    this.nodes.stereo = stereo;

    this.nodes.resonances =
      resonances;

    /* --------------------------------------------------
       ATMOSPHERIC LFOs
    -------------------------------------------------- */

    this._createLFO(
      0.018,
      (v) => {

        const drift =
          1100 + (v * 240);

        textureBand.frequency
          .setTargetAtTime(
            drift,
            ctx.currentTime,
            0.5
          );
      }
    );

    this._createLFO(
      0.011,
      (v) => {

        stereo.pan
          .setTargetAtTime(
            v * this.state.width * 0.45,
            ctx.currentTime,
            1.2
          );
      }
    );

    this._createLFO(
      0.008,
      (v) => {

        resonances.forEach((r, i) => {

          const base =
            resonanceFreqs[i];

          r.filter.frequency
            .setTargetAtTime(
              base + (v * 40),
              ctx.currentTime,
              1.5
            );
        });
      }
    );

    /* --------------------------------------------------
       START FADE
    -------------------------------------------------- */

    this.nodes.output.gain
      .setTargetAtTime(
        0.75,
        ctx.currentTime,
        2.5
      );

    this._updateSound();
  }

  /* ======================================================
     NOISE
  ====================================================== */

  _createPinkNoiseBuffer(seconds) {

    const ctx = this.ctx;

    const length =
      ctx.sampleRate * seconds;

    const buffer =
      ctx.createBuffer(
        1,
        length,
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

    for (let i = 0; i < length; i++) {

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

    return buffer;
  }

  _createBrownNoiseBuffer(seconds) {

    const ctx = this.ctx;

    const length =
      ctx.sampleRate * seconds;

    const buffer =
      ctx.createBuffer(
        1,
        length,
        ctx.sampleRate
      );

    const data =
      buffer.getChannelData(0);

    let last = 0;

    for (let i = 0; i < length; i++) {

      const white =
        Math.random() * 2 - 1;

      last =
        (last + (0.02 * white)) / 1.02;

      data[i] =
        last * 3.5;
    }

    return buffer;
  }

  _createLoopingNoise(buffer) {

    const src =
      this.ctx.createBufferSource();

    src.buffer = buffer;
    src.loop = true;

    src.start();

    this.noiseSources.push(src);

    return src;
  }

  /* ======================================================
     MODULATION
  ====================================================== */

  _createLFO(rate, callback) {

    let phase =
      Math.random() * Math.PI * 2;

    const tick = () => {

      phase +=
        rate * 0.03;

      const v =
        Math.sin(phase);

      callback(v);

      const id =
        requestAnimationFrame(tick);

      this.modulation.push(id);
    };

    tick();
  }

  /* ======================================================
     PARAMETER UPDATE
  ====================================================== */

  _updateSound() {

    const ctx = this.ctx;

    const energy =
      this.state.intensity;

    /* --------------------------------------------------
       BASE AIR
    -------------------------------------------------- */

    const baseAir =
      0.006 +
      Math.pow(energy, 1.7) *
      0.16;

    this.nodes.baseGain.gain
      .setTargetAtTime(
        baseAir,
        ctx.currentTime,
        0.4
      );

    /* --------------------------------------------------
       TEXTURE
    -------------------------------------------------- */

    const texture =
      (
        this.state.texture *
        Math.pow(energy, 1.8)
      ) * 0.08;

    this.nodes.textureGain.gain
      .setTargetAtTime(
        texture,
        ctx.currentTime,
        0.4
      );

    /* --------------------------------------------------
       BODY
    -------------------------------------------------- */

    const body =
      Math.pow(energy, 2.5)
      * 0.09;

    this.nodes.bodyGain.gain
      .setTargetAtTime(
        body,
        ctx.currentTime,
        0.8
      );

    /* --------------------------------------------------
       RESONANCE
    -------------------------------------------------- */

    const resonanceLevel =
      (
        this.state.resonance *
        Math.pow(energy, 2.1)
      ) * 0.055;

    this.nodes.resonances
      .forEach((r) => {

        r.gain.gain
          .setTargetAtTime(
            resonanceLevel,
            ctx.currentTime,
            0.8
          );
      });

    /* --------------------------------------------------
       FILTER SHAPE
    -------------------------------------------------- */

    const openness =
      2500 +
      energy * 5200;

    this.nodes.baseLP.frequency
      .setTargetAtTime(
        openness,
        ctx.currentTime,
        0.7
      );

    const thickness =
      260 -
      energy * 140;

    this.nodes.baseHP.frequency
      .setTargetAtTime(
        thickness,
        ctx.currentTime,
        0.6
      );
  }

  /* ======================================================
     UI
  ====================================================== */

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
              value="35"
            />
          </label>

          <label class="expert-control">
            <span>Movement</span>

            <input
              class="wind-movement"
              type="range"
              min="0"
              max="100"
              value="50"
            />
          </label>

          <label class="expert-control">
            <span>Width</span>

            <input
              class="wind-width"
              type="range"
              min="0"
              max="100"
              value="70"
            />
          </label>

        </div>

      </article>
    `;
  }

  bindCardControls(card) {

    card
      .querySelector('.wind-intensity')
      .addEventListener('input', (e) => {

        this.state.intensity =
          e.target.value / 100;

        this._updateSound();
      });

    card
      .querySelector('.wind-texture')
      .addEventListener('input', (e) => {

        this.state.texture =
          e.target.value / 100;

        this._updateSound();
      });

    card
      .querySelector('.wind-resonance')
      .addEventListener('input', (e) => {

        this.state.resonance =
          e.target.value / 100;

        this._updateSound();
      });

    card
      .querySelector('.wind-movement')
      .addEventListener('input', (e) => {

        this.state.movement =
          e.target.value / 100;
      });

    card
      .querySelector('.wind-width')
      .addEventListener('input', (e) => {

        this.state.width =
          e.target.value / 100;
      });
  }

  /* ======================================================
     WORLD STATE
  ====================================================== */

  onWorldStateUpdate(state) {

    if (!state) return;

    if (state.enclosure === 'indoor') {

      this.nodes.baseLP.frequency
        .setTargetAtTime(
          2200,
          this.ctx.currentTime,
          1.5
        );
    }

    if (state.enclosure === 'umbrella') {

      this.nodes.baseLP.frequency
        .setTargetAtTime(
          3800,
          this.ctx.currentTime,
          1.5
        );
    }
  }

  /* ======================================================
     START
  ====================================================== */

  _startAtmosphere() {

    this.nodes.output.gain
      .setTargetAtTime(
        0.65,
        this.ctx.currentTime,
        3
      );
  }

  /* ======================================================
     DESTROY
  ====================================================== */

  destroy() {

    this.noiseSources.forEach(src => {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    });

    this.modulation.forEach(id => {
      cancelAnimationFrame(id);
    });

    Object.values(this.nodes)
      .forEach(node => {

        try {

          if (node.disconnect) {
            node.disconnect();
          }

        } catch {}
      });
  }
}
