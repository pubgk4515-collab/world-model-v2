/**
 * expert_wind.js
 * =========================================================
 * Ultra-Realistic Procedural Wind Expert
 * For Symbiote Studio · MoE World Model
 *
 * Philosophy:
 * Real wind ≠ noise.
 * Real wind = moving resonant air masses.
 *
 * This engine uses:
 * - pink/brown turbulence
 * - moving resonances
 * - pressure body
 * - stereo drift
 * - cavity whistles
 * - ultra smooth modulation
 *
 * NO:
 * - harsh TV static
 * - sub-bass earthquakes
 * - clicks/pops
 * - fake gust envelopes
 *
 * Architecture compatible with:
 * app.js → new WindExpert(audioCtx, masterBus)
 * =========================================================
 */

export default class WindExpert {

  constructor(audioCtx, masterBus) {

    this.ctx = audioCtx;
    this.masterBus = masterBus;

    this.id =
      crypto.randomUUID?.() ||
      Math.random().toString(36).slice(2);

    // ---------------------------------------------------
    // STATE
    // ---------------------------------------------------

    this.state = {

      intensity: 0.28,
      texture: 0.45,
      resonance: 0.35,
      movement: 0.55,
      width: 0.75,
    };

    // ---------------------------------------------------
    // OUTPUT
    // ---------------------------------------------------

    this.output = this.ctx.createGain();
    this.output.gain.value = 0;

    this.output.connect(masterBus);

    // ---------------------------------------------------
    // NOISE BUFFER
    // ---------------------------------------------------

    this.noiseBuffer =
      this.createPinkNoiseBuffer(8);

    // ---------------------------------------------------
    // AIRFLOW LAYER
    // ---------------------------------------------------

    this.airSource =
      this.ctx.createBufferSource();

    this.airSource.buffer =
      this.noiseBuffer;

    this.airSource.loop = true;

    this.airGain =
      this.ctx.createGain();

    this.airHP =
      this.ctx.createBiquadFilter();

    this.airHP.type =
      'highpass';

    this.airHP.frequency.value = 180;

    this.airLP =
      this.ctx.createBiquadFilter();

    this.airLP.type =
      'lowpass';

    this.airLP.frequency.value = 4800;

    // ---------------------------------------------------
    // TURBULENCE
    // ---------------------------------------------------

    this.turbulenceGain =
      this.ctx.createGain();

    this.bandA =
      this.ctx.createBiquadFilter();

    this.bandA.type =
      'bandpass';

    this.bandA.frequency.value = 700;
    this.bandA.Q.value = 1.2;

    this.bandB =
      this.ctx.createBiquadFilter();

    this.bandB.type =
      'bandpass';

    this.bandB.frequency.value = 1600;
    this.bandB.Q.value = 1.5;

    // ---------------------------------------------------
    // RESONANCE CAVITIES
    // ---------------------------------------------------

    this.resonanceInput =
      this.ctx.createGain();

    this.resonanceGain =
      this.ctx.createGain();

    this.resonanceGain.gain.value = 0;

    this.resonators = [];

    const freqs = [
      320,
      470,
      620,
      910
    ];

    freqs.forEach(freq => {

      const bp =
        this.ctx.createBiquadFilter();

      bp.type =
        'bandpass';

      bp.frequency.value =
        freq;

      bp.Q.value = 14;

      this.resonators.push(bp);

      this.resonanceInput.connect(bp);
      bp.connect(this.resonanceGain);
    });

    // ---------------------------------------------------
    // PRESSURE BODY
    // ---------------------------------------------------

    this.bodyGain =
      this.ctx.createGain();

    this.bodyGain.gain.value = 0;

    this.bodyFilter =
      this.ctx.createBiquadFilter();

    this.bodyFilter.type =
      'bandpass';

    this.bodyFilter.frequency.value = 240;
    this.bodyFilter.Q.value = 0.6;

    // ---------------------------------------------------
    // STEREO
    // ---------------------------------------------------

    this.panner =
      this.ctx.createStereoPanner();

    // ---------------------------------------------------
    // FINAL TONE SHAPING
    // ---------------------------------------------------

    this.finalHP =
      this.ctx.createBiquadFilter();

    this.finalHP.type =
      'highpass';

    this.finalHP.frequency.value = 70;

    this.finalLP =
      this.ctx.createBiquadFilter();

    this.finalLP.type =
      'lowpass';

    this.finalLP.frequency.value = 11000;

    // ---------------------------------------------------
    // CONNECTIONS
    // ---------------------------------------------------

    this.airSource.connect(this.airGain);

    this.airGain.connect(this.airHP);
    this.airHP.connect(this.airLP);

    // turbulence paths

    this.airLP.connect(this.bandA);
    this.airLP.connect(this.bandB);

    this.bandA.connect(this.turbulenceGain);
    this.bandB.connect(this.turbulenceGain);

    // resonance excitation

    this.turbulenceGain.connect(
      this.resonanceInput
    );

    // body

    this.airLP.connect(this.bodyFilter);
    this.bodyFilter.connect(this.bodyGain);

    // summing

    this.airLP.connect(this.panner);

    this.turbulenceGain.connect(
      this.panner
    );

    this.resonanceGain.connect(
      this.panner
    );

    this.bodyGain.connect(
      this.panner
    );

    // final

    this.panner.connect(this.finalHP);
    this.finalHP.connect(this.finalLP);
    this.finalLP.connect(this.output);

    // ---------------------------------------------------
    // START
    // ---------------------------------------------------

    this.airSource.start();

    // ---------------------------------------------------
    // MODULATION
    // ---------------------------------------------------

    this.startAtmosphericMotion();

    // ---------------------------------------------------
    // INITIAL UPDATE
    // ---------------------------------------------------

    this.updateDSP();

    // smooth fade in

    const now =
      this.ctx.currentTime;

    this.output.gain.setValueAtTime(
      0,
      now
    );

    this.output.gain.linearRampToValueAtTime(
      0.65,
      now + 3
    );
  }

