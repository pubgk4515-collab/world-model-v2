// Window Surface Simulation
// Simulates rain on windows

export class WindowSurface {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.transientSynth = null;
    this.isConnected = false;
  }

  build() {
    // Build window surface simulation
  }

  connect(transientSynth) {
    this.transientSynth = transientSynth;
    this.isConnected = true;
  }

  updateSurface() {
    // Update window parameters
  }

  trigger(parameters = {}) {
    if (!this.isConnected || !this.transientSynth) return;

    // Apply window-specific modifications - glassy, sharp
    const windowParams = {
      ...parameters,
      frequencyOffset: (parameters.frequencyOffset || 0) + 200, // Higher pitch
      wetness: 0.4,
      resonance: 0.6,
      damping: 0.4,
      hardness: 0.7,
    };

    // Trigger through transient synth
    this.transientSynth.trigger(windowParams);
  }
}