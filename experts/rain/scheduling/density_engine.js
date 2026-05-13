// Rain Density Engine
// Controls density variations over time

export class DensityEngine {
  constructor() {
    this.baseDensity = 0.7;
    this.variation = 0.2;
    this.currentDensity = 0.7;
  }

  init() {
    // Safe initialization
  }

  connect(target) {
    this.target = target;
  }

  disconnect() {
    this.target = null;
  }

  start() {
    // Start density modulation if needed
  }

  stop() {
    // Stop modulation
  }

  dispose() {
    this.stop();
  }

  update() {
    this.updateDensity();
  }

  updateDensity() {
    const variation = (Math.random() - 0.5) * this.variation;
    this.currentDensity = Math.max(0.1, Math.min(1.0, this.baseDensity + variation));

    if (this.target && this.target.setDensity) {
      this.target.setDensity(this.currentDensity);
    }
  }

  setBaseDensity(value) {
    this.baseDensity = Math.max(0.1, Math.min(1.0, value));
  }

  setVariation(value) {
    this.variation = Math.max(0, Math.min(0.5, value));
  }

  getCurrentDensity() {
    return this.currentDensity;
  }
}