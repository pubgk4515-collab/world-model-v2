// Rain Damping Processor
// Cinematic damping and air absorption processor
// Removes harshness, digital hiss, brittle highs, and fake synthetic sharpness

export class Damping {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.input = null;
    this.output = null;

    this.lowpass = null;
    this.highshelf = null;
    this.highpass = null;

    this.isInitialized = false;
    this.isConnected = false;

    // Core damping state
    this.dampingAmount = 0.45;
    this.airAbsorption = 0.35;
    this.wetness = 0.6;
    this.distance = 0.25;

    // Safety
    this.minimumCutoff = 650;
    this.maximumCutoff = 14000;
  }

  init() {
    if (this.isInitialized) return;

    // IO
    this.input = this.audioContext.createGain();
    this.output = this.audioContext.createGain();

    // Main damping filter
    this.lowpass = this.audioContext.createBiquadFilter();
    this.lowpass.type = 'lowpass';

    // Smooth digital harshness
    this.highshelf = this.audioContext.createBiquadFilter();
    this.highshelf.type = 'highshelf';

    // Remove muddy low rumble
    this.highpass = this.audioContext.createBiquadFilter();
    this.highpass.type = 'highpass';

    // Default tuning
    this.lowpass.frequency.value = 5200;
    this.lowpass.Q.value = 0.25;

    this.highshelf.frequency.value = 4200;
    this.highshelf.gain.value = -4;

    this.highpass.frequency.value = 70;
    this.highpass.Q.value = 0.5;

    // Routing
    this.input.connect(this.highpass);
    this.highpass.connect(this.lowpass);
    this.lowpass.connect(this.highshelf);
    this.highshelf.connect(this.output);

    this.isInitialized = true;

    console.log('[RAIN] Damping initialized');
  }

  connect(destination) {
    if (!this.isInitialized) {
      this.init();
    }

    if (!destination) {
      console.warn('[RAIN] Damping.connect() - invalid destination');
      return;
    }

    this.output.connect(destination);
    this.isConnected = true;

    console.log('[RAIN] Damping connected');
  }

  disconnect() {
    try {
      if (this.output) {
        this.output.disconnect();
      }

      this.isConnected = false;
    } catch (error) {
      console.warn('[RAIN] Damping disconnect error:', error);
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

    // More damping = darker sound
    const dampingCutoff =
      this.maximumCutoff -
      (this.dampingAmount * 9000);

    // Distance darkens sound naturally
    const distanceReduction =
      this.distance * 3500;

    // Wet air absorbs highs
    const airReduction =
      this.airAbsorption * 2500;

    // Final cutoff
    const finalCutoff = Math.max(
      this.minimumCutoff,
      dampingCutoff - distanceReduction - airReduction
    );

    // Smooth movement
    this.lowpass.frequency.cancelScheduledValues(now);
    this.lowpass.frequency.linearRampToValueAtTime(
      finalCutoff,
      now + 0.08
    );

    // Wet environments soften highs
    const shelfGain =
      -2 -
      (this.wetness * 5) -
      (this.airAbsorption * 4);

    this.highshelf.gain.cancelScheduledValues(now);
    this.highshelf.gain.linearRampToValueAtTime(
      shelfGain,
      now + 0.08
    );
  }

  setCutoff(value) {
    if (!this.lowpass) return;

    const clamped = Math.max(
      this.minimumCutoff,
      Math.min(this.maximumCutoff, value)
    );

    this.lowpass.frequency.setValueAtTime(
      clamped,
      this.audioContext.currentTime
    );
  }

  setDampingAmount(value) {
    this.dampingAmount = Math.max(0, Math.min(1, value));
    this.updateFilters();
  }

  setAirAbsorption(value) {
    this.airAbsorption = Math.max(0, Math.min(1, value));
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

  dispose() {
    try {
      this.disconnect();

      if (this.input) this.input.disconnect();
      if (this.output) this.output.disconnect();
      if (this.lowpass) this.lowpass.disconnect();
      if (this.highshelf) this.highshelf.disconnect();
      if (this.highpass) this.highpass.disconnect();

      this.isInitialized = false;

      console.log('[RAIN] Damping disposed');
    } catch (error) {
      console.warn('[RAIN] Damping dispose error:', error);
    }
  }
}