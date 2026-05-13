// experts/rain/synthesis/lowpass_diffusion.js
// Cinematic Lowpass Diffusion
// Creates soft atmospheric depth, wet-air blur,
// distant diffusion, and non-harsh rain softness.

export class LowpassDiffusion {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.input = null;
    this.output = null;

    this.filters = [];
    this.delays = [];
    this.feedbackGains = [];

    this.wetGain = null;
    this.dryGain = null;

    this.isInitialized = false;
    this.isConnected = false;

    // Diffusion parameters
    this.cutoff = 5200;
    this.diffusion = 0.6;
    this.stereoSpread = 0.7;
    this.darkness = 0.45;
    this.wetness = 0.35;
    this.distance = 0.25;

    this.stageCount = 4;
  }

  init() {
    if (this.isInitialized) return;

    this.input = this.audioContext.createGain();
    this.output = this.audioContext.createGain();

    this.wetGain = this.audioContext.createGain();
    this.dryGain = this.audioContext.createGain();

    this.wetGain.gain.value = 0.22;
    this.dryGain.gain.value = 0.9;

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    let previousNode = this.input;

    // Multi-stage atmospheric diffusion
    for (let i = 0; i < this.stageCount; i++) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';

      const delay = this.audioContext.createDelay(0.2);

      const feedback = this.audioContext.createGain();

      // Softer progressively darker stages
      filter.frequency.value =
        this.cutoff - (i * 700);

      filter.Q.value =
        0.18 + (i * 0.05);

      // Tiny atmospheric smearing
      delay.delayTime.value =
        0.008 +
        (i * 0.003);

      // Extremely controlled feedback
      feedback.gain.value =
        0.08 +
        (i * 0.015);

      // Routing
      previousNode.connect(filter);

      filter.connect(delay);
      delay.connect(feedback);
      feedback.connect(filter);

      previousNode = delay;

      this.filters.push(filter);
      this.delays.push(delay);
      this.feedbackGains.push(feedback);
    }

    // Final wet output
    previousNode.connect(this.wetGain);
    this.wetGain.connect(this.output);

    this.isInitialized = true;

    console.log('[RAIN] LowpassDiffusion initialized');
  }

  connect(destination) {
    if (!this.isInitialized) {
      this.init();
    }

    if (!destination) {
      console.warn('[RAIN] LowpassDiffusion.connect() invalid destination');
      return;
    }

    this.output.connect(destination);
    this.isConnected = true;

    console.log('[RAIN] LowpassDiffusion connected');
  }

  disconnect() {
    try {
      if (this.output) {
        this.output.disconnect();
      }

      this.isConnected = false;
    } catch (error) {
      console.warn('[RAIN] LowpassDiffusion disconnect error:', error);
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

    const darknessReduction =
      this.darkness * 3500;

    const distanceReduction =
      this.distance * 2500;

    const wetnessReduction =
      this.wetness * 1800;

    const baseCutoff = Math.max(
      700,
      this.cutoff -
      darknessReduction -
      distanceReduction -
      wetnessReduction
    );

    // Update stages
    this.filters.forEach((filter, index) => {
      const stageCutoff =
        Math.max(
          500,
          baseCutoff - (index * 500)
        );

      filter.frequency.cancelScheduledValues(now);
      filter.frequency.linearRampToValueAtTime(
        stageCutoff,
        now + 0.08
      );

      // Slightly increase blur with diffusion
      filter.Q.cancelScheduledValues(now);
      filter.Q.linearRampToValueAtTime(
        0.15 + (this.diffusion * 0.25),
        now + 0.08
      );
    });

    // Wet level
    const wetLevel =
      0.08 +
      (this.diffusion * 0.35);

    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.linearRampToValueAtTime(
      wetLevel,
      now + 0.08
    );

    // Feedback smoothing
    this.feedbackGains.forEach((feedback, index) => {
      const feedbackAmount =
        0.04 +
        (this.diffusion * 0.08) +
        (index * 0.01);

      feedback.gain.cancelScheduledValues(now);
      feedback.gain.linearRampToValueAtTime(
        feedbackAmount,
        now + 0.08
      );
    });
  }

  setCutoff(value) {
    this.cutoff = Math.max(500, Math.min(12000, value));
    this.updateFilters();
  }

  setDiffusion(value) {
    this.diffusion = Math.max(0, Math.min(1, value));
    this.updateFilters();
  }

  setDarkness(value) {
    this.darkness = Math.max(0, Math.min(1, value));
    this.updateFilters();
  }

  setWetness(value) {
    this.wetness = Math.max(0, Math.min(1, value));
    this.updateFilters();
  }

  setDistance(value) {
    this.distance = Math.max(0, Math.min(1, value));
    this.updateFilters();
  }

  setStereoSpread(value) {
    this.stereoSpread = Math.max(0, Math.min(1, value));
  }

  dispose() {
    try {
      this.disconnect();

      if (this.input) this.input.disconnect();
      if (this.output) this.output.disconnect();

      if (this.wetGain) this.wetGain.disconnect();
      if (this.dryGain) this.dryGain.disconnect();

      this.filters.forEach(filter => {
        try {
          filter.disconnect();
        } catch {}
      });

      this.delays.forEach(delay => {
        try {
          delay.disconnect();
        } catch {}
      });

      this.feedbackGains.forEach(gain => {
        try {
          gain.disconnect();
        } catch {}
      });

      this.filters = [];
      this.delays = [];
      this.feedbackGains = [];

      this.isInitialized = false;

      console.log('[RAIN] LowpassDiffusion disposed');
    } catch (error) {
      console.warn('[RAIN] LowpassDiffusion dispose error:', error);
    }
  }
}