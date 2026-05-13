// experts/rain/synthesis/saturation.js
// Cinematic Rain Saturation Processor
// Adds soft analog warmth, wet density,
// low-level harmonic bloom,
// and removes sterile digital sharpness.
//
// IMPORTANT:
// This is NOT aggressive distortion.
// Rain ambience must remain soft, breathable, and immersive.

export class Saturation {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.input = null;
    this.output = null;

    this.preGain = null;
    this.postGain = null;

    this.waveShaper = null;

    this.lowpass = null;
    this.highpass = null;

    this.dryGain = null;
    this.wetGain = null;

    this.isInitialized = false;
    this.isConnected = false;

    // =====================================================
    // STATE
    // =====================================================

    this.amount = 0.12;

    this.warmth = 0.45;

    this.softness = 0.7;

    this.darkness = 0.35;

    this.outputLevel = 0.9;

    this.wetLevel = 0.22;
  }

  // =====================================================
  // INIT
  // =====================================================

  init() {
    if (this.isInitialized) return;

    // IO
    this.input =
      this.audioContext.createGain();

    this.output =
      this.audioContext.createGain();

    // Pre gain
    this.preGain =
      this.audioContext.createGain();

    // Post gain
    this.postGain =
      this.audioContext.createGain();

    // Saturation
    this.waveShaper =
      this.audioContext.createWaveShaper();

    this.waveShaper.oversample = '4x';

    // Tone shaping
    this.lowpass =
      this.audioContext.createBiquadFilter();

    this.lowpass.type = 'lowpass';

    this.lowpass.frequency.value = 6200;

    this.lowpass.Q.value = 0.2;

    this.highpass =
      this.audioContext.createBiquadFilter();

    this.highpass.type = 'highpass';

    this.highpass.frequency.value = 90;

    this.highpass.Q.value = 0.3;

    // Mix
    this.dryGain =
      this.audioContext.createGain();

    this.wetGain =
      this.audioContext.createGain();

    // Initial values
    this.preGain.gain.value = 1.25;

    this.postGain.gain.value = this.outputLevel;

    this.dryGain.gain.value = 0.9;

    this.wetGain.gain.value = this.wetLevel;

    // Generate initial curve
    this.updateCurve();

    // =====================================================
    // ROUTING
    // =====================================================

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Wet path
    this.input.connect(this.highpass);

    this.highpass.connect(this.preGain);

    this.preGain.connect(this.waveShaper);

    this.waveShaper.connect(this.lowpass);

    this.lowpass.connect(this.postGain);

    this.postGain.connect(this.wetGain);

    this.wetGain.connect(this.output);

    this.isInitialized = true;

    console.log('[RAIN] Saturation initialized');
  }

  // =====================================================
  // CONNECT
  // =====================================================

  connect(destination) {
    if (!this.isInitialized) {
      this.init();
    }

    if (!destination) {
      console.warn(
        '[RAIN] Saturation.connect() invalid destination'
      );

      return;
    }

    this.output.connect(destination);

    this.isConnected = true;

    console.log('[RAIN] Saturation connected');
  }

  disconnect() {
    try {
      if (this.output) {
        this.output.disconnect();
      }

      this.isConnected = false;
    } catch (error) {
      console.warn(
        '[RAIN] Saturation disconnect error:',
        error
      );
    }
  }

  getInput() {
    if (!this.isInitialized) {
      this.init();
    }

    return this.input;
  }

  // =====================================================
  // UPDATE
  // =====================================================

  update() {
    this.updateFilters();
  }

  updateFilters() {
    if (!this.isInitialized) return;

    const now =
      this.audioContext.currentTime;

    // Softer darker ambience
    const cutoff =
      8500 -
      (this.darkness * 4500);

    this.lowpass.frequency
      .cancelScheduledValues(now);

    this.lowpass.frequency
      .linearRampToValueAtTime(
        cutoff,
        now + 0.08
      );

    // Wet blend
    const wet =
      0.04 +
      (this.amount * 0.32);

    this.wetGain.gain
      .cancelScheduledValues(now);

    this.wetGain.gain
      .linearRampToValueAtTime(
        wet,
        now + 0.08
      );

    // Gentle drive
    const drive =
      1 +
      (this.amount * 2.5);

    this.preGain.gain
      .cancelScheduledValues(now);

    this.preGain.gain
      .linearRampToValueAtTime(
        drive,
        now + 0.08
      );

    // Rebuild curve
    this.updateCurve();
  }

  // =====================================================
  // CURVE
  // =====================================================

  updateCurve() {
    if (!this.waveShaper) return;

    this.waveShaper.curve =
      this.makeSoftCurve(
        this.amount,
        this.softness,
        this.warmth
      );
  }

  makeSoftCurve(amount, softness, warmth) {
    const samples = 44100;

    const curve =
      new Float32Array(samples);

    const drive =
      1 +
      (amount * 5);

    const soft =
      1.5 +
      (softness * 4);

    const warm =
      0.6 +
      (warmth * 1.4);

    for (let i = 0; i < samples; i++) {
      const x =
        (i * 2) / samples - 1;

      // Soft analog-like saturation
      const shaped =
        Math.tanh(
          x *
          drive *
          soft
        );

      // Blend for warmth
      curve[i] =
        (shaped * warm) +
        (x * (1 - warm));
    }

    return curve;
  }

  // =====================================================
  // SETTERS
  // =====================================================

  setAmount(value) {
    this.amount =
      Math.max(0, Math.min(1, value));

    this.update();
  }

  setWarmth(value) {
    this.warmth =
      Math.max(0, Math.min(1, value));

    this.update();
  }

  setSoftness(value) {
    this.softness =
      Math.max(0, Math.min(1, value));

    this.update();
  }

  setDarkness(value) {
    this.darkness =
      Math.max(0, Math.min(1, value));

    this.update();
  }

  setWetLevel(value) {
    this.wetLevel =
      Math.max(0, Math.min(1, value));

    this.update();
  }

  setOutputLevel(value) {
    this.outputLevel =
      Math.max(0, Math.min(2, value));

    if (this.postGain) {
      this.postGain.gain.setValueAtTime(
        this.outputLevel,
        this.audioContext.currentTime
      );
    }
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {
    try {
      this.disconnect();

      if (this.input) this.input.disconnect();
      if (this.output) this.output.disconnect();

      if (this.preGain) this.preGain.disconnect();
      if (this.postGain) this.postGain.disconnect();

      if (this.waveShaper) this.waveShaper.disconnect();

      if (this.lowpass) this.lowpass.disconnect();
      if (this.highpass) this.highpass.disconnect();

      if (this.dryGain) this.dryGain.disconnect();
      if (this.wetGain) this.wetGain.disconnect();

      this.isInitialized = false;

      console.log('[RAIN] Saturation disposed');
    } catch (error) {
      console.warn(
        '[RAIN] Saturation dispose error:',
        error
      );
    }
  }
}