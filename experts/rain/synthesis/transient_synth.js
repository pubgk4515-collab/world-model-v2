// experts/rain/synthesis/transient_synth.js
// Symbiote Noise-Based Cinematic Rain Transient Synth
//
// IMPORTANT SHIFT:
// Rain should feel like broadband wet texture,
// not like a pitched instrument.
//
// DESIGN GOALS:
// - remove xylophone / dhol / toy feel
// - make impacts noise-dominant
// - keep low-mid body subtle
// - preserve cinematic wet texture
// - stay mobile-safe
// - keep CPU low

export class TransientSynth {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.destination = null;
    this.isConnected = false;
    this.isInitialized = false;

    // =====================================================
    // CORE CHARACTER
    // =====================================================

    // Lowered so the impact center sits in a rain-like zone,
    // not a musical one.
    this.baseFrequency = 220;
    this.frequencyVariance = 120;

    this.outputGain = 0.11;

    // =====================================================
    // ENVELOPE
    // =====================================================

    this.attackTime = 0.0025;
    this.decayTime = 0.045;
    this.releaseTime = 0.085;

    // =====================================================
    // ATMOSPHERE
    // =====================================================

    this.wetness = 0.65;
    this.resonance = 0.14;
    this.bloom = 0.08;
    this.darkness = 0.58;
    this.softness = 0.82;
    this.air = 0.28;

    // =====================================================
    // SPATIAL
    // =====================================================

    this.stereoSpread = 0.22;

    // =====================================================
    // SAFETY
    // =====================================================

    this.maxFrequency = 1400;
    this.minFrequency = 70;

    // =====================================================
    // NOISE BUFFER
    // =====================================================

    this.noiseBuffer = null;
    this.bufferLengthSeconds = 2.0;

