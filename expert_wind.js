/**
 * expert_wind.js
 * NASA-grade smooth ambient wind synthesis
 * ---------------------------------------------------------
 * Goals:
 * - ZERO clicks / pops
 * - no earthquake rumble
 * - no dinosaur breathing
 * - soft continuous air movement
 * - sleep-friendly
 * - subtle natural stereo drift
 * - mobile-safe
 * - no scheduled harsh gusts
 *
 * Architecture:
 * Pink-ish Noise Bed
 * + Air Layer
 * + Soft Turbulence
 * + Slow Analog Drift
 */

const STYLE_ID = 'symbiote-wind-v3-style';

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function clamp01(v) {
  return clamp(v, 0, 1);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;

  style.textContent = `
    .wind-card {
      position: relative;
      overflow: hidden;
      border-radius: 26px;
      padding: 18px;
      background:
        radial-gradient(circle at top right,
          rgba(124,58,237,0.12),
          transparent 34%),
        radial-gradient(circle at bottom left,
          rgba(37,99,235,0.10),
          transparent 28%),
        linear-gradient(
          180deg,
          rgba(255,255,255,0.06),
          rgba(255,255,255,0.03)
        );

      border: 1px solid rgba(255,255,255,0.08);

      backdrop-filter: blur(22px);
      -webkit-backdrop-filter: blur(22px);

      box-shadow:
        0 18px 50px rgba(0,0,0,0.42);

      color: rgba(255,255,255,0.94);
    }

    .wind-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
    }

    .wind-kicker {
      font-size: 0.72rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.48);
      font-weight: 700;
      margin-bottom: 6px;
    }

    .wind-title {
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      margin: 0;
    }

    .wind-sub {
      margin-top: 8px;
      font-size: 0.92rem;
      line-height: 1.5;
      color: rgba(255,255,255,0.56);
    }

    .wind-grid {
      display: grid;
      gap: 14px;
      margin-top: 18px;
    }

    .wind-row {
      display: grid;
      gap: 8px;
    }

    .wind-row-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .wind-label {
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.6);
    }

    .wind-value {
      font-size: 0.84rem;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
    }

    .wind-slider {
      width: 100%;
      height: 7px;
      appearance: none;
      -webkit-appearance: none;
      border-radius: 999px;
      outline: none;

      background:
        linear-gradient(
          90deg,
          rgba(124,58,237,0.92),
          rgba(37,99,235,0.92)
        );
    }

    .wind-slider::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;

      width: 26px;
      height: 26px;

      border-radius: 50%;

      background: rgba(255,255,255,0.97);

      border:
        2px solid rgba(255,255,255,0.18);

      box-shadow:
        0 0 0 6px rgba(255,255,255,0.08),
        0 10px 24px rgba(255,255,255,0.14);

      cursor: pointer;
    }

    .remove-btn {
      border: none;
      outline: none;

      border-radius: 14px;

      padding: 10px 14px;

      background:
        rgba(255,255,255,0.06);

      border:
        1px solid rgba(255,255,255,0.08);

      color:
        rgba(255,255,255,0.88);

      font-weight: 700;

      cursor: pointer;
    }
  `;

  document.head.appendChild(style);
}

export default class WindExpert {
  constructor(audioCtx, masterBus) {
    ensureStyles();

    this.audioCtx = audioCtx;
    this.masterBus = masterBus;

    this.id =
      crypto.randomUUID?.() ||
      `wind-${Date.now()}`;

    this.state = {
      intensity: 0.45,
      air: 0.42,
      width: 0.55,
    };

    this.world = {
      enclosure: 'open',
      atmosphericPressure: 0.5,
    };

    this.destroyed = false;

    this._buildAudio();
    this._startMotion();
    this._apply();
  }

  // -------------------------------------------------------
  // NOISE GENERATION
  // -------------------------------------------------------

  _createPinkishNoise(seconds = 8) {
    const sr = this.audioCtx.sampleRate;
    const length = seconds * sr;

    const buffer =
      this.audioCtx.createBuffer(1, length, sr);

    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;

    for (let i = 0; i < length; i++) {
      const white =
        Math.random() * 2 - 1;

      b0 =
        0.99765 * b0 +
        white * 0.0990460;

      b1 =
        0.96300 * b1 +
        white * 0.2965164;

      b2 =
        0.57000 * b2 +
        white * 1.0526913;

      data[i] =
        (b0 + b1 + b2 + white * 0.1848) * 0.05;
    }

    return buffer;
  }

