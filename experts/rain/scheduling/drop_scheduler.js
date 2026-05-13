// Rain Drop Scheduler
// Natural procedural droplet scheduler with clusters and probabilistic timing

export class DropScheduler {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.intervalId = null;
    this.isRunning = false;
    this.onDrop = null;

    // Scheduling parameters
    this.density = 0.7;      // Overall density (0-1)
    this.randomness = 0.6;   // Timing randomness (0-1)
    this.clusterAmount = 0.4; // How clustered drops are (0-1)
    this.calmness = 0.3;     // Calm periods between clusters (0-1)

    // Internal state
    this.clusterMode = false;
    this.clusterSize = 0;
    this.clusterRemaining = 0;
    this.lastDropTime = 0;
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
    // Update scheduling parameters dynamically if needed
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
    let baseInterval;

    if (this.clusterMode && this.clusterRemaining > 0) {
      // Inside cluster - faster drops
      baseInterval = 0.05 + Math.random() * 0.1; // 50-150ms
      this.clusterRemaining--;

      if (this.clusterRemaining === 0) {
        this.clusterMode = false;
      }
    } else {
      // Between clusters - variable spacing
      const densityFactor = 1 - this.density; // Higher density = shorter intervals
      baseInterval = 0.1 + densityFactor * 1.5; // 100ms to 1.6s

      // Add calmness factor - longer pauses
      baseInterval *= (1 + this.calmness * 2);

      // Decide if we start a cluster
      if (Math.random() < this.clusterAmount) {
        this.clusterMode = true;
        this.clusterSize = 2 + Math.floor(Math.random() * 4); // 2-5 drops per cluster
        this.clusterRemaining = this.clusterSize;
      }
    }

    // Add randomness
    const randomFactor = 1 + (Math.random() - 0.5) * this.randomness;
    return Math.max(0.02, baseInterval * randomFactor); // Minimum 20ms
  }

  triggerDrop() {
    if (this.onDrop) {
      this.onDrop();
    }
    this.lastDropTime = this.audioContext.currentTime;
  }

  setDensity(value) {
    this.density = Math.max(0.1, Math.min(1.0, value));
  }

  setRandomness(value) {
    this.randomness = Math.max(0, Math.min(1, value));
  }

  setClusterAmount(value) {
    this.clusterAmount = Math.max(0, Math.min(1, value));
  }

  setCalmness(value) {
    this.calmness = Math.max(0, Math.min(1, value));
  }

  // Get current scheduling state for debugging
  getState() {
    return {
      density: this.density,
      randomness: this.randomness,
      clusterAmount: this.clusterAmount,
      calmness: this.calmness,
      clusterMode: this.clusterMode,
      clusterRemaining: this.clusterRemaining,
    };
  }
}