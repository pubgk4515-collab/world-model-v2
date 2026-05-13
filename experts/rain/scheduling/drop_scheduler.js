// Rain Drop Scheduler
// Lightweight scheduling for rain events

export class DropScheduler {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.intervalId = null;
    this.isRunning = false;
    this.density = 0.7;
    this.onDrop = null;
  }

  init() {
    // Initialize with safe defaults
  }

  connect(target) {
    this.onDrop = target;
  }

  disconnect() {
    this.onDrop = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNext();
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  dispose() {
    this.stop();
  }

  update() {
    // Update scheduling parameters
  }

  scheduleNext() {
    if (!this.isRunning) return;

    const interval = this.calculateInterval();
    this.intervalId = setTimeout(() => {
      this.triggerDrop();
      this.scheduleNext();
    }, interval * 1000);
  }

  calculateInterval() {
    // Simple density-based interval
    const baseInterval = 0.1;
    const variance = 0.05;
    return baseInterval / this.density + (Math.random() - 0.5) * variance;
  }

  triggerDrop() {
    if (this.onDrop) {
      this.onDrop();
    }
  }

  setDensity(value) {
    this.density = Math.max(0.1, Math.min(1.0, value));
  }
}