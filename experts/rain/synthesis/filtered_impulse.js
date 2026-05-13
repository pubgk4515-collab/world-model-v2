// experts/rain/synthesis/filtered_impulse.js
// Cinematic Rain Filtered Impulse
// Generates soft reflective space responses for rain surfaces
// Designed to avoid metallic ringing, harsh convolution tails,
// and fake synthetic reverb artifacts.

export class FilteredImpulse {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.input = null;
    this.output = null;

    this.convolver = null;

    this.preFilter = null;
    this.postFilter = null;
    this.toneFilter = null;

    this.wetGain = null;
    this.dryGain = null;

    this.isInitialized = false;
    this.isConnected = false;

    // Response tuning
    this.decay = 0.45;
    this.size = 0.35;
    this.darkness = 0.55;
    this.diffusion = 0.7;
    this.stereoSpread = 0.8;
    this.wetLevel = 0.18;
  }

  init() {
    if (this.isInitialized) return;

    // IO
    this.input = this.audioContext.createGain();
    this.output = this.audioContext.createGain();

    // Core convolver
    this.convolver = this.audioContext.createConvolver();

    // Pre-filter
    this.preFilter = this.audioContext.createBiquadFilter();
    this.preFilter.type = 'highpass';
    this.preFilter.frequency.value = 180;

    // Tone shaping
    this.toneFilter = this.audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 5200;
    this.toneFilter.Q.value = 0.3;

    // Post damping
    this.postFilter = this.audioContext.createBiquadFilter();
    this.postFilter.type = 'highshelf';
    this.postFilter.frequency.value = 4500;
    this.postFilter.gain.value = -5;

    // Wet/dry
    this.wetGain = this.audioContext.createGain();
    this.dryGain = this.audioContext.createGain();

    this.wetGain.gain.value = this.wetLevel;
    this.dryGain.gain.value = 1.0 - (this.wetLevel * 0.5);

    // Routing
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.input.connect(this.preFilter);
    this.preFilter.connect(this.convolver);
    this.convolver.connect(this.toneFilter);
    this.toneFilter.connect(this.postFilter);
    this.postFilter.connect(this.wetGain);
    this.wetGain.connect(this.output);

    this.createImpulseResponse();

    this.isInitialized = true;

    console.log('[RAIN] FilteredImpulse initialized');
  }

  connect(destination) {
    if (!this.isInitialized) {
      this.init();
    }

    if (!destination) {
      console.warn('[RAIN] FilteredImpulse.connect() invalid destination');
      return;
    }

    this.output.connect(destination);
    this.isConnected = true;

    console.log('[RAIN] FilteredImpulse connected');
  }

  disconnect() {
    try {
      if (this.output) {
        this.output.disconnect();
      }

      this.isConnected = false;
    } catch (error) {
      console.warn('[RAIN] FilteredImpulse disconnect error:', error);
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

  updateFilters() {
    if (!this.isInitialized) return;

    const now = this.audioContext.currentTime;

    // Dark wetter environments
    const lpFreq =
      8500 -
      (this.darkness * 5000);

    this.toneFilter.frequency.cancelScheduledValues(now);
    this.toneFilter.frequency.linearRampToValueAtTime(
      lpFreq,
      now + 0.08
    );

    // More darkness = softer highs
    const shelfGain =
      -2 -
      (this.darkness * 7);

    this.postFilter.gain.cancelScheduledValues(now);
    this.postFilter.gain.linearRampToValueAtTime(
      shelfGain,
      now + 0.08
    );

    // Wetness control
    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.linearRampToValueAtTime(
      this.wetLevel,
      now + 0.08
    );
  }

  createImpulseResponse() {
    const sampleRate = this.audioContext.sampleRate;

    // Longer IR for cinematic softness
    const length =
      Math.floor(sampleRate * (
        0.25 +
        (this.size * 1.2)
      ));

    const impulse =
      this.audioContext.createBuffer(
        2,
        length,
        sampleRate
      );

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);

      let previous = 0;

      for (let i = 0; i < length; i++) {
        const t = i / length;

        // Smooth exponential decay
        const decay =
          Math.pow(
            1 - t,
            2.5 + (this.decay * 3)
          );

        // Soft filtered noise
        const white =
          (Math.random() * 2 - 1);

        // Diffused smoothing
        previous =
          previous * this.diffusion +
          white * (1 - this.diffusion);

        // Stereo decorrelation
        const stereoOffset =
          channel === 0
            ? 1
            : (0.96 + Math.random() * 0.08);

        // Air absorption
        const highLoss =
          1 - (t * this.darkness * 0.85);

        data[i] =
          previous *
          decay *
          stereoOffset *
          highLoss *
          0.35;
      }
    }

    this.convolver.buffer = impulse;

    console.log('[RAIN] Filtered impulse response generated');
  }

  regenerate() {
    this.createImpulseResponse();
    this.updateFilters();
  }

  setDecay(value) {
    this.decay = Math.max(0, Math.min(1, value));
    this.regenerate();
  }

  setSize(value) {
    this.size = Math.max(0, Math.min(1, value));
    this.regenerate();
  }

  setDarkness(value) {
    this.darkness = Math.max(0, Math.min(1, value));
    this.updateFilters();
  }

  setDiffusion(value) {
    this.diffusion = Math.max(0, Math.min(0.98, value));
    this.regenerate();
  }

  setWetLevel(value) {
    this.wetLevel = Math.max(0, Math.min(1, value));
    this.updateFilters();
  }

  dispose() {
    try {
      this.disconnect();

      if (this.input) this.input.disconnect();
      if (this.output) this.output.disconnect();

      if (this.preFilter) this.preFilter.disconnect();
      if (this.toneFilter) this.toneFilter.disconnect();
      if (this.postFilter) this.postFilter.disconnect();

      if (this.wetGain) this.wetGain.disconnect();
      if (this.dryGain) this.dryGain.disconnect();

      if (this.convolver) {
        this.convolver.disconnect();
        this.convolver.buffer = null;
      }

      this.isInitialized = false;

      console.log('[RAIN] FilteredImpulse disposed');
    } catch (error) {
      console.warn('[RAIN] FilteredImpulse dispose error:', error);
    }
  }
}