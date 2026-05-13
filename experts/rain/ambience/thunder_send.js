// Thunder Send
// Thunder integration layer

export class ThunderSend {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.send = null;
    this.isConnected = false;
  }

  init() {
    this.send = this.audioContext.createGain();
    this.send.gain.value = 0.1;
  }

  connect(destination) {
    if (this.send && destination) {
      this.send.connect(destination);
      this.isConnected = true;
    }
  }

  disconnect() {
    if (this.send && this.isConnected) {
      this.send.disconnect();
      this.isConnected = false;
    }
  }

  update() {
    // Update thunder send parameters
  }

  triggerThunder(intensity = 1.0) {
    if (!this.isConnected) return;

    // Simple thunder rumble
    const noise = this.audioContext.createBufferSource();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    const bufferSize = this.audioContext.sampleRate * 2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * intensity;
    }

    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.send);

    noise.start();
    noise.stop(this.audioContext.currentTime + 1.5);
  }

  setSendLevel(value) {
    if (this.send) {
      this.send.gain.value = Math.max(0, Math.min(1, value));
    }
  }
}