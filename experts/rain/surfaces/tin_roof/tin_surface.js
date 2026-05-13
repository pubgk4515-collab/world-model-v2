// Tin Roof Surface Simulation
// Simulates rain on tin roofs

export class TinSurface {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.isConnected = false;
  }

  build() {
    // Build tin roof surface simulation
  }

  connect(destination) {
    this.destination = destination;
    this.isConnected = true;
  }

  updateSurface() {
    // Update tin roof parameters
  }

  trigger(parameters = {}) {
    if (!this.isConnected) return;

    // Trigger tin roof drop - metallic, resonant
    const frequency = parameters.frequency || 1200;
    const decay = parameters.decay || 0.8;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.06, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + decay);

    oscillator.connect(gainNode);
    gainNode.connect(this.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + decay);
  }
}