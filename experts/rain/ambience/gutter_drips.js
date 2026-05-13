// Gutter Drips
// Simulated gutter dripping effects

export class GutterDrips {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.isConnected = false;
  }

  init() {
    // Initialize gutter drips
  }

  connect(destination) {
    this.destination = destination;
    this.isConnected = true;
  }

  disconnect() {
    this.destination = null;
    this.isConnected = false;
  }

  update() {
    // Update drip parameters
  }

  triggerDrip() {
    if (!this.isConnected) return;

    // Trigger drip sound
    const frequency = 200 + Math.random() * 300;
    const decay = 0.3 + Math.random() * 0.4;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = 'triangle';

    gainNode.gain.setValueAtTime(0.02, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + decay);

    oscillator.connect(gainNode);
    gainNode.connect(this.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + decay);
  }

  startDripping(interval = 2000) {
    this.dripInterval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance per interval
        this.triggerDrip();
      }
    }, interval);
  }

  stopDripping() {
    if (this.dripInterval) {
      clearInterval(this.dripInterval);
      this.dripInterval = null;
    }
  }
}