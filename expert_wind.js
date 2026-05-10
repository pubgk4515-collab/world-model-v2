/**
 * expert_wind.js
 * =========================================================
 * Symbiote Studio · Ultra Realistic Wind Expert
 * ---------------------------------------------------------
 * Procedural atmospheric wind synthesis using:
 * - Pink/Brown turbulence
 * - Resonant air cavities
 * - Dynamic airflow physics
 * - Psychoacoustic motion
 * - Storm scaling
 *
 * NO samples.
 * NO TV static.
 * NO fake earthquake rumble.
 * =========================================================
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
      texture: 0.45,
      resonance: 0.42,
      movement: 0.55,
      width: 0.7
    };

    this.nodes = {};
    this.modulators = [];

    this.#build();
    this.#startMotion();
    this.#applyState();
  }

  /* =======================================================
     BUILD ENGINE
  ======================================================= */

  #build() {

    const ctx = this.ctx;

    /* ---------------------------------------------------
       MASTER
    --------------------------------------------------- */

    this.output = ctx.createGain();
    this.output.gain.value = 0.0;

    this.output.connect(this.masterBus);

    /* ---------------------------------------------------
       NOISE SOURCE
    --------------------------------------------------- */

    const noiseBuffer =
      this.#createPinkNoiseBuffer(8);

    const noise =
      ctx.createBufferSource();

    noise.buffer = noiseBuffer;
    noise.loop = true;

    /* ---------------------------------------------------
       BASE AIRFLOW
    --------------------------------------------------- */

    const airflowGain =
      ctx.createGain();

    const airflowHP =
      ctx.createBiquadFilter();

    airflowHP.type = 'highpass';
    airflowHP.frequency.value = 180;
    airflowHP.Q.value = 0.4;

    const airflowLP =
      ctx.createBiquadFilter();

    airflowLP.type = 'lowpass';
    airflowLP.frequency.value = 4500;
    airflowLP.Q.value = 0.4;

    airflowGain.gain.value = 0.18;

    noise.connect(airflowGain);
    airflowGain.connect(airflowHP);
    airflowHP.connect(airflowLP);

    /* ---------------------------------------------------
       TURBULENCE LAYERS
    --------------------------------------------------- */

    const turbA =
      ctx.createBiquadFilter();

    turbA.type = 'bandpass';
    turbA.frequency.value = 500;
    turbA.Q.value = 0.7;

    const turbB =
      ctx.createBiquadFilter();

    turbB.type = 'bandpass';
    turbB.frequency.value = 1400;
    turbB.Q.value = 1.2;

    const turbGainA =
      ctx.createGain();

    const turbGainB =
      ctx.createGain();

    turbGainA.gain.value = 0.12;
    turbGainB.gain.value = 0.06;

    airflowLP.connect(turbA);
    airflowLP.connect(turbB);

    turbA.connect(turbGainA);
    turbB.connect(turbGainB);

    /* ---------------------------------------------------
       RESONANT AIR CAVITIES
    --------------------------------------------------- */

    const resonators = [];

    const resonanceBus =
      ctx.createGain();

    resonanceBus.gain.value = 0.0;

    const resonanceFreqs = [
      320,
      470,
      620,
      840,
      1180
    ];

    resonanceFreqs.forEach((freq) => {

      const bp =
        ctx.createBiquadFilter();

      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 12;

      const g =
        ctx.createGain();

      g.gain.value = 0.0;

      turbGainA.connect(bp);
      bp.connect(g);
      g.connect(resonanceBus);

      resonators.push({
        filter: bp,
        gain: g,
        base: freq
      });
    });

    /* ---------------------------------------------------
       STORM BODY
    --------------------------------------------------- */

    const stormLP =
      ctx.createBiquadFilter();

    stormLP.type = 'lowpass';
    stormLP.frequency.value = 700;

    const stormHP =
      ctx.createBiquadFilter();

    stormHP.type = 'highpass';
    stormHP.frequency.value = 140;

    const stormGain =
      ctx.createGain();

    stormGain.gain.value = 0.0;

    airflowLP.connect(stormLP);
    stormLP.connect(stormHP);
    stormHP.connect(stormGain);

    /* ---------------------------------------------------
       SPATIAL
    --------------------------------------------------- */

    const merger =
      ctx.createGain();

    turbGainA.connect(merger);
    turbGainB.connect(merger);
    resonanceBus.connect(merger);
    stormGain.connect(merger);

    const stereo =
      ctx.createStereoPanner();

    merger.connect(stereo);

    /* ---------------------------------------------------
       FINAL TONE
    --------------------------------------------------- */

    const finalLP =
      ctx.createBiquadFilter();

    finalLP.type = 'lowpass';
    finalLP.frequency.value = 10000;

    const finalHP =
      ctx.createBiquadFilter();

    finalHP.type = 'highpass';
    finalHP.frequency.value = 120;

    stereo.connect(finalLP);
    finalLP.connect(finalHP);
    finalHP.connect(this.output);

    /* ---------------------------------------------------
       STORE
    --------------------------------------------------- */

    this.nodes = {
      noise,
      airflowGain,
      airflowHP,
      airflowLP,

      turbA,
      turbB,
      turbGainA,
      turbGainB,

      resonanceBus,
      resonators,

      stormGain,

      stereo,
      finalLP,
      finalHP
    };

    noise.start();

    /* fade in */
    this.output.gain
      .setTargetAtTime(
        0.65,
        ctx.currentTime,
        2.5
      );
  }

  /* =======================================================
     MOTION ENGINE
  ======================================================= */

  #startMotion() {

    const ctx = this.ctx;

    const createLFO = (
      rate,
      depth,
      callback
    ) => {

      let t = 0;

      const loop = () => {

        t += rate;

        const v =
          Math.sin(t) * depth;

        callback(v);

        const id =
          requestAnimationFrame(loop);

        this.modulators.push(id);
      };

      loop();
    };

    /* slow airflow evolution */

    createLFO(
      0.0012,
      1,
      (v) => {

        const energy =
          this.state.intensity;

        this.nodes.turbA.frequency
          .setTargetAtTime(
            480 + v * 120 + energy * 180,
            ctx.currentTime,
            1.8
          );

        this.nodes.turbB.frequency
          .setTargetAtTime(
            1300 + v * 260 + energy * 700,
            ctx.currentTime,
            2.4
          );
      }
    );

    /* stereo drift */

    createLFO(
      0.00045,
      1,
      (v) => {

        this.nodes.stereo.pan
          .setTargetAtTime(
            v * 0.28 * this.state.width,
            ctx.currentTime,
            3
          );
      }
    );

    /* resonance drift */

    createLFO(
      0.0008,
      1,
      (v) => {

        this.nodes.resonators
          .forEach((r, i) => {

            r.filter.frequency
              .setTargetAtTime(
                r.base +
                v * (40 + i * 20),
                ctx.currentTime,
                2
              );
          });
      }
    );
  }

  /* =======================================================
     APPLY STATE
  ======================================================= */

  #applyState() {

    const ctx = this.ctx;

    const i =
      this.state.intensity;

    const t =
      this.state.texture;

    const r =
      this.state.resonance;

    /* ----------------------------------------------
       BASE AIR
    ---------------------------------------------- */

    const baseAir =
      0.01 +
      Math.pow(i, 1.8) * 0.22;

    this.nodes.airflowGain.gain
      .setTargetAtTime(
        baseAir,
        ctx.currentTime,
        1.5
      );

    /* ----------------------------------------------
       TEXTURE
    ---------------------------------------------- */

    this.nodes.airflowLP.frequency
      .setTargetAtTime(
        2800 + t * 5000,
        ctx.currentTime,
        2
      );

    /* ----------------------------------------------
       TURBULENCE
    ---------------------------------------------- */

    this.nodes.turbGainA.gain
      .setTargetAtTime(
        0.02 +
        Math.pow(i, 1.6) * 0.22,
        ctx.currentTime,
        2
      );

    this.nodes.turbGainB.gain
      .setTargetAtTime(
        0.005 +
        Math.pow(i, 2.1) * 0.12,
        ctx.currentTime,
        2
      );

    /* ----------------------------------------------
       RESONANCE
    ---------------------------------------------- */

    this.nodes.resonators
      .forEach((res, index) => {

        const amt =
          (
            Math.pow(i, 2.4) *
            0.08 *
            r
          ) +
          (
            0.003 *
            r
          );

        res.gain.gain
          .setTargetAtTime(
            amt / (1 + index * 0.3),
            ctx.currentTime,
            2.5
          );
      });

    /* ----------------------------------------------
       STORM BODY
    ---------------------------------------------- */

    const storm =
      Math.max(
        0,
        i - 0.58
      );

    this.nodes.stormGain.gain
      .setTargetAtTime(
        Math.pow(storm, 1.8) * 0.34,
        ctx.currentTime,
        3
      );

    /* ----------------------------------------------
       FINAL TONE
    ---------------------------------------------- */

    this.nodes.finalLP.frequency
      .setTargetAtTime(
        7000 +
        i * 5000,
        ctx.currentTime,
        2
      );
  }

  /* =======================================================
     WORLD STATE
  ======================================================= */

  onWorldStateUpdate(state) {

    if (!state) return;

    const ctx = this.ctx;

    if (state.enclosure === 'indoor') {

      this.nodes.finalLP.frequency
        .setTargetAtTime(
          2800,
          ctx.currentTime,
          3
        );
    }

    if (state.enclosure === 'umbrella') {

      this.nodes.finalLP.frequency
        .setTargetAtTime(
          4500,
          ctx.currentTime,
          3
        );
    }

    if (state.enclosure === 'open') {

      this.nodes.finalLP.frequency
        .setTargetAtTime(
          12000,
          ctx.currentTime,
          3
        );
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  getUICard() {

    return `
      <article class="expert-card glass" data-id="${this.id}">

        <div class="expert-head">

          <div>
            <div class="expert-kicker">
              ATMOSPHERE • WIND
            </div>

            <h3 class="expert-title">
              Wind Expert
            </h3>
          </div>

          <button class="remove-btn">
            Remove
          </button>

        </div>

        <div class="expert-controls">

          <label>
            Intensity

            <input
              class="wind-intensity"
              type="range"
              min="0"
              max="100"
              value="28"
            />
          </label>

          <label>
            Texture

            <input
              class="wind-texture"
              type="range"
              min="0"
              max="100"
              value="45"
            />
          </label>

          <label>
            Resonance

            <input
              class="wind-resonance"
              type="range"
              min="0"
              max="100"
              value="42"
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

        this.#applyState();
      });

    card
      .querySelector('.wind-texture')
      .addEventListener('input', (e) => {

        this.state.texture =
          e.target.value / 100;

        this.#applyState();
      });

    card
      .querySelector('.wind-resonance')
      .addEventListener('input', (e) => {

        this.state.resonance =
          e.target.value / 100;

        this.#applyState();
      });
  }

  /* =======================================================
     NOISE
  ======================================================= */

  #createPinkNoiseBuffer(seconds) {

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

    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;

    for (let i = 0; i < length; i++) {

      const white =
        Math.random() * 2 - 1;

      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;

      data[i] =
        (
          b0 +
          b1 +
          b2 +
          b3 +
          b4 +
          b5 +
          b6 +
          white * 0.5362
        ) * 0.08;

      b6 =
        white * 0.115926;
    }

    return buffer;
  }

  /* =======================================================
     DESTROY
  ======================================================= */

  destroy() {

    this.modulators
      .forEach(cancelAnimationFrame);

    try {

      this.nodes.noise.stop();

    } catch {}

    Object.values(this.nodes)
      .forEach((n) => {

        try {
          n.disconnect?.();
        } catch {}
      });

    this.output.disconnect();
  }
}
