// Puddle Surface Simulation
// Simulates rain on puddles

export class PuddleSurface {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.isConnected = false;
  }

  build() {
    // Build puddle surface simulation
  }

  connect(destination) {
    this.destination = destination;
    this.isConnected = true;
  }

  updateSurface() {
    // Update puddle parameters
  }

  trigger(parameters = {}) {
    if (!this.isConnected) return;

    // Trigger puddle drop - splashy, resonant
    const frequency = parameters.frequency || 300;
    const decay = parameters.decay || 0.5;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = 'triangle';

    gainNode.gain.setValueAtTime(0.04, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + decay);

    oscillator.connect(gainNode);
    gainNode.connect(this.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + decay);
  }
}