// Open Air Resonance
// Minimal resonance for open air

export class OpenAirResonance {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.filter = null;
    this.isConnected = false;
  }

  build() {
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'highpass';
    this.filter.frequency.value = 500;
  }

  connect(destination) {
    if (this.filter && destination) {
      this.filter.connect(destination);
      this.isConnected = true;
    }
  }

  updateSurface() {
    // Update resonance parameters
  }

  setCutoff(value) {
    if (this.filter) {
      this.filter.frequency.value = Math.max(200, Math.min(2000, value));
    }
  }
}