/**
 * expert_wind.js — Ultra‑Advanced Procedural Wind Synthesis Engine
 * ===================================================================
 * 
 * A fully self‑contained, sample‑free, zero‑dependency procedural wind
 * synthesis engine using only the Web Audio API. It creates the perception
 * of real moving air through a layered architecture:
 * 
 *  1. Base Airflow Layer   (brown noise, gently band‑limited)
 *  2. Turbulence Layer     (pink noise, moving band‑pass textures)
 *  3. Resonance Cavity Layer (high‑Q band‑pass + comb filter “flute” tones)
 *  4. Pressure Body Layer  (brown noise with low‑mid emphasis, no sub rumble)
 *  5. Stereo Spatial Layer (decorrelation via all‑pass filters + slow panning)
 *  6. Atmospheric Modulation (ultra‑slow LFOs that animate parameters)
 *
 *  NO external audio files, NO AI generation, NO static hiss – only physics‑
 *  informed, perceptually grounded procedural audio.
 *
 *  HTML REQUIRED (place inside <body>):
 *  ------------------------------------------------------------------
 *  <button id="startBtn">Start Wind</button><br>
 *  Intensity: <input type="range" id="intensity" min="0" max="100" value="30"><br>
 *  Air Texture: <input type="range" id="airTexture" min="0" max="100" value="50"><br>
 *  Resonance: <input type="range" id="resonance" min="0" max="100" value="40"><br>
 *  Movement: <input type="range" id="movement" min="0" max="100" value="60"><br>
 *  Stereo Width: <input type="range" id="stereoWidth" min="0" max="100" value="70"><br>
 *  <script src="expert_wind.js"></script>
 *  
 *  Author: [Your Name]  •  Date: 2026-05-10
 */

// ------------------------- Noise Buffer Generators -------------------------
class NoiseBufferGenerator {
  /**
   * Generate pure white noise: uniform distribution [-1, 1).
   */
  static generateWhiteNoise(durationSec, sampleRate) {
    const length = Math.floor(sampleRate * durationSec);
    const buffer = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      buffer[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Generate brown noise (integrated white noise) with DC removal.
   * After integration we apply a first‑order highpass at ~5 Hz to kill DC drift,
   * then normalise to peak 0.9.
   */
  static generateBrownNoise(durationSec, sampleRate) {
    const length = Math.floor(sampleRate * durationSec);
    // Step 1: white noise
    const white = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      white[i] = Math.random() * 2 - 1;
    }
    // Step 2: cumulative sum (integration) →  −6 dB/oct
    const integrated = new Float32Array(length);
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += white[i];
      integrated[i] = sum;
    }
    // Step 3: first‑order highpass to remove DC drift (cutoff ~5 Hz)
    const hpf = new Float32Array(length);
    const coeff = Math.exp(-2 * Math.PI * 5 / sampleRate); // e.g. 0.9998 @44.1kHz
    let prevIn = 0, prevOut = 0;
    for (let i = 0; i < length; i++) {
      const input = integrated[i];
      const out = input - prevIn + coeff * prevOut;
      hpf[i] = out;
      prevIn = input;
      prevOut = out;
    }
    // Step 4: normalise
    let max = 0;
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(hpf[i]);
      if (abs > max) max = abs;
    }
    if (max > 0) {
      const scale = 0.9 / max;
      for (let i = 0; i < length; i++) hpf[i] *= scale;
    }
    return hpf;
  }

  /**
   * Generate pink noise using Paul Kellet’s refined filter (accurate −3 dB/oct).
   * Output is normalised to peak ~0.9.
   */
  static generatePinkNoise(durationSec, sampleRate) {
    const length = Math.floor(sampleRate * durationSec);
    const buffer = new Float32Array(length);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      buffer[i] = pink * 0.11; // rough scaling
    }
    // Normalise
    let max = 0;
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(buffer[i]);
      if (abs > max) max = abs;
    }
    if (max > 0) {
      const scale = 0.9 / max;
      for (let i = 0; i < length; i++) buffer[i] *= scale;
    }
    return buffer;
  }
}

