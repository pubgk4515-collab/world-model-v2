// Rain Noise Generator
// Basic white noise for rain synthesis

export class RainNoise {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.source = null;
    this.gainNode = null;
    this.isConnected = false;
  }

  init() {
    this.source = this.audioContext.createBufferSource();
    this.gainNode = this.audioContext.createGain();

    // Create white noise buffer
    const bufferSize = this.audioContext.sampleRate * 2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.source.buffer = buffer;
    this.source.loop = true;
    this.gainNode.gain.value = 0.1;
  }

  connect(destination) {
    if (this.gainNode && destination) {
      this.source.connect(this.gainNode);
      this.gainNode.connect(destination);
      this.isConnected = true;
    }
  }

  disconnect() {
    if (this.source && this.isConnected) {
      this.source.disconnect();
      this.gainNode.disconnect();
      this.isConnected = false;
    }
  }

  update() {
    // Update noise parameters
  }

  start() {
    if (this.source && !this.isConnected) {
      this.source.start();
    }
  }

  stop() {
    if (this.source) {
      this.source.stop();
    }
  }
}