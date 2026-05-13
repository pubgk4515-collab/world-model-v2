// Distant Rain
// Background rain ambience layer

export class DistantRain {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.noise = null;
    this.filter = null;
    this.gain = null;
    this.isConnected = false;
  }

  init() {
    this.noise = this.audioContext.createBufferSource();
    this.filter = this.audioContext.createBiquadFilter();
    this.gain = this.audioContext.createGain();

    // Create distant noise
    const bufferSize = this.audioContext.sampleRate * 4;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }

    this.noise.buffer = buffer;
    this.noise.loop = true;

    this.filter.type = 'lowpass';
    this.filter.frequency.value = 800;
    this.gain.gain.value = 0.05;
  }

  connect(destination) {
    if (this.gain && destination) {
      this.noise.connect(this.filter);
      this.filter.connect(this.gain);
      this.gain.connect(destination);
      this.isConnected = true;
    }
  }

  disconnect() {
    if (this.gain && this.isConnected) {
      this.gain.disconnect();
      this.isConnected = false;
    }
  }

  update() {
    // Update distant rain parameters
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
}