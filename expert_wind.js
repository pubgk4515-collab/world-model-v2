/**
 * expert_wind.js
 * Audible, smooth, natural wind expert for Symbiote Studio.
 * Sliders directly affect the sound so you can actually hear changes.
 */

const WIND_STYLE_ID = 'wind-expert-style-audible-v1';

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

function enclosureFactor(enclosure) {
  switch (enclosure) {
    case 'indoor':
      return 0.22;
    case 'umbrella':
      return 0.58;
    case 'open':
    default:
      return 1;
  }
}

function enclosureLabel(enclosure) {
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

function ensureStyles() {
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
    if (!audioCtx) throw new Error('WindExpert requires a valid AudioContext.');
    if (!masterBus) throw new Error('WindExpert requires a valid master bus GainNode.');

    ensureStyles();

    this.audioCtx = audioCtx;
    this.masterBus = masterBus;
    this.id = window.crypto?.randomUUID?.() || `wind-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.type = 'wind';

    this.state = {
      intensity: 0.60,
      swell: 0.22,
      texture: 0.48,
      width: 0.62,
    };

    this.world = {
      enclosure: 'open',
      atmosphericPressure: 0.5,
    };

    this.destroyed = false;
    this.swellTimer = null;
    this.card = null;
    this.controls = {};
    this.readouts = {};

    this._buildGraph();
    this._applyStateToAudio(true);
    this._startScheduler();
  }

  _createNoiseBuffer(seconds = 8) {
    const sr = this.audioCtx.sampleRate;
    const frames = Math.max(1, Math.floor(seconds * sr));
    const buffer = this.audioCtx.createBuffer(1, frames, sr);
    const data = buffer.getChannelData(0);

    let a = 0, b = 0, c = 0;
    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1;
      a = a * 0.998 + white * 0.002;
      b = b * 0.992 + a * 0.008;
      c = c * 0.984 + b * 0.016;
      data[i] = clamp(c * 1.8, -1, 1);
    }

    return buffer;
  }

  _makeNoiseSource(seconds = 8, rate = 1) {
    const src = this.audioCtx.createBufferSource();
    src.buffer = this._createNoiseBuffer(seconds);
    src.loop = true;
    src.playbackRate.value = rate;
    return src;
  }

  _safeStart(node) {
    try { node.start(); } catch (_) {}
  }

  _buildGraph() {
    const ctx = this.audioCtx;

    this.outputGain = ctx.createGain();
    this.outputGain.gain.value = 1.0;

    this.panner = ctx.createStereoPanner();
    this.panner.pan.value = 0;

    this.mix = ctx.createGain();
    this.mix.gain.value = 1;

    // Bed layer: constant wind body, audible on phones.
    this.bed = this._makeNoiseSource(9.5, randomRange(0.92, 1.05));
    this.bedHP = ctx.createBiquadFilter();
    this.bedHP.type = 'highpass';
    this.bedHP.frequency.value = 28;
    this.bedHP.Q.value = 0.72;

    this.bedLP = ctx.createBiquadFilter();
    this.bedLP.type = 'lowpass';
    this.bedLP.frequency.value = 5200;
    this.bedLP.Q.value = 0.72;

    this.bedGain = ctx.createGain();
    this.bedGain.gain.value = 0.12;

    // Air layer: brighter hiss, makes it clearly present.
    this.air = this._makeNoiseSource(7.25, randomRange(0.84, 1.02));
    this.airHP = ctx.createBiquadFilter();
    this.airHP.type = 'highpass';
    this.airHP.frequency.value = 900;
    this.airHP.Q.value = 0.8;

    this.airLP = ctx.createBiquadFilter();
    this.airLP.type = 'lowpass';
    this.airLP.frequency.value = 12000;
    this.airLP.Q.value = 0.66;

    this.airGain = ctx.createGain();
    this.airGain.gain.value = 0.045;

    // Swell layer: slow gust waves, soft but audible.
    this.swellSrc = this._makeNoiseSource(5.5, randomRange(0.78, 0.96));
    this.swellHP = ctx.createBiquadFilter();
    this.swellHP.type = 'highpass';
    this.swellHP.frequency.value = 180;
    this.swellHP.Q.value = 0.82;

    this.swellBP = ctx.createBiquadFilter();
    this.swellBP.type = 'bandpass';
    this.swellBP.frequency.value = 520;
    this.swellBP.Q.value = 0.95;

    this.swellLP = ctx.createBiquadFilter();
    this.swellLP.type = 'lowpass';
    this.swellLP.frequency.value = 3200;
    this.swellLP.Q.value = 0.75;

    this.swellGain = ctx.createGain();
    this.swellGain.gain.value = 0.02;

    // Drift motion.
    this.panLfo = ctx.createOscillator();
    this.panLfo.type = 'sine';
    this.panLfo.frequency.value = 0.035;

    this.panDepth = ctx.createGain();
    this.panDepth.gain.value = 0.08;

    this.cutoffLfo = ctx.createOscillator();
    this.cutoffLfo.type = 'sine';
    this.cutoffLfo.frequency.value = 0.018;

    this.cutoffDepth = ctx.createGain();
    this.cutoffDepth.gain.value = 120;

    // Wiring
    this.bed.connect(this.bedHP);
    this.bedHP.connect(this.bedLP);
    this.bedLP.connect(this.bedGain);

    this.air.connect(this.airHP);
    this.airHP.connect(this.airLP);
    this.airLP.connect(this.airGain);

    this.swellSrc.connect(this.swellHP);
    this.swellHP.connect(this.swellBP);
    this.swellBP.connect(this.swellLP);
    this.swellLP.connect(this.swellGain);

    this.bedGain.connect(this.mix);
    this.airGain.connect(this.mix);
    this.swellGain.connect(this.mix);

    this.mix.connect(this.panner);
    this.panner.connect(this.outputGain);
    this.outputGain.connect(this.masterBus);

    this.panLfo.connect(this.panDepth);
    this.panDepth.connect(this.panner.pan);

    this.cutoffLfo.connect(this.cutoffDepth);
    this.cutoffDepth.connect(this.bedLP.frequency);
    this.cutoffDepth.connect(this.airLP.frequency);

    this._safeStart(this.bed);
    this._safeStart(this.air);
    this._safeStart(this.swellSrc);
    this._safeStart(this.panLfo);
    this._safeStart(this.cutoffLfo);
  }

  _computeEnergy() {
    const eFactor = enclosureFactor(this.world.enclosure);
    const pFactor = clamp(1.12 + (0.5 - this.world.atmosphericPressure) * 0.65, 0.7, 1.35);

    const base =
      this.state.intensity * 0.7 +
      this.state.swell * 0.18 +
      this.state.texture * 0.12;

    return clamp01(base * eFactor * pFactor);
  }

  _applyStateToAudio(immediate = false) {
    if (!this.audioCtx || this.destroyed) return;

    const now = this.audioCtx.currentTime;
    const t = immediate ? 0.001 : 0.55;

    const energy = this._computeEnergy();
    const openness = enclosureFactor(this.world.enclosure);

    const masterTarget = 0.72 + energy * 0.28;
    const bedTarget = 0.12 + this.state.intensity * 0.30 + energy * 0.16;
    const airTarget = 0.05 + this.state.texture * 0.08 + energy * 0.06;
    const swellTarget = 0.02 + this.state.swell * 0.08 + energy * 0.04;

    const bedLP = 4200 + this.state.texture * 2600 + energy * 1800;
    const airLP = 10500 + this.state.texture * 1500;
    const swellLP = 2200 + this.state.texture * 1000 + energy * 500;

    const bedHP = 24 + (1 - openness) * 18;
    const airHP = 780 + this.state.texture * 320;
    const swellHP = 120 + this.state.texture * 120;
    const swellBP = 360 + this.state.texture * 420;

    const panDepth = 0.04 + this.state.width * 0.18;
    const cutoffDepth = 90 + this.state.texture * 160;
    const swellMotion = 0.02 + this.state.swell * 0.04;

    const set = (param, value) => {
      if (!param) return;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, t);
    };

    set(this.outputGain.gain, masterTarget);
    set(this.bedGain.gain, bedTarget);
    set(this.airGain.gain, airTarget);
    set(this.swellGain.gain, swellTarget);

    set(this.bedLP.frequency, bedLP);
    set(this.airLP.frequency, airLP);
    set(this.swellLP.frequency, swellLP);

    set(this.bedHP.frequency, bedHP);
    set(this.airHP.frequency, airHP);
    set(this.swellHP.frequency, swellHP);
    set(this.swellBP.frequency, swellBP);

    set(this.panLfo.frequency, 0.02 + this.state.width * 0.03);
    set(this.panDepth.gain, panDepth);
    set(this.panner.pan, (this.state.width - 0.5) * 0.18 * openness);

    set(this.cutoffLfo.frequency, 0.012 + this.state.texture * 0.01);
    set(this.cutoffDepth.gain, cutoffDepth);

    this._updateReadouts();
    this._scheduleSwell();
  }

  _startScheduler() {
    this._clearScheduler();
    this._scheduleSwell();
  }

  _clearScheduler() {
    if (this.swellTimer) {
      clearTimeout(this.swellTimer);
      this.swellTimer = null;
    }
  }

  _scheduleSwell() {
    if (this.destroyed) return;

    this._clearScheduler();

    const energy = this._computeEnergy();
    const openness = enclosureFactor(this.world.enclosure);

    const delay =
      clamp(
        lerp(22000, 7000, energy) * (0.78 + (1 - openness) * 0.45) +
        randomRange(-0.18, 0.26) * 8000,
        6500,
        28000
      );

    this.swellTimer = window.setTimeout(() => {
      if (this.destroyed) return;
      this._fireSwell();
      this._scheduleSwell();
    }, delay);
  }

  _fireSwell() {
    if (this.destroyed || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const energy = this._computeEnergy();
    const openness = enclosureFactor(this.world.enclosure);

    const peak = 0.03 + this.state.swell * 0.10 + energy * 0.04;
    const mid = 0.016 + this.state.swell * 0.05;
    const tail = 0.006 + this.state.swell * 0.02;

    this.swellGain.gain.cancelScheduledValues(now);
    this.swellGain.gain.setValueAtTime(Math.max(this.swellGain.gain.value, 0.0001), now);
    this.swellGain.gain.linearRampToValueAtTime(peak, now + 0.18);
    this.swellGain.gain.linearRampToValueAtTime(mid, now + 1.2);
    this.swellGain.gain.linearRampToValueAtTime(tail, now + 4.6);

    this.panner.pan.cancelScheduledValues(now);
    this.panner.pan.setValueAtTime(this.panner.pan.value, now);
    this.panner.pan.linearRampToValueAtTime(
      clamp(this.panner.pan.value + (Math.random() * 2 - 1) * 0.08 * openness, -0.32, 0.32),
      now + 0.9
    );
    this.panner.pan.linearRampToValueAtTime(this.panner.pan.value * 0.25, now + 4.5);
  }

  _setFill(input, value) {
    const pct = Math.round(clamp01(value) * 100);
    input.style.background = `linear-gradient(
      90deg,
      rgba(124,58,237,0.92) 0%,
      rgba(37,99,235,0.92) ${pct}%,
      rgba(255,255,255,0.10) ${pct}%,
      rgba(255,255,255,0.10) 100%
    )`;
  }

  _updateReadouts() {
    if (!this.readouts) return;

    if (this.readouts.intensity) this.readouts.intensity.textContent = this.state.intensity.toFixed(2);
    if (this.readouts.swell) this.readouts.swell.textContent = this.state.swell.toFixed(2);
    if (this.readouts.texture) this.readouts.texture.textContent = this.state.texture.toFixed(2);
    if (this.readouts.width) this.readouts.width.textContent = this.state.width.toFixed(2);
    if (this.readouts.state) this.readouts.state.textContent = enclosureLabel(this.world.enclosure);
    if (this.readouts.pressure) this.readouts.pressure.textContent = this.world.atmosphericPressure.toFixed(2);
    if (this.readouts.energy) this.readouts.energy.textContent = `${Math.round(this._computeEnergy() * 100)}%`;
    if (this.readouts.status) this.readouts.status.textContent = 'Soft continuous breeze';

    if (this.controls.intensity) this._setFill(this.controls.intensity, this.state.intensity);
    if (this.controls.swell) this._setFill(this.controls.swell, this.state.swell);
    if (this.controls.texture) this._setFill(this.controls.texture, this.state.texture);
    if (this.controls.width) this._setFill(this.controls.width, this.state.width);
  }

  getUICard() {
    return `
      <article class="expert-card wind-expert" data-id="${this.id}">
        <div class="wind-top">
          <div>
            <div class="wind-kicker">Atmosphere · Wind</div>
            <h3 class="wind-title">Wind Expert</h3>
            <p class="wind-subtitle">
              Smooth, natural air motion with clear audible presence and gentle evolving motion.
            </p>
          </div>

          <button class="remove-btn" type="button" aria-label="Remove wind expert">
            Remove
          </button>
        </div>

        <div class="wind-chiprow">
          <span class="wind-chip">Audible Bed</span>
          <span class="wind-chip">Soft Swells</span>
          <span class="wind-chip">Stereo Drift</span>
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
            <span class="wind-metric-value">Natural</span>
          </div>
        </div>

        <div class="wind-controls">
          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-intensity">Intensity</label>
              <span class="wind-control-value" data-value="intensity">0.60</span>
            </div>
            <input
              id="${this.id}-intensity"
              class="wind-slider"
              data-control="intensity"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.60"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-swell">Swell</label>
              <span class="wind-control-value" data-value="swell">0.22</span>
            </div>
            <input
              id="${this.id}-swell"
              class="wind-slider"
              data-control="swell"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.22"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-texture">Texture</label>
              <span class="wind-control-value" data-value="texture">0.48</span>
            </div>
            <input
              id="${this.id}-texture"
              class="wind-slider"
              data-control="texture"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.48"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-width">Width</label>
              <span class="wind-control-value" data-value="width">0.62</span>
            </div>
            <input
              id="${this.id}-width"
              class="wind-slider"
              data-control="width"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.62"
            />
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
    this.controls.swell = card.querySelector('[data-control="swell"]');
    this.controls.texture = card.querySelector('[data-control="texture"]');
    this.controls.width = card.querySelector('[data-control="width"]');

    this.readouts.intensity = card.querySelector('[data-value="intensity"]');
    this.readouts.swell = card.querySelector('[data-value="swell"]');
    this.readouts.texture = card.querySelector('[data-value="texture"]');
    this.readouts.width = card.querySelector('[data-value="width"]');
    this.readouts.state = card.querySelector('[data-value="state"]');
    this.readouts.pressure = card.querySelector('[data-value="pressure"]');
    this.readouts.energy = card.querySelector('[data-value="energy"]');
    this.readouts.status = card.querySelector('[data-value="status"]');

    const bind = (key) => (e) => {
      const value = clamp01(parseFloat(e.target.value));
      this.state[key] = value;
      this._applyStateToAudio(false);
    };

    if (this.controls.intensity) this.controls.intensity.addEventListener('input', bind('intensity'));
    if (this.controls.swell) this.controls.swell.addEventListener('input', bind('swell'));
    if (this.controls.texture) this.controls.texture.addEventListener('input', bind('texture'));
    if (this.controls.width) this.controls.width.addEventListener('input', bind('width'));

    this._updateReadouts();
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

    this._clearScheduler();

    const now = this.audioCtx?.currentTime ?? 0;

    const stop = (node) => {
      if (!node) return;
      try {
        if (node.gain?.cancelScheduledValues) {
          node.gain.cancelScheduledValues(now);
          node.gain.setTargetAtTime(0.00001, now, 0.06);
        }
      } catch (_) {}

      try {
        if (typeof node.stop === 'function') {
          node.stop(now + 0.06);
        }
      } catch (_) {}

      try {
        node.disconnect?.();
      } catch (_) {}
    };

    stop(this.bed);
    stop(this.air);
    stop(this.swellSrc);
    stop(this.panLfo);
    stop(this.cutoffLfo);

    try {
      this.bedHP?.disconnect();
      this.bedLP?.disconnect();
      this.bedGain?.disconnect();
      this.airHP?.disconnect();
      this.airLP?.disconnect();
      this.airGain?.disconnect();
      this.swellHP?.disconnect();
      this.swellBP?.disconnect();
      this.swellLP?.disconnect();
      this.swellGain?.disconnect();
      this.panner?.disconnect();
      this.outputGain?.disconnect();
      this.panDepth?.disconnect();
      this.cutoffDepth?.disconnect();
      this.mix?.disconnect();
    } catch (_) {}

    this.card = null;
    this.controls = {};
    this.readouts = {};
  }
}
