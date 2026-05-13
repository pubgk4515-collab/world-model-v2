// experts/rain/synthesis/transient_synth.js
// Symbiote Granular Rain Texture Engine
//
// NEW ARCHITECTURE:
//
// OLD:
// individual audible drops
//
// NEW:
// overlapping stochastic particle clouds
//
// GOALS:
// - remove tak tak tak
// - remove percussion identity
// - remove discrete impacts
// - create continuous rain texture
// - realistic ambience blending
// - ultra soft procedural rain
// - mobile safe
// - low CPU
//
// IMPORTANT:
// wind expert already owns:
// - air
// - movement
// - atmosphere
//
// so THIS engine only creates:
// micro texture energy

export class TransientSynth {

  constructor(audioContext) {

    this.audioContext = audioContext;

    this.destination = null;

    this.output = null;

    this.isConnected = false;

    this.isInitialized = false;

    // =====================================================
    // CHARACTER
    // =====================================================

    this.baseFrequency = 420;

    this.frequencyVariance = 260;

    // IMPORTANT:
    // quieter = more realistic

    this.outputGain = 0.038;

    // =====================================================
    // ENVELOPE
    // =====================================================

    // slower attack removes tak

    this.attackTime = 0.012;

    this.decayTime = 0.035;

    this.releaseTime = 0.06;

    // =====================================================
    // TEXTURE
    // =====================================================

    this.wetness = 0.65;

    this.darkness = 0.58;

    this.softness = 0.82;

    this.air = 0.25;

    // =====================================================
    // SPATIAL
    // =====================================================

    this.stereoSpread = 0.28;

    // =====================================================
    // SAFETY
    // =====================================================

    this.maxFrequency = 1800;

    this.minFrequency = 120;

    // =====================================================
    // NOISE
    // =====================================================

    this.noiseBuffer = null;

    this.bufferLengthSeconds = 2;
  }

  // =====================================================
  // INIT
  // =====================================================

  init() {

    if (this.isInitialized) {
      return;
    }

    this.createNoiseBuffer();

    this.output =
      this.audioContext.createGain();

    this.output.gain.value = 1.0;

    this.isInitialized = true;

    console.log(
      '[RAIN] Granular rain engine initialized'
    );
  }

  // =====================================================
  // NOISE BUFFER
  // =====================================================

  createNoiseBuffer() {

    const sampleRate =
      this.audioContext.sampleRate;

    const bufferSize =
      sampleRate *
      this.bufferLengthSeconds;

    const buffer =
      this.audioContext.createBuffer(
        2,
        bufferSize,
        sampleRate
      );

    for (let ch = 0; ch < 2; ch++) {

      const data =
        buffer.getChannelData(ch);

      let brown = 0;

      let slow = 0;

      for (let i = 0; i < bufferSize; i++) {

        const white =
          Math.random() * 2 - 1;

        brown +=
          (white - brown) * 0.02;

        slow =
          slow * 0.995 +
          brown * 0.005;

        const darkNoise =
          (white * 0.12) +
          (brown * 0.58) +
          (slow * 0.30);

        data[i] =
          darkNoise *
          (0.96 + Math.random() * 0.04);
      }
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

    if (this.output) {

      try {
        this.output.disconnect();
      } catch (_) {}

      this.output.connect(
        this.destination
      );
    }

    this.isConnected = true;

    console.log(
      '[RAIN] Granular engine connected'
    );
  }

  disconnect() {

    this.isConnected = false;

    this.destination = null;

    if (this.output) {

      try {
        this.output.disconnect();
      } catch (_) {}
    }
  }

  // =====================================================
  // MAIN DROP EVENT
  // =====================================================

  trigger(parameters = {}) {

    if (
      !this.isConnected ||
      !this.destination ||
      !this.noiseBuffer ||
      !this.output
    ) {
      return;
    }

    const now =
      this.audioContext.currentTime;

    // =====================================================
    // PARTICLE CLOUD
    // =====================================================

    // IMPORTANT:
    // NOT one impact anymore

    const particles =
      4 +
      Math.floor(
        Math.random() * 7
      );

    for (let i = 0; i < particles; i++) {

      const offset =
        Math.random() * 0.035;

      const frequency =
        this.clamp(

          this.baseFrequency +

          ((Math.random() - 0.5) *
            this.frequencyVariance) +

          (parameters.frequencyOffset || 0),

          this.minFrequency,
          this.maxFrequency
        );

      this.createParticle(
        now + offset,
        frequency,
        parameters
      );
    }
  }

  // =====================================================
  // PARTICLE
  // =====================================================

  createParticle(
    now,
    frequency,
    parameters = {}
  ) {

    const source =
      this.audioContext.createBufferSource();

    source.buffer =
      this.noiseBuffer;

    // IMPORTANT:
    // extra randomness kills repetition

    source.playbackRate.value =
      0.90 +
      Math.random() * 0.18;

    // =====================================================
    // FILTERS
    // =====================================================

    const highpass =
      this.audioContext.createBiquadFilter();

    const bandpass =
      this.audioContext.createBiquadFilter();

    const lowpass =
      this.audioContext.createBiquadFilter();

    const gain =
      this.audioContext.createGain();

    const panner =
      this.audioContext.createStereoPanner();

    // =====================================================
    // FILTER DESIGN
    // =====================================================

    // remove muddy drum lows

    highpass.type =
      'highpass';

    highpass.frequency.value =
      160 +
      (Math.random() * 80);

    highpass.Q.value =
      0.02;

    // broad noisy center

    bandpass.type =
      'bandpass';

    bandpass.frequency.value =
      frequency *
      (0.7 + Math.random() * 0.4);

    // LOW Q IS CRITICAL

    bandpass.Q.value =
      0.08;

    // dark cinematic rolloff

    lowpass.type =
      'lowpass';

    lowpass.frequency.value =
      1200 -
      (this.darkness * 400) +
      (Math.random() * 200);

    lowpass.Q.value =
      0.04;

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

    // IMPORTANT:
    // exponential attack
    // removes hard transient edge

    gain.gain.setValueAtTime(
      0.0001,
      now
    );

    gain.gain.exponentialRampToValueAtTime(
      this.outputGain *
      (0.7 + Math.random() * 0.5),

      attackEnd
    );

    gain.gain.exponentialRampToValueAtTime(
      0.004,
      decayEnd
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      releaseEnd
    );

    // =====================================================
    // ROUTING
    // =====================================================

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
  // CONTROLS
  // =====================================================

  setWetness(value) {

    this.wetness =
      this.clamp(value, 0, 1);
  }

  setDarkness(value) {

    this.darkness =
      this.clamp(value, 0, 1);
  }

  setSoftness(value) {

    this.softness =
      this.clamp(value, 0, 1);
  }

  setOutputGain(value) {

    this.outputGain =
      this.clamp(
        value,
        0.005,
        0.3
      );
  }

  // =====================================================
  // HELPERS
  // =====================================================

  clamp(value, min, max) {

    const n =
      Number(value);

    if (!Number.isFinite(n)) {
      return min;
    }

    return Math.max(
      min,
      Math.min(max, n)
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
      '[RAIN] Granular engine disposed'
    );
  }
}