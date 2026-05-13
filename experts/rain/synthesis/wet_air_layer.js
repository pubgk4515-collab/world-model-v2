// Rain Wet Air Layer
// Simulates wet air absorption

export class WetAirLayer {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.filter = null;
    this.isConnected = false;
  }

  init() {
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'highpass';
    this.filter.frequency.value = 100;
    this.filter.Q.value = 0.5;
  }

  connect(destination) {
    if (this.filter && destination) {
      this.filter.connect(destination);
      this.isConnected = true;
    }
  }

  disconnect() {
    if (this.filter && this.isConnected) {
      this.filter.disconnect();
      this.isConnected = false;
    }
  }

  update() {
    // Update wet air parameters
  }

  setHumidity(value) {
    if (this.filter) {
      // Higher humidity = more high frequency absorption
      const cutoff = 100 + value * 200;
      this.filter.frequency.value = Math.max(50, Math.min(500, cutoff));
    }
  }
}