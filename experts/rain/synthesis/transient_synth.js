// experts/rain/synthesis/transient_synth.js
// Symbiote Natural Rain Texture Engine
//
// TARGET:
//
// not:
// TAK TAK TAK
//
// not:
// ultra blurry fog mush
//
// but:
// soft realistic rain particles
//
// KEY FIXES:
//
// - shorter drop duration
// - softer transient edge
// - controlled mid sharpness
// - less muddy
// - less drum body
// - less xylophone pitch
// - more realistic rain grit
//
// DESIGN:
//
// real rain impacts are:
// broadband + short + random
//
// NOT:
// tonal resonant objects

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

    // IMPORTANT:
    // lower center frequency
    // removes xylophone feel

    this.baseFrequency = 340;

    this.frequencyVariance = 160;

    // IMPORTANT:
    // balanced level

    this.outputGain = 0.026;

    // =====================================================
    // ENVELOPE
    // =====================================================

    // THIS IS THE MAIN FIX

    // old:
    // too sharp

    // previous:
    // too blurry

    // now:
    // balanced

    this.attackTime = 0.006;

    this.decayTime = 0.014;

    this.releaseTime = 0.018;

    // =====================================================
    // TEXTURE
    // =====================================================

    this.darkness = 0.58;

    this.stereoSpread = 0.18;

    // =====================================================
    // SAFETY
    // =====================================================

    this.minFrequency = 160;

    this.maxFrequency = 1600;

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

    this.output =
      this.audioContext.createGain();

    // softer overall texture

    this.output.gain.value = 0.9;

    this.isInitialized = true;

    console.log(
      '[RAIN] Natural rain engine initialized'
    );
  }

  // =====================================================
  // NOISE BUFFER
  // =====================================================

  createNoiseBuffer() {

    const sampleRate =
      this.audioContext.sampleRate;

    const bufferSize =
      sampleRate * 2;

    const buffer =
      this.audioContext.createBuffer(
        1,
        bufferSize,
        sampleRate
      );

    const data =
      buffer.getChannelData(0);

    let brown = 0;

    for (let i = 0; i < bufferSize; i++) {

      const white =
        Math.random() * 2 - 1;

      // smoother darker noise

      brown +=
        (white - brown) * 0.015;

      // IMPORTANT:
      // mostly brown
      // little white

      data[i] =
        (
          brown * 0.82 +
          white * 0.18
        ) * 0.7;
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

    try {

      this.output.disconnect();

    } catch (_) {}

    this.output.connect(
      this.destination
    );

    this.isConnected = true;

    console.log(
      '[RAIN] Natural rain engine connected'
    );
  }

  disconnect() {

    this.isConnected = false;

    try {

      this.output.disconnect();

    } catch (_) {}
  }

  // =====================================================
  // MAIN EVENT
  // =====================================================

  trigger(parameters = {}) {

    if (
      !this.isConnected ||
      !this.noiseBuffer
    ) {
      return;
    }

    const now =
      this.audioContext.currentTime;

    // IMPORTANT:
    // fewer particles now

    // too many =
    // mush blur

    const particles =
      2 +
      Math.floor(
        Math.random() * 3
      );

    for (let i = 0; i < particles; i++) {

      const offset =
        Math.random() * 0.028;

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
        frequency
      );
    }
  }

  // =====================================================
  // PARTICLE
  // =====================================================

  createParticle(
    now,
    frequency
  ) {

    const source =
      this.audioContext.createBufferSource();

    source.buffer =
      this.noiseBuffer;

    // IMPORTANT:
    // more randomness
    // less repetition

    source.playbackRate.value =
      0.92 +
      Math.random() * 0.22;

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
    // REMOVE DRUM LOWS
    // =====================================================

    highpass.type =
      'highpass';

    highpass.frequency.value =
      240;

    highpass.Q.value =
      0.02;

    // =====================================================
    // MAIN TEXTURE SHAPE
    // =====================================================

    bandpass.type =
      'bandpass';

    bandpass.frequency.value =
      frequency;

    // IMPORTANT:
    // low Q removes pitch

    bandpass.Q.value =
      0.045;

    // =====================================================
    // DARK TOP
    // =====================================================

    lowpass.type =
      'lowpass';

    lowpass.frequency.value =
      1250 -
      (this.darkness * 400);

    lowpass.Q.value =
      0.02;

    // =====================================================
    // PAN
    // =====================================================

    panner.pan.value =
      (Math.random() - 0.5) *
      this.stereoSpread;

    // =====================================================
    // ENVELOPE
    // =====================================================

    // IMPORTANT:
    // shorter duration now

    const attackEnd =
      now + this.attackTime;

    const decayEnd =
      attackEnd + this.decayTime;

    const releaseEnd =
      decayEnd + this.releaseTime;

    // IMPORTANT:
    // begin above zero

    gain.gain.setValueAtTime(
      0.001,
      now
    );

    // IMPORTANT:
    // soft but NOT blurry

    gain.gain.linearRampToValueAtTime(

      this.outputGain *
      (0.85 + Math.random() * 0.3),

      attackEnd
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0015,
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

    source.stop(
  releaseEnd + 0.005
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
  // CONTROLS
  // =====================================================

  setOutputGain(value) {

    this.outputGain =
      this.clamp(
        value,
        0.002,
        0.08
      );
  }

  setDarkness(value) {

    this.darkness =
      this.clamp(value, 0, 1);
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {

    this.disconnect();

    this.noiseBuffer = null;

    this.isInitialized = false;

    console.log(
      '[RAIN] Natural rain engine disposed'
    );
  }
}