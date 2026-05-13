// Water Flow
// Simulated water flow effects

export class WaterFlow {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.noise = null;
    this.filter = null;
    this.isConnected = false;
  }

  init() {
    this.noise = this.audioContext.createBufferSource();
    this.filter = this.audioContext.createBiquadFilter();

    // Create flow noise
    const bufferSize = this.audioContext.sampleRate * 3;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.05;
    }

    this.noise.buffer = buffer;
    this.noise.loop = true;

    this.filter.type = 'bandpass';
    this.filter.frequency.value = 1000;
    this.filter.Q.value = 2;
  }

  connect(destination) {
    if (this.filter && destination) {
      this.noise.connect(this.filter);
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
    // Update flow parameters
  }

  start() {
    if (this.noise && !this.isConnected) {
      this.noise.start();
    }
  }

  stop() {
    if (this.noise) {
      this.noise.stop();
    }
  }

  setFlowRate(value) {
    if (this.filter) {
      // Higher flow = higher frequency
      this.filter.frequency.value = 500 + value * 1000;
    }
  }
}