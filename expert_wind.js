/**
 * expert_wind.js
 * NASA-Level Procedural Wind Engine
 * ---------------------------------
 * Goals:
 * - Natural moving air perception
 * - No earthquake rumble
 * - No dinosaur breathing
 * - No pops/clicks
 * - Sleep-friendly continuous airflow
 * - Real atmospheric motion feeling
 * - Extremely smooth modulation
 *
 * Architecture:
 * Pink Noise Bed
 * + Air Turbulence
 * + Diffused Stereo Drift
 * + Analog Motion
 * + Continuous Spectral Evolution
 *
 * IMPORTANT:
 * This engine intentionally avoids:
 * - aggressive gust scheduling
 * - sub-bass rumble
 * - abrupt gain jumps
 * - fake "whoosh" envelopes
 */

const STYLE_ID = 'nasa-wind-style-v1';

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function clamp01(v) {
  return clamp(v, 0, 1);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');

  style.id = STYLE_ID;

  style.textContent = `
    .expert-card.wind-expert{
      position:relative;
      overflow:hidden;
      border-radius:24px;
      border:1px solid rgba(255,255,255,.08);
      background:
        radial-gradient(circle at top right, rgba(124,58,237,.10), transparent 34%),
        radial-gradient(circle at bottom left, rgba(37,99,235,.08), transparent 28%),
        linear-gradient(180deg,
          rgba(255,255,255,.05),
          rgba(255,255,255,.025)
        );
      backdrop-filter:blur(22px);
      -webkit-backdrop-filter:blur(22px);
      box-shadow:0 18px 50px rgba(0,0,0,.42);
      padding:16px;
      color:white;
    }

    .wind-top{
      display:flex;
      justify-content:space-between;
      gap:12px;
      margin-bottom:14px;
    }

    .wind-kicker{
      font-size:.72rem;
      letter-spacing:.14em;
      text-transform:uppercase;
      color:rgba(255,255,255,.48);
      font-weight:700;
      margin-bottom:6px;
    }

    .wind-title{
      font-size:1.08rem;
      font-weight:800;
      letter-spacing:-.04em;
      margin:0;
    }

    .wind-subtitle{
      margin-top:6px;
      font-size:.9rem;
      line-height:1.45;
      color:rgba(255,255,255,.56);
    }

    .wind-controls{
      display:grid;
      gap:14px;
      margin-top:16px;
    }

    .wind-control{
      display:grid;
      gap:8px;
    }

    .wind-control-head{
      display:flex;
      justify-content:space-between;
      align-items:center;
    }

    .wind-label{
      font-size:.76rem;
      font-weight:800;
      letter-spacing:.08em;
      text-transform:uppercase;
      color:rgba(255,255,255,.62);
    }

    .wind-value{
      font-size:.84rem;
      font-weight:800;
      color:rgba(255,255,255,.86);
    }

    .wind-slider{
      width:100%;
      height:7px;
      appearance:none;
      -webkit-appearance:none;
      border-radius:999px;
      outline:none;
      background:
        linear-gradient(
          90deg,
          rgba(124,58,237,.9),
          rgba(37,99,235,.9)
        );
    }

    .wind-slider::-webkit-slider-thumb{
      appearance:none;
      -webkit-appearance:none;
      width:24px;
      height:24px;
      border-radius:50%;
      background:white;
      cursor:pointer;
      box-shadow:
        0 0 0 6px rgba(255,255,255,.08),
        0 8px 20px rgba(255,255,255,.12);
    }

    .remove-btn{
      border:none;
      border-radius:14px;
      background:rgba(255,255,255,.06);
      color:white;
      padding:10px 14px;
      font-weight:700;
      cursor:pointer;
    }
  `;

  document.head.appendChild(style);
}

export default class WindExpert {