  _makeNoiseSource(rate = 1) {
    const src =
      this.audioCtx.createBufferSource();

    src.buffer =
      this._createPinkishNoise(10);

    src.loop = true;
    src.playbackRate.value = rate;

    return src;
  }

  // -------------------------------------------------------
  // AUDIO GRAPH
  // -------------------------------------------------------

  _buildAudio() {
    const ctx = this.audioCtx;

    // MASTER
    this.output =
      ctx.createGain();

    this.output.gain.value = 0.55;

    // STEREO
    this.stereo =
      ctx.createStereoPanner();

    // BED
    this.bed =
      this._makeNoiseSource(
        random(0.94, 1.03)
      );

    this.bedHP =
      ctx.createBiquadFilter();

    this.bedHP.type =
      'highpass';

    // IMPORTANT:
    // remove rumble
    this.bedHP.frequency.value = 180;

    this.bedLP =
      ctx.createBiquadFilter();

    this.bedLP.type =
      'lowpass';

    this.bedLP.frequency.value = 4200;

    this.bedGain =
      ctx.createGain();

    this.bedGain.gain.value = 0.16;

    // AIR LAYER
    this.air =
      this._makeNoiseSource(
        random(0.82, 0.96)
      );

    this.airHP =
      ctx.createBiquadFilter();

    this.airHP.type =
      'highpass';

    this.airHP.frequency.value = 1400;

    this.airLP =
      ctx.createBiquadFilter();

    this.airLP.type =
      'lowpass';

    this.airLP.frequency.value = 7000;

    this.airGain =
      ctx.createGain();

    this.airGain.gain.value = 0.025;

    // MOTION
    this.panLfo =
      ctx.createOscillator();

    this.panLfo.type = 'sine';

    // EXTREMELY slow
    this.panLfo.frequency.value = 0.008;

    this.panDepth =
      ctx.createGain();

    this.panDepth.gain.value = 0.12;

    // FILTER DRIFT
    this.cutoffLfo =
      ctx.createOscillator();

    this.cutoffLfo.type = 'sine';

    this.cutoffLfo.frequency.value = 0.004;

    this.cutoffDepth =
      ctx.createGain();

    this.cutoffDepth.gain.value = 120;

    // ---------------------------------------------------
    // CONNECTIONS
    // ---------------------------------------------------

    this.bed.connect(this.bedHP);
    this.bedHP.connect(this.bedLP);
    this.bedLP.connect(this.bedGain);

    this.air.connect(this.airHP);
    this.airHP.connect(this.airLP);
    this.airLP.connect(this.airGain);

    this.bedGain.connect(this.stereo);
    this.airGain.connect(this.stereo);

    this.stereo.connect(this.output);
    this.output.connect(this.masterBus);

    // LFOs
    this.panLfo.connect(this.panDepth);
    this.panDepth.connect(this.stereo.pan);

    this.cutoffLfo.connect(this.cutoffDepth);

    this.cutoffDepth.connect(
      this.bedLP.frequency
    );

    // START
    this.bed.start();
    this.air.start();

    this.panLfo.start();
    this.cutoffLfo.start();
  }

  // -------------------------------------------------------
  // APPLY STATE
  // -------------------------------------------------------

  _apply() {
    if (this.destroyed) return;

    const now =
      this.audioCtx.currentTime;

    const intensity =
      this.state.intensity;

    const air =
      this.state.air;

    const width =
      this.state.width;

    // smoother automation
    const smooth = (
      param,
      value,
      time = 2.8
    ) => {
      param.cancelScheduledValues(now);

      param.setTargetAtTime(
        value,
        now,
        time
      );
    };

    // MAIN BODY
    smooth(
      this.bedGain.gain,
      0.08 + intensity * 0.22
    );

    // AIR TEXTURE
    smooth(
      this.airGain.gain,
      0.008 + air * 0.045
    );

    // STEREO WIDTH
    smooth(
      this.panDepth.gain,
      0.04 + width * 0.18
    );

    // FILTER MOVEMENT
    smooth(
      this.cutoffDepth.gain,
      60 + air * 120
    );

    // TONE
    smooth(
      this.bedLP.frequency,
      3200 + air * 2600
    );

    smooth(
      this.airLP.frequency,
      5200 + air * 1800
    );
  }