// ------------------------- Seamless Looping Noise Player -------------------------
class NoisePlayer {
  /**
   * @param {AudioContext} ctx
   * @param {AudioBuffer} buffer   mono buffer
   * @param {number} crossfade     crossfade duration in seconds (default 0.05)
   */
  constructor(ctx, buffer, crossfade = 0.05) {
    this.ctx = ctx;
    this.buffer = buffer;
    this.crossfade = crossfade;
    this.output = ctx.createGain();       // connect your chain here
    this._sources = [];
    this._stopped = false;
    this._timerId = null;
    this._nextStartTime = 0;
    this._loopDuration = buffer.duration - crossfade;
  }

  /** Start looping at `when` (context time). */
  start(when = 0) {
    this._nextStartTime = when;
    this._schedule();
    this._timerId = setInterval(() => this._schedule(), 100);
  }

  /** Scheduler: look ahead and create crossfaded sources. */
  _schedule() {
    if (this._stopped) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const lookahead = 0.2;
    while (this._nextStartTime < now + lookahead) {
      const startTime = this._nextStartTime;
      const duration = this.buffer.duration;

      const source = ctx.createBufferSource();
      source.buffer = this.buffer;
      source.loop = false;               // we handle looping manually

      const gainNode = ctx.createGain();
      source.connect(gainNode);
      gainNode.connect(this.output);

      // Crossfade envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(1, startTime + this.crossfade);
      gainNode.gain.setValueAtTime(1, startTime + this._loopDuration);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      source.start(startTime);
      source.stop(startTime + duration);

      // Cleanup after stop
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
        const idx = this._sources.indexOf(source);
        if (idx !== -1) this._sources.splice(idx, 1);
      };
      this._sources.push(source);
      this._nextStartTime = startTime + this._loopDuration;
    }
  }

  /** Gracefully stop all scheduled sources. */
  stop() {
    this._stopped = true;
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
    for (const src of this._sources) {
      try { src.stop(); } catch (e) { /* already stopped */ }
    }
    this._sources = [];
  }
}

// ------------------------- Main Wind Engine -------------------------
class WindEngine {
  constructor() {
    this.ctx = null;
    this.nodes = {};            // store important AudioNodes
    this.players = [];          // NoisePlayer instances
    this.lfos = [];             // {osc, depth} for global modulation
    this.modTargets = [];       // {mixer, scale} for modulation routing
    this._running = false;

    // current slider values (0–100)
    this.intensityVal = 30;
    this.airTextureVal = 50;
    this.resonanceVal = 40;
    this.movementVal = 60;
    this.stereoWidthVal = 70;
  }

  /** Must be called from a user gesture (e.g. click). */
  async start() {
    if (this._running) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
    } catch (e) {
      console.error('Failed to create AudioContext', e);
      return;
    }

    this._buildGraph();
    this._running = true;

    // Fade in master gain over 0.5 seconds to avoid a click
    const now = this.ctx.currentTime;
    this.nodes.masterGain.gain.setValueAtTime(0, now);
    this.nodes.masterGain.gain.linearRampToValueAtTime(0.5, now + 0.5); // final master volume is handled later

