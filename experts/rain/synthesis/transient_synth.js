// experts/rain/synthesis/transient_synth.js
// Symbiote Noise-Based Cinematic Rain Transient Synth
//
// FINAL DESIGN:
// - noise-first impact synthesis
// - no musical oscillator identity
// - darker, wetter, more physical droplets
// - soft bloom without flute/toy artifacts
// - mobile-safe
// - low CPU
//
// This version is intentionally "noise-centric" so the rain
// behaves like environmental impact energy, not an instrument.

export class TransientSynth {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.destination = null;
    this.isConnected = false;
    this.isInitialized = false;

    // =====================================================
    // CORE CHARACTER
    // =====================================================

    // Lower = darker / less toy-like.
    this.baseFrequency = 240;
    this.frequencyVariance = 120;

    this.outputGain = 0.11;

    // =====================================================
    // ENVELOPE
    // =====================================================

    this.attackTime = 0.0025;
    this.decayTime = 0.055;
    this.releaseTime = 0.095;

    // =====================================================
    // ENVIRONMENT
    // =====================================================

    this.wetness = 0.62;
    this.resonance = 0.2;
    this.bloom = 0.11;
    this.darkness = 0.6;
    this.softness = 0.84;
    this.air = 0.28;

    // =====================================================
    // SPATIAL
    // =====================================================

    this.stereoSpread = 0.18;
    this.pitchDrift = 0.03;
    this.microVariation = 0.08;

    // =====================================================
    // SAFETY
    // =====================================================

    this.maxFrequency = 2200;
    this.minFrequency = 70;

    // =====================================================
    // NOISE
    // =====================================================

    this.noiseBuffer = null;

    // =====================================================
    // INTERNAL MIX
    // =====================================================

