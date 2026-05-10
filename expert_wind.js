/**
 * expert_wind.js
 * Gentle, natural, sleep-friendly procedural wind expert
 * for Symbiote Studio.
 *
 * Goals:
 * - smooth continuous airflow
 * - subtle swells instead of breathy pumping
 * - enclosure-aware shaping
 * - slow stereo drift
 * - very soft gust events with long envelopes
 * - mobile-safe card UI
 */

const WIND_STYLE_ID = 'wind-expert-style-v2';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function pickEnclosureFactor(enclosure) {
  switch (enclosure) {
    case 'indoor':
      return 0.12;
    case 'umbrella':
      return 0.45;
    case 'open':
    default:
      return 1.0;
  }
}

function pickEnclosureLabel(enclosure) {
  switch (enclosure) {
    case 'indoor':
      return 'Indoor hush';
    case 'umbrella':
      return 'Umbrella cover';
    case 'open':
    default:
      return 'Open air';
  }
}

function ensureWindStyles() {
  if (document.getElementById(WIND_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = WIND_STYLE_ID;
  style.textContent = `
    .expert-card.wind-expert {
      position: relative;
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.08);
      background:
        radial-gradient(circle at top right, rgba(124,58,237,0.12), transparent 34%),
        radial-gradient(circle at bottom left, rgba(37,99,235,0.10), transparent 28%),
        linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
      box-shadow: 0 18px 50px rgba(0,0,0,0.42);
      backdrop-filter: blur(22px);
      -webkit-backdrop-filter: blur(22px);
      padding: 16px 16px 14px;
      color: rgba(255,255,255,0.94);
    }

    .expert-card.wind-expert::before {
      content: "";
      position: absolute;
      inset: -1px;
      pointer-events: none;
      background:
        linear-gradient(135deg, rgba(255,255,255,0.10), transparent 22%, transparent 78%, rgba(255,255,255,0.04));
      opacity: 0.38;
      mix-blend-mode: screen;
    }

    .wind-top {
      position: relative;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .wind-kicker {
      font-size: 0.72rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.48);
      margin-bottom: 6px;
      font-weight: 700;
    }

    .wind-title {
      font-size: 1.08rem;
      line-height: 1.05;
      font-weight: 800;
      letter-spacing: -0.04em;
      margin: 0;
    }

    .wind-subtitle {
      margin-top: 6px;
      font-size: 0.9rem;
      line-height: 1.45;
      color: rgba(255,255,255,0.56);
    }

    .wind-chiprow {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 14px 0 14px;
    }

    .wind-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.07);
      font-size: 0.76rem;
      font-weight: 700;
      color: rgba(255,255,255,0.74);
    }

    .wind-metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin: 12px 0 14px;
    }

    .wind-metric {
      padding: 12px 12px;
      border-radius: 16px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
    }

    .wind-metric-label {
      display: block;
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.48);
      margin-bottom: 6px;
      font-weight: 700;
    }

    .wind-metric-value {
      display: block;
      font-size: 0.96rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: rgba(255,255,255,0.9);
    }

    .wind-controls {
      position: relative;
      display: grid;
      gap: 12px;
      margin-top: 12px;
    }

    .wind-control {
      display: grid;
      gap: 8px;
    }

    .wind-control-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .wind-control-label {
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.62);
    }

    .wind-control-value {
      font-size: 0.84rem;
      font-weight: 800;
      color: rgba(255,255,255,0.86);
      min-width: 42px;
      text-align: right;
    }

    .wind-slider {
      width: 100%;
      height: 7px;
      appearance: none;
      -webkit-appearance: none;
      border-radius: 999px;
      outline: none;
      background: linear-gradient(90deg, rgba(124,58,237,0.88), rgba(37,99,235,0.88));
    }

    .wind-slider::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(255,255,255,0.97);
      border: 2px solid rgba(255,255,255,0.18);
      box-shadow: 0 0 0 6px rgba(255,255,255,0.08), 0 10px 24px rgba(255,255,255,0.14);
      cursor: pointer;
    }

    .wind-slider::-moz-range-thumb {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(255,255,255,0.97);
      border: 2px solid rgba(255,255,255,0.18);
      cursor: pointer;
    }

    .wind-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    .wind-status {
      font-size: 0.82rem;
      font-weight: 700;
      color: rgba(255,255,255,0.62);
    }

    .remove-btn {
      appearance: none;
      -webkit-appearance: none;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.88);
      font-size: 0.9rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      padding: 10px 14px;
      border-radius: 14px;
      cursor: pointer;
      transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;
    }

    .remove-btn:active {
      transform: scale(0.98);
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.14);
    }

    @media (max-width: 480px) {
      .wind-metrics {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

export default class WindExpert {
  constructor(audioCtx, masterBus) {
    if (!audioCtx) {
      throw new Error('WindExpert requires a valid AudioContext.');
    }
    if (!masterBus) {
      throw new Error('WindExpert requires a valid master bus GainNode.');
    }

    ensureWindStyles();

    this.audioCtx = audioCtx;
    this.masterBus = masterBus;

    this.id =
      (window.crypto?.randomUUID?.() ||
        `wind-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    this.type = 'wind';

    // Softer defaults — designed to feel like a gentle night breeze.
    this.state = {
      intensity: 0.38,
      gust: 0.12,
      texture: 0.56,
      width: 0.58,
    };

    this.world = {
      enclosure: 'open',
      atmosphericPressure: 0.5,
    };

    this.destroyed = false;
    this.gustTimer = null;
    this.card = null;
    this.controls = {};
    this.readouts = {};

    this._buildGraph();
    this._applyStateToAudio(true);
    this._startSchedulers();
  }

  _createSmoothNoiseBuffer(durationSeconds = 6.0) {
    const sr = this.audioCtx.sampleRate;
    const frames = Math.max(1, Math.floor(durationSeconds * sr));
    const buffer = this.audioCtx.createBuffer(1, frames, sr);
    const data = buffer.getChannelData(0);

    // Smoothed random source: closer to pink-ish air than harsh white noise.
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;

    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1;

      a = a * 0.998 + white * 0.002;
      b = b * 0.995 + a * 0.005;
      c = c * 0.990 + b * 0.010;
      d = d * 0.985 + c * 0.015;

      data[i] = clamp(d * 1.6, -1, 1);
    }

    // Soft edge shaping helps avoid obvious loop seams.
    const fade = Math.min(Math.floor(sr * 0.25), Math.floor(frames / 4));
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      const wIn = Math.sin((t * Math.PI) / 2);
      const wOut = Math.cos((t * Math.PI) / 2);

      const start = data[i];
      const end = data[frames - fade + i];
      const mixed = start * wOut + end * wIn;

      data[i] = mixed;
      data[frames - fade + i] = mixed;
    }

    return buffer;
  }

  _makeLoopingNoiseSource({ duration = 6.0, playbackRate = 1.0 }) {
    const source = this.audioCtx.createBufferSource();
    source.buffer = this._createSmoothNoiseBuffer(duration);
    source.loop = true;
    source.playbackRate.value = playbackRate;
    return source;
  }

  _safeStart(node) {
    try {
      node.start();
    } catch (_) {
      // ignore double-start or state timing issues
    }
  }

  _buildGraph() {
    const ctx = this.audioCtx;

    this.outputGain = ctx.createGain();
    this.outputGain.gain.value = 0.68;

    this.stereoPanner = ctx.createStereoPanner();
    this.stereoPanner.pan.value = 0;

    // Main bed: the soft, continuous air layer.
    this.bedA = this._makeLoopingNoiseSource({
      duration: 7.5,
      playbackRate: randomRange(0.9, 1.04),
    });

    this.bedB = this._makeLoopingNoiseSource({
      duration: 8.25,
      playbackRate: randomRange(0.84, 0.98),
    });

    this.bedAHP = ctx.createBiquadFilter();
    this.bedAHP.type = 'highpass';
    this.bedAHP.frequency.value = 24;
    this.bedAHP.Q.value = 0.7;

    this.bedALP = ctx.createBiquadFilter();
    this.bedALP.type = 'lowpass';
    this.bedALP.frequency.value = 3200;
    this.bedALP.Q.value = 0.7;

    this.bedBHP = ctx.createBiquadFilter();
    this.bedBHP.type = 'highpass';
    this.bedBHP.frequency.value = 20;
    this.bedBHP.Q.value = 0.7;

    this.bedBLP = ctx.createBiquadFilter();
    this.bedBLP.type = 'lowpass';
    this.bedBLP.frequency.value = 2600;
    this.bedBLP.Q.value = 0.68;

    this.bedAGain = ctx.createGain();
    this.bedAGain.gain.value = 0.02;

    this.bedBGain = ctx.createGain();
    this.bedBGain.gain.value = 0.02;

    // Fine air shimmer — very subtle, to avoid dead-flat sound.
    this.mist = this._makeLoopingNoiseSource({
      duration: 5.25,
      playbackRate: randomRange(0.8, 1.0),
    });

    this.mistHP = ctx.createBiquadFilter();
    this.mistHP.type = 'highpass';
    this.mistHP.frequency.value = 280;
    this.mistHP.Q.value = 0.8;

    this.mistLP = ctx.createBiquadFilter();
    this.mistLP.type = 'lowpass';
    this.mistLP.frequency.value = 7800;
    this.mistLP.Q.value = 0.65;

    this.mistGain = ctx.createGain();
    this.mistGain.gain.value = 0.006;

    // Gentle swells instead of harsh gusts.
    this.swell = this._makeLoopingNoiseSource({
      duration: 4.75,
      playbackRate: randomRange(0.78, 0.96),
    });

    this.swellHP = ctx.createBiquadFilter();
    this.swellHP.type = 'highpass';
    this.swellHP.frequency.value = 90;
    this.swellHP.Q.value = 0.82;

    this.swellBP = ctx.createBiquadFilter();
    this.swellBP.type = 'bandpass';
    this.swellBP.frequency.value = 640;
    this.swellBP.Q.value = 0.9;

    this.swellLP = ctx.createBiquadFilter();
    this.swellLP.type = 'lowpass';
    this.swellLP.frequency.value = 2800;
    this.swellLP.Q.value = 0.7;

    this.swellGain = ctx.createGain();
    this.swellGain.gain.value = 0.0001;

    // Very slow motion.
    this.panLfo = ctx.createOscillator();
    this.panLfo.type = 'sine';
    this.panLfo.frequency.value = randomRange(0.012, 0.028);

    this.panLfoDepth = ctx.createGain();
    this.panLfoDepth.gain.value = 0.0;

    this.cutoffLfo = ctx.createOscillator();
    this.cutoffLfo.type = 'sine';
    this.cutoffLfo.frequency.value = randomRange(0.01, 0.022);

    this.cutoffDepth = ctx.createGain();
    this.cutoffDepth.gain.value = 0.0;

    this.swellMotionLfo = ctx.createOscillator();
    this.swellMotionLfo.type = 'sine';
    this.swellMotionLfo.frequency.value = randomRange(0.06, 0.11);

    this.swellMotionDepth = ctx.createGain();
    this.swellMotionDepth.gain.value = 0.0;

    // Wiring
    this.bedA.connect(this.bedAHP);
    this.bedAHP.connect(this.bedALP);
    this.bedALP.connect(this.bedAGain);

    this.bedB.connect(this.bedBHP);
    this.bedBHP.connect(this.bedBLP);
    this.bedBLP.connect(this.bedBGain);

    this.mist.connect(this.mistHP);
    this.mistHP.connect(this.mistLP);
    this.mistLP.connect(this.mistGain);

    this.swell.connect(this.swellHP);
    this.swellHP.connect(this.swellBP);
    this.swellBP.connect(this.swellLP);
    this.swellLP.connect(this.swellGain);

    this.bedAGain.connect(this.stereoPanner);
    this.bedBGain.connect(this.stereoPanner);
    this.mistGain.connect(this.stereoPanner);
    this.swellGain.connect(this.stereoPanner);

    this.stereoPanner.connect(this.outputGain);
    this.outputGain.connect(this.masterBus);

    // LFOs
    this.panLfo.connect(this.panLfoDepth);
    this.panLfoDepth.connect(this.stereoPanner.pan);

    this.cutoffLfo.connect(this.cutoffDepth);
    this.cutoffDepth.connect(this.bedALP.frequency);
    this.cutoffDepth.connect(this.bedBLP.frequency);
    this.cutoffDepth.connect(this.mistLP.frequency);

    this.swellMotionLfo.connect(this.swellMotionDepth);
    this.swellMotionDepth.connect(this.swellGain.gain);

    this._safeStart(this.bedA);
    this._safeStart(this.bedB);
    this._safeStart(this.mist);
    this._safeStart(this.swell);
    this._safeStart(this.panLfo);
    this._safeStart(this.cutoffLfo);
    this._safeStart(this.swellMotionLfo);
  }

  _computeWindEnergy() {
    const enclosureFactor = pickEnclosureFactor(this.world.enclosure);
    const pressureFactor = clamp(1.08 + (0.5 - this.world.atmosphericPressure) * 0.65, 0.72, 1.28);

    const base =
      (this.state.intensity * 0.62) +
      (this.state.texture * 0.18) +
      (this.state.gust * 0.08);

    return clamp01(base * enclosureFactor * pressureFactor);
  }

  _computeSwellEnergy() {
    const enclosureFactor = pickEnclosureFactor(this.world.enclosure);
    const pressureFactor = clamp(1.05 + (0.5 - this.world.atmosphericPressure) * 0.85, 0.68, 1.35);

    const base =
      (this.state.gust * 0.55) +
      (this.state.texture * 0.10) +
      (this.state.intensity * 0.12);

    return clamp01(base * enclosureFactor * pressureFactor);
  }

  _applyStateToAudio(immediate = false) {
    if (!this.audioCtx || this.destroyed) return;

    const now = this.audioCtx.currentTime;
    const t = immediate ? 0.001 : 1.8;

    const windEnergy = this._computeWindEnergy();
    const swellEnergy = this._computeSwellEnergy();
    const openness = pickEnclosureFactor(this.world.enclosure);

    // Keep it soft and sleep-friendly.
    const bedGainATarget = 0.012 + windEnergy * 0.11;
    const bedGainBTarget = 0.010 + windEnergy * 0.085;
    const mistGainTarget = 0.003 + this.state.texture * 0.014;
    const swellGainTarget = 0.0001 + swellEnergy * 0.018;

    const bedALpTarget = 2400 + windEnergy * 2600;
    const bedBLpTarget = 2000 + windEnergy * 2200;
    const mistLpTarget = 5200 + this.state.texture * 2200;
    const swellBpTarget = 320 + this.state.texture * 540;
    const swellLpTarget = 1800 + windEnergy * 1600;

    const bedHpTarget = 20 + (1 - openness) * 12;
    const mistHpTarget = 220 + this.state.texture * 220;
    const swellHpTarget = 70 + this.state.texture * 50;

    const panDepthTarget = 0.02 + this.state.width * 0.12;
    const pannerBias = (this.state.width - 0.5) * 0.16 * openness;

    const cutoffDepthTarget = 70 + this.state.texture * 180;
    const swellMotionDepthTarget = 0.0 + this.state.gust * 0.018;

    const outputTarget = 0.58 + windEnergy * 0.10;

    const smooth = (param, value) => {
      if (!param) return;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, t);
    };

    smooth(this.outputGain.gain, outputTarget);
    smooth(this.bedAGain.gain, bedGainATarget);
    smooth(this.bedBGain.gain, bedGainBTarget);
    smooth(this.mistGain.gain, mistGainTarget);
    smooth(this.swellGain.gain, swellGainTarget);

    smooth(this.bedAHP.frequency, bedHpTarget);
    smooth(this.bedBHP.frequency, bedHpTarget);
    smooth(this.bedALP.frequency, bedALpTarget);
    smooth(this.bedBLP.frequency, bedBLpTarget);
    smooth(this.mistHP.frequency, mistHpTarget);
    smooth(this.mistLP.frequency, mistLpTarget);
    smooth(this.swellHP.frequency, swellHpTarget);
    smooth(this.swellBP.frequency, swellBpTarget);
    smooth(this.swellLP.frequency, swellLpTarget);

    smooth(this.panLfo.frequency, 0.012 + this.state.intensity * 0.022);
    smooth(this.panLfoDepth.gain, panDepthTarget);
    smooth(this.stereoPanner.pan, pannerBias);

    smooth(this.cutoffLfo.frequency, 0.01 + this.state.texture * 0.012);
    smooth(this.cutoffDepth.gain, cutoffDepthTarget);

    smooth(this.swellMotionLfo.frequency, 0.05 + this.state.gust * 0.06);
    smooth(this.swellMotionDepth.gain, swellMotionDepthTarget);

    this._updateCardReadouts();
    this._scheduleNextSwell();
  }

  _startSchedulers() {
    this._clearSchedulers();
    this._scheduleNextSwell();
  }

  _clearSchedulers() {
    if (this.gustTimer) {
      clearTimeout(this.gustTimer);
      this.gustTimer = null;
    }
  }

  _scheduleNextSwell() {
    if (this.destroyed) return;

    this._clearSchedulers();

    const enclosureFactor = pickEnclosureFactor(this.world.enclosure);
    const windEnergy = this._computeWindEnergy();
    const swellEnergy = this._computeSwellEnergy();

    // Long gaps. Soft swells. No breathing-pump feel.
    const baseDelay =
      lerp(24000, 9000, clamp01((windEnergy + swellEnergy) * 0.5)) *
      (0.72 + (1 - enclosureFactor) * 0.45);

    const jitter = randomRange(-0.22, 0.32) * baseDelay;
    const delay = clamp(baseDelay + jitter, 8000, 38000);

    this.gustTimer = window.setTimeout(() => {
      if (this.destroyed) return;
      this._fireSoftSwell();
      this._scheduleNextSwell();
    }, delay);
  }

  _fireSoftSwell() {
    if (this.destroyed || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const swellEnergy = this._computeSwellEnergy();
    const openness = pickEnclosureFactor(this.world.enclosure);

    // Very soft, long, sleepy swell.
    const peak = 0.003 + swellEnergy * 0.02;
    const mid = 0.001 + swellEnergy * 0.009;
    const tail = 0.00008 + swellEnergy * 0.0016;

    const drift = (Math.random() * 2 - 1) * (0.03 + this.state.width * 0.06) * openness;

    this.swellGain.gain.cancelScheduledValues(now);
    this.swellGain.gain.setValueAtTime(Math.max(this.swellGain.gain.value, 0.00008), now);
    this.swellGain.gain.linearRampToValueAtTime(peak, now + 1.4);
    this.swellGain.gain.linearRampToValueAtTime(mid, now + 5.0);
    this.swellGain.gain.linearRampToValueAtTime(tail, now + 9.5);

    this.stereoPanner.pan.cancelScheduledValues(now);
    this.stereoPanner.pan.setValueAtTime(this.stereoPanner.pan.value, now);
    this.stereoPanner.pan.linearRampToValueAtTime(
      clamp(this.stereoPanner.pan.value + drift, -0.35, 0.35),
      now + 1.2
    );
    this.stereoPanner.pan.linearRampToValueAtTime(
      this.stereoPanner.pan.value * 0.35,
      now + 8.0
    );
  }

  _setControlBackground(input, value) {
    const pct = Math.round(clamp01(value) * 100);
    input.style.background = `linear-gradient(
      90deg,
      rgba(124,58,237,0.92) 0%,
      rgba(37,99,235,0.92) ${pct}%,
      rgba(255,255,255,0.10) ${pct}%,
      rgba(255,255,255,0.10) 100%
    )`;
  }

  _updateCardReadouts() {
    if (!this.readouts) return;

    if (this.readouts.intensity) {
      this.readouts.intensity.textContent = this.state.intensity.toFixed(2);
    }
    if (this.readouts.gust) {
      this.readouts.gust.textContent = this.state.gust.toFixed(2);
    }
    if (this.readouts.texture) {
      this.readouts.texture.textContent = this.state.texture.toFixed(2);
    }
    if (this.readouts.width) {
      this.readouts.width.textContent = this.state.width.toFixed(2);
    }
    if (this.readouts.state) {
      this.readouts.state.textContent = pickEnclosureLabel(this.world.enclosure);
    }
    if (this.readouts.pressure) {
      this.readouts.pressure.textContent = this.world.atmosphericPressure.toFixed(2);
    }
    if (this.readouts.energy) {
      const e = this._computeWindEnergy();
      this.readouts.energy.textContent = `${Math.round(e * 100)}%`;
    }
    if (this.readouts.status) {
      this.readouts.status.textContent = 'Soft continuous breeze';
    }

    if (this.controls.intensity) this._setControlBackground(this.controls.intensity, this.state.intensity);
    if (this.controls.gust) this._setControlBackground(this.controls.gust, this.state.gust);
    if (this.controls.texture) this._setControlBackground(this.controls.texture, this.state.texture);
    if (this.controls.width) this._setControlBackground(this.controls.width, this.state.width);
  }

  getUICard() {
    return `
      <article class="expert-card wind-expert" data-id="${this.id}">
        <div class="wind-top">
          <div>
            <div class="wind-kicker">Atmosphere · Wind</div>
            <h3 class="wind-title">Wind Expert</h3>
            <p class="wind-subtitle">
              A gentle air engine tuned for sleep-like, natural movement with long, soft motion.
            </p>
          </div>

          <button class="remove-btn" type="button" aria-label="Remove wind expert">
            Remove
          </button>
        </div>

        <div class="wind-chiprow">
          <span class="wind-chip">Continuous Bed</span>
          <span class="wind-chip">Soft Swells</span>
          <span class="wind-chip">Slow Drift</span>
          <span class="wind-chip">World-Aware</span>
        </div>

        <div class="wind-metrics">
          <div class="wind-metric">
            <span class="wind-metric-label">State</span>
            <span class="wind-metric-value" data-value="state">Open air</span>
          </div>

          <div class="wind-metric">
            <span class="wind-metric-label">Pressure</span>
            <span class="wind-metric-value" data-value="pressure">0.50</span>
          </div>

          <div class="wind-metric">
            <span class="wind-metric-label">Energy</span>
            <span class="wind-metric-value" data-value="energy">0%</span>
          </div>

          <div class="wind-metric">
            <span class="wind-metric-label">Mode</span>
            <span class="wind-metric-value">Gentle</span>
          </div>
        </div>

        <div class="wind-controls">
          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-intensity">Intensity</label>
              <span class="wind-control-value" data-value="intensity">0.38</span>
            </div>
            <input
              id="${this.id}-intensity"
              class="wind-slider"
              data-control="intensity"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.38"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-gust">Swell</label>
              <span class="wind-control-value" data-value="gust">0.12</span>
            </div>
            <input
              id="${this.id}-gust"
              class="wind-slider"
              data-control="gust"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.12"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-texture">Texture</label>
              <span class="wind-control-value" data-value="texture">0.56</span>
            </div>
            <input
              id="${this.id}-texture"
              class="wind-slider"
              data-control="texture"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.56"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-width">Width</label>
              <span class="wind-control-value" data-value="width">0.58</span>
            </div>
            <input
              id="${this.id}-width"
              class="wind-slider"
              data-control="width"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.58"
            />
          </div>
        </div>

        <div class="wind-footer">
          <div class="wind-status" data-value="status">
            Soft continuous breeze
          </div>
        </div>
      </article>
    `;
  }

  bindCardControls(card) {
    if (!card) {
      throw new Error('WindExpert.bindCardControls requires a card element.');
    }

    this.card = card;

    this.controls.intensity = card.querySelector('[data-control="intensity"]');
    this.controls.gust = card.querySelector('[data-control="gust"]');
    this.controls.texture = card.querySelector('[data-control="texture"]');
    this.controls.width = card.querySelector('[data-control="width"]');

    this.readouts.intensity = card.querySelector('[data-value="intensity"]');
    this.readouts.gust = card.querySelector('[data-value="gust"]');
    this.readouts.texture = card.querySelector('[data-value="texture"]');
    this.readouts.width = card.querySelector('[data-value="width"]');
    this.readouts.state = card.querySelector('[data-value="state"]');
    this.readouts.pressure = card.querySelector('[data-value="pressure"]');
    this.readouts.energy = card.querySelector('[data-value="energy"]');
    this.readouts.status = card.querySelector('[data-value="status"]');

    const onInput = (key) => (e) => {
      const value = clamp01(parseFloat(e.target.value));
      this.state[key] = value;
      this._applyStateToAudio(false);
    };

    if (this.controls.intensity) {
      this.controls.intensity.addEventListener('input', onInput('intensity'));
    }
    if (this.controls.gust) {
      this.controls.gust.addEventListener('input', onInput('gust'));
    }
    if (this.controls.texture) {
      this.controls.texture.addEventListener('input', onInput('texture'));
    }
    if (this.controls.width) {
      this.controls.width.addEventListener('input', onInput('width'));
    }

    this._updateCardReadouts();
  }

  onWorldStateUpdate(worldState = {}) {
    if (this.destroyed) return;

    this.world = {
      enclosure: worldState.enclosure ?? 'open',
      atmosphericPressure:
        typeof worldState.atmosphericPressure === 'number'
          ? clamp01(worldState.atmosphericPressure)
          : 0.5,
    };

    this._applyStateToAudio(false);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this._clearSchedulers();

    const now = this.audioCtx?.currentTime ?? 0;

    const fadeOutNode = (node, release = 0.06) => {
      if (!node) return;

      try {
        if (node.gain?.cancelScheduledValues) {
          node.gain.cancelScheduledValues(now);
          node.gain.setTargetAtTime(0.00001, now, release);
        }
      } catch (_) {
        // ignore
      }

      try {
        if (typeof node.stop === 'function') {
          node.stop(now + 0.05);
        }
      } catch (_) {
        // ignore
      }

      try {
        node.disconnect?.();
      } catch (_) {
        // ignore
      }
    };

    fadeOutNode(this.bedA);
    fadeOutNode(this.bedB);
    fadeOutNode(this.mist);
    fadeOutNode(this.swell);
    fadeOutNode(this.panLfo);
    fadeOutNode(this.cutoffLfo);
    fadeOutNode(this.swellMotionLfo);

    try {
      this.bedAHP?.disconnect();
      this.bedALP?.disconnect();
      this.bedAGain?.disconnect();

      this.bedBHP?.disconnect();
      this.bedBLP?.disconnect();
      this.bedBGain?.disconnect();

      this.mistHP?.disconnect();
      this.mistLP?.disconnect();
      this.mistGain?.disconnect();

      this.swellHP?.disconnect();
      this.swellBP?.disconnect();
      this.swellLP?.disconnect();
      this.swellGain?.disconnect();

      this.stereoPanner?.disconnect();
      this.outputGain?.disconnect();

      this.panLfoDepth?.disconnect();
      this.cutoffDepth?.disconnect();
      this.swellMotionDepth?.disconnect();
    } catch (_) {
      // ignore cleanup issues
    }

    this.card = null;
    this.controls = {};
    this.readouts = {};
  }
}
