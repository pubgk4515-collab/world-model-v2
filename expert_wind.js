/**
 * expert_wind.js
 * Ultra-advanced procedural wind expert for Symbiote Studio.
 *
 * Features:
 * - Dual-layer noise synthesis (bed + gust)
 * - Enclosure-aware shaping
 * - Pressure-reactive wind intensity
 * - Slow spatial drift
 * - Random gust scheduling
 * - Clean card UI with live controls
 * - Full cleanup / destroy support
 */

const WIND_STYLE_ID = 'wind-expert-style-v1';

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
      return 0.18;
    case 'umbrella':
      return 0.58;
    case 'open':
    default:
      return 1.0;
  }
}

function pickEnclosureLabel(enclosure) {
  switch (enclosure) {
    case 'indoor':
      return 'Indoor shield';
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
        radial-gradient(circle at top right, rgba(124,58,237,0.14), transparent 34%),
        radial-gradient(circle at bottom left, rgba(37,99,235,0.12), transparent 28%),
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
      opacity: 0.42;
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

    this.id = (window.crypto?.randomUUID?.() || `wind-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    this.type = 'wind';

    this.state = {
      intensity: 0.62, // core wind strength
      gust: 0.38,      // gust frequency / impulse
      texture: 0.52,   // roughness / hiss color
      width: 0.64,     // stereo spread / spatial drift
    };

    this.world = {
      enclosure: 'open',
      atmosphericPressure: 0.5,
    };

    this.destroyed = false;
    this.gustTimer = null;
    this._lastGustAt = 0;

    this.controls = {};
    this.readouts = {};

    this._buildGraph();
    this._startSchedulers();
    this._applyStateToAudio(true);
  }

  _createNoiseBuffer(durationSeconds = 2.0) {
    const sampleRate = this.audioCtx.sampleRate;
    const frameCount = Math.max(1, Math.floor(durationSeconds * sampleRate));
    const buffer = this.audioCtx.createBuffer(1, frameCount, sampleRate);
    const channel = buffer.getChannelData(0);

    // White noise, lightly smoothed by a tiny moving average later in the graph.
    for (let i = 0; i < frameCount; i++) {
      channel[i] = (Math.random() * 2 - 1);
    }

    return buffer;
  }

  _makeLoopingNoiseSource({ rate = 1.0, duration = 2.0 }) {
    const source = this.audioCtx.createBufferSource();
    source.buffer = this._createNoiseBuffer(duration);
    source.loop = true;
    source.playbackRate.value = rate;
    return source;
  }

  _safeStartSource(source) {
    try {
      source.start();
    } catch (_) {
      // ignore double-start or state issues
    }
  }

  _buildGraph() {
    const ctx = this.audioCtx;

    // Root output
    this.outputGain = ctx.createGain();
    this.outputGain.gain.value = 0.85;

    this.stereoPanner = ctx.createStereoPanner();
    this.stereoPanner.pan.value = 0.0;

    // Layer mix
    this.mixGain = ctx.createGain();
    this.mixGain.gain.value = 1.0;

    // Continuous wind bed
    this.bedSource = this._makeLoopingNoiseSource({
      rate: randomRange(0.88, 1.08),
      duration: 2.4,
    });

    this.bedHP = ctx.createBiquadFilter();
    this.bedHP.type = 'highpass';
    this.bedHP.frequency.value = 26;
    this.bedHP.Q.value = 0.72;

    this.bedLP = ctx.createBiquadFilter();
    this.bedLP.type = 'lowpass';
    this.bedLP.frequency.value = 4200;
    this.bedLP.Q.value = 0.68;

    this.bedGain = ctx.createGain();
    this.bedGain.gain.value = 0.0;

    // Gust layer
    this.gustSource = this._makeLoopingNoiseSource({
      rate: randomRange(0.74, 0.98),
      duration: 1.7,
    });

    this.gustHP = ctx.createBiquadFilter();
    this.gustHP.type = 'highpass';
    this.gustHP.frequency.value = 34;
    this.gustHP.Q.value = 0.84;

    this.gustBP = ctx.createBiquadFilter();
    this.gustBP.type = 'bandpass';
    this.gustBP.frequency.value = 640;
    this.gustBP.Q.value = 0.95;

    this.gustLP = ctx.createBiquadFilter();
    this.gustLP.type = 'lowpass';
    this.gustLP.frequency.value = 5200;
    this.gustLP.Q.value = 0.78;

    this.gustGain = ctx.createGain();
    this.gustGain.gain.value = 0.0001;

    // Motion LFO for slow spatial drift
    this.panLfo = ctx.createOscillator();
    this.panLfo.type = 'sine';
    this.panLfo.frequency.value = randomRange(0.03, 0.085);

    this.panLfoDepth = ctx.createGain();
    this.panLfoDepth.gain.value = 0.0;

    // Optional micro-flutter for air instability
    this.flutterLfo = ctx.createOscillator();
    this.flutterLfo.type = 'sine';
    this.flutterLfo.frequency.value = randomRange(0.17, 0.31);

    this.flutterDepth = ctx.createGain();
    this.flutterDepth.gain.value = 0.0;

    // Wiring
    this.bedSource.connect(this.bedHP);
    this.bedHP.connect(this.bedLP);
    this.bedLP.connect(this.bedGain);
    this.bedGain.connect(this.mixGain);

    this.gustSource.connect(this.gustHP);
    this.gustHP.connect(this.gustBP);
    this.gustBP.connect(this.gustLP);
    this.gustLP.connect(this.gustGain);
    this.gustGain.connect(this.mixGain);

    this.mixGain.connect(this.stereoPanner);
    this.stereoPanner.connect(this.outputGain);
    this.outputGain.connect(this.masterBus);

    // LFOs
    this.panLfo.connect(this.panLfoDepth);
    this.panLfoDepth.connect(this.stereoPanner.pan);

    // Flutter modulates gust filter a bit for air shimmer
    this.flutterLfo.connect(this.flutterDepth);
    this.flutterDepth.connect(this.gustBP.frequency);

    this._safeStartSource(this.bedSource);
    this._safeStartSource(this.gustSource);
    this._safeStartSource(this.panLfo);
    this._safeStartSource(this.flutterLfo);
  }

  _startSchedulers() {
    this._clearSchedulers();
    this._scheduleNextGust();
  }

  _clearSchedulers() {
    if (this.gustTimer) {
      clearTimeout(this.gustTimer);
      this.gustTimer = null;
    }
  }

  _computeWindEnergy() {
    const enclosureFactor = pickEnclosureFactor(this.world.enclosure);
    const pressureFactor = clamp(1.12 + (0.5 - this.world.atmosphericPressure) * 0.95, 0.6, 1.55);

    // The actual audible density of the wind.
    const intensity = this.state.intensity;
    const texture = this.state.texture;

    const raw =
      (intensity * 0.72 + texture * 0.28) *
      pressureFactor *
      enclosureFactor;

    return clamp01(raw);
  }

  _computeGustEnergy() {
    const enclosureFactor = pickEnclosureFactor(this.world.enclosure);
    const pressureFactor = clamp(1.18 + (0.5 - this.world.atmosphericPressure) * 1.1, 0.65, 1.75);

    const raw =
      (this.state.gust * 0.78 + this.state.texture * 0.12 + this.state.intensity * 0.10) *
      pressureFactor *
      enclosureFactor;

    return clamp01(raw);
  }

  _applyStateToAudio(immediate = false) {
    if (!this.audioCtx || this.destroyed) return;

    const now = this.audioCtx.currentTime;
    const t = immediate ? 0.001 : 0.22;

    const windEnergy = this._computeWindEnergy();
    const gustEnergy = this._computeGustEnergy();
    const openness = pickEnclosureFactor(this.world.enclosure);

    const bedGainTarget = 0.02 + windEnergy * 0.22;
    const gustGainTarget = 0.01 + gustEnergy * 0.16;

    const bedHPHz = 20 + this.state.texture * 26 + (1 - openness) * 10;
    const bedLPHz = 880 + windEnergy * 2200 + this.state.texture * 1200;
    const gustHPHz = 28 + this.state.texture * 24;
    const gustLPHz = 900 + gustEnergy * 2600;

    const panDepth = 0.05 + this.state.width * 0.38;
    const panBias = (this.state.width - 0.5) * 0.42 * openness;
    const flutterDepth = 120 + this.state.texture * 240;
    const flutterFreq = 0.14 + this.state.texture * 0.22;

    this.bedGain.gain.cancelScheduledValues(now);
    this.gustGain.gain.cancelScheduledValues(now);
    this.bedHP.frequency.cancelScheduledValues(now);
    this.bedLP.frequency.cancelScheduledValues(now);
    this.gustHP.frequency.cancelScheduledValues(now);
    this.gustBP.frequency.cancelScheduledValues(now);
    this.gustLP.frequency.cancelScheduledValues(now);
    this.panLfoDepth.gain.cancelScheduledValues(now);
    this.stereoPanner.pan.cancelScheduledValues(now);
    this.flutterDepth.gain.cancelScheduledValues(now);

    this.bedGain.gain.setTargetAtTime(bedGainTarget, now, t);
    this.gustGain.gain.setTargetAtTime(gustGainTarget, now, t);

    this.bedHP.frequency.setTargetAtTime(bedHPHz, now, t);
    this.bedLP.frequency.setTargetAtTime(bedLPHz, now, t);
    this.gustHP.frequency.setTargetAtTime(gustHPHz, now, t);
    this.gustBP.frequency.setTargetAtTime(lerp(420, 900, this.state.texture), now, t);
    this.gustLP.frequency.setTargetAtTime(gustLPHz, now, t);

    this.panLfo.frequency.setTargetAtTime(0.02 + this.state.intensity * 0.08, now, t);
    this.panLfoDepth.gain.setTargetAtTime(panDepth, now, t);
    this.stereoPanner.pan.setTargetAtTime(panBias, now, t);

    this.flutterLfo.frequency.setTargetAtTime(flutterFreq, now, t);
    this.flutterDepth.gain.setTargetAtTime(flutterDepth, now, t);

    this._updateCardReadouts();
    this._scheduleNextGust();
  }

  _scheduleNextGust() {
    if (this.destroyed) return;

    if (this.gustTimer) {
      clearTimeout(this.gustTimer);
      this.gustTimer = null;
    }

    const enclosureFactor = pickEnclosureFactor(this.world.enclosure);
    const pressureFactor = clamp(1.0 + (0.5 - this.world.atmosphericPressure) * 0.8, 0.72, 1.45);

    const gustDensity =
      this.state.gust * 0.92 +
      this.state.intensity * 0.18 +
      this.state.texture * 0.06;

    const baseDelay =
      lerp(5200, 900, gustDensity) *
      pressureFactor *
      (0.7 + (1 - enclosureFactor) * 0.55);

    const jitter = randomRange(-0.18, 0.42) * baseDelay;
    const delay = clamp(baseDelay + jitter, 700, 7000);

    this.gustTimer = window.setTimeout(() => {
      if (this.destroyed) return;
      this._fireGust();
      this._scheduleNextGust();
    }, delay);
  }

  _fireGust() {
    if (this.destroyed || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const gustEnergy = this._computeGustEnergy();
    const openness = pickEnclosureFactor(this.world.enclosure);

    const pulsePeak = this.gustGain.gain.value + 0.018 + gustEnergy * 0.12;
    const sustain = this.gustGain.gain.value + 0.004 + gustEnergy * 0.04;
    const settle = 0.0001 + gustEnergy * 0.016;

    const gustPanOffset =
      (Math.random() * 2 - 1) *
      (0.08 + this.state.width * 0.22) *
      openness;

    this.gustGain.gain.cancelScheduledValues(now);
    this.gustGain.gain.setValueAtTime(Math.max(this.gustGain.gain.value, 0.0001), now);
    this.gustGain.gain.linearRampToValueAtTime(pulsePeak, now + 0.16);
    this.gustGain.gain.linearRampToValueAtTime(sustain, now + 0.72);
    this.gustGain.gain.linearRampToValueAtTime(settle, now + 1.55);

    this.stereoPanner.pan.cancelScheduledValues(now);
    this.stereoPanner.pan.setValueAtTime(this.stereoPanner.pan.value, now);
    this.stereoPanner.pan.linearRampToValueAtTime(
      clamp(this.stereoPanner.pan.value + gustPanOffset, -0.85, 0.85),
      now + 0.12
    );
    this.stereoPanner.pan.linearRampToValueAtTime(
      this.stereoPanner.pan.value * 0.25,
      now + 1.1
    );

    this._lastGustAt = performance.now();
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
              Procedural air-flow engine with gust scheduling, stereo drift, and enclosure-aware shaping.
            </p>
          </div>

          <button class="remove-btn" type="button" aria-label="Remove wind expert">
            Remove
          </button>
        </div>

        <div class="wind-chiprow">
          <span class="wind-chip">Noise Bed</span>
          <span class="wind-chip">Gust Scheduler</span>
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
            <span class="wind-metric-value">Procedural</span>
          </div>
        </div>

        <div class="wind-controls">
          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-intensity">Intensity</label>
              <span class="wind-control-value" data-value="intensity">0.62</span>
            </div>
            <input
              id="${this.id}-intensity"
              class="wind-slider"
              data-control="intensity"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.62"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-gust">Gust</label>
              <span class="wind-control-value" data-value="gust">0.38</span>
            </div>
            <input
              id="${this.id}-gust"
              class="wind-slider"
              data-control="gust"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.38"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-texture">Texture</label>
              <span class="wind-control-value" data-value="texture">0.52</span>
            </div>
            <input
              id="${this.id}-texture"
              class="wind-slider"
              data-control="texture"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.52"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-width">Width</label>
              <span class="wind-control-value" data-value="width">0.64</span>
            </div>
            <input
              id="${this.id}-width"
              class="wind-slider"
              data-control="width"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.64"
            />
          </div>
        </div>

        <div class="wind-footer">
          <div class="wind-status" data-value="status">
            Stable wind lattice
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

    const ctx = this.audioCtx;
    const now = ctx?.currentTime ?? 0;

    const stopNode = (node, release = 0.03) => {
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
        // ignore double-stop
      }

      try {
        node.disconnect?.();
      } catch (_) {
        // ignore
      }
    };

    stopNode(this.bedSource);
    stopNode(this.gustSource);
    stopNode(this.panLfo);
    stopNode(this.flutterLfo);

    try {
      this.bedHP?.disconnect();
      this.bedLP?.disconnect();
      this.bedGain?.disconnect();
      this.gustHP?.disconnect();
      this.gustBP?.disconnect();
      this.gustLP?.disconnect();
      this.gustGain?.disconnect();
      this.mixGain?.disconnect();
      this.stereoPanner?.disconnect();
      this.outputGain?.disconnect();
      this.panLfoDepth?.disconnect();
      this.flutterDepth?.disconnect();
    } catch (_) {
      // ignore disconnect issues
    }

    this.card = null;
    this.controls = {};
    this.readouts = {};
  }
}
