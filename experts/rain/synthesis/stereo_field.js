// Rain Stereo Field
// Basic stereo spatialization

export class StereoField {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.panNode = null;
    this.isConnected = false;
  }

  init() {
    this.panNode = this.audioContext.createStereoPanner();
    this.panNode.pan.value = 0;
  }

  connect(destination) {
    if (this.panNode && destination) {
      this.panNode.connect(destination);
      this.isConnected = true;
    }
  }

  disconnect() {
    if (this.panNode && this.isConnected) {
      this.panNode.disconnect();
      this.isConnected = false;
    }
  }

  update() {
    // Update stereo parameters
  }

  setPan(value) {
    if (this.panNode) {
      this.panNode.pan.value = Math.max(-1, Math.min(1, value));
    }
  }

  randomizePan() {
    this.setPan((Math.random() - 0.5) * 2);
  }
}