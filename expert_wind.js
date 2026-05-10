const WIND_STYLE_ID = 'wind-expert-style-v3';

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
      return 0.14;
    case 'umbrella':
      return 0.5;
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

function makeUUID() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `wind-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default class WindExpert {
  constructor(audioCtx, masterBus) {
    if (!audioCtx) throw new Error('WindExpert requires a valid AudioContext.');
    if (!masterBus) throw new Error('WindExpert requires a valid master bus GainNode.');

    ensureWindStyles();

    this.audioCtx = audioCtx;
    this.masterBus = masterBus;
    this.id = makeUUID();
    this.type = 'wind';
    this.destroyed = false;
    this.card = null;
    this.controls = {};
    this.readouts = {};
    this.motionTimer = null;
    this.swellTimer = null;

    this.state = {
      intensity: 0.42,
      gust: 0.08,
      texture: 0.58,
      width: 0.62,
    };

    this.world = {
      enclosure: 'open',
      atmosphericPressure: 0.5,
    };

    this._buildGraph();
    this._applyStateToAudio(true);
    this._startAutomation();
  }

  _noiseBuffer(durationSeconds, smoothness = 0.996) {
    const sr = this.audioCtx.sampleRate;
    const frames = Math.max(1, Math.floor(durationSeconds * sr));
    const buffer = this.audioCtx.createBuffer(1, frames, sr);
    const ch = buffer.getChannelData(0);

    let a = 0;
    let b = 0;
    let c = 0;

    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1;
      a = a * smoothness + white * (1 - smoothness);
      b = b * 0.985 + a * 0.015;
      c = c * 0.992 + b * 0.008;
      ch[i] = clamp(c * 1.9, -1, 1);
    }

    return buffer;
  }

  _loopNoise({ duration = 8, playbackRate = 1 }) {
    const src = this.audioCtx.createBufferSource();
    src.buffer = this._noiseBuffer(duration);
    src.loop = true;
    src.playbackRate.value = playbackRate;
    return src;
  }

  _safeStart(node) {
    try {
      node.start();
    } catch (_) {}
  }

  _buildGraph() {
    const ctx = this.audioCtx;

    this.outputGain = ctx.createGain();
    this.outputGain.gain.value = 0.72;

    this.stereo = ctx.createStereoPanner();
    this.stereo.pan.value = 0;

    this.bed1 = this._loopNoise({ duration: 9.5, playbackRate: randomRange(0.88, 1.04) });
    this.bed2 = this._loopNoise({ duration: 11.25, playbackRate: randomRange(0.82, 0.98) });

    this.bed1HP = ctx.createBiquadFilter();
    this.bed1HP.type = 'highpass';
    this.bed1HP.frequency.value = 28;
    this.bed1HP.Q.value = 0.72;

    this.bed1LP = ctx.createBiquadFilter();
    this.bed1LP.type = 'lowpass';
    this.bed1LP.frequency.value = 3600;
    this.bed1LP.Q.value = 0.68;

    this.bed2HP = ctx.createBiquadFilter();
    this.bed2HP.type = 'highpass';
    this.bed2HP.frequency.value = 22;
    this.bed2HP.Q.value = 0.72;

    this.bed2LP = ctx.createBiquadFilter();
    this.bed2LP.type = 'lowpass';
    this.bed2LP.frequency.value = 3000;
    this.bed2LP.Q.value = 0.68;

    this.bed1Gain = ctx.createGain();
    this.bed1Gain.gain.value = 0.025;

    this.bed2Gain = ctx.createGain();
    this.bed2Gain.gain.value = 0.021;

    this.hiss = this._loopNoise({ duration: 6.5, playbackRate: randomRange(0.9, 1.08) });
    this.hissHP = ctx.createBiquadFilter();
    this.hissHP.type = 'highpass';
    this.hissHP.frequency.value = 420;
    this.hissHP.Q.value = 0.8;
    this.hissLP = ctx.createBiquadFilter();
    this.hissLP.type = 'lowpass';
    this.hissLP.frequency.value = 8200;
    this.hissLP.Q.value = 0.65;
    this.hissGain = ctx.createGain();
    this.hissGain.gain.value = 0.006;

    this.swell = this._loopNoise({ duration: 7.75, playbackRate: randomRange(0.78, 0.94) });
    this.swellHP = ctx.createBiquadFilter();
    this.swellHP.type = 'highpass';
    this.swellHP.frequency.value = 90;
    this.swellHP.Q.value = 0.82;
    this.swellBP = ctx.createBiquadFilter();
    this.swellBP.type = 'bandpass';
    this.swellBP.frequency.value = 560;
    this.swellBP.Q.value = 0.9;
    this.swellLP = ctx.createBiquadFilter();
    this.swellLP.type = 'lowpass';
    this.swellLP.frequency.value = 2400;
    this.swellLP.Q.value = 0.7;
    this.swellGain = ctx.createGain();
    this.swellGain.gain.value = 0.0001;

    this.panLfo = ctx.createOscillator();
    this.panLfo.type = 'sine';
    this.panLfo.frequency.value = randomRange(0.008, 0.02);
    this.panDepth = ctx.createGain();
    this.panDepth.gain.value = 0;

    this.cutoffLfo = ctx.createOscillator();
    this.cutoffLfo.type = 'sine';
    this.cutoffLfo.frequency.value = randomRange(0.007, 0.015);
    this.cutoffDepth = ctx.createGain();
    this.cutoffDepth.gain.value = 0;

    this.swellLfo = ctx.createOscillator();
    this.swellLfo.type = 'sine';
    this.swellLfo.frequency.value = randomRange(0.03, 0.06);
    this.swellDepth = ctx.createGain();
    this.swellDepth.gain.value = 0;

    this.bed1.connect(this.bed1HP);
    this.bed1HP.connect(this.bed1LP);
    this.bed1LP.connect(this.bed1Gain);

    this.bed2.connect(this.bed2HP);
    this.bed2HP.connect(this.bed2LP);
    this.bed2LP.connect(this.bed2Gain);

    this.hiss.connect(this.hissHP);
    this.hissHP.connect(this.hissLP);
    this.hissLP.connect(this.hissGain);

    this.swell.connect(this.swellHP);
    this.swellHP.connect(this.swellBP);
    this.swellBP.connect(this.swellLP);
    this.swellLP.connect(this.swellGain);

    this.bed1Gain.connect(this.stereo);
    this.bed2Gain.connect(this.stereo);
    this.hissGain.connect(this.stereo);
    this.swellGain.connect(this.stereo);

    this.stereo.connect(this.outputGain);
    this.outputGain.connect(this.masterBus);

    this.panLfo.connect(this.panDepth);
    this.panDepth.connect(this.stereo.pan);

    this.cutoffLfo.connect(this.cutoffDepth);
    this.cutoffDepth.connect(this.bed1LP.frequency);
    this.cutoffDepth.connect(this.bed2LP.frequency);
    this.cutoffDepth.connect(this.hissLP.frequency);

    this.swellLfo.connect(this.swellDepth);
    this.swellDepth.connect(this.swellGain.gain);

    this._safeStart(this.bed1);
    this._safeStart(this.bed2);
    this._safeStart(this.hiss);
    this._safeStart(this.swell);
    this._safeStart(this.panLfo);
    this._safeStart(this.cutoffLfo);
    this._safeStart(this.swellLfo);
  }

  _energy() {
    const enclosure = pickEnclosureFactor(this.world.enclosure);
    const pressure = clamp(1.05 + (0.5 - this.world.atmosphericPressure) * 0.8, 0.72, 1.32);
    const base = (this.state.intensity * 0.58) + (this.state.texture * 0.24) + (this.state.gust * 0.08);
    return clamp01(base * enclosure * pressure);
  }

  _swellEnergy() {
    const enclosure = pickEnclosureFactor(this.world.enclosure);
    const pressure = clamp(1.08 + (0.5 - this.world.atmosphericPressure) * 1.0, 0.7, 1.42);
    const base = (this.state.gust * 0.55) + (this.state.intensity * 0.18) + (this.state.texture * 0.08);
    return clamp01(base * enclosure * pressure);
  }

  _applyStateToAudio(immediate = false) {
    if (!this.audioCtx || this.destroyed) return;

    const now = this.audioCtx.currentTime;
    const tc = immediate ? 0.001 : 1.5;
    const energy = this._energy();
    const swellEnergy = this._swellEnergy();
    const openness = pickEnclosureFactor(this.world.enclosure);

    const targetBed1 = 0.018 + energy * 0.12;
    const targetBed2 = 0.014 + energy * 0.09;
    const targetHiss = 0.003 + this.state.texture * 0.012 + energy * 0.006;
    const targetSwell = 0.00015 + swellEnergy * 0.018;
    const targetOut = 0.7 + energy * 0.12;

    const b1hp = 24 + (1 - openness) * 12;
    const b2hp = 18 + (1 - openness) * 10;
    const b1lp = 2800 + energy * 3200;
    const b2lp = 2200 + energy * 2600;
    const hisshp = 260 + this.state.texture * 220;
    const hisslp = 7200 + this.state.texture * 1200;
    const swelleq = 420 + this.state.texture * 520;
    const swelllp = 1800 + energy * 1300;

    const panDepth = 0.02 + this.state.width * 0.13;
    const panBias = (this.state.width - 0.5) * 0.14 * openness;
    const cutoffDepth = 70 + this.state.texture * 170;
    const swellDepth = 0.002 + this.state.gust * 0.02;

    const smooth = (param, value) => {
      if (!param) return;
      if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
      if (typeof param.setTargetAtTime === 'function') param.setTargetAtTime(value, now, tc);
      else param.value = value;
    };

    smooth(this.outputGain.gain, targetOut);
    smooth(this.bed1Gain.gain, targetBed1);
    smooth(this.bed2Gain.gain, targetBed2);
    smooth(this.hissGain.gain, targetHiss);
    smooth(this.swellGain.gain, targetSwell);

    smooth(this.bed1HP.frequency, b1hp);
    smooth(this.bed2HP.frequency, b2hp);
    smooth(this.bed1LP.frequency, b1lp);
    smooth(this.bed2LP.frequency, b2lp);
    smooth(this.hissHP.frequency, hisshp);
    smooth(this.hissLP.frequency, hisslp);
    smooth(this.swellHP.frequency, 70 + this.state.texture * 50);
    smooth(this.swellBP.frequency, swelleq);
    smooth(this.swellLP.frequency, swelllp);

    smooth(this.panLfo.frequency, 0.008 + this.state.intensity * 0.02);
    smooth(this.panDepth.gain, panDepth);
    smooth(this.stereo.pan, panBias);

    smooth(this.cutoffLfo.frequency, 0.007 + this.state.texture * 0.01);
    smooth(this.cutoffDepth.gain, cutoffDepth);

    smooth(this.swellLfo.frequency, 0.03 + this.state.gust * 0.045);
    smooth(this.swellDepth.gain, swellDepth);

    this._updateCard();
    this._scheduleMotionCurves();
    this._scheduleSwellPulse();
  }

  _startAutomation() {
    this._scheduleMotionCurves();
    this._scheduleSwellPulse();
  }

  _scheduleMotionCurves() {
    if (this.destroyed) return;
    if (this.motionTimer) {
      clearTimeout(this.motionTimer);
      this.motionTimer = null;
    }

    const now = this.audioCtx.currentTime;
    const duration = randomRange(8, 16);
    const steps = 24;
    const panCurve = new Float32Array(steps);
    const cutoffCurve = new Float32Array(steps);

    const energy = this._energy();
    const openness = pickEnclosureFactor(this.world.enclosure);
    const panSpan = 0.01 + this.state.width * 0.08 * openness;
    const basePan = (this.state.width - 0.5) * 0.12 * openness;
    const baseCutoff = 80 + this.state.texture * 140;

    for (let i = 0; i < steps; i++) {
      const x = i / (steps - 1);
      const noise1 = Math.sin((x * Math.PI * 2) + Math.random() * 0.8) * panSpan * 0.55;
      const noise2 = Math.cos((x * Math.PI * 1.5) + Math.random() * 0.6) * panSpan * 0.45;
      panCurve[i] = clamp(basePan + noise1 + noise2, -0.28, 0.28);

      const wobble = Math.sin(x * Math.PI * 4) * (40 + energy * 50) + Math.cos(x * Math.PI * 3) * (24 + this.state.texture * 22);
      cutoffCurve[i] = clamp(baseCutoff + wobble, 20, 2200);
    }

    try {
      if (this.stereo?.pan?.cancelScheduledValues) this.stereo.pan.cancelScheduledValues(now);
      if (this.cutoffDepth?.gain?.cancelScheduledValues) this.cutoffDepth.gain.cancelScheduledValues(now);

      if (this.stereo?.pan?.setValueCurveAtTime) {
        this.stereo.pan.setValueCurveAtTime(panCurve, now, duration);
      }
      if (this.cutoffDepth?.gain?.setValueCurveAtTime) {
        this.cutoffDepth.gain.setValueCurveAtTime(cutoffCurve, now, duration);
      }
    } catch (_) {
      // ignore curve scheduling issues
    }

    this.motionTimer = window.setTimeout(() => {
      if (this.destroyed) return;
      this._scheduleMotionCurves();
    }, duration * 1000 * 0.92);
  }

  _scheduleSwellPulse() {
    if (this.destroyed) return;
    if (this.swellTimer) {
      clearTimeout(this.swellTimer);
      this.swellTimer = null;
    }

    const enclosure = pickEnclosureFactor(this.world.enclosure);
    const energy = this._energy();
    const swellEnergy = this._swellEnergy();

    const baseDelay = lerp(26000, 12000, clamp01((energy + swellEnergy) * 0.5)) * (0.7 + (1 - enclosure) * 0.45);
    const delay = clamp(baseDelay + randomRange(-0.2, 0.35) * baseDelay, 12000, 42000);

    this.swellTimer = window.setTimeout(() => {
      if (this.destroyed) return;
      this._fireSoftSwell();
      this._scheduleSwellPulse();
    }, delay);
  }

  _fireSoftSwell() {
    if (this.destroyed || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const swellEnergy = this._swellEnergy();
    const openness = pickEnclosureFactor(this.world.enclosure);
    const drift = (Math.random() * 2 - 1) * (0.02 + this.state.width * 0.04) * openness;

    const peak = 0.0025 + swellEnergy * 0.016;
    const mid = 0.001 + swellEnergy * 0.007;
    const tail = 0.00008 + swellEnergy * 0.0012;

    try {
      this.swellGain.gain.cancelScheduledValues(now);
      this.swellGain.gain.setValueAtTime(Math.max(this.swellGain.gain.value, 0.00008), now);
      this.swellGain.gain.linearRampToValueAtTime(peak, now + 1.8);
      this.swellGain.gain.linearRampToValueAtTime(mid, now + 6.0);
      this.swellGain.gain.linearRampToValueAtTime(tail, now + 11.0);

      this.stereo.pan.cancelScheduledValues(now);
      this.stereo.pan.setValueAtTime(this.stereo.pan.value, now);
      this.stereo.pan.linearRampToValueAtTime(clamp(this.stereo.pan.value + drift, -0.25, 0.25), now + 1.0);
      this.stereo.pan.linearRampToValueAtTime(this.stereo.pan.value * 0.4, now + 10.0);
    } catch (_) {
      // ignore automation issues
    }
  }

  _setRangeFill(input, value) {
    const pct = Math.round(clamp01(value) * 100);
    input.style.background = `linear-gradient(
      90deg,
      rgba(124,58,237,0.92) 0%,
      rgba(37,99,235,0.92) ${pct}%,
      rgba(255,255,255,0.10) ${pct}%,
      rgba(255,255,255,0.10) 100%
    )`;
  }

  _updateCard() {
    if (!this.readouts) return;

    if (this.readouts.intensity) this.readouts.intensity.textContent = this.state.intensity.toFixed(2);
    if (this.readouts.gust) this.readouts.gust.textContent = this.state.gust.toFixed(2);
    if (this.readouts.texture) this.readouts.texture.textContent = this.state.texture.toFixed(2);
    if (this.readouts.width) this.readouts.width.textContent = this.state.width.toFixed(2);
    if (this.readouts.state) this.readouts.state.textContent = pickEnclosureLabel(this.world.enclosure);
    if (this.readouts.pressure) this.readouts.pressure.textContent = this.world.atmosphericPressure.toFixed(2);
    if (this.readouts.energy) this.readouts.energy.textContent = `${Math.round(this._energy() * 100)}%`;
    if (this.readouts.status) this.readouts.status.textContent = 'Soft continuous breeze';

    if (this.controls.intensity) this._setRangeFill(this.controls.intensity, this.state.intensity);
    if (this.controls.gust) this._setRangeFill(this.controls.gust, this.state.gust);
    if (this.controls.texture) this._setRangeFill(this.controls.texture, this.state.texture);
    if (this.controls.width) this._setRangeFill(this.controls.width, this.state.width);
  }

  getUICard() {
    return `
      <article class="expert-card wind-expert" data-id="${this.id}">
        <div class="wind-top">
          <div>
            <div class="wind-kicker">Atmosphere · Wind</div>
            <h3 class="wind-title">Wind Expert</h3>
            <p class="wind-subtitle">A gentle air engine with continuous texture, slow drift, and long soft motion.</p>
          </div>

          <button class="remove-btn" type="button" aria-label="Remove wind expert">Remove</button>
        </div>

        <div class="wind-chiprow">
          <span class="wind-chip">Continuous Bed</span>
          <span class="wind-chip">Soft Motion</span>
          <span class="wind-chip">Slow Drift</span>
          <span class="wind-chip">World-Aware</span>
        </div>

        <div class="wind-metrics">
          <div class="wind-metric"><span class="wind-metric-label">State</span><span class="wind-metric-value" data-value="state">Open air</span></div>
          <div class="wind-metric"><span class="wind-metric-label">Pressure</span><span class="wind-metric-value" data-value="pressure">0.50</span></div>
          <div class="wind-metric"><span class="wind-metric-label">Energy</span><span class="wind-metric-value" data-value="energy">0%</span></div>
          <div class="wind-metric"><span class="wind-metric-label">Mode</span><span class="wind-metric-value">Gentle</span></div>
        </div>

        <div class="wind-controls">
          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-intensity">Intensity</label>
              <span class="wind-control-value" data-value="intensity">0.42</span>
            </div>
            <input id="${this.id}-intensity" class="wind-slider" data-control="intensity" type="range" min="0" max="1" step="0.01" value="0.42" />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-gust">Swell</label>
              <span class="wind-control-value" data-value="gust">0.08</span>
            </div>
            <input id="${this.id}-gust" class="wind-slider" data-control="gust" type="range" min="0" max="1" step="0.01" value="0.08" />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-texture">Texture</label>
              <span class="wind-control-value" data-value="texture">0.58</span>
            </div>
            <input id="${this.id}-texture" class="wind-slider" data-control="texture" type="range" min="0" max="1" step="0.01" value="0.58" />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-width">Width</label>
              <span class="wind-control-value" data-value="width">0.62</span>
            </div>
            <input id="${this.id}-width" class="wind-slider" data-control="width" type="range" min="0" max="1" step="0.01" value="0.62" />
          </div>
        </div>

        <div class="wind-footer">
          <div class="wind-status" data-value="status">Soft continuous breeze</div>
        </div>
      </article>
    `;
  }

  bindCardControls(card) {
    if (!card) throw new Error('WindExpert.bindCardControls requires a card element.');
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

    if (this.controls.intensity) this.controls.intensity.addEventListener('input', onInput('intensity'));
    if (this.controls.gust) this.controls.gust.addEventListener('input', onInput('gust'));
    if (this.controls.texture) this.controls.texture.addEventListener('input', onInput('texture'));
    if (this.controls.width) this.controls.width.addEventListener('input', onInput('width'));

    this._updateCard();
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

  _stopNode(node) {
    if (!node) return;

    try {
      if (node.gain?.cancelScheduledValues) {
        node.gain.cancelScheduledValues(this.audioCtx.currentTime);
        node.gain.setTargetAtTime(0.00001, this.audioCtx.currentTime, 0.05);
      }
    } catch (_) {}

    try {
      if (typeof node.stop === 'function') {
        node.stop(this.audioCtx.currentTime + 0.05);
      }
    } catch (_) {}

    try {
      node.disconnect?.();
    } catch (_) {}
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.motionTimer) clearTimeout(this.motionTimer);
    if (this.swellTimer) clearTimeout(this.swellTimer);
    this.motionTimer = null;
    this.swellTimer = null;

    this._stopNode(this.bed1);
    this._stopNode(this.bed2);
    this._stopNode(this.hiss);
    this._stopNode(this.swell);
    this._stopNode(this.panLfo);
    this._stopNode(this.cutoffLfo);
    this._stopNode(this.swellLfo);

    try { this.bed1HP?.disconnect(); } catch (_) {}
    try { this.bed1LP?.disconnect(); } catch (_) {}
    try { this.bed1Gain?.disconnect(); } catch (_) {}
    try { this.bed2HP?.disconnect(); } catch (_) {}
    try { this.bed2LP?.disconnect(); } catch (_) {}
    try { this.bed2Gain?.disconnect(); } catch (_) {}
    try { this.hissHP?.disconnect(); } catch (_) {}
    try { this.hissLP?.disconnect(); } catch (_) {}
    try { this.hissGain?.disconnect(); } catch (_) {}
    try { this.swellHP?.disconnect(); } catch (_) {}
    try { this.swellBP?.disconnect(); } catch (_) {}
    try { this.swellLP?.disconnect(); } catch (_) {}
    try { this.swellGain?.disconnect(); } catch (_) {}
    try { this.stereo?.disconnect(); } catch (_) {}
    try { this.outputGain?.disconnect(); } catch (_) {}
    try { this.panDepth?.disconnect(); } catch (_) {}
    try { this.cutoffDepth?.disconnect(); } catch (_) {}
    try { this.swellDepth?.disconnect(); } catch (_) {}

    this.card = null;
    this.controls = {};
    this.readouts = {};
  }
}
