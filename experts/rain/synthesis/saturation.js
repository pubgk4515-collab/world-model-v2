// Rain Saturation Processor
// Applies saturation/distortion

export class Saturation {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.waveShaper = null;
    this.isConnected = false;
  }

  init() {
    this.waveShaper = this.audioContext.createWaveShaper();
    this.waveShaper.curve = this.makeDistortionCurve(0);
  }

  connect(destination) {
    if (this.waveShaper && destination) {
      this.waveShaper.connect(destination);
      this.isConnected = true;
    }
  }

  disconnect() {
    if (this.waveShaper && this.isConnected) {
      this.waveShaper.disconnect();
      this.isConnected = false;
    }
  }

  update() {
    // Update saturation parameters
  }

  setAmount(value) {
    if (this.waveShaper) {
      this.waveShaper.curve = this.makeDistortionCurve(value);
    }
  }

  makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = (3 + amount) * x * 20 * (Math.PI / 180) / (Math.PI + amount * Math.abs(x));
    }

    return curve;
  }
}