// Rain Noise Generator
// Ultra-soft atmospheric rain bed with brown/pink hybrid noise

export class RainNoise {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.source = null;
    this.gainNode = null;
    this.filter = null;
    this.stereoPanner = null;
    this.isConnected = false;
    this.isRunning = false;
    this.intensity = 0.3;
    this.stereoDrift = 0;
    this.driftPhase = 0;
  }

  init() {
    this.source = this.audioContext.createBufferSource();
    this.gainNode = this.audioContext.createGain();
    this.filter = this.audioContext.createBiquadFilter();
    this.stereoPanner = this.audioContext.createStereoPanner();

    // Create brown/pink hybrid noise buffer
    const bufferSize = this.audioContext.sampleRate * 4; // 4 seconds
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate brown noise (random walk)
    let brownValue = 0;
    const brownCoeff = 0.02;

    // Generate pink noise (1/f spectrum approximation)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    const pinkCoeffs = [0.99886, 0.99332, 0.96900, 0.86650, 0.55000, 0.09380, 0.00000];

    for (let i = 0; i < bufferSize; i++) {
      // White noise base
      const white = Math.random() * 2 - 1;

      // Brown noise integration
      brownValue += (white - brownValue) * brownCoeff;

      // Pink noise filtering
      b0 = pinkCoeffs[0] * (b0 - white) + white;
      b1 = pinkCoeffs[1] * (b1 - b0) + b0;
      b2 = pinkCoeffs[2] * (b2 - b1) + b1;
      b3 = pinkCoeffs[3] * (b3 - b2) + b2;
      b4 = pinkCoeffs[4] * (b4 - b3) + b3;
      b5 = pinkCoeffs[5] * (b5 - b4) + b4;
      b6 = pinkCoeffs[6] * (b6 - b5) + b5;

      // Blend brown and pink noise
      const pinkNoise = b6 * 0.55;
      const brownNoise = brownValue * 0.45;

      data[i] = pinkNoise + brownNoise;
    }

    this.source.buffer = buffer;
    this.source.loop = true;

    // Soft high-cut filtering
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 3000;
    this.filter.Q.value = 0.5;

    // Very low gain for atmospheric feel
    this.gainNode.gain.value = 0.02;

    // Chain: source -> filter -> gain -> stereo panner
    this.source.connect(this.filter);
    this.filter.connect(this.gainNode);
    this.gainNode.connect(this.stereoPanner);
  }

  connect(destination) {
    if (this.stereoPanner && destination) {
      this.stereoPanner.connect(destination);
      this.isConnected = true;
    }
  }

  disconnect() {
    if (this.stereoPanner && this.isConnected) {
      this.stereoPanner.disconnect();
      this.isConnected = false;
    }
  }

  update() {
    if (!this.isRunning) return;

    // Subtle stereo drift
    this.driftPhase += 0.01;
    this.stereoDrift = Math.sin(this.driftPhase) * 0.1;
    if (this.stereoPanner) {
      this.stereoPanner.pan.value = this.stereoDrift;
    }

    // Gentle gain evolution based on intensity
    const targetGain = Math.max(0.005, this.intensity * 0.08); // Floor suppression
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, 0.5);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    if (this.source) {
      this.source.start();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.source) {
      this.source.stop();
    }
  }

  setIntensity(value) {
    this.intensity = Math.max(0, Math.min(1, value));
  }

  setHighCut(frequency) {
    if (this.filter) {
      this.filter.frequency.setTargetAtTime(
        Math.max(500, Math.min(8000, frequency)),
        this.audioContext.currentTime,
        0.1
      );
    }
  }
}