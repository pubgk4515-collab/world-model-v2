// Tin Resonance
// Metallic resonance effects

export class TinResonance {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.filter = null;
    this.isConnected = false;
  }

  build() {
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 1500;
    this.filter.Q.value = 5;
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

  setResonanceFrequency(value) {
    if (this.filter) {
      this.filter.frequency.value = Math.max(500, Math.min(3000, value));
    }
  }

  setResonance(value) {
    if (this.filter) {
      this.filter.Q.value = Math.max(1, Math.min(20, value));
    }
  }
}