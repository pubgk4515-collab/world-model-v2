// Smoothing Utilities
// Value smoothing and filtering

export class ExponentialSmoothing {
  constructor(alpha = 0.1) {
    this.alpha = alpha;
    this.value = 0;
    this.initialized = false;
  }

  process(input) {
    if (!this.initialized) {
      this.value = input;
      this.initialized = true;
    } else {
      this.value = this.alpha * input + (1 - this.alpha) * this.value;
    }
    return this.value;
  }

  reset() {
    this.initialized = false;
  }

  setAlpha(alpha) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }
}

export class MovingAverage {
  constructor(windowSize = 10) {
    this.windowSize = windowSize;
    this.values = [];
  }

  process(input) {
    this.values.push(input);
    if (this.values.length > this.windowSize) {
      this.values.shift();
    }
    return this.average();
  }

  average() {
    if (this.values.length === 0) return 0;
    return this.values.reduce((sum, val) => sum + val, 0) / this.values.length;
  }

  reset() {
    this.values = [];
  }
}

export function smooth(current, target, factor) {
  return current + (target - current) * factor;
}

export function damp(current, target, velocity, damping = 0.9, stiffness = 0.1) {
  const force = (target - current) * stiffness;
  velocity += force;
  velocity *= damping;
  return current + velocity;
}