  // =====================================================
  // PINK NOISE
  // =====================================================

  createPinkNoiseBuffer(seconds) {

    const length =
      this.ctx.sampleRate * seconds;

    const buffer =
      this.ctx.createBuffer(
        1,
        length,
        this.ctx.sampleRate
      );

    const data =
      buffer.getChannelData(0);

    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;

    for(let i=0;i<length;i++){

      const white =
        Math.random()*2-1;

      b0 = 0.99886*b0 + white*0.0555179;
      b1 = 0.99332*b1 + white*0.0750759;
      b2 = 0.96900*b2 + white*0.1538520;
      b3 = 0.86650*b3 + white*0.3104856;
      b4 = 0.55000*b4 + white*0.5329522;
      b5 = -0.7616*b5 - white*0.0168980;

      data[i] =
        (
          b0+b1+b2+b3+b4+b5+b6+
          white*0.5362
        ) * 0.08;

      b6 = white*0.115926;
    }

    return buffer;
  }

  // =====================================================
  // MOTION
  // =====================================================

  startAtmosphericMotion() {

    const drift = () => {

      const now =
        this.ctx.currentTime;

      const energy =
        this.state.intensity;

      // stereo drift

      this.panner.pan.linearRampToValueAtTime(

        (
          Math.random() * 2 - 1
        ) *
        0.45 *
        this.state.width,

        now + 8
      );

      // moving turbulence

      this.bandA.frequency.linearRampToValueAtTime(
        500 + Math.random()*700,
        now + 6
      );

      this.bandB.frequency.linearRampToValueAtTime(
        1200 + Math.random()*1800,
        now + 7
      );

      // cavity resonance motion

      this.resonators.forEach(filter => {

        const base =
          filter.frequency.value;

        filter.frequency.linearRampToValueAtTime(

          base +
          (
            Math.random()*120 - 60
          ),

          now + 10
        );
      });

      // soft gust emergence

      const gust =
        Math.pow(
          Math.random(),
          2.5
        ) * energy;

      this.turbulenceGain.gain.linearRampToValueAtTime(
        0.03 + gust * 0.18,
        now + 5
      );

      this.bodyGain.gain.linearRampToValueAtTime(
        gust * 0.16,
        now + 6
      );
    };

    drift();

    this.motionInterval =
      setInterval(
        drift,
        5000
      );
  }

