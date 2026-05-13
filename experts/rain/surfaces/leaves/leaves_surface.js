// Leaves Surface Simulation
// Simulates rain on leaves

export class LeavesSurface {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.transientSynth = null;
    this.isConnected = false;
  }

  build() {
    // Build leaves surface simulation
  }

  connect(transientSynth) {
    this.transientSynth = transientSynth;
    this.isConnected = true;
  }

  updateSurface() {
    // Update leaves parameters
  }

  trigger(parameters = {}) {
    if (!this.isConnected || !this.transientSynth) return;

    // Apply leaves-specific modifications - softer, rustling
    const leavesParams = {
      ...parameters,
      frequencyOffset: (parameters.frequencyOffset || 0) - 200, // Lower pitch
      wetness: 0.8,
      resonance: 0.2,
      damping: 0.9,
      hardness: 0.2,
    };

    // Trigger through transient synth
    this.transientSynth.trigger(leavesParams);
  }
}