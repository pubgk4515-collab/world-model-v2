// Leaves Flutter
// Simulates leaf movement in rain

export class LeavesFlutter {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.lfo = null;
    this.isConnected = false;
  }

  build() {
    this.lfo = this.audioContext.createOscillator();
    this.lfo.frequency.value = 2; // Slow flutter
    this.lfo.type = 'sine';
  }

  connect(destination) {
    if (this.lfo && destination) {
      this.lfo.connect(destination);
      this.isConnected = true;
    }
  }

  updateSurface() {
    // Update flutter parameters
  }

  setFlutterRate(value) {
    if (this.lfo) {
      this.lfo.frequency.value = Math.max(0.5, Math.min(10, value));
    }
  }

  start() {
    if (this.lfo && !this.isConnected) {
      this.lfo.start();
    }
  }

  stop() {
    if (this.lfo) {
      this.lfo.stop();
    }
  }
}