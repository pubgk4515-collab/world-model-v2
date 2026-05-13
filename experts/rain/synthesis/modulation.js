// experts/rain/synthesis/modulation.js
// Cinematic Rain Modulation Engine
// Creates subtle organic movement across the rain system.
// NO harsh LFO wobble.
// NO robotic periodic motion.
// Mobile-safe and CPU-light.

export class Modulation {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.targets = [];

    this.isActive = false;
    this.isInitialized = false;

    this.animationFrame = null;

    // Internal modulation state
    this.time = 0;

    // Slow atmospheric motion
    this.windDrift = 0;
    this.pressureMotion = 0;
    this.wetMotion = 0;
    this.stereoMotion = 0;

    // Speeds
    this.windSpeed = 0.00011;
    this.pressureSpeed = 0.00007;
    this.wetnessSpeed = 0.00005;
    this.stereoSpeed = 0.00009;

    // Intensities
    this.windAmount = 0.25;
    this.pressureAmount = 0.18;
    this.wetnessAmount = 0.12;
    this.stereoAmount = 0.2;

    // Safety
    this.maxTargets = 64;
    this.lastUpdate = 0;
    this.updateRate = 30; // FPS cap
  }

  init() {
    if (this.isInitialized) return;

    this.time = performance.now();

    this.isInitialized = true;

    console.log('[RAIN] Modulation initialized');
  }

  connect(target) {
    if (!target) return;

    if (this.targets.includes(target)) return;

    if (this.targets.length >= this.maxTargets) {
      console.warn('[RAIN] Modulation target limit reached');
      return;
    }

    this.targets.push(target);

    console.log('[RAIN] Modulation target connected');
  }

  disconnect(target) {
    const index = this.targets.indexOf(target);

    if (index !== -1) {
      this.targets.splice(index, 1);
    }
  }

  start() {
    if (this.isActive) return;

    if (!this.isInitialized) {
      this.init();
    }

    this.isActive = true;

    this.modulationLoop();

    console.log('[RAIN] Modulation started');
  }

  stop() {
    this.isActive = false;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    console.log('[RAIN] Modulation stopped');
  }

  modulationLoop() {
    if (!this.isActive) return;

    this.animationFrame = requestAnimationFrame(() => {
      this.modulationLoop();
    });

    const now = performance.now();

    // FPS limiter
    if (now - this.lastUpdate < (1000 / this.updateRate)) {
      return;
    }

    this.lastUpdate = now;

    this.update();
  }

  update() {
    if (!this.isActive) return;

    const t = performance.now();

    // Atmospheric modulation layers
    this.windDrift =
      Math.sin(t * this.windSpeed) *
      this.windAmount;

    this.pressureMotion =
      Math.sin(t * this.pressureSpeed + 1.4) *
      this.pressureAmount;

    this.wetMotion =
      Math.sin(t * this.wetnessSpeed + 2.7) *
      this.wetnessAmount;

    this.stereoMotion =
      Math.sin(t * this.stereoSpeed + 0.9) *
      this.stereoAmount;

    // Combined organic movement
    const combined =
      (this.windDrift * 0.4) +
      (this.pressureMotion * 0.3) +
      (this.wetMotion * 0.2) +
      (this.stereoMotion * 0.1);

    // Dispatch modulation safely
    for (const target of this.targets) {
      try {
        // Generic modulation callback
        if (typeof target.updateModulation === 'function') {
          target.updateModulation({
            combined,
            wind: this.windDrift,
            pressure: this.pressureMotion,
            wetness: this.wetMotion,
            stereo: this.stereoMotion,
            timestamp: t,
          });
        }

        // Optional specialized handlers
        if (typeof target.setWetness === 'function') {
          target.setWetness(
            Math.max(
              0,
              Math.min(
                1,
                0.5 + this.wetMotion
              )
            )
          );
        }

        if (typeof target.setStereoSpread === 'function') {
          target.setStereoSpread(
            Math.max(
              0,
              Math.min(
                1,
                0.5 + this.stereoMotion
              )
            )
          );
        }

      } catch (error) {
        console.warn(
          '[RAIN] Modulation target update failed:',
          error
        );
      }
    }
  }

  setWindAmount(value) {
    this.windAmount =
      Math.max(0, Math.min(1, value));
  }

  setPressureAmount(value) {
    this.pressureAmount =
      Math.max(0, Math.min(1, value));
  }

  setWetnessAmount(value) {
    this.wetnessAmount =
      Math.max(0, Math.min(1, value));
  }

  setStereoAmount(value) {
    this.stereoAmount =
      Math.max(0, Math.min(1, value));
  }

  setUpdateRate(fps) {
    this.updateRate =
      Math.max(10, Math.min(60, fps));
  }

  getState() {
    return {
      active: this.isActive,
      targets: this.targets.length,
      wind: this.windDrift,
      pressure: this.pressureMotion,
      wetness: this.wetMotion,
      stereo: this.stereoMotion,
    };
  }

  dispose() {
    this.stop();

    this.targets = [];

    this.isInitialized = false;

    console.log('[RAIN] Modulation disposed');
  }
}