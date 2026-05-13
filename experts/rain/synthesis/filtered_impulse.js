// Rain Filtered Impulse
// Generates filtered impulse responses

export class FilteredImpulse {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.convolver = null;
    this.isConnected = false;
  }

  init() {
    this.convolver = this.audioContext.createConvolver();
    this.createImpulseResponse();
  }

  connect(destination) {
    if (this.convolver && destination) {
      this.convolver.connect(destination);
      this.isConnected = true;
    }
  }

  disconnect() {
    if (this.convolver && this.isConnected) {
      this.convolver.disconnect();
      this.isConnected = false;
    }
  }

  update() {
    // Update impulse parameters
  }

  createImpulseResponse() {
    const length = this.audioContext.sampleRate * 0.5; // 0.5 second
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }

    this.convolver.buffer = impulse;
  }
}