// experts/rain/synthesis/transient_synth.js
// Symbiote Noise-Based Cinematic Rain Transient Synth
//
// HUGE ARCHITECTURE SHIFT:
//
// OLD:
// oscillator-centric rain
//
// NEW:
// noise-transient-centric rain
//
// WHY:
// Real rain is broadband chaotic energy,
// NOT stable musical pitch.
//
// GOALS:
// - remove instrument/xylophone feel
// - realistic rain texture
// - soft chaotic impacts
// - cinematic wet atmosphere
// - mobile-safe
// - low CPU
// - zero harsh ringing

export class TransientSynth {

  constructor(audioContext) {

    this.audioContext = audioContext;

    this.destination = null;

    this.isConnected = false;

    this.isInitialized = false;

    // =====================================================
    // CORE CHARACTER
    // =====================================================

    this.baseFrequency = 320;

    this.frequencyVariance = 140;

    this.outputGain = 0.12;

    // =====================================================
    // ENVELOPE
    // =====================================================

    this.attackTime = 0.002;

    this.decayTime = 0.05;

    this.releaseTime = 0.09;

    // =====================================================
    // ATMOSPHERE
    // =====================================================

    this.wetness = 0.65;

    this.resonance = 0.18;

    this.bloom = 0.12;

    this.darkness = 0.55;

    this.softness = 0.82;

    this.air = 0.28;

    // =====================================================
    // SPATIAL
    // =====================================================

    this.stereoSpread = 0.18;

    // =====================================================
    // SAFETY
    // =====================================================

    this.maxFrequency = 2200;

    this.minFrequency = 80;

    // =====================================================
    // NOISE BUFFER
    // =====================================================

    this.noiseBuffer = null;
  }

  // =====================================================
  // INIT
  // =====================================================

  init() {

    if (this.isInitialized) {
      return;
    }

    this.createNoiseBuffer();

    this.isInitialized = true;

    console.log(
      '[RAIN] Noise-based TransientSynth initialized'
    );
  }

  // =====================================================
  // NOISE BUFFER
  // =====================================================

  createNoiseBuffer() {

    const bufferSize =
      this.audioContext.sampleRate * 2;

    const buffer =
      this.audioContext.createBuffer(
        1,
        bufferSize,
        this.audioContext.sampleRate
      );

    const data =
      buffer.getChannelData(0);

    // =====================================================
    // DARK BROWN/PINK HYBRID
    // =====================================================

    let brown = 0;

    for (let i = 0; i < bufferSize; i++) {

      const white =
        Math.random() * 2 - 1;

      brown +=
        (white - brown) * 0.018;

      // darker smoother noise

      data[i] =
        (white * 0.18) +
        (brown * 0.82);
    }

    this.noiseBuffer = buffer;
  }

  // =====================================================
  // CONNECT
  // =====================================================

  connect(destination) {

    if (
      destination &&
      typeof destination.connect ===
      'function'
    ) {

      this.destination = destination;

    } else {

      this.destination =
        this.audioContext.destination;
    }

    this.isConnected = true;

    console.log(
      '[RAIN] TransientSynth connected'
    );
  }

  disconnect() {

    this.destination = null;

    this.isConnected = false;
  }

  // =====================================================
  // MAIN DROP
  // =====================================================

  trigger(parameters = {}) {

    if (
      !this.isConnected ||
      !this.destination
    ) {
      return;
    }

    const now =
      this.audioContext.currentTime;

    // =====================================================
    // LOWER RANDOMIZED FREQUENCY
    // =====================================================

    const frequency =
      Math.max(
        this.minFrequency,
        Math.min(
          this.maxFrequency,

          this.baseFrequency +

          ((Math.random() - 0.5) *
            this.frequencyVariance) +

          (parameters.frequencyOffset || 0)
        )
      );

    // =====================================================
    // MAIN NOISE IMPACT
    // =====================================================

    this.createNoiseImpact(
      now,
      frequency,
      parameters
    );

    // =====================================================
    // LOW WET BODY
    // =====================================================

    if (this.wetness > 0.15) {

      this.createWetBody(
        now,
        frequency,
        parameters
      );
    }

    // =====================================================
    // SOFT AIR BLOOM
    // =====================================================

    if (this.bloom > 0.05) {

      this.createAirBloom(
        now,
        frequency,
        parameters
      );
    }

    // =====================================================
    // MICRO REFLECTIONS
    // =====================================================

    if (this.softness > 0.4) {

      this.createMicroReflections(
        now,
        frequency
      );
    }
  }

  // =====================================================
  // MAIN NOISE IMPACT
  // =====================================================

