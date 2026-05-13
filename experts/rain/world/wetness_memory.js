// Wetness Memory
// Remembers surface wetness over time

export class WetnessMemory {
  constructor() {
    this.wetness = 0;
    this.decayRate = 0.001;
    this.memory = new Array(100).fill(0); // Rolling buffer
    this.index = 0;
  }

  init() {
    // Initialize wetness memory
  }

  connect(target) {
    this.target = target;
  }

  update() {
    // Update wetness over time
    this.wetness = Math.max(0, this.wetness - this.decayRate);

    // Update rolling memory
    this.memory[this.index] = this.wetness;
    this.index = (this.index + 1) % this.memory.length;

    if (this.target && this.target.setWetness) {
      this.target.setWetness(this.wetness);
    }
  }

  addWetness(amount) {
    this.wetness = Math.min(1, this.wetness + amount);
  }

  getWetness() {
    return this.wetness;
  }

  getAverageWetness() {
    const sum = this.memory.reduce((a, b) => a + b, 0);
    return sum / this.memory.length;
  }

  setDecayRate(value) {
    this.decayRate = Math.max(0.0001, Math.min(0.01, value));
  }
}