    this.mixGain = null;
    this.toneLowpass = null;
    this.saturator = null;
    this.outputGainNode = null;
    this.stereoPanner = null;
  }

  // =====================================================
  // INIT
  // =====================================================

  init() {
    if (this.isInitialized) return;

    this.createNoiseBuffer();
    this.createOutputChain();

    this.isInitialized = true;

    console.log('[RAIN] TransientSynth initialized');
  }

  createNoiseBuffer() {
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 4;

    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let brown = 0;
    let last = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;

      // Brown-ish smoothing
      brown += (white - brown) * 0.018;

      // Extra diffusion to remove "static hiss"
      last = last * 0.985 + brown * 0.015;

      // Blend white + brown for a softer, denser bed
      const pinkish = (white * 0.16) + (brown * 0.62) + (last * 0.22);

      data[i] = pinkish * 0.55;
    }

    this.noiseBuffer = buffer;
  }

  createOutputChain() {
    this.mixGain = this.audioContext.createGain();
    this.toneLowpass = this.audioContext.createBiquadFilter();
    this.outputGainNode = this.audioContext.createGain();

    this.toneLowpass.type = 'lowpass';
    this.toneLowpass.frequency.value = 1800;
    this.toneLowpass.Q.value = 0.22;

    this.outputGainNode.gain.value = 1.0;
    this.mixGain.gain.value = 1.0;

    // Soft saturation to avoid sterile edges.
    this.saturator = this.audioContext.createWaveShaper();
    this.saturator.oversample = '2x';
    this.saturator.curve = this.makeSoftCurve(0.18);

    if (typeof this.audioContext.createStereoPanner === 'function') {
      this.stereoPanner = this.audioContext.createStereoPanner();
      this.stereoPanner.pan.value = 0;
    } else {
      this.stereoPanner = null;
    }

    this.mixGain.connect(this.saturator);
    this.saturator.connect(this.toneLowpass);
    this.toneLowpass.connect(this.outputGainNode);

    if (this.stereoPanner) {
      this.outputGainNode.connect(this.stereoPanner);
    }
  }

  makeSoftCurve(amount = 0.18) {
    const samples = 44100;
    const curve = new Float32Array(samples);

    const drive = 1 + amount * 4.5;
    const softness = 1.25 + amount * 2.2;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const shaped = Math.tanh(x * drive * softness);
      curve[i] = shaped * 0.92 + x * 0.08;
    }

    return curve;
  }

  // =====================================================
  // CONNECT
  // =====================================================

  connect(destination) {
    if (!this.isInitialized) {
      this.init();
    }

    if (destination && typeof destination.connect === 'function') {
      this.destination = destination;
    } else {
      this.destination = this.audioContext.destination;
    }

    if (this.stereoPanner) {
      this.stereoPanner.connect(this.destination);
    } else {
      this.outputGainNode.connect(this.destination);
    }

    this.isConnected = true;
    console.log('[RAIN] TransientSynth connected');
  }

  disconnect() {
    this.destination = null;
    this.isConnected = false;
  }

  // =====================================================
  // MAIN TRIGGER
  // =====================================================

  trigger(parameters = {}) {
    if (!this.isConnected || !this.destination || !this.noiseBuffer) {
      return;
    }

    const now = this.audioContext.currentTime;

    // =====================================================
    // INPUT PARAMS
    // =====================================================

    const wetness = this.clamp01(parameters.wetness ?? this.wetness);
    const resonance = this.clamp01(parameters.resonance ?? this.resonance);
    const bloom = this.clamp01(parameters.bloom ?? this.bloom);
    const darkness = this.clamp01(parameters.darkness ?? this.darkness);
    const softness = this.clamp01(parameters.softness ?? this.softness);
    const air = this.clamp01(parameters.air ?? this.air);
    const hardness = this.clamp01(parameters.hardness ?? 0.45);
    const brightness = this.clamp01(parameters.brightness ?? 0.35);
    const stereoSpread = this.clamp01(parameters.stereoSpread ?? this.stereoSpread);

    const freqOffset = parameters.frequencyOffset || 0;

    // This is NOT a tonal pitch.
    // It is a spectral center for noise shaping.
    const baseCenter =
      this.baseFrequency +
      (Math.random() - 0.5) * this.frequencyVariance +
      (Math.random() - 0.5) * 18 * this.microVariation +
      freqOffset;

    const centerFrequency = this.clamp(
      baseCenter,
      this.minFrequency,
      this.maxFrequency
    );

    // =====================================================
    // LAYERS
    // =====================================================

    this.createCrackLayer(now, centerFrequency, {
      wetness,
      resonance,
      darkness,
      hardness,
      brightness,
      stereoSpread
    });

    if (wetness > 0.12) {
      this.createBodyLayer(now, centerFrequency, {
        wetness,
        darkness,
        air,
        stereoSpread
      });
    }

    if (bloom > 0.05 || resonance > 0.08) {
      this.createBloomLayer(now, centerFrequency, {
        bloom,
        resonance,
        darkness,
        air,
        stereoSpread
      });
    }

    if (softness > 0.42) {
      this.createMicroReflections(now, centerFrequency, {
        softness,
        darkness,
        stereoSpread
      });
    }
  }

  // =====================================================
  // CRACK / IMPACT LAYER
  // =====================================================

  createCrackLayer(now, centerFrequency, params) {
    const source = this.audioContext.createBufferSource();
    source.buffer = this.noiseBuffer;

    const highpass = this.audioContext.createBiquadFilter();
    const bandpass = this.audioContext.createBiquadFilter();
    const lowpass = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    const panner = this.stereoPanner
      ? this.audioContext.createStereoPanner()
      : null;

    const crackCenter =
      this.clamp(
        centerFrequency * (0.92 + Math.random() * 0.18),
        110,
        1300
      );

    highpass.type = 'highpass';
    highpass.frequency.value = 55 + (params.darkness * 35);
    highpass.Q.value = 0.15;

    bandpass.type = 'bandpass';
    bandpass.frequency.value = crackCenter;
    bandpass.Q.value = 0.52 + (params.hardness * 0.38);

    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2100 - (params.darkness * 900) - (params.brightness * 250);
    lowpass.Q.value = 0.12;

    if (panner) {
      panner.pan.value = (Math.random() - 0.5) * params.stereoSpread;
    }

    const attackEnd = now + this.attackTime;
    const decayEnd = attackEnd + this.decayTime;
    const releaseEnd = decayEnd + this.releaseTime;

    const peakGain =
      0.035 +
      (params.hardness * 0.03) +
      (params.brightness * 0.018) +
      (params.wetness * 0.008);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, attackEnd);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.00012, 0.012 + (params.wetness * 0.004)),
      decayEnd
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gain);

    if (panner) {
      gain.connect(panner);
      panner.connect(this.mixGain);
    } else {
      gain.connect(this.mixGain);
    }

    source.start(now);
    source.stop(releaseEnd);
  }

  // =====================================================
  // BODY LAYER
  // =====================================================

  createBodyLayer(now, centerFrequency, params) {
    const source = this.audioContext.createBufferSource();
    source.buffer = this.noiseBuffer;

    const bandpass = this.audioContext.createBiquadFilter();
    const lowpass = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    const bodyCenter = this.clamp(
      centerFrequency * (0.28 + Math.random() * 0.18),
      70,
      520
    );

    bandpass.type = 'bandpass';
    bandpass.frequency.value = bodyCenter;
    bandpass.Q.value = 0.38;

    lowpass.type = 'lowpass';
    lowpass.frequency.value = 760 - (params.darkness * 260) - (params.air * 90);
    lowpass.Q.value = 0.08;

    const attackEnd = now + 0.003;
    const decayEnd = attackEnd + 0.075;
    const releaseEnd = decayEnd + 0.05;

    const bodyGain =
      0.018 +
      (params.wetness * 0.018) +
      (params.darkness * 0.01);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(bodyGain, attackEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);

    source.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.mixGain);

    source.start(now);
    source.stop(releaseEnd);
  }

  // =====================================================
  // BLOOM LAYER
  // =====================================================

  createBloomLayer(now, centerFrequency, params) {
    const source = this.audioContext.createBufferSource();
    source.buffer = this.noiseBuffer;

    const bandpass = this.audioContext.createBiquadFilter();
    const highpass = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    const panner = this.stereoPanner
      ? this.audioContext.createStereoPanner()
      : null;

    const bloomCenter = this.clamp(
      centerFrequency * (1.4 + Math.random() * 0.32),
      260,
      2200
    );

    highpass.type = 'highpass';
    highpass.frequency.value = 180 + (params.darkness * 65);
    highpass.Q.value = 0.12;

    bandpass.type = 'bandpass';
    bandpass.frequency.value = bloomCenter;
    bandpass.Q.value = 0.22 + (params.resonance * 0.22);

    if (panner) {
      panner.pan.value = (Math.random() - 0.5) * 0.22;
    }

    const start = now + 0.012;
    const peak = start + 0.028;
    const end = start + 0.14 + (params.bloom * 0.08);

    const bloomGain =
      0.0035 +
      (params.bloom * 0.005) +
      (params.resonance * 0.0025);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(bloomGain, peak);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gain);

    if (panner) {
      gain.connect(panner);
      panner.connect(this.mixGain);
    } else {
      gain.connect(this.mixGain);
    }

    source.start(start);
    source.stop(end);
  }

  // =====================================================
  // MICRO REFLECTIONS
  // =====================================================

  createMicroReflections(now, centerFrequency, params) {
    const count = 1 + Math.floor(params.softness * 2);

    for (let i = 0; i < count; i++) {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.noiseBuffer;

      const bandpass = this.audioContext.createBiquadFilter();
      const lowpass = this.audioContext.createBiquadFilter();
      const gain = this.audioContext.createGain();

      const delay = Math.random() * 0.018;
      const start = now + delay;
      const end = start + 0.036 + (Math.random() * 0.014);

      const microCenter = this.clamp(
        centerFrequency * (0.65 + Math.random() * 0.18),
        90,
        900
      );

      bandpass.type = 'bandpass';
      bandpass.frequency.value = microCenter;
      bandpass.Q.value = 0.24;

      lowpass.type = 'lowpass';
      lowpass.frequency.value = 1300 - (params.darkness * 420);
      lowpass.Q.value = 0.08;

      const microGain = 0.0018 + Math.random() * 0.0016;

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(microGain, start + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      source.connect(bandpass);
      bandpass.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(this.mixGain);

      source.start(start);
      source.stop(end);
    }
  }

  // =====================================================
  // CONTROLS
  // =====================================================

  setWetness(value) {
    this.wetness = this.clamp01(value);
  }

  setResonance(value) {
    this.resonance = this.clamp01(value);
  }

  setBloom(value) {
    this.bloom = this.clamp01(value);
  }

  setDarkness(value) {
    this.darkness = this.clamp01(value);
  }

  setSoftness(value) {
    this.softness = this.clamp01(value);
  }

  setAir(value) {
    this.air = this.clamp01(value);
  }

  setOutputGain(value) {
    this.outputGain = this.clamp(value, 0.01, 1);
    if (this.outputGainNode) {
      this.outputGainNode.gain.setValueAtTime(
        this.outputGain,
        this.audioContext.currentTime
      );
    }
  }

  setStereoSpread(value) {
    this.stereoSpread = this.clamp01(value);
  }

  update() {
    if (!this.isInitialized) return;

    const now = this.audioContext.currentTime;

    const lp =
      2000 -
      (this.darkness * 850) -
      (this.air * 180) -
      (this.softness * 110);

    this.toneLowpass.frequency.cancelScheduledValues(now);
    this.toneLowpass.frequency.linearRampToValueAtTime(
      this.clamp(lp, 420, 3200),
      now + 0.06
    );

    this.outputGainNode.gain.cancelScheduledValues(now);
    this.outputGainNode.gain.linearRampToValueAtTime(
      this.outputGain,
      now + 0.06
    );

    this.saturator.curve = this.makeSoftCurve(0.1 + this.bloom * 0.12);
  }

  // =====================================================
  // HELPERS
  // =====================================================

  clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  clamp(value, min, max) {
    const v = Number(value);
    if (Number.isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {
    this.disconnect();

    try {
      if (this.mixGain) this.mixGain.disconnect();
      if (this.toneLowpass) this.toneLowpass.disconnect();
      if (this.saturator) this.saturator.disconnect();
      if (this.outputGainNode) this.outputGainNode.disconnect();
      if (this.stereoPanner) this.stereoPanner.disconnect();
    } catch (_) {}

    this.noiseBuffer = null;
    this.isInitialized = false;

    console.log('[RAIN] TransientSynth disposed');
  }
}