    // master output bus
    this.output = null;
  }

  // =====================================================
  // INIT
  // =====================================================

  init() {
    if (this.isInitialized) return;

    this.createNoiseBuffer();

    this.output = this.audioContext.createGain();
    this.output.gain.value = 1.0;

    this.isInitialized = true;

    console.log('[RAIN] Noise-based TransientSynth initialized');
  }

  // =====================================================
  // NOISE BUFFER
  // =====================================================

  createNoiseBuffer() {
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = Math.floor(sampleRate * this.bufferLengthSeconds);

    // stereo buffer for slight decorrelation
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);

      let brown = 0;
      let smoother = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;

        // brown-ish smoothing
        brown += (white - brown) * 0.018;

        // additional diffusion to avoid grainy hiss
        smoother = smoother * 0.992 + brown * 0.008;

        // very dark hybrid noise
        const value = (white * 0.14) + (brown * 0.55) + (smoother * 0.31);

        // slight channel decorrelation
        const stereoOffset =
          channel === 0
            ? 1.0
            : 0.985 + (Math.random() * 0.03);

        data[i] = value * stereoOffset;
      }
    }

    this.noiseBuffer = buffer;
  }

  // =====================================================
  // CONNECT
  // =====================================================

  connect(destination) {
    if (destination && typeof destination.connect === 'function') {
      this.destination = destination;
    } else {
      this.destination = this.audioContext.destination;
    }

    if (this.output) {
      try {
        this.output.disconnect();
      } catch (_) {}
      this.output.connect(this.destination);
    }

    this.isConnected = true;

    console.log('[RAIN] TransientSynth connected');
  }

  disconnect() {
    this.destination = null;
    this.isConnected = false;

    if (this.output) {
      try {
        this.output.disconnect();
      } catch (_) {}
    }
  }

  // =====================================================
  // MAIN DROP
  // =====================================================

  trigger(parameters = {}) {
    if (!this.isConnected || !this.destination || !this.noiseBuffer || !this.output) {
      return;
    }

    const now = this.audioContext.currentTime;

    const frequency = this._clamp(
      this.baseFrequency +
        ((Math.random() - 0.5) * this.frequencyVariance) +
        (parameters.frequencyOffset || 0),
      this.minFrequency,
      this.maxFrequency
    );

    const wetness = this._clamp(parameters.wetness ?? this.wetness, 0, 1);
    const resonance = this._clamp(parameters.resonance ?? this.resonance, 0, 1);
    const bloom = this._clamp(parameters.bloom ?? this.bloom, 0, 1);
    const darkness = this._clamp(parameters.darkness ?? this.darkness, 0, 1);
    const softness = this._clamp(parameters.softness ?? this.softness, 0, 1);
    const air = this._clamp(parameters.air ?? this.air, 0, 1);

    // primary rain impact
    this.createNoiseImpact(now, frequency, {
      wetness,
      resonance,
      bloom,
      darkness,
      softness,
      air,
      ...parameters,
    });

    // soft wet support body, but kept subtle so it doesn't turn into drums
    if (wetness > 0.12) {
      this.createWetBody(now, frequency, {
        wetness,
        darkness,
        ...parameters,
      });
    }

    // very subtle airy bloom
    if (bloom > 0.05) {
      this.createAirBloom(now, frequency, {
        bloom,
        air,
        darkness,
        ...parameters,
      });
    }

    // tiny micro reflections for realism
    if (softness > 0.4) {
      this.createMicroReflections(now, frequency, {
        softness,
        darkness,
        ...parameters,
      });
    }
  }

  // =====================================================
  // MAIN NOISE IMPACT
  // =====================================================

  createNoiseImpact(now, frequency, parameters = {}) {
    const source = this.audioContext.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = 0.92 + Math.random() * 0.14;

    const highpass = this.audioContext.createBiquadFilter();
    const bandpass = this.audioContext.createBiquadFilter();
    const lowpass = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    const panner = this.audioContext.createStereoPanner();

    const wetness = this._clamp(parameters.wetness ?? this.wetness, 0, 1);
    const resonance = this._clamp(parameters.resonance ?? this.resonance, 0, 1);
    const darkness = this._clamp(parameters.darkness ?? this.darkness, 0, 1);
    const air = this._clamp(parameters.air ?? this.air, 0, 1);
    const stereoSpread = this._clamp(parameters.stereoSpread ?? this.stereoSpread, 0, 1);

    // key change: keep the impact broad and non-musical
    const center = this._clamp(
      frequency * 0.72 + (Math.random() - 0.5) * 70,
      120,
      1100
    );

    const hpCutoff = 85 + (darkness * 90) + ((1 - wetness) * 35);
    const lpCutoff = 1500 + (air * 900) - (darkness * 550);

    highpass.type = 'highpass';
    highpass.frequency.value = hpCutoff;
    highpass.Q.value = 0.06;

    bandpass.type = 'bandpass';
    bandpass.frequency.value = center;
    bandpass.Q.value = 0.12 + (resonance * 0.16); // low Q, wide texture

    lowpass.type = 'lowpass';
    lowpass.frequency.value = this._clamp(lpCutoff, 700, 3200);
    lowpass.Q.value = 0.08;

    panner.pan.value = (Math.random() - 0.5) * stereoSpread;

    const attackEnd = now + this.attackTime;
    const decayEnd = attackEnd + this.decayTime;
    const releaseEnd = decayEnd + this.releaseTime;

    const level =
      this.outputGain *
      (0.72 + wetness * 0.35) *
      (0.85 + air * 0.15);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(level, attackEnd);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.008, level * 0.12), decayEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(panner);
    panner.connect(this.output);

    source.start(now);
    source.stop(releaseEnd);
  }

  // =====================================================
  // LOW WET BODY
  // =====================================================

  createWetBody(now, frequency, parameters = {}) {
    // tiny supporting body only — no drum-like mass
    const source = this.audioContext.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = 0.88 + Math.random() * 0.08;

    const lowpass = this.audioContext.createBiquadFilter();
    const bandpass = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    const panner = this.audioContext.createStereoPanner();

    const wetness = this._clamp(parameters.wetness ?? this.wetness, 0, 1);
    const darkness = this._clamp(parameters.darkness ?? this.darkness, 0, 1);
    const stereoSpread = this._clamp(parameters.stereoSpread ?? this.stereoSpread, 0, 1);

    const center = this._clamp(
      frequency * 0.24,
      110,
      420
    );

    bandpass.type = 'bandpass';
    bandpass.frequency.value = center;
    bandpass.Q.value = 0.08;

    lowpass.type = 'lowpass';
    lowpass.frequency.value = this._clamp(620 - (darkness * 260), 180, 800);
    lowpass.Q.value = 0.05;

    panner.pan.value = (Math.random() - 0.5) * stereoSpread * 0.5;

    const end = now + 0.07;

    const level = 0.012 * wetness;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(panner);
    panner.connect(this.output);

    source.start(now);
    source.stop(end);
  }

  // =====================================================
  // AIR BLOOM
  // =====================================================

  createAirBloom(now, frequency, parameters = {}) {
    const source = this.audioContext.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = 0.96 + Math.random() * 0.08;

    const bandpass = this.audioContext.createBiquadFilter();
    const lowpass = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    const panner = this.audioContext.createStereoPanner();

    const bloom = this._clamp(parameters.bloom ?? this.bloom, 0, 1);
    const air = this._clamp(parameters.air ?? this.air, 0, 1);
    const darkness = this._clamp(parameters.darkness ?? this.darkness, 0, 1);

    bandpass.type = 'bandpass';
    bandpass.frequency.value = this._clamp(frequency * 0.92, 180, 1200);
    bandpass.Q.value = 0.22;

    lowpass.type = 'lowpass';
    lowpass.frequency.value = this._clamp(2200 - (darkness * 600), 900, 2800);
    lowpass.Q.value = 0.05;

    panner.pan.value = (Math.random() - 0.5) * 0.22;

    const start = now + 0.01;
    const end = start + 0.1;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.004 * bloom * (0.8 + air * 0.4), start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(panner);
    panner.connect(this.output);

    source.start(start);
    source.stop(end);
  }

  // =====================================================
  // MICRO REFLECTIONS
  // =====================================================

  createMicroReflections(now, frequency, parameters = {}) {
    const softness = this._clamp(parameters.softness ?? this.softness, 0, 1);
    const darkness = this._clamp(parameters.darkness ?? this.darkness, 0, 1);

    const count = 1 + Math.floor(softness * 2);

    for (let i = 0; i < count; i++) {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.playbackRate.value = 0.92 + Math.random() * 0.12;

      const filter = this.audioContext.createBiquadFilter();
      const gain = this.audioContext.createGain();
      const panner = this.audioContext.createStereoPanner();

      const delay = Math.random() * 0.02;
      const start = now + delay;
      const end = start + 0.03 + Math.random() * 0.015;

      filter.type = 'bandpass';
      filter.frequency.value = this._clamp(
        frequency * (0.55 + Math.random() * 0.25),
        120,
        1200
      );
      filter.Q.value = 0.18;

      panner.pan.value = (Math.random() - 0.5) * 0.25;

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.0022, start + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.output);

      source.start(start);
      source.stop(end);
    }
  }

  // =====================================================
  // CONTROLS
  // =====================================================

  setWetness(value) {
    this.wetness = this._clamp(value, 0, 1);
  }

  setResonance(value) {
    this.resonance = this._clamp(value, 0, 1);
  }

  setBloom(value) {
    this.bloom = this._clamp(value, 0, 1);
  }

  setDarkness(value) {
    this.darkness = this._clamp(value, 0, 1);
  }

  setSoftness(value) {
    this.softness = this._clamp(value, 0, 1);
  }

  setOutputGain(value) {
    this.outputGain = this._clamp(value, 0.01, 1);
  }

  // =====================================================
  // HELPERS
  // =====================================================

  _clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {
    this.disconnect();
    this.noiseBuffer = null;
    this.isInitialized = false;
    console.log('[RAIN] TransientSynth disposed');
  }
}