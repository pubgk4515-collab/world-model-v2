// experts/rain/synthesis/transient_synth.js
// Symbiote Ultra-Soft Rain Texture Engine
//
// THIS VERSION FIXES:
//
// - sharp attacks
// - tak tak tak
// - percussion identity
// - clicky onset perception
// - discrete impact feeling
//
// CORE IDEA:
//
// REAL RAIN ≠ impacts
//
// REAL RAIN =
// soft stochastic texture wash
//
// IMPORTANT CHANGE:
//
// we intentionally BLUR the transient.
//
// no sharp edges.
// no clear onset.
// no hard peaks.
//
// this is now:
// "texture synthesis"
// NOT percussion synthesis.

export class TransientSynth {

  constructor(audioContext) {

    this.audioContext = audioContext;

    this.destination = null;

    this.output = null;

    this.masterLowpass = null;

    this.masterCompressor = null;

    this.isConnected = false;

    this.isInitialized = false;

    // =====================================================
    // TEXTURE CHARACTER
    // =====================================================

    // MUCH LOWER

    this.baseFrequency = 260;

    this.frequencyVariance = 140;

    // IMPORTANT:
    // quieter = softer

    this.outputGain = 0.018;

    // =====================================================
    // ENVELOPE
    // =====================================================

    // THIS IS THE BIG FIX

    // very slow fade-in
    // removes attack perception

    this.attackTime = 0.040;

    // smooth texture bloom

    this.decayTime = 0.080;

    this.releaseTime = 0.12;

    // =====================================================
    // TEXTURE
    // =====================================================

    this.darkness = 0.72;

    this.softness = 0.94;

    this.stereoSpread = 0.16;

    // =====================================================
    // SAFETY
    // =====================================================

    this.minFrequency = 120;

    this.maxFrequency = 1200;

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

    this.output.gain.value = 1.0;

    // =====================================================
    // MASTER SOFTENING
    // =====================================================

    // THIS is the huge realism fix

    this.masterLowpass =
      this.audioContext.createBiquadFilter();

    this.masterLowpass.type =
      'lowpass';

    this.masterLowpass.frequency.value =
      1400;

    this.masterLowpass.Q.value =
      0.03;

    // compressor smooths peaks

    this.masterCompressor =
      this.audioContext.createDynamicsCompressor();

    this.masterCompressor.threshold.value =
      -32;

    this.masterCompressor.knee.value =
      30;

    this.masterCompressor.ratio.value =
      2;

    this.masterCompressor.attack.value =
      0.04;

    this.masterCompressor.release.value =
      0.25;

    // =====================================================
    // ROUTING
    // =====================================================

    this.output.connect(
      this.masterLowpass
    );

    this.masterLowpass.connect(
      this.masterCompressor
    );

    this.isInitialized = true;

    console.log(
      '[RAIN] Ultra-soft rain engine initialized'
    );
  }

  // =====================================================
  // NOISE BUFFER
  // =====================================================

  createNoiseBuffer() {

    const sampleRate =
      this.audioContext.sampleRate;

    const bufferSize =
      sampleRate * 3;

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

      let ultraSlow = 0;

      for (let i = 0; i < bufferSize; i++) {

        const white =
          Math.random() * 2 - 1;

        // VERY SMOOTH random walk

        brown +=
          (white - brown) * 0.008;

        ultraSlow =
          ultraSlow * 0.999 +
          brown * 0.001;

        // dark soft noise

        data[i] =
          (
            brown * 0.72 +
            ultraSlow * 0.22 +
            white * 0.06
          ) * 0.7;
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

    if (
      this.masterCompressor
    ) {

      try {

        this.masterCompressor.disconnect();

      } catch (_) {}

      this.masterCompressor.connect(
        this.destination
      );
    }

    this.isConnected = true;

    console.log(
      '[RAIN] Ultra-soft rain engine connected'
    );
  }

  disconnect() {

    this.isConnected = false;

    try {

      this.masterCompressor?.disconnect();

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

    // =====================================================
    // MUCH HIGHER CLOUD COUNT
    // =====================================================

    // THIS is another critical realism fix

    // more overlap
    // less individual identity

    const particles =
      8 +
      Math.floor(
        Math.random() * 12
      );

    for (let i = 0; i < particles; i++) {

      // MUCH WIDER TIME BLUR

      const offset =
        Math.random() * 0.09;

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
    // random playback destroys repetition

    source.playbackRate.value =
      0.82 +
      Math.random() * 0.28;

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
    // REMOVE DRUM BODY
    // =====================================================

    highpass.type =
      'highpass';

    highpass.frequency.value =
      260;

    highpass.Q.value =
      0.01;

    // =====================================================
    // VERY WIDE BANDPASS
    // =====================================================

    // LOW Q is EXTREMELY important

    bandpass.type =
      'bandpass';

    bandpass.frequency.value =
      frequency;

    bandpass.Q.value =
      0.015;

    // =====================================================
    // DARK TOP
    // =====================================================

    lowpass.type =
      'lowpass';

    lowpass.frequency.value =
      900;

    lowpass.Q.value =
      0.01;

    // =====================================================
    // PAN
    // =====================================================

    panner.pan.value =
      (Math.random() - 0.5) *
      this.stereoSpread;

    // =====================================================
    // ENVELOPE
    // =====================================================

    // MASSIVE FIX:
    // NO FAST ATTACKS

    const attackEnd =
      now + this.attackTime;

    const decayEnd =
      attackEnd + this.decayTime;

    const releaseEnd =
      decayEnd + this.releaseTime;

    // IMPORTANT:
    // begin ABOVE zero
    // avoids perceived click transient

    gain.gain.setValueAtTime(
      0.002,
      now
    );

    // VERY slow rise

    gain.gain.linearRampToValueAtTime(

      this.outputGain *
      (0.8 + Math.random() * 0.4),

      attackEnd
    );

    // smooth fade

    gain.gain.exponentialRampToValueAtTime(
      0.003,
      decayEnd
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
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

    // =====================================================
    // START
    // =====================================================

    source.start(now);

    source.stop(releaseEnd);
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

    if (this.masterLowpass) {

      this.masterLowpass.frequency.value =
        1600 -
        (this.darkness * 900);
    }
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {

    this.disconnect();

    this.noiseBuffer = null;

    this.isInitialized = false;

    console.log(
      '[RAIN] Ultra-soft rain engine disposed'
    );
  }
}