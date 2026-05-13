// Leaves Surface Simulation
// Simulates rain on leaves

export class LeavesSurface {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.isConnected = false;
  }

  build() {
    // Build leaves surface simulation
  }

  connect(destination) {
    this.destination = destination;
    this.isConnected = true;
  }

  updateSurface() {
    // Update leaves parameters
  }

  trigger(parameters = {}) {
    if (!this.isConnected) return;

    // Trigger leaves drop sound - softer, rustling
    const frequency = parameters.frequency || 600;
    const decay = parameters.decay || 0.3;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.03, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + decay);

    oscillator.connect(gainNode);
    gainNode.connect(this.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + decay);
  }
}