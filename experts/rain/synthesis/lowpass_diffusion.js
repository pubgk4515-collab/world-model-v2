// Rain Lowpass Diffusion
// Applies lowpass filtering with diffusion

export class LowpassDiffusion {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.filters = [];
    this.isConnected = false;
  }

  init() {
    // Create filter chain
    for (let i = 0; i < 4; i++) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 4000 - i * 500;
      filter.Q.value = 0.7;
      this.filters.push(filter);
    }

    // Connect filters in series
    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1]);
    }
  }

  connect(destination) {
    if (this.filters.length > 0 && destination) {
      this.filters[this.filters.length - 1].connect(destination);
      this.isConnected = true;
    }
  }

  disconnect() {
    if (this.filters.length > 0 && this.isConnected) {
      this.filters[this.filters.length - 1].disconnect();
      this.isConnected = false;
    }
  }

  update() {
    // Update diffusion parameters
  }

  setCutoff(value) {
    const baseFreq = Math.max(500, Math.min(8000, value));
    this.filters.forEach((filter, index) => {
      filter.frequency.value = baseFreq - index * 200;
    });
  }
}