  constructor(audioCtx, masterBus) {

    if (!audioCtx) {
      throw new Error('AudioContext required');
    }

    if (!masterBus) {
      throw new Error('Master bus required');
    }

    ensureStyles();

    this.audioCtx = audioCtx;
    this.masterBus = masterBus;

    this.id =
      crypto.randomUUID?.() ||
      `wind-${Date.now()}`;

    this.destroyed = false;

    this.state = {
      intensity: 0.55,
      air: 0.45,
      movement: 0.35,
      width: 0.6
    };

    this.world = {
      enclosure: 'open',
      atmosphericPressure: 0.5
    };

    this._buildAudio();
    this._applyState(true);
  }

  // --------------------------------------------------------
  // PINK NOISE GENERATOR
  // --------------------------------------------------------

  _createPinkNoiseBuffer(seconds = 12) {

    const sr = this.audioCtx.sampleRate;
    const length = seconds * sr;

    const buffer =
      this.audioCtx.createBuffer(1, length, sr);

    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < length; i++) {

      const white = Math.random() * 2 - 1;

      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;

      const pink =
        b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;

      b6 = white * 0.115926;

      data[i] = pink * 0.11;
    }

    return buffer;
  }

  _makeNoiseSource(rate = 1) {

    const src =
      this.audioCtx.createBufferSource();

    src.buffer =
      this._createPinkNoiseBuffer();

    src.loop = true;
    src.playbackRate.value = rate;

    return src;
  }

  // --------------------------------------------------------
  // AUDIO ENGINE
  // --------------------------------------------------------

  _buildAudio() {

    const ctx = this.audioCtx;

    // MASTER

    this.output =
      ctx.createGain();

    this.output.gain.value = 0.7;

    // STEREO

    this.panner =
      ctx.createStereoPanner();

    this.panner.pan.value = 0;

    // ======================================================
    // MAIN WIND BED
    // ======================================================

    this.windA =
      this._makeNoiseSource(
        random(0.94, 1.02)
      );

    this.windB =
      this._makeNoiseSource(
        random(0.88, 0.97)
      );

    // HIGH PASS
    // Removes earthquake rumble.

    this.hpA =
      ctx.createBiquadFilter();

    this.hpA.type = 'highpass';
    this.hpA.frequency.value = 180;

    this.hpB =
      ctx.createBiquadFilter();

    this.hpB.type = 'highpass';
    this.hpB.frequency.value = 220;

    // LOW PASS
    // Keeps smooth air texture.

    this.lpA =
      ctx.createBiquadFilter();

    this.lpA.type = 'lowpass';
    this.lpA.frequency.value = 4200;
    this.lpA.Q.value = 0.4;

    this.lpB =
      ctx.createBiquadFilter();

    this.lpB.type = 'lowpass';
    this.lpB.frequency.value = 3600;
    this.lpB.Q.value = 0.5;

    // GAIN

    this.gainA =
      ctx.createGain();

    this.gainB =
      ctx.createGain();

    this.gainA.gain.value = 0.18;
    this.gainB.gain.value = 0.14;

    // ======================================================
    // AIR TURBULENCE
    // ======================================================

    this.airNoise =
      this._makeNoiseSource(
        random(0.78, 0.94)
      );

    this.airHP =
      ctx.createBiquadFilter();

    this.airHP.type = 'highpass';
    this.airHP.frequency.value = 1400;

    this.airLP =
      ctx.createBiquadFilter();

    this.airLP.type = 'lowpass';
    this.airLP.frequency.value = 7000;

    this.airGain =
      ctx.createGain();

    this.airGain.gain.value = 0.028;

    // ======================================================
    // SLOW ANALOG MOTION
    // ======================================================

    this.panLFO =
      ctx.createOscillator();

    this.panLFO.type = 'sine';
    this.panLFO.frequency.value = 0.008;

    this.panDepth =
      ctx.createGain();

    this.panDepth.gain.value = 0.12;

    this.filterLFO =
      ctx.createOscillator();

    this.filterLFO.type = 'sine';
    this.filterLFO.frequency.value = 0.004;

    this.filterDepth =
      ctx.createGain();

    this.filterDepth.gain.value = 180;

    // ======================================================
    // WIRING
    // ======================================================

    this.windA.connect(this.hpA);
    this.hpA.connect(this.lpA);
    this.lpA.connect(this.gainA);

    this.windB.connect(this.hpB);
    this.hpB.connect(this.lpB);
    this.lpB.connect(this.gainB);

    this.airNoise.connect(this.airHP);
    this.airHP.connect(this.airLP);
    this.airLP.connect(this.airGain);

    this.gainA.connect(this.panner);
    this.gainB.connect(this.panner);
    this.airGain.connect(this.panner);

    this.panner.connect(this.output);
    this.output.connect(this.masterBus);

    // LFOs

    this.panLFO.connect(this.panDepth);
    this.panDepth.connect(this.panner.pan);

    this.filterLFO.connect(this.filterDepth);

    this.filterDepth.connect(
      this.lpA.frequency
    );

    this.filterDepth.connect(
      this.lpB.frequency
    );

    // START

    this.windA.start();
    this.windB.start();
    this.airNoise.start();

    this.panLFO.start();
    this.filterLFO.start();
  }

  // --------------------------------------------------------
  // STATE
  // --------------------------------------------------------

  _computeEnergy() {

    const enclosureFactor =
      this.world.enclosure === 'indoor'
        ? 0.28
        : this.world.enclosure === 'umbrella'
        ? 0.6
        : 1;

    const pressureFactor =
      1 + (
        (0.5 - this.world.atmosphericPressure)
        * 0.45
      );

    return clamp01(
      (
        this.state.intensity * 0.7 +
        this.state.air * 0.2 +
        this.state.movement * 0.1
      )
      * enclosureFactor
      * pressureFactor
    );
  }

  _applyState(immediate = false) {

    if (this.destroyed) return;

    const now =
      this.audioCtx.currentTime;

    const smooth =
      immediate ? 0.001 : 2.4;

    const energy =
      this._computeEnergy();

    // ======================================================
    // VOLUME
    // ======================================================

    const bedA =
  0.015 +
  Math.pow(energy, 1.7) * 0.26;

const bedB =
  0.01 +
  Math.pow(energy, 1.9) * 0.20;

    const air =
  0.001 +
  (
    this.state.air *
    Math.pow(energy, 1.8)
  ) * 0.028;

    const output =
      0.38 +
      energy * 0.12;

    // ======================================================
    // FILTERS
    // ======================================================

    const cutoffA =
      3200 +
      this.state.air * 2200;

    const cutoffB =
      2600 +
      this.state.air * 1800;

    // ======================================================
    // MOTION
    // ======================================================

    const panDepth =
      0.04 +
      this.state.width * 0.14;

    // ======================================================

    const set = (param, value) => {

      param.cancelScheduledValues(now);

      param.setTargetAtTime(
        value,
        now,
        smooth
      );
    };

    set(this.gainA.gain, bedA);
    set(this.gainB.gain, bedB);
    set(this.airGain.gain, air);

    set(this.output.gain, output);

    set(this.lpA.frequency, cutoffA);
    set(this.lpB.frequency, cutoffB);

    set(this.panDepth.gain, panDepth);

    set(
      this.filterDepth.gain,
      60 + this.state.air * 120
    );
  }

  // --------------------------------------------------------
  // UI
  // --------------------------------------------------------

  _paintSlider(slider, value) {

    const pct =
      Math.round(value * 100);

    slider.style.background =
      `linear-gradient(
        90deg,
        rgba(124,58,237,.92) 0%,
        rgba(37,99,235,.92) ${pct}%,
        rgba(255,255,255,.08) ${pct}%,
        rgba(255,255,255,.08) 100%
      )`;
  }

  getUICard() {

    return `
      <article
        class="expert-card wind-expert"
        data-id="${this.id}"
      >

        <div class="wind-top">

          <div>

            <div class="wind-kicker">
              Atmosphere · Wind
            </div>

            <h3 class="wind-title">
              NASA Wind Engine
            </h3>

            <p class="wind-subtitle">
              Continuous atmospheric airflow with
              ultra-smooth analog motion.
            </p>

          </div>

          <button
            class="remove-btn"
            type="button"
          >
            Remove
          </button>

        </div>

        <div class="wind-controls">

          <div class="wind-control">

            <div class="wind-control-head">

              <div class="wind-label">
                Intensity
              </div>

              <div
                class="wind-value"
                data-value="intensity"
              >
                0.55
              </div>

            </div>

            <input
              class="wind-slider"
              data-control="intensity"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.55"
            />

          </div>

          <div class="wind-control">

            <div class="wind-control-head">

              <div class="wind-label">
                Air Texture
              </div>

              <div
                class="wind-value"
                data-value="air"
              >
                0.45
              </div>

            </div>

            <input
              class="wind-slider"
              data-control="air"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.45"
            />

          </div>

          <div class="wind-control">

            <div class="wind-control-head">

              <div class="wind-label">
                Motion
              </div>

              <div
                class="wind-value"
                data-value="movement"
              >
                0.35
              </div>

            </div>

            <input
              class="wind-slider"
              data-control="movement"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.35"
            />

          </div>

          <div class="wind-control">

            <div class="wind-control-head">

              <div class="wind-label">
                Stereo Width
              </div>

              <div
                class="wind-value"
                data-value="width"
              >
                0.60
              </div>

            </div>

            <input
              class="wind-slider"
              data-control="width"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.60"
            />

          </div>

        </div>

      </article>
    `;
  }

  bindCardControls(card) {

    this.card = card;

    const controls =
      card.querySelectorAll(
        '[data-control]'
      );

    controls.forEach((slider) => {

      const key =
        slider.dataset.control;

      const valueLabel =
        card.querySelector(
          `[data-value="${key}"]`
        );

      this._paintSlider(
        slider,
        parseFloat(slider.value)
      );

      slider.addEventListener(
        'input',
        (e) => {

          const value =
            clamp01(
              parseFloat(e.target.value)
            );

          this.state[key] = value;

          valueLabel.textContent =
            value.toFixed(2);

          this._paintSlider(
            slider,
            value
          );

          this._applyState(false);
        }
      );
    });
  }

  // --------------------------------------------------------
  // WORLD STATE
  // --------------------------------------------------------

  onWorldStateUpdate(worldState = {}) {

    this.world = {

      enclosure:
        worldState.enclosure || 'open',

      atmosphericPressure:
        typeof worldState.atmosphericPressure
          === 'number'
            ? clamp01(
                worldState.atmosphericPressure
              )
            : 0.5
    };

    this._applyState(false);
  }

  // --------------------------------------------------------
  // DESTROY
  // --------------------------------------------------------

  destroy() {

    if (this.destroyed) return;

    this.destroyed = true;

    const now =
      this.audioCtx.currentTime;

    const fade = (gain) => {

      gain.gain.cancelScheduledValues(now);

      gain.gain.setTargetAtTime(
        0.0001,
        now,
        0.2
      );
    };

    fade(this.output);

    setTimeout(() => {

      try {

        this.windA.stop();
        this.windB.stop();
        this.airNoise.stop();

        this.panLFO.stop();
        this.filterLFO.stop();

      } catch (_) {}

      [
        this.windA,
        this.windB,
        this.airNoise,
        this.hpA,
        this.hpB,
        this.lpA,
        this.lpB,
        this.airHP,
        this.airLP,
        this.gainA,
        this.gainB,
        this.airGain,
        this.output,
        this.panner,
        this.panLFO,
        this.panDepth,
        this.filterLFO,
        this.filterDepth
      ].forEach((node) => {

        try {
          node.disconnect();
        } catch (_) {}
      });

    }, 1200);
  }
}