  // -------------------------------------------------------
  // CONTINUOUS ANALOG MOTION
  // -------------------------------------------------------

  _startMotion() {
    const loop = () => {
      if (this.destroyed) return;

      const now =
        this.audioCtx.currentTime;

      // VERY subtle drift
      const drift =
        random(-0.03, 0.03);

      this.stereo.pan.setTargetAtTime(
        drift,
        now,
        6
      );

      requestAnimationFrame(loop);
    };

    loop();
  }

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------

  getUICard() {
    return `
      <article
        class="wind-card"
        data-id="${this.id}"
      >

        <div class="wind-top">

          <div>
            <div class="wind-kicker">
              Atmosphere · Wind
            </div>

            <h3 class="wind-title">
              Wind Expert
            </h3>

            <div class="wind-sub">
              Soft natural airflow with
              continuous analog motion.
            </div>
          </div>

          <button
            class="remove-btn"
          >
            Remove
          </button>

        </div>

        <div class="wind-grid">

          <div class="wind-row">

            <div class="wind-row-top">
              <div class="wind-label">
                Intensity
              </div>

              <div
                class="wind-value"
                data-value="intensity"
              >
                0.45
              </div>
            </div>

            <input
              class="wind-slider"
              data-control="intensity"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.45"
            />

          </div>

          <div class="wind-row">

            <div class="wind-row-top">
              <div class="wind-label">
                Air
              </div>

              <div
                class="wind-value"
                data-value="air"
              >
                0.42
              </div>
            </div>

            <input
              class="wind-slider"
              data-control="air"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.42"
            />

          </div>

          <div class="wind-row">

            <div class="wind-row-top">
              <div class="wind-label">
                Width
              </div>

              <div
                class="wind-value"
                data-value="width"
              >
                0.55
              </div>
            </div>

            <input
              class="wind-slider"
              data-control="width"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.55"
            />

          </div>

        </div>

      </article>
    `;
  }

  bindCardControls(card) {
    this.card = card;

    const controls = {
      intensity:
        card.querySelector(
          '[data-control="intensity"]'
        ),

      air:
        card.querySelector(
          '[data-control="air"]'
        ),

      width:
        card.querySelector(
          '[data-control="width"]'
        ),
    };

    const values = {
      intensity:
        card.querySelector(
          '[data-value="intensity"]'
        ),

      air:
        card.querySelector(
          '[data-value="air"]'
        ),

      width:
        card.querySelector(
          '[data-value="width"]'
        ),
    };

    Object.keys(controls).forEach((key) => {
      controls[key].addEventListener(
        'input',
        (e) => {
          const value =
            parseFloat(e.target.value);

          this.state[key] = value;

          values[key].textContent =
            value.toFixed(2);

          this._apply();
        }
      );
    });
  }

  // -------------------------------------------------------
  // WORLD STATE
  // -------------------------------------------------------

  onWorldStateUpdate(state) {
    this.world = state || this.world;

    // enclosure darkens sound
    let enclosureTone = 1;

    switch (state.enclosure) {
      case 'indoor':
        enclosureTone = 0.55;
        break;

      case 'umbrella':
        enclosureTone = 0.78;
        break;

      case 'open':
      default:
        enclosureTone = 1;
    }

    const target =
      2800 +
      this.state.air *
      2600 *
      enclosureTone;

    this.bedLP.frequency.setTargetAtTime(
      target,
      this.audioCtx.currentTime,
      4
    );
  }

  // -------------------------------------------------------
  // DESTROY
  // -------------------------------------------------------

  destroy() {
    this.destroyed = true;

    const now =
      this.audioCtx.currentTime;

    this.output.gain.setTargetAtTime(
      0.0001,
      now,
      0.8
    );

    setTimeout(() => {
      try {
        this.bed.stop();
        this.air.stop();

        this.panLfo.stop();
        this.cutoffLfo.stop();

        this.output.disconnect();
      } catch (_) {}
    }, 1500);
  }
}