    // Apply initial slider positions
    this.setIntensity(this.intensityVal);
    this.setAirTexture(this.airTextureVal);
    this.setResonance(this.resonanceVal);
    this.setMovement(this.movementVal);
    this.setStereoWidth(this.stereoWidthVal);
  }

  /** Disconnect everything and release resources. */
  stop() {
    if (!this._running) return;
    this._running = false;

    // Stop all noise players
    for (const player of this.players) {
      player.stop();
    }
    this.players = [];

    // Stop LFOs
    for (const lfo of this.lfos) {
      try { lfo.osc.stop(); } catch(e) {}
      lfo.osc.disconnect();
      lfo.depth.disconnect();
    }
    this.lfos = [];

    // Disconnect all stored nodes (brute‑force safety)
    if (this.nodes.masterGain) this.nodes.masterGain.disconnect();
    // … more if needed, but re‑creating context is simplest
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.nodes = {};
  }

  // ------------------------ Graph Construction ------------------------
  _buildGraph() {
    const ctx = this.ctx;

    // Master output
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
    this.nodes.masterGain = masterGain;

    // Main mix bus (mono before spatialization)
    const mainMix = ctx.createGain();
    this.nodes.mainMix = mainMix;

    // ---------- Layer 1: Base Airflow (brown noise) ----------
    const baseBuffer = NoiseBufferGenerator.generateBrownNoise(4, ctx.sampleRate);
    const baseAudioBuffer = ctx.createBuffer(1, baseBuffer.length, ctx.sampleRate);
    baseAudioBuffer.getChannelData(0).set(baseBuffer);
    const basePlayer = new NoisePlayer(ctx, baseAudioBuffer, 0.05);
    this.players.push(basePlayer);

    const baseGain = ctx.createGain();
    const baseHPF = ctx.createBiquadFilter();
    baseHPF.type = 'highpass';
    baseHPF.frequency.value = 120;   // initial, will be set by intensity
    baseHPF.Q.value = 0.7;
    const baseLPF = ctx.createBiquadFilter();
    baseLPF.type = 'lowpass';
    baseLPF.frequency.value = 5000;
    baseLPF.Q.value = 0.5;

    basePlayer.output.connect(baseGain);
    baseGain.connect(baseHPF);
    baseHPF.connect(baseLPF);
    baseLPF.connect(mainMix);

    this.nodes.baseGain = baseGain;
    this.nodes.baseHPF = baseHPF;
    this.nodes.baseLPF = baseLPF;

    // ---------- Layer 2: Turbulence (pink noise) ----------
    const turbBuffer = NoiseBufferGenerator.generatePinkNoise(4, ctx.sampleRate);
    const turbAudioBuffer = ctx.createBuffer(1, turbBuffer.length, ctx.sampleRate);
    turbAudioBuffer.getChannelData(0).set(turbBuffer);
    const turbPlayer = new NoisePlayer(ctx, turbAudioBuffer, 0.05);
    this.players.push(turbPlayer);

    // Split into two band‑pass paths for moving spectral texture
    const turbSplit = ctx.createGain();    // just a splitter
    turbPlayer.output.connect(turbSplit);
    const turbPathA = ctx.createGain();
    const turbPathB = ctx.createGain();
    turbSplit.connect(turbPathA);
    turbSplit.connect(turbPathB);

    const bpfA = ctx.createBiquadFilter();
    bpfA.type = 'bandpass';
    bpfA.frequency.value = 600;
    bpfA.Q.value = 2.0;
    const bpfB = ctx.createBiquadFilter();
    bpfB.type = 'bandpass';
    bpfB.frequency.value = 1800;
    bpfB.Q.value = 2.5;

    const turbMix = ctx.createGain();      // sums both paths
    turbPathA.connect(bpfA).connect(turbMix);
    turbPathB.connect(bpfB).connect(turbMix);
    turbMix.connect(mainMix);

    this.nodes.turbPathA = turbPathA;
    this.nodes.turbPathB = turbPathB;
    this.nodes.bpfA = bpfA;
    this.nodes.bpfB = bpfB;
    this.nodes.turbMix = turbMix;

    // ---------- Layer 3: Resonance Cavities ----------
    const resoInput = ctx.createGain();
    turbMix.connect(resoInput);            // excite resonances with turbulence

    const resonanceFreqs = [220, 330, 440, 550, 660, 880];  // flute‑like harmonic series
    const resoFilters = resonanceFreqs.map(f => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 15;                    // high Q → ringing
      return bp;
    });
    const resoSum = ctx.createGain();
    resoFilters.forEach(bp => {
      resoInput.connect(bp);
      bp.connect(resoSum);
    });

    // Comb filter (short delay + feedback) to add pitched resonance body
    const combDelay = ctx.createDelay(1.0);
    combDelay.delayTime.value = 0.004;    // 4 ms → ~250 Hz fundamental
    const combFeedback = ctx.createGain();
    combFeedback.gain.value = 0.3;
    const combMix = ctx.createGain();

    resoSum.connect(combMix);
    resoSum.connect(combDelay);
    combDelay.connect(combFeedback);
    combFeedback.connect(combDelay);      // feedback loop
    combDelay.connect(combMix);

    const resoGain = ctx.createGain();
    resoGain.gain.value = 0.2;
    combMix.connect(resoGain);
    resoGain.connect(mainMix);

    this.nodes.resoInput = resoInput;
    this.nodes.resoFilters = resoFilters;
    this.nodes.combDelay = combDelay;
    this.nodes.combFeedback = combFeedback;
    this.nodes.resoGain = resoGain;

    // ---------- Layer 4: Pressure Body (low‑mid weight) ----------
    const pressBuffer = NoiseBufferGenerator.generateBrownNoise(4, ctx.sampleRate);
    const pressAudioBuffer = ctx.createBuffer(1, pressBuffer.length, ctx.sampleRate);
    pressAudioBuffer.getChannelData(0).set(pressBuffer);
    const pressPlayer = new NoisePlayer(ctx, pressAudioBuffer, 0.05);
    this.players.push(pressPlayer);

    const pressGain = ctx.createGain();
    const pressHPF = ctx.createBiquadFilter();
    pressHPF.type = 'highpass';
    pressHPF.frequency.value = 70;        // remove sub‑bass
    pressHPF.Q.value = 0.7;
    const pressLoShelf = ctx.createBiquadFilter();
    pressLoShelf.type = 'lowshelf';
    pressLoShelf.frequency.value = 250;
    pressLoShelf.gain.value = 6;          // +6 dB gentle low‑mid boost

    pressPlayer.output.connect(pressGain);
    pressGain.connect(pressHPF);
    pressHPF.connect(pressLoShelf);
    pressLoShelf.connect(mainMix);

    this.nodes.pressGain = pressGain;
    this.nodes.pressHPF = pressHPF;
    this.nodes.pressLoShelf = pressLoShelf;

    // ---------- Layer 5: Stereo Spatial Movement ----------
    // Convert mono mainMix to dual‑mono, then split for independent L/R processing
    const stereoInput = ctx.createChannelMerger(2);
    mainMix.connect(stereoInput, 0, 0);   // left
    mainMix.connect(stereoInput, 0, 1);   // right

    const splitter = ctx.createChannelSplitter(2);
    stereoInput.connect(splitter);

    const leftChain  = this._createAllpassChain('left');
    const rightChain = this._createAllpassChain('right');

    splitter.connect(leftChain.input, 0);
    splitter.connect(rightChain.input, 1);

    const merger = ctx.createChannelMerger(2);
    leftChain.output.connect(merger, 0, 0);
    rightChain.output.connect(merger, 0, 1);

    // Global stereo panner for slow spatial drift
    const panner = ctx.createStereoPanner();
    merger.connect(panner);
    panner.connect(masterGain);

    this.nodes.leftChain = leftChain;
    this.nodes.rightChain = rightChain;
    this.nodes.panner = panner;

    // ---------- Layer 6: Atmospheric Modulation LFOs ----------
    this._createModulationLFOs();

    // Wire modulation targets (each target gets a mixer summing several LFOs)
    this._addModulationTarget(
      this.nodes.baseHPF.frequency, [
        {lfoIdx: 0, weight: 1}
      ], 5     // scale = 5 Hz deviation
    );
    this._addModulationTarget(
      this.nodes.baseLPF.frequency, [
        {lfoIdx: 1, weight: 1}, {lfoIdx: 2, weight: 0.5}
      ], 200
    );
    this._addModulationTarget(
      this.nodes.bpfA.frequency, [
        {lfoIdx: 3, weight: 0.8}, {lfoIdx: 4, weight: 0.4}
      ], 100
    );
    this._addModulationTarget(
      this.nodes.bpfB.frequency, [
        {lfoIdx: 5, weight: 0.7}, {lfoIdx: 0, weight: 0.3}
      ], 200
    );
    // All resonance filters share the same modulation to keep a coherent chord drift
    this.nodes.resoFilters.forEach(bp => {
      this._addModulationTarget(bp.frequency, [
        {lfoIdx: 1, weight: 0.7}, {lfoIdx: 4, weight: 0.5}
      ], 3);
    });
    this._addModulationTarget(
      this.nodes.combDelay.delayTime, [
        {lfoIdx: 2, weight: 0.6}
      ], 0.0005   // ±0.5 ms
    );
    // All‑pass filter modulation for stereo movement
    this._addModulationTarget(
      this.nodes.leftChain.ap1.frequency, [
        {lfoIdx: 5, weight: 0.5}
      ], 15
    );
    this._addModulationTarget(
      this.nodes.leftChain.ap2.frequency, [
        {lfoIdx: 3, weight: 0.4}
      ], 30
    );
    this._addModulationTarget(
      this.nodes.rightChain.ap1.frequency, [
        {lfoIdx: 4, weight: 0.5}
      ], 15
    );
    this._addModulationTarget(
      this.nodes.rightChain.ap2.frequency, [
        {lfoIdx: 2, weight: 0.4}
      ], 30
    );
    // Panning
    this._addModulationTarget(
      this.nodes.panner.pan, [
        {lfoIdx: 1, weight: 0.5}
      ], 0.3
    );

    // Start all noise players shortly after now
    const now = ctx.currentTime;
    this.players.forEach(p => p.start(now + 0.1));
  }

  /** Create L/R all‑pass chain (two filters in series). */
  _createAllpassChain(side) {
    const ctx = this.ctx;
    const input = ctx.createGain();
    const ap1 = ctx.createBiquadFilter();
    ap1.type = 'allpass';
    ap1.frequency.value = side === 'left' ? 350 : 400;
    ap1.Q.value = 0.5;
    const ap2 = ctx.createBiquadFilter();
    ap2.type = 'allpass';
    ap2.frequency.value = side === 'left' ? 1200 : 1350;
    ap2.Q.value = 0.5;
    const output = ctx.createGain();
    input.connect(ap1);
    ap1.connect(ap2);
    ap2.connect(output);
    return { input, ap1, ap2, output };
  }

  /** Build ultra‑slow LFO bank (inaudible frequencies). */
  _createModulationLFOs() {
    const ctx = this.ctx;
    const rates = [0.07, 0.11, 0.13, 0.17, 0.23, 0.31]; // inharmonic to avoid periodic feel
    this.lfos = rates.map(rate => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = rate;
      const depth = ctx.createGain();    // depth will be controlled by movement slider
      depth.gain.value = 0;
      osc.connect(depth);
      osc.start();
      return { osc, depth };
    });
  }

  /**
   * Create a modulation mixer for a specific AudioParam.
   * @param {AudioParam} param        target parameter
   * @param {Array} lfoWeights        {lfoIdx, weight} pairs
   * @param {number} scale            scaling factor (final unit = Hz, seconds, etc.)
   */
  _addModulationTarget(param, lfoWeights, scale) {
    const ctx = this.ctx;
    const mixer = ctx.createGain();
    mixer.gain.value = scale;
    // Connect each LFO (through its depth gain) to the mixer
    lfoWeights.forEach(({lfoIdx, weight}) => {
      const lfo = this.lfos[lfoIdx];
      const gain = ctx.createGain();
      gain.gain.value = weight;        // fixed weight for this LFO on this target
      lfo.depth.connect(gain);        // depth gain already contains movement amount
      gain.connect(mixer);
    });
    mixer.connect(param);
    this.modTargets.push({ mixer, scale });   // store for possible future tweaks
  }

  // ------------------------ Parameter Smoothing ------------------------
  /**
   * Apply an exponential ramp to an AudioParam to avoid zipper noise.
   * @param {AudioParam} param
   * @param {number} targetValue
   * @param {number} timeConstant  smoothing time constant (default 0.05 s)
   */
  _smoothSet(param, targetValue, timeConstant = 0.05) {
    param.setTargetAtTime(targetValue, this.ctx.currentTime, timeConstant);
  }

  // ------------------------ UI Slider Handlers ------------------------
  /**
   * Intensity slider (0–100)
   * Controls: turbulence density, spectral width, resonance excitation,
   *           air‑mass pressure, movement depth multiplier, master volume.
   */
  setIntensity(value) {
    this.intensityVal = value;
    if (!this._running) return;
    const frac = value / 100;   // 0 … 1

    // Master gain (louder at higher intensity, but not linearly destructive)
    const masterVol = 0.2 + Math.pow(frac, 0.65) * 0.7;   // 0.2 … 0.9
    this._smoothSet(this.nodes.masterGain.gain, masterVol);

    // Base airflow: gain, HPF, LPF
    const baseGainVal = Math.pow(frac, 0.7) * 0.5;         // 0 … 0.5
    this._smoothSet(this.nodes.baseGain.gain, baseGainVal);

    const hpfFreq = this._mapExp(frac, 200, 60, 1.5);      // thin → full
    this._smoothSet(this.nodes.baseHPF.frequency, hpfFreq, 0.1);

    // LPF cut‐off mixed later with airTexture; store base value
    this._baseLPFCutoff = this._mapExp(frac, 3000, 8000, 2);
    this._updateLPFWithTexture();

    // Turbulence: path gains and overall mix
    const turbGain = Math.pow(frac, 0.8) * 0.4;
    this._smoothSet(this.nodes.turbPathA.gain, turbGain);
    this._smoothSet(this.nodes.turbPathB.gain, turbGain * 0.9);
    this._smoothSet(this.nodes.turbMix.gain, 0.6 + frac * 0.4);   // 0.6 … 1.0

    // Pressure body
    const pressGain = Math.pow(frac, 0.6) * 0.3;
    this._smoothSet(this.nodes.pressGain.gain, pressGain);
    // Slight HPF shift for more body at high intensity
    this._smoothSet(this.nodes.pressHPF.frequency, this._mapExp(frac, 100, 60, 1.2), 0.1);

    // Resonance: gain & comb feedback
    const resoBase = Math.pow(frac, 2.5) * 0.4;   // steep rise
    this._smoothSet(this.nodes.resoGain.gain, resoBase * (this.resonanceVal / 100));
    const fbBase = 0.05 + frac * 0.5;   // 0.05 … 0.55
    this._smoothSet(this.nodes.combFeedback.gain, fbBase * (this.resonanceVal / 100));

    // Movement depth multiplier (intensity drives more movement)
    this._updateMovement();
  }

  /**
   * Air Texture slider: smooth (0) ↔ rough (100).
   * Changes LPF cutoff, turbulence edge, resonance Q slightly.
   */
  setAirTexture(value) {
    this.airTextureVal = value;
    if (!this._running) return;
    this._updateLPFWithTexture();
    const frac = value / 100;

    // Turbulence Q: wider (smooth) ↔ tighter (rough)
    const qA = 1.5 + frac * 2.0;       // 1.5 … 3.5
    const qB = 2.0 + frac * 2.0;       // 2.0 … 4.0
    this._smoothSet(this.nodes.bpfA.Q, qA, 0.1);
    this._smoothSet(this.nodes.bpfB.Q, qB, 0.1);

    // Resonance filter Q slight increase for more edge
    const resoQ = 10 + frac * 10;      // 10 … 20
    this.nodes.resoFilters.forEach(bp => {
      this._smoothSet(bp.Q, resoQ, 0.1);
    });
  }

  /**
   * Resonance slider: amount of cavity ringing and comb feedback.
   */
  setResonance(value) {
    this.resonanceVal = value;
    if (!this._running) return;
    const frac = value / 100;

    // Adjust resoGain and combFeedback using current intensity-dependent base
    const intensityFrac = this.intensityVal / 100;
    const resoMax = Math.pow(intensityFrac, 2.5) * 0.4;
    this._smoothSet(this.nodes.resoGain.gain, resoMax * frac);

    const fbMax = 0.05 + intensityFrac * 0.5;
    this._smoothSet(this.nodes.combFeedback.gain, fbMax * frac);
  }

  /**
   * Movement slider: amount of low‑frequency modulation (LFO depth).
   */
  setMovement(value) {
    this.movementVal = value;
    if (!this._running) return;
    this._updateMovement();
  }

  /**
   * Stereo Width slider: all‑pass frequency offset and channel decorrelation.
   * 0 = mono, 100 = wide spatial separation.
   */
  setStereoWidth(value) {
    this.stereoWidthVal = value;
    if (!this._running) return;
    const frac = value / 100;

    // Offsets for all‑pass frequencies (left‑right divergence)
    const leftAp1 = 350 - frac * 80;
    const leftAp2 = 1200 - frac * 200;
    const rightAp1 = 350 + frac * 80;
    const rightAp2 = 1200 + frac * 200;

    this._smoothSet(this.nodes.leftChain.ap1.frequency, leftAp1, 0.1);
    this._smoothSet(this.nodes.leftChain.ap2.frequency, leftAp2, 0.1);
    this._smoothSet(this.nodes.rightChain.ap1.frequency, rightAp1, 0.1);
    this._smoothSet(this.nodes.rightChain.ap2.frequency, rightAp2, 0.1);
  }

  // ------------------------ Helper Methods ------------------------
  /**
   * Exponential interpolation: 0..1 → [min, max].
   * @param {number} t    normalised slider 0–1
   * @param {number} min
   * @param {number} max
   * @param {number} exp  exponent ( >1 curves down, <1 curves up)
   */
  _mapExp(t, min, max, exp = 1.5) {
    return min + (max - min) * Math.pow(t, exp);
  }

  /** Blend intensity‑driven LPF cutoff with air texture adjustment. */
  _updateLPFWithTexture() {
    if (!this._running) return;
    const intensityFrac = this.intensityVal / 100;
    const baseCutoff = this._mapExp(intensityFrac, 3000, 8000, 2);
    // Air texture pulls cutoff down for smooth, up for rough
    const textureShift = (this.airTextureVal / 100) * 2500 - 1250; // -1250 … +1250
    const finalCutoff = Math.max(1500, Math.min(16000, baseCutoff + textureShift));
    this._smoothSet(this.nodes.baseLPF.frequency, finalCutoff, 0.1);
  }

  /** Update LFO depth gains based on movement slider and intensity multiplier. */
  _updateMovement() {
    if (!this._running) return;
    const movementFrac = this.movementVal / 100;
    const intensityFrac = this.intensityVal / 100;
    // Intensity adds extra movement: 0.2 (low) … 1.0 (high)
    const intensityMul = 0.2 + intensityFrac * 0.8;
    const baseDepth = movementFrac * intensityMul * 0.6;   // 0 … 0.6

    this.lfos.forEach(lfo => {
      this._smoothSet(lfo.depth.gain, baseDepth);
    });
  }
}

// ------------------------- UI Initialisation -------------------------
document.addEventListener('DOMContentLoaded', () => {
  const engine = new WindEngine();

  document.getElementById('startBtn').addEventListener('click', () => {
    if (!engine._running) {
      engine.start();
    }
  });

  document.getElementById('intensity').addEventListener('input', e => {
    engine.setIntensity(parseInt(e.target.value, 10));
  });
  document.getElementById('airTexture').addEventListener('input', e => {
    engine.setAirTexture(parseInt(e.target.value, 10));
  });
  document.getElementById('resonance').addEventListener('input', e => {
    engine.setResonance(parseInt(e.target.value, 10));
  });
  document.getElementById('movement').addEventListener('input', e => {
    engine.setMovement(parseInt(e.target.value, 10));
  });
  document.getElementById('stereoWidth').addEventListener('input', e => {
    engine.setStereoWidth(parseInt(e.target.value, 10));
  });

  // Cleanup on page unload (optional but thorough)
  window.addEventListener('beforeunload', () => {
    engine.stop();
  });
});
