// Rain Stochastic Clock
// Probabilistic timing system

export class StochasticClock {
  constructor() {
    this.interval = 100; // ms
    this.probability = 0.8;
    this.timerId = null;
    this.isRunning = false;
  }

  init() {
    // Safe initialization
  }

  connect(target) {
    this.onTick = target;
  }

  disconnect() {
    this.onTick = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNext();
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  dispose() {
    this.stop();
  }

  update() {
    // Update timing parameters
  }

  scheduleNext() {
    if (!this.isRunning) return;

    this.timerId = setTimeout(() => {
      this.tick();
      this.scheduleNext();
    }, this.interval);
  }

  tick() {
    if (Math.random() < this.probability && this.onTick) {
      this.onTick();
    }
  }

  setInterval(value) {
    this.interval = Math.max(10, Math.min(1000, value));
  }

  setProbability(value) {
    this.probability = Math.max(0, Math.min(1, value));
  }
}