  // =====================================================
  // DSP UPDATE
  // =====================================================

  updateDSP() {

    const now =
      this.ctx.currentTime;

    const energy =
      this.state.intensity;

    // ---------------------------------------------------
    // AIR BED
    // ---------------------------------------------------

    const air =
      0.002 +
      Math.pow(
        energy,
        1.8
      ) * 0.03;

    this.airGain.gain.setTargetAtTime(
      air,
      now,
      1.2
    );

    // ---------------------------------------------------
    // FILTER SHAPE
    // ---------------------------------------------------

    this.airHP.frequency.setTargetAtTime(

      260 -
      energy * 120,

      now,
      2
    );

    this.airLP.frequency.setTargetAtTime(

      3200 +
      (
        this.state.texture *
        5200
      ),

      now,
      2
    );

    // ---------------------------------------------------
    // TURBULENCE
    // ---------------------------------------------------

    this.turbulenceGain.gain.setTargetAtTime(

      0.01 +
      Math.pow(
        energy,
        2.1
      ) * 0.22,

      now,
      2
    );

    // ---------------------------------------------------
    // RESONANCE
    // ---------------------------------------------------

    this.resonanceGain.gain.setTargetAtTime(

      (
        this.state.resonance *
        Math.pow(energy, 1.7)
      ) * 0.18,

      now,
      3
    );

    // ---------------------------------------------------
    // BODY
    // ---------------------------------------------------

    this.bodyGain.gain.setTargetAtTime(

      Math.pow(
        energy,
        2.4
      ) * 0.22,

      now,
      2
    );
  }

  // =====================================================
  // UI
  // =====================================================

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
              Wind Expert
            </h3>

          </div>

          <button class="remove-btn">
            Remove
          </button>

        </div>

        <div class="expert-sliders">

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
              value="35"
            />
          </label>

          <label>
            Movement
            <input
              class="wind-movement"
              type="range"
              min="0"
              max="100"
              value="55"
            />
          </label>

          <label>
            Width
            <input
              class="wind-width"
              type="range"
              min="0"
              max="100"
              value="75"
            />
          </label>

        </div>

      </article>
    `;
  }

  // =====================================================
  // UI BINDINGS
  // =====================================================

  bindCardControls(card) {

    card
      .querySelector('.wind-intensity')
      .addEventListener('input', e => {

        this.state.intensity =
          e.target.value / 100;

        this.updateDSP();
      });

    card
      .querySelector('.wind-texture')
      .addEventListener('input', e => {

        this.state.texture =
          e.target.value / 100;

        this.updateDSP();
      });

    card
      .querySelector('.wind-resonance')
      .addEventListener('input', e => {

        this.state.resonance =
          e.target.value / 100;

        this.updateDSP();
      });

    card
      .querySelector('.wind-movement')
      .addEventListener('input', e => {

        this.state.movement =
          e.target.value / 100;
      });

    card
      .querySelector('.wind-width')
      .addEventListener('input', e => {

        this.state.width =
          e.target.value / 100;
      });
  }

  // =====================================================
  // WORLD STATE
  // =====================================================

  onWorldStateUpdate(state) {

    if (!state) return;

    const now =
      this.ctx.currentTime;

    if (state.enclosure === 'indoor') {

      this.finalLP.frequency
        .setTargetAtTime(
          2800,
          now,
          2
        );
    }

    if (state.enclosure === 'umbrella') {

      this.finalLP.frequency
        .setTargetAtTime(
          4200,
          now,
          2
        );
    }

    if (state.enclosure === 'open') {

      this.finalLP.frequency
        .setTargetAtTime(
          11000,
          now,
          2
        );
    }
  }

  // =====================================================
  // DESTROY
  // =====================================================

  destroy() {

    clearInterval(
      this.motionInterval
    );

    const now =
      this.ctx.currentTime;

    this.output.gain.cancelScheduledValues(now);

    this.output.gain.setTargetAtTime(
      0,
      now,
      0.8
    );

    setTimeout(() => {

      try {

        this.airSource.stop();

        this.output.disconnect();

      } catch(e) {}

    }, 2000);
  }
}
