// Rain Burst Engine
// Manages burst patterns in rain scheduling

export class BurstEngine {
  constructor() {
    this.probability = 0.1;
    this.burstSize = 3;
    this.isActive = false;
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
    this.isActive = true;
  }

  stop() {
    this.isActive = false;
  }

  dispose() {
    this.stop();
  }

  update() {
    // Update burst parameters
  }

  shouldBurst() {
    return Math.random() < this.probability;
  }

  triggerBurst() {
    if (!this.isActive || !this.target) return;

    for (let i = 0; i < this.burstSize; i++) {
      setTimeout(() => {
        if (this.target) this.target();
      }, i * 50); // Stagger bursts
    }
  }

  setProbability(value) {
    this.probability = Math.max(0, Math.min(1, value));
  }

  setBurstSize(value) {
    this.burstSize = Math.max(1, Math.min(10, value));
  }
}