// Rain Modulation Engine
// Basic parameter modulation

export class Modulation {
  constructor() {
    this.targets = [];
    this.isActive = false;
  }

  init() {
    // Initialize modulation
  }

  connect(target) {
    if (target && target.update) {
      this.targets.push(target);
    }
  }

  disconnect(target) {
    const index = this.targets.indexOf(target);
    if (index > -1) {
      this.targets.splice(index, 1);
    }
  }

  start() {
    this.isActive = true;
  }

  stop() {
    this.isActive = false;
  }

  update() {
    if (!this.isActive) return;

    // Simple modulation
    const modulation = Math.sin(Date.now() * 0.001) * 0.1;

    this.targets.forEach(target => {
      if (target.updateModulation) {
        target.updateModulation(modulation);
      }
    });
  }

  dispose() {
    this.stop();
    this.targets = [];
  }
}