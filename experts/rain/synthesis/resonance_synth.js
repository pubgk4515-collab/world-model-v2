// experts/rain/synthesis/resonance_synth.js
// Cinematic Rain Resonance Synth
// Generates soft environmental bloom, metallic ringing,
// humid resonance tails, roof resonance,
// and subtle flute-like atmospheric bloom.

export class ResonanceSynth {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.input = null;
    this.output = null;

    this.bandpass = null;
    this.lowpass = null;
    this.highshelf = null;

    this.wetGain = null;
    this.dryGain = null;

    this.feedbackDelay = null;
    this.feedbackGain = null;

    this.isInitialized = false;
    this.isConnected = false;

    // =====================================================
    // RESONANCE STATE
    // =====================================================

    this.frequency = 1400;

    this.resonance = 0.45;

    this.damping = 0.5;

    this.wetness = 0.6;

    this.darkness = 0.4;

    this.bloom = 0.35;

    this.stereoSpread = 0.6;

    this.tailLength = 0.3;
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

    // =====================================================
    // CORE FILTERS
    // =====================================================

    this.bandpass =
      this.audioContext.createBiquadFilter();

    this.bandpass.type = 'bandpass';

    this.bandpass.frequency.value =
      this.frequency;

    this.bandpass.Q.value = 4;

    // Soft top-end damping
    this.lowpass =
      this.audioContext.createBiquadFilter();

    this.lowpass.type = 'lowpass';

    this.lowpass.frequency.value = 4800;

    this.lowpass.Q.value = 0.25;

    // Remove harsh resonance spikes
    this.highshelf =
      this.audioContext.createBiquadFilter();

    this.highshelf.type = 'highshelf';

    this.highshelf.frequency.value = 3200;

    this.highshelf.gain.value = -4;

    // =====================================================
    // FEEDBACK NETWORK
    // =====================================================

    this.feedbackDelay =
      this.audioContext.createDelay(0.4);

    this.feedbackGain =
      this.audioContext.createGain();

    this.feedbackDelay.delayTime.value =
      0.045;

    this.feedbackGain.gain.value =
      0.12;

    // =====================================================
    // MIX
    // =====================================================

    this.wetGain =
      this.audioContext.createGain();

    this.dryGain =
      this.audioContext.createGain();

    this.wetGain.gain.value =
      0.2;

    this.dryGain.gain.value =
      0.9;

    // =====================================================
    // ROUTING
    // =====================================================

    this.input.connect(this.dryGain);

    this.dryGain.connect(this.output);

    this.input.connect(this.bandpass);

    this.bandpass.connect(this.lowpass);

    this.lowpass.connect(this.highshelf);

    // Feedback loop
    this.highshelf.connect(this.feedbackDelay);

    this.feedbackDelay.connect(this.feedbackGain);

    this.feedbackGain.connect(this.bandpass);

    // Wet out
    this.highshelf.connect(this.wetGain);

    this.wetGain.connect(this.output);

    this.isInitialized = true;

    console.log('[RAIN] ResonanceSynth initialized');
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
        '[RAIN] ResonanceSynth.connect() invalid destination'
      );

      return;
    }

    this.output.connect(destination);

    this.isConnected = true;

    console.log('[RAIN] ResonanceSynth connected');
  }

  disconnect() {
    try {
      if (this.output) {
        this.output.disconnect();
      }

      this.isConnected = false;
    } catch (error) {
      console.warn(
        '[RAIN] ResonanceSynth disconnect error:',
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

  update() {
    this.updateFilters();
  }

  // =====================================================
  // PARAMETER EVOLUTION
  // =====================================================

  updateFilters() {
    if (!this.isInitialized) return;

    const now =
      this.audioContext.currentTime;

    // =====================================================
    // RESONANT CENTER
    // =====================================================

    const centerFreq =
      this.frequency +
      (this.wetness * 180) -
      (this.darkness * 250);

    this.bandpass.frequency
      .cancelScheduledValues(now);

    this.bandpass.frequency
      .linearRampToValueAtTime(
        centerFreq,
        now + 0.08
      );

    // =====================================================
    // RESONANCE SHARPNESS
    // =====================================================

    const q =
      1.2 +
      (this.resonance * 8);

    this.bandpass.Q
      .cancelScheduledValues(now);

    this.bandpass.Q
      .linearRampToValueAtTime(
        q,
        now + 0.08
      );

    // =====================================================
    // DAMPING
    // =====================================================

    const lpCutoff =
      7800 -
      (this.damping * 4500) -
      (this.darkness * 1500);

    this.lowpass.frequency
      .cancelScheduledValues(now);

    this.lowpass.frequency
      .linearRampToValueAtTime(
        lpCutoff,
        now + 0.08
      );

    // =====================================================
    // HARSHNESS CONTROL
    // =====================================================

    const shelfGain =
      -2 -
      (this.darkness * 6);

    this.highshelf.gain
      .cancelScheduledValues(now);

    this.highshelf.gain
      .linearRampToValueAtTime(
        shelfGain,
        now + 0.08
      );

    // =====================================================
    // BLOOM TAIL
    // =====================================================

    const feedback =
      0.04 +
      (this.bloom * 0.25);

    this.feedbackGain.gain
      .cancelScheduledValues(now);

    this.feedbackGain.gain
      .linearRampToValueAtTime(
        feedback,
        now + 0.08
      );

    // =====================================================
    // TAIL LENGTH
    // =====================================================

    const delayTime =
      0.02 +
      (this.tailLength * 0.12);

    this.feedbackDelay.delayTime
      .cancelScheduledValues(now);

    this.feedbackDelay.delayTime
      .linearRampToValueAtTime(
        delayTime,
        now + 0.08
      );

    // =====================================================
    // WET LEVEL
    // =====================================================

    const wetLevel =
      0.08 +
      (this.resonance * 0.28);

    this.wetGain.gain
      .cancelScheduledValues(now);

    this.wetGain.gain
      .linearRampToValueAtTime(
        wetLevel,
        now + 0.08
      );
  }

  // =====================================================
  // SETTERS
  // =====================================================

  setFrequency(value) {
    this.frequency =
      Math.max(120, Math.min(8000, value));

    this.updateFilters();
  }

  setResonance(value) {
    this.resonance =
      Math.max(0, Math.min(1, value));

    this.updateFilters();
  }

  setDamping(value) {
    this.damping =
      Math.max(0, Math.min(1, value));

    this.updateFilters();
  }

  setWetness(value) {
    this.wetness =
      Math.max(0, Math.min(1, value));

    this.updateFilters();
  }

  setDarkness(value) {
    this.darkness =
      Math.max(0, Math.min(1, value));

    this.updateFilters();
  }

  setBloom(value) {
    this.bloom =
      Math.max(0, Math.min(1, value));

    this.updateFilters();
  }

  setTailLength(value) {
    this.tailLength =
      Math.max(0, Math.min(1, value));

    this.updateFilters();
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {
    try {
      this.disconnect();

      if (this.input) this.input.disconnect();
      if (this.output) this.output.disconnect();

      if (this.bandpass) this.bandpass.disconnect();
      if (this.lowpass) this.lowpass.disconnect();
      if (this.highshelf) this.highshelf.disconnect();

      if (this.feedbackDelay) this.feedbackDelay.disconnect();
      if (this.feedbackGain) this.feedbackGain.disconnect();

      if (this.wetGain) this.wetGain.disconnect();
      if (this.dryGain) this.dryGain.disconnect();

      this.isInitialized = false;

      console.log('[RAIN] ResonanceSynth disposed');
    } catch (error) {
      console.warn(
        '[RAIN] ResonanceSynth dispose error:',
        error
      );
    }
  }
}