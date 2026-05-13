// Fog Layer
// Atmospheric fog effects

export class FogLayer {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.filter = null;
    this.isConnected = false;
  }

  init() {
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 3000;
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
    // Update fog parameters
  }

  setDensity(value) {
    if (this.filter) {
      // Higher density = more filtering
      const cutoff = 5000 - value * 3000;
      this.filter.frequency.value = Math.max(500, cutoff);
    }
  }
}