/**
 * expert_wind.js
 * =========================================================
 * Symbiote Studio · Advanced Procedural Wind Expert
 * ---------------------------------------------------------
 * Goal:
 * - real moving air perception
 * - soft breeze at low intensity
 * - storm-like mass at high intensity
 * - flute-like resonance, not TV static
 * - mobile-safe, low CPU, no external audio files
 *
 * Compatible with:
 * - app.js constructor(audioCtx, masterBus)
 * - getUICard()
 * - bindCardControls(card)
 * - onWorldStateUpdate(state)
 * - destroy()
 */

const WIND_STYLE_ID = 'symbiote-wind-expert-style-v4';

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
  if (document.getElementById(WIND_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = WIND_STYLE_ID;
  style.textContent = `
    .expert-card.wind-expert{
      position:relative;
      overflow:hidden;
      border-radius:24px;
      border:1px solid rgba(255,255,255,.08);
      background:
        radial-gradient(circle at top right, rgba(124,58,237,.12), transparent 34%),
        radial-gradient(circle at bottom left, rgba(37,99,235,.10), transparent 28%),
        linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
      box-shadow:0 18px 50px rgba(0,0,0,.42);
      backdrop-filter:blur(22px);
      -webkit-backdrop-filter:blur(22px);
      padding:16px 16px 14px;
      color:rgba(255,255,255,.94);
    }

    .wind-top{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
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

    .wind-chiprow{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin:14px 0 14px;
    }

    .wind-chip{
      display:inline-flex;
      align-items:center;
      gap:6px;
      padding:8px 10px;
      border-radius:999px;
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.07);
      font-size:.76rem;
      font-weight:700;
      color:rgba(255,255,255,.74);
    }

    .wind-metrics{
      display:grid;
      grid-template-columns:repeat(2, minmax(0, 1fr));
      gap:10px;
      margin:12px 0 14px;
    }

    .wind-metric{
      padding:12px 12px;
      border-radius:16px;
      background:rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.06);
    }

    .wind-metric-label{
      display:block;
      font-size:.72rem;
      letter-spacing:.12em;
      text-transform:uppercase;
      color:rgba(255,255,255,.48);
      margin-bottom:6px;
      font-weight:700;
    }

    .wind-metric-value{
      display:block;
      font-size:.96rem;
      font-weight:800;
      letter-spacing:-.02em;
      color:rgba(255,255,255,.9);
    }

    .wind-controls{
      display:grid;
      gap:12px;
      margin-top:12px;
    }

    .wind-control{
      display:grid;
      gap:8px;
    }

    .wind-control-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }

    .wind-control-label{
      font-size:.78rem;
      font-weight:800;
      letter-spacing:.08em;
      text-transform:uppercase;
      color:rgba(255,255,255,.62);
    }

    .wind-control-value{
      font-size:.84rem;
      font-weight:800;
      color:rgba(255,255,255,.86);
      min-width:42px;
      text-align:right;
    }

    .wind-slider{
      width:100%;
      height:7px;
      appearance:none;
      -webkit-appearance:none;
      border-radius:999px;
      outline:none;
      background:linear-gradient(90deg, rgba(124,58,237,.88), rgba(37,99,235,.88));
    }

    .wind-slider::-webkit-slider-thumb{
      appearance:none;
      -webkit-appearance:none;
      width:26px;
      height:26px;
      border-radius:50%;
      background:rgba(255,255,255,.97);
      border:2px solid rgba(255,255,255,.18);
      box-shadow:0 0 0 6px rgba(255,255,255,.08), 0 10px 24px rgba(255,255,255,.14);
      cursor:pointer;
    }

    .wind-slider::-moz-range-thumb{
      width:26px;
      height:26px;
      border-radius:50%;
      background:rgba(255,255,255,.97);
      border:2px solid rgba(255,255,255,.18);
      cursor:pointer;
    }

    .wind-footer{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-top:14px;
      padding-top:12px;
      border-top:1px solid rgba(255,255,255,.06);
    }

    .wind-status{
      font-size:.82rem;
      font-weight:700;
      color:rgba(255,255,255,.62);
    }

    .remove-btn{
      appearance:none;
      -webkit-appearance:none;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.06);
      color:rgba(255,255,255,.88);
      font-size:.9rem;
      font-weight:800;
      letter-spacing:-.02em;
      padding:10px 14px;
      border-radius:14px;
      cursor:pointer;
      transition:transform .16s ease, background .16s ease, border-color .16s ease;
    }

    .remove-btn:active{
      transform:scale(.98);
      background:rgba(255,255,255,.1);
      border-color:rgba(255,255,255,.14);
    }

    @media (max-width:480px){
      .wind-metrics{
        grid-template-columns:1fr;
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
    this.id = globalThis.crypto?.randomUUID?.() || `wind-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.type = 'wind';

    // Gentle defaults: soft breeze first, storm later.
    this.state = {
      intensity: 0.28,
      texture: 0.42,
      resonance: 0.35,
      movement: 0.50,
      width: 0.70,
    };

    this.world = {
      enclosure: 'open',
      atmosphericPressure: 0.5,
    };

    this.motion = {
      gust: 0.02,
      howl: 0.0,
      pan: 0.0,
      cavity: 0.0,
    };

    this.sources = [];
    this.controls = {};
    this.readouts = {};
    this.destroyed = false;
    this._motionTimer = null;

    this._buildGraph();
    this._startSources();
    this._applyAudioTargets(true);
    this._startMotionLoop();
  }

  // -------------------------------------------------------
  // Noise generation
  // -------------------------------------------------------

  _createNoiseBuffer(kind = 'pink', seconds = 10) {
    const sr = this.audioCtx.sampleRate;
    const length = Math.floor(sr * seconds);
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    if (kind === 'brown') {
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.8;
      }
    } else {
      // Paul Kellet pink noise
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        data[i] = pink * 0.11;
      }
    }

    // Edge fade so loops are less likely to click.
    const fadeLen = Math.min(Math.floor(sr * 0.25), Math.floor(length / 4));
    for (let i = 0; i < fadeLen; i++) {
      const t = i / fadeLen;
      const fadeIn = Math.sin(t * Math.PI * 0.5);
      const fadeOut = Math.sin((1 - t) * Math.PI * 0.5);
      data[i] *= fadeIn;
      data[length - 1 - i] *= fadeOut;
    }

    // Normalize to a safe peak.
    let max = 0;
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > max) max = abs;
    }
    if (max > 0) {
      const scale = 0.9 / max;
      for (let i = 0; i < length; i++) data[i] *= scale;
    }

    return buffer;
  }

  _createLoopingSource(kind, seconds = 10, rate = 1) {
    const src = this.audioCtx.createBufferSource();
    src.buffer = this._createNoiseBuffer(kind, seconds);
    src.loop = true;
    src.loopStart = 0;
    src.loopEnd = src.buffer.duration;
    src.playbackRate.value = rate;
    this.sources.push(src);
    return src;
  }

  // -------------------------------------------------------
  // Graph helpers
  // -------------------------------------------------------

  _buildDecorrelator(side = 'left') {
    const ctx = this.audioCtx;

    const input = ctx.createGain();

    const ap1 = ctx.createBiquadFilter();
    ap1.type = 'allpass';
    ap1.frequency.value = side === 'left' ? 360 : 410;
    ap1.Q.value = 0.55;

    const ap2 = ctx.createBiquadFilter();
    ap2.type = 'allpass';
    ap2.frequency.value = side === 'left' ? 1120 : 1280;
    ap2.Q.value = 0.55;

    const delay = ctx.createDelay(0.02);
    delay.delayTime.value = side === 'left' ? 0.0009 : 0.0013;

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = side === 'left' ? 7200 : 7600;
    lpf.Q.value = 0.65;

    const output = ctx.createGain();

    input.connect(ap1);
    ap1.connect(ap2);
    ap2.connect(delay);
    delay.connect(lpf);
    lpf.connect(output);

    return { input, ap1, ap2, delay, lpf, output };
  }

  _buildGraph() {
    const ctx = this.audioCtx;

    this.nodes = {};

    this.nodes.output = ctx.createGain();
    this.nodes.output.gain.value = 0.0;
    this.nodes.output.connect(this.masterBus);

    this.nodes.mainMix = ctx.createGain();

    // -----------------------------------------------------
    // Base airflow: soft, broad, non-static air bed
    // -----------------------------------------------------
    this.nodes.baseSource = this._createLoopingSource('pink', 11.2, random(0.92, 1.04));
    this.nodes.baseHP = ctx.createBiquadFilter();
    this.nodes.baseHP.type = 'highpass';
    this.nodes.baseHP.frequency.value = 180;
    this.nodes.baseHP.Q.value = 0.72;

    this.nodes.baseLP = ctx.createBiquadFilter();
    this.nodes.baseLP.type = 'lowpass';
    this.nodes.baseLP.frequency.value = 3600;
    this.nodes.baseLP.Q.value = 0.45;

    this.nodes.baseGain = ctx.createGain();
    this.nodes.baseGain.gain.value = 0.02;

    this.nodes.baseSource.connect(this.nodes.baseHP);
    this.nodes.baseHP.connect(this.nodes.baseLP);
    this.nodes.baseLP.connect(this.nodes.baseGain);
    this.nodes.baseGain.connect(this.nodes.mainMix);

    // -----------------------------------------------------
    // Body layer: low-mid pressure mass, not earthquake rumble
    // -----------------------------------------------------
    this.nodes.bodySource = this._createLoopingSource('brown', 13.1, random(0.88, 0.98));
    this.nodes.bodyHP = ctx.createBiquadFilter();
    this.nodes.bodyHP.type = 'highpass';
    this.nodes.bodyHP.frequency.value = 75;
    this.nodes.bodyHP.Q.value = 0.72;

    this.nodes.bodyShelf = ctx.createBiquadFilter();
    this.nodes.bodyShelf.type = 'lowshelf';
    this.nodes.bodyShelf.frequency.value = 220;
    this.nodes.bodyShelf.gain.value = 5.5;

    this.nodes.bodyLP = ctx.createBiquadFilter();
    this.nodes.bodyLP.type = 'lowpass';
    this.nodes.bodyLP.frequency.value = 520;
    this.nodes.bodyLP.Q.value = 0.55;

    this.nodes.bodyGain = ctx.createGain();
    this.nodes.bodyGain.gain.value = 0.008;

    this.nodes.bodySource.connect(this.nodes.bodyHP);
    this.nodes.bodyHP.connect(this.nodes.bodyShelf);
    this.nodes.bodyShelf.connect(this.nodes.bodyLP);
    this.nodes.bodyLP.connect(this.nodes.bodyGain);
    this.nodes.bodyGain.connect(this.nodes.mainMix);

    // -----------------------------------------------------
    // Turbulence layer: airy moving texture
    // -----------------------------------------------------
    this.nodes.turbSource = this._createLoopingSource('pink', 9.4, random(0.84, 1.0));
    this.nodes.turbHP = ctx.createBiquadFilter();
    this.nodes.turbHP.type = 'highpass';
    this.nodes.turbHP.frequency.value = 360;
    this.nodes.turbHP.Q.value = 0.78;

    this.nodes.turbSplit = ctx.createGain();

    this.nodes.turbBP1 = ctx.createBiquadFilter();
    this.nodes.turbBP1.type = 'bandpass';
    this.nodes.turbBP1.frequency.value = 820;
    this.nodes.turbBP1.Q.value = 1.4;

    this.nodes.turbBP2 = ctx.createBiquadFilter();
    this.nodes.turbBP2.type = 'bandpass';
    this.nodes.turbBP2.frequency.value = 2400;
    this.nodes.turbBP2.Q.value = 1.9;

    this.nodes.turbGain1 = ctx.createGain();
    this.nodes.turbGain1.gain.value = 0.012;

    this.nodes.turbGain2 = ctx.createGain();
    this.nodes.turbGain2.gain.value = 0.010;

    this.nodes.turbMix = ctx.createGain();
    this.nodes.turbMix.gain.value = 0.0;

    this.nodes.turbSource.connect(this.nodes.turbHP);
    this.nodes.turbHP.connect(this.nodes.turbSplit);
    this.nodes.turbSplit.connect(this.nodes.turbBP1);
    this.nodes.turbSplit.connect(this.nodes.turbBP2);
    this.nodes.turbBP1.connect(this.nodes.turbGain1);
    this.nodes.turbBP2.connect(this.nodes.turbGain2);
    this.nodes.turbGain1.connect(this.nodes.turbMix);
    this.nodes.turbGain2.connect(this.nodes.turbMix);
    this.nodes.turbMix.connect(this.nodes.mainMix);

    // -----------------------------------------------------
    // Resonance layer: flute-like cavities + comb body
    // -----------------------------------------------------
    this.nodes.resoHP = ctx.createBiquadFilter();
    this.nodes.resoHP.type = 'highpass';
    this.nodes.resoHP.frequency.value = 180;
    this.nodes.resoHP.Q.value = 0.75;

    this.nodes.resoLP = ctx.createBiquadFilter();
    this.nodes.resoLP.type = 'lowpass';
    this.nodes.resoLP.frequency.value = 4200;
    this.nodes.resoLP.Q.value = 0.65;

    this.nodes.resoSend = ctx.createGain();
    this.nodes.resoSend.gain.value = 1.0;

    this.nodes.resoSum = ctx.createGain();
    this.nodes.resoSum.gain.value = 0.25;

    this.nodes.resoBands = [
      { base: 290, filter: ctx.createBiquadFilter(), gain: ctx.createGain() },
      { base: 430, filter: ctx.createBiquadFilter(), gain: ctx.createGain() },
      { base: 650, filter: ctx.createBiquadFilter(), gain: ctx.createGain() },
      { base: 980, filter: ctx.createBiquadFilter(), gain: ctx.createGain() },
    ];

    this.nodes.resoBands.forEach((band) => {
      band.filter.type = 'bandpass';
      band.filter.frequency.value = band.base;
      band.filter.Q.value = 12;

      band.gain.gain.value = 0.0;

      this.nodes.turbMix.connect(this.nodes.resoHP);
      this.nodes.resoHP.connect(this.nodes.resoLP);
      this.nodes.resoLP.connect(this.nodes.resoSend);
      this.nodes.resoSend.connect(band.filter);
      band.filter.connect(band.gain);
      band.gain.connect(this.nodes.resoSum);
    });

    this.nodes.combDelay = ctx.createDelay(0.03);
    this.nodes.combDelay.delayTime.value = 0.0042;

    this.nodes.combFeedback = ctx.createGain();
    this.nodes.combFeedback.gain.value = 0.14;

    this.nodes.combLP = ctx.createBiquadFilter();
    this.nodes.combLP.type = 'lowpass';
    this.nodes.combLP.frequency.value = 2200;
    this.nodes.combLP.Q.value = 0.7;

    this.nodes.combDirect = ctx.createGain();
    this.nodes.combDirect.gain.value = 0.18;

    this.nodes.combOut = ctx.createGain();
    this.nodes.combOut.gain.value = 0.0;

    this.nodes.resoSum.connect(this.nodes.combDirect);
    this.nodes.resoSum.connect(this.nodes.combDelay);
    this.nodes.combDelay.connect(this.nodes.combLP);
    this.nodes.combLP.connect(this.nodes.combFeedback);
    this.nodes.combFeedback.connect(this.nodes.combDelay);
    this.nodes.combDirect.connect(this.nodes.combOut);
    this.nodes.combDelay.connect(this.nodes.combOut);
    this.nodes.combOut.connect(this.nodes.mainMix);

    // -----------------------------------------------------
    // Stereo decorrelation + spatial movement
    // -----------------------------------------------------
    this.nodes.stereoPre = ctx.createChannelMerger(2);
    this.nodes.mainMix.connect(this.nodes.stereoPre, 0, 0);
    this.nodes.mainMix.connect(this.nodes.stereoPre, 0, 1);

    this.nodes.stereoSplit = ctx.createChannelSplitter(2);
    this.nodes.stereoPre.connect(this.nodes.stereoSplit);

    this.leftChain = this._buildDecorrelator('left');
    this.rightChain = this._buildDecorrelator('right');

    this.nodes.stereoSplit.connect(this.leftChain.input, 0);
    this.nodes.stereoSplit.connect(this.rightChain.input, 1);

    this.nodes.stereoMerge = ctx.createChannelMerger(2);
    this.leftChain.output.connect(this.nodes.stereoMerge, 0, 0);
    this.rightChain.output.connect(this.nodes.stereoMerge, 0, 1);

    this.nodes.stereoPan = ctx.createStereoPanner();
    this.nodes.stereoPan.pan.value = 0.0;
    this.nodes.stereoMerge.connect(this.nodes.stereoPan);
    this.nodes.stereoPan.connect(this.nodes.output);
  }

  _startSources() {
    const now = this.audioCtx.currentTime + 0.03;
    this.sources.forEach((src, idx) => {
      try {
        src.start(now + idx * 0.01);
      } catch (_) {}
    });
  }

  // -------------------------------------------------------
  // Motion / dynamics
  // -------------------------------------------------------

  _computeEnergy() {
    const enclosureFactor =
      this.world.enclosure === 'indoor' ? 0.28 :
      this.world.enclosure === 'umbrella' ? 0.62 :
      1.0;

    const pressureFactor = clamp(
      1.0 + (0.5 - this.world.atmosphericPressure) * 0.55,
      0.68,
      1.35
    );

    const intensityCurve = Math.pow(this.state.intensity, 1.35);

    return clamp01(intensityCurve * enclosureFactor * pressureFactor);
  }

  _startMotionLoop() {
    this._stopMotionLoop();

    // Slow enough to avoid CPU waste, fast enough to feel alive.
    this._motionTimer = window.setInterval(() => {
      if (this.destroyed) return;

      const energy = this._computeEnergy();
      const motion = clamp01(this.state.movement);
      const texture = clamp01(this.state.texture);
      const resonance = clamp01(this.state.resonance);

      const gustImpulseChance = 0.03 + energy * 0.07 + motion * 0.03;
      const gustImpulse = Math.random() < gustImpulseChance
        ? (0.10 + Math.random() * 0.22) * energy
        : 0.0;

      const motionStep = 0.003 + motion * 0.010 + energy * 0.007;

      this.motion.gust = clamp01(
        this.motion.gust * 0.985 +
        gustImpulse +
        (Math.random() - 0.5) * motionStep
      );

      this.motion.howl = clamp01(
        this.motion.howl * 0.993 +
        gustImpulse * 0.55 +
        (Math.random() - 0.5) * (0.001 + motion * 0.0035)
      );

      this.motion.pan = clamp(
        this.motion.pan * 0.986 +
        (Math.random() - 0.5) * (0.002 + motion * 0.010),
        -1,
        1
      );

      this.motion.cavity = clamp01(
        this.motion.cavity * 0.992 +
        (Math.random() - 0.5) * (0.002 + resonance * 0.0045)
      );

      this._applyAudioTargets(false);
    }, 140);
  }

  _stopMotionLoop() {
    if (this._motionTimer) {
      clearInterval(this._motionTimer);
      this._motionTimer = null;
    }
  }

  _smooth(param, value, tc = 0.22) {
    if (!param) return;
    const now = this.audioCtx.currentTime;
    try {
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, tc);
    } catch (_) {}
  }

  _applyAudioTargets(immediate = false) {
    if (this.destroyed) return;

    const now = this.audioCtx.currentTime;
    const tc = immediate ? 0.001 : 0.45;

    const energy = this._computeEnergy();
    const texture = clamp01(this.state.texture);
    const resonance = clamp01(this.state.resonance);
    const movement = clamp01(this.state.movement);
    const width = clamp01(this.state.width);

    // Core profile: low intensity = soft breeze, high intensity = storm mass.
    const outputTarget = 0.12 + Math.pow(energy, 0.85) * 0.58;

    const baseGainTarget = 0.012 + Math.pow(energy, 1.55) * 0.18;
    const bodyGainTarget = 0.004 + Math.pow(energy, 2.25) * 0.085;

    const turbTarget =
      (0.002 + Math.pow(energy, 1.3) * 0.05) *
      (0.55 + texture * 0.85);

    const airHP = 320 + texture * 220;
    const airBP1 = 620 + texture * 920 + this.motion.gust * 420;
    const airBP2 = 1800 + texture * 1800 + this.motion.gust * 850;

    const airQ1 = 1.1 + texture * 1.4;
    const airQ2 = 1.3 + texture * 1.8;

    const baseHP = 180 + (1 - energy) * 100;
    const baseLP = 3000 + texture * 4200 + energy * 1800;

    const bodyHP = 70;
    const bodyLP = 340 + energy * 180;
    const bodyShelf = 4.5 + energy * 3.0;

    const resonanceGainTarget =
      (0.001 + resonance * 0.030) * Math.pow(energy, 1.9) +
      this.motion.howl * (0.008 + resonance * 0.020);

    const combFeedbackTarget = clamp(
      0.08 + resonance * 0.28 * Math.pow(energy, 1.1) + this.motion.howl * 0.08,
      0.06,
      0.48
    );

    const combDirectTarget = 0.10 + resonance * 0.12;
    const combLP = 1600 + texture * 1100 + energy * 450;

    const resoQ = 9 + resonance * 8 + energy * 3.5;
    const resonanceSpread = 0.6 + movement * 0.9 + energy * 0.4;

    const panDepth = (0.015 + width * 0.10) * (0.35 + energy * 0.75);
    const stereoPanTarget = this.motion.pan * panDepth + (width - 0.5) * 0.16;

    // Smooth global output
    this._smooth(this.nodes.output.gain, outputTarget, immediate ? 0.01 : 0.55);

    // Base layer
    this._smooth(this.nodes.baseGain.gain, baseGainTarget, tc);
    this._smooth(this.nodes.baseHP.frequency, baseHP, tc);
    this._smooth(this.nodes.baseLP.frequency, baseLP, tc);

    // Body layer
    this._smooth(this.nodes.bodyGain.gain, bodyGainTarget, tc);
    this._smooth(this.nodes.bodyHP.frequency, bodyHP, tc);
    this._smooth(this.nodes.bodyShelf.gain, bodyShelf, tc);
    this._smooth(this.nodes.bodyLP.frequency, bodyLP, tc);

    // Turbulence layer
    this._smooth(this.nodes.turbMix.gain, turbTarget, tc);
    this._smooth(this.nodes.turbHP.frequency, airHP, tc);
    this._smooth(this.nodes.turbBP1.frequency, airBP1, tc);
    this._smooth(this.nodes.turbBP2.frequency, airBP2, tc);
    this._smooth(this.nodes.turbBP1.Q, airQ1, tc);
    this._smooth(this.nodes.turbBP2.Q, airQ2, tc);

    // Resonance cavities
    this.nodes.resoBands.forEach((band, idx) => {
      const spread = (idx - 1.5) * 0.18;
      const base = band.base * (1 + spread * 0.015 * resonanceSpread);
      const drift = (this.motion.cavity - 0.5) * 24 + (movement - 0.5) * 14;

      this._smooth(band.filter.frequency, base + drift, 0.5);
      this._smooth(band.filter.Q, resoQ, 0.5);

      const bandGain = resonanceGainTarget * (0.75 + idx * 0.08);
      this._smooth(band.gain.gain, bandGain, 0.6);
    });

    this._smooth(this.nodes.combFeedback.gain, combFeedbackTarget, 0.6);
    this._smooth(this.nodes.combLP.frequency, combLP, 0.6);
    this._smooth(this.nodes.combDirect.gain, combDirectTarget, 0.5);

    // Spatial decorrelation
    const leftAp1 = 300 + width * 80 + movement * 35;
    const leftAp2 = 1080 + width * 260 + movement * 70;
    const rightAp1 = 360 + width * 80 + movement * 35;
    const rightAp2 = 1220 + width * 260 + movement * 70;

    this._smooth(this.leftChain.ap1.frequency, leftAp1, 0.9);
    this._smooth(this.leftChain.ap2.frequency, leftAp2, 0.9);
    this._smooth(this.rightChain.ap1.frequency, rightAp1, 0.9);
    this._smooth(this.rightChain.ap2.frequency, rightAp2, 0.9);

    this._smooth(this.leftChain.lpf.frequency, 6800 + width * 700, 0.9);
    this._smooth(this.rightChain.lpf.frequency, 7000 + width * 700, 0.9);

    this._smooth(this.nodes.stereoPan.pan, stereoPanTarget, 0.9);

    this._updateReadouts();
  }

  // -------------------------------------------------------
  // Card UI
  // -------------------------------------------------------

  _setFill(slider, value) {
    const pct = Math.round(clamp01(value) * 100);
    slider.style.background = `linear-gradient(
      90deg,
      rgba(124,58,237,.92) 0%,
      rgba(37,99,235,.92) ${pct}%,
      rgba(255,255,255,.10) ${pct}%,
      rgba(255,255,255,.10) 100%
    )`;
  }

  _profileLabel() {
    const energy = this._computeEnergy();
    if (energy < 0.18) return 'Soft breeze';
    if (energy < 0.48) return 'Airflow';
    if (energy < 0.78) return 'Strong wind';
    return 'Storm front';
  }

  _updateReadouts() {
    if (!this.readouts) return;

    if (this.readouts.intensity) this.readouts.intensity.textContent = this.state.intensity.toFixed(2);
    if (this.readouts.texture) this.readouts.texture.textContent = this.state.texture.toFixed(2);
    if (this.readouts.resonance) this.readouts.resonance.textContent = this.state.resonance.toFixed(2);
    if (this.readouts.movement) this.readouts.movement.textContent = this.state.movement.toFixed(2);
    if (this.readouts.width) this.readouts.width.textContent = this.state.width.toFixed(2);

    if (this.readouts.state) {
      this.readouts.state.textContent =
        this.world.enclosure === 'indoor' ? 'Indoor hush' :
        this.world.enclosure === 'umbrella' ? 'Umbrella cover' :
        'Open air';
    }

    if (this.readouts.pressure) {
      this.readouts.pressure.textContent = this.world.atmosphericPressure.toFixed(2);
    }

    if (this.readouts.energy) {
      this.readouts.energy.textContent = `${Math.round(this._computeEnergy() * 100)}%`;
    }

    if (this.readouts.profile) {
      this.readouts.profile.textContent = this._profileLabel();
    }

    if (this.readouts.status) {
      this.readouts.status.textContent = this._profileLabel();
    }

    if (this.controls.intensity) this._setFill(this.controls.intensity, this.state.intensity);
    if (this.controls.texture) this._setFill(this.controls.texture, this.state.texture);
    if (this.controls.resonance) this._setFill(this.controls.resonance, this.state.resonance);
    if (this.controls.movement) this._setFill(this.controls.movement, this.state.movement);
    if (this.controls.width) this._setFill(this.controls.width, this.state.width);
  }

  getUICard() {
    return `
      <article class="expert-card wind-expert" data-id="${this.id}">
        <div class="wind-top">
          <div>
            <div class="wind-kicker">Atmosphere · Wind</div>
            <h3 class="wind-title">Atmospheric Wind</h3>
            <p class="wind-subtitle">
              Continuous air synthesis with soft breeze, resonant cavities, and storm evolution.
            </p>
          </div>

          <button class="remove-btn" type="button" aria-label="Remove wind expert">
            Remove
          </button>
        </div>

        <div class="wind-chiprow">
          <span class="wind-chip">Pink + Brown Air</span>
          <span class="wind-chip">Flute Resonance</span>
          <span class="wind-chip">Stereo Drift</span>
          <span class="wind-chip">No Static</span>
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
            <span class="wind-metric-label">Profile</span>
            <span class="wind-metric-value" data-value="profile">Soft breeze</span>
          </div>
        </div>

        <div class="wind-controls">
          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-intensity">Intensity</label>
              <span class="wind-control-value" data-value="intensity">0.28</span>
            </div>
            <input
              id="${this.id}-intensity"
              class="wind-slider"
              data-control="intensity"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.28"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-texture">Texture</label>
              <span class="wind-control-value" data-value="texture">0.42</span>
            </div>
            <input
              id="${this.id}-texture"
              class="wind-slider"
              data-control="texture"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.42"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-resonance">Resonance</label>
              <span class="wind-control-value" data-value="resonance">0.35</span>
            </div>
            <input
              id="${this.id}-resonance"
              class="wind-slider"
              data-control="resonance"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.35"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-movement">Movement</label>
              <span class="wind-control-value" data-value="movement">0.50</span>
            </div>
            <input
              id="${this.id}-movement"
              class="wind-slider"
              data-control="movement"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.50"
            />
          </div>

          <div class="wind-control">
            <div class="wind-control-head">
              <label class="wind-control-label" for="${this.id}-width">Stereo Width</label>
              <span class="wind-control-value" data-value="width">0.70</span>
            </div>
            <input
              id="${this.id}-width"
              class="wind-slider"
              data-control="width"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.70"
            />
          </div>
        </div>

        <div class="wind-footer">
          <div class="wind-status" data-value="status">Soft breeze</div>
        </div>
      </article>
    `;
  }

  bindCardControls(card) {
    if (!card) {
      throw new Error('WindExpert.bindCardControls requires a card element.');
    }

    this.card = card;

    const map = [
      ['intensity', 'setIntensity'],
      ['texture', 'setTexture'],
      ['resonance', 'setResonance'],
      ['movement', 'setMovement'],
      ['width', 'setWidth'],
    ];

    for (const [key, setterName] of map) {
      const slider = card.querySelector(`[data-control="${key}"]`);
      const valueLabel = card.querySelector(`[data-value="${key}"]`);

      if (!slider || !valueLabel) continue;

      this.controls[key] = slider;
      this.readouts[key] = valueLabel;

      slider.value = String(this.state[key]);

      this._setFill(slider, parseFloat(slider.value));

      slider.addEventListener('input', (e) => {
        const value = clamp01(parseFloat(e.target.value));
        this[setterName](value);
      });
    }

    this.readouts.state = card.querySelector('[data-value="state"]');
    this.readouts.pressure = card.querySelector('[data-value="pressure"]');
    this.readouts.energy = card.querySelector('[data-value="energy"]');
    this.readouts.profile = card.querySelector('[data-value="profile"]');
    this.readouts.status = card.querySelector('[data-value="status"]');

    this._updateReadouts();
  }

  // -------------------------------------------------------
  // Public setters
  // -------------------------------------------------------

  setIntensity(value) {
    this.state.intensity = clamp01(value);
    this._applyAudioTargets(false);
  }

  setTexture(value) {
    this.state.texture = clamp01(value);
    this._applyAudioTargets(false);
  }

  setResonance(value) {
    this.state.resonance = clamp01(value);
    this._applyAudioTargets(false);
  }

  setMovement(value) {
    this.state.movement = clamp01(value);
    this._applyAudioTargets(false);
  }

  setWidth(value) {
    this.state.width = clamp01(value);
    this._applyAudioTargets(false);
  }

  // -------------------------------------------------------
  // World state
  // -------------------------------------------------------

  onWorldStateUpdate(state = {}) {
    if (this.destroyed) return;

    this.world.enclosure = state.enclosure ?? 'open';
    this.world.atmosphericPressure =
      typeof state.atmosphericPressure === 'number'
        ? clamp01(state.atmosphericPressure)
        : 0.5;

    this._applyAudioTargets(false);
  }

  // -------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this._stopMotionLoop();

    const now = this.audioCtx.currentTime;

    try {
      this.nodes.output.gain.cancelScheduledValues(now);
      this.nodes.output.gain.setTargetAtTime(0.0001, now, 0.08);
    } catch (_) {}

    window.setTimeout(() => {
      for (const src of this.sources) {
        try {
          src.stop();
        } catch (_) {}
        try {
          src.disconnect();
        } catch (_) {}
      }

      const disconnectNode = (node) => {
        if (!node) return;
        try {
          node.disconnect();
        } catch (_) {}
      };

      disconnectNode(this.nodes.baseHP);
      disconnectNode(this.nodes.baseLP);
      disconnectNode(this.nodes.baseGain);
      disconnectNode(this.nodes.bodyHP);
      disconnectNode(this.nodes.bodyShelf);
      disconnectNode(this.nodes.bodyLP);
      disconnectNode(this.nodes.bodyGain);
      disconnectNode(this.nodes.turbHP);
      disconnectNode(this.nodes.turbSplit);
      disconnectNode(this.nodes.turbBP1);
      disconnectNode(this.nodes.turbBP2);
      disconnectNode(this.nodes.turbGain1);
      disconnectNode(this.nodes.turbGain2);
      disconnectNode(this.nodes.turbMix);
      disconnectNode(this.nodes.resoHP);
      disconnectNode(this.nodes.resoLP);
      disconnectNode(this.nodes.resoSend);
      disconnectNode(this.nodes.resoSum);
      disconnectNode(this.nodes.combDelay);
      disconnectNode(this.nodes.combFeedback);
      disconnectNode(this.nodes.combLP);
      disconnectNode(this.nodes.combDirect);
      disconnectNode(this.nodes.combOut);
      disconnectNode(this.nodes.stereoPre);
      disconnectNode(this.nodes.stereoSplit);
      disconnectNode(this.leftChain?.input);
      disconnectNode(this.leftChain?.ap1);
      disconnectNode(this.leftChain?.ap2);
      disconnectNode(this.leftChain?.delay);
      disconnectNode(this.leftChain?.lpf);
      disconnectNode(this.leftChain?.output);
      disconnectNode(this.rightChain?.input);
      disconnectNode(this.rightChain?.ap1);
      disconnectNode(this.rightChain?.ap2);
      disconnectNode(this.rightChain?.delay);
      disconnectNode(this.rightChain?.lpf);
      disconnectNode(this.rightChain?.output);
      disconnectNode(this.nodes.stereoMerge);
      disconnectNode(this.nodes.stereoPan);
      disconnectNode(this.nodes.mainMix);
      disconnectNode(this.nodes.output);

      if (this.card && this.card.remove) {
        this.card.remove();
      }
    }, 250);
  }
}