  createNoiseImpact(
    now,
    frequency,
    parameters
  ) {

    const source =
      this.audioContext.createBufferSource();

    source.buffer =
      this.noiseBuffer;

    // =====================================================
    // FILTERS
    // =====================================================

    const bandpass =
      this.audioContext.createBiquadFilter();

    const lowpass =
      this.audioContext.createBiquadFilter();

    const gain =
      this.audioContext.createGain();

    const panner =
      this.audioContext.createStereoPanner();

    // =====================================================
    // RANDOMIZED IMPACT FILTERING
    // =====================================================

    bandpass.type =
      'bandpass';

    bandpass.frequency.value =
      frequency;

    // LOW Q = NON MUSICAL

    bandpass.Q.value =
      0.7;

    lowpass.type =
      'lowpass';

    lowpass.frequency.value =
      1800 -
      (this.darkness * 900);

    lowpass.Q.value =
      0.1;

    // =====================================================
    // PAN
    // =====================================================

    panner.pan.value =
      (Math.random() - 0.5) *
      this.stereoSpread;

    // =====================================================
    // ENVELOPE
    // =====================================================

    const attackEnd =
      now + this.attackTime;

    const decayEnd =
      attackEnd + this.decayTime;

    const releaseEnd =
      decayEnd + this.releaseTime;

    gain.gain.setValueAtTime(
      0.0001,
      now
    );

    gain.gain.linearRampToValueAtTime(
      this.outputGain,
      attackEnd
    );

    gain.gain.exponentialRampToValueAtTime(
      0.015,
      decayEnd
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      releaseEnd
    );

    // =====================================================
    // ROUTING
    // =====================================================

    source.connect(bandpass);

    bandpass.connect(lowpass);

    lowpass.connect(gain);

    gain.connect(panner);

    panner.connect(this.destination);

    source.start(now);

    source.stop(releaseEnd);
  }

  // =====================================================
  // LOW WET BODY
  // =====================================================

  createWetBody(
    now,
    frequency
  ) {

    // subtle low-frequency body
    // ONLY supporting layer now

    const osc =
      this.audioContext.createOscillator();

    const gain =
      this.audioContext.createGain();

    const lowpass =
      this.audioContext.createBiquadFilter();

    osc.type =
      'triangle';

    osc.frequency.value =
      Math.max(
        55,
        frequency * 0.16
      );

    lowpass.type =
      'lowpass';

    lowpass.frequency.value =
      420;

    lowpass.Q.value =
      0.05;

    const end =
      now + 0.08;

    gain.gain.setValueAtTime(
      0.0001,
      now
    );

    gain.gain.linearRampToValueAtTime(
      0.018 * this.wetness,
      now + 0.004
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      end
    );

    osc.connect(lowpass);

    lowpass.connect(gain);

    gain.connect(this.destination);

    osc.start(now);

    osc.stop(end);
  }

  // =====================================================
  // AIR BLOOM
  // =====================================================

  createAirBloom(
    now,
    frequency
  ) {

    const source =
      this.audioContext.createBufferSource();

    source.buffer =
      this.noiseBuffer;

    const bandpass =
      this.audioContext.createBiquadFilter();

    const gain =
      this.audioContext.createGain();

    const panner =
      this.audioContext.createStereoPanner();

    bandpass.type =
      'bandpass';

    bandpass.frequency.value =
      frequency * 0.9;

    bandpass.Q.value =
      0.4;

    panner.pan.value =
      (Math.random() - 0.5) *
      0.3;

    const start =
      now + 0.01;

    const end =
      start + 0.12;

    gain.gain.setValueAtTime(
      0.0001,
      start
    );

    gain.gain.linearRampToValueAtTime(
      0.006 * this.bloom,
      start + 0.02
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      end
    );

    source.connect(bandpass);

    bandpass.connect(gain);

    gain.connect(panner);

    panner.connect(this.destination);

    source.start(start);

    source.stop(end);
  }

  // =====================================================
  // MICRO REFLECTIONS
  // =====================================================

  createMicroReflections(
    now,
    frequency
  ) {

    const count =
      1 +
      Math.floor(
        this.softness * 2
      );

    for (let i = 0; i < count; i++) {

      const source =
        this.audioContext.createBufferSource();

      source.buffer =
        this.noiseBuffer;

      const filter =
        this.audioContext.createBiquadFilter();

      const gain =
        this.audioContext.createGain();

      const delay =
        Math.random() * 0.018;

      const start =
        now + delay;

      const end =
        start + 0.035;

      filter.type =
        'bandpass';

      filter.frequency.value =
        frequency *
        (0.7 + Math.random() * 0.25);

      filter.Q.value =
        0.35;

      gain.gain.setValueAtTime(
        0.0001,
        start
      );

      gain.gain.linearRampToValueAtTime(
        0.0025,
        start + 0.003
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        end
      );

      source.connect(filter);

      filter.connect(gain);

      gain.connect(this.destination);

      source.start(start);

      source.stop(end);
    }
  }

  // =====================================================
  // CONTROLS
  // =====================================================

  setWetness(value) {

    this.wetness =
      Math.max(0, Math.min(1, value));
  }

  setResonance(value) {

    this.resonance =
      Math.max(0, Math.min(1, value));
  }

  setBloom(value) {

    this.bloom =
      Math.max(0, Math.min(1, value));
  }

  setDarkness(value) {

    this.darkness =
      Math.max(0, Math.min(1, value));
  }

  setSoftness(value) {

    this.softness =
      Math.max(0, Math.min(1, value));
  }

  setOutputGain(value) {

    this.outputGain =
      Math.max(
        0.01,
        Math.min(1, value)
      );
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {

    this.disconnect();

    this.noiseBuffer = null;

    this.isInitialized = false;

    console.log(
      '[RAIN] TransientSynth disposed'
    );
  }
}