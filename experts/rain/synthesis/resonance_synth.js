// Rain Resonance Synthesizer
// Generates surface resonance effects

export class ResonanceSynth {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.filter = null;
    this.isConnected = false;
  }

  init() {
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2000;
    this.filter.Q.value = 1;
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
    // Update resonance parameters
  }

  setFrequency(value) {
    if (this.filter) {
      this.filter.frequency.value = Math.max(100, Math.min(8000, value));
    }
  }

  setResonance(value) {
    if (this.filter) {
      this.filter.Q.value = Math.max(0.1, Math.min(10, value));
    }
  }
}