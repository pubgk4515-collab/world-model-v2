// Rain Expert State Container
// Lightweight state management with null-safe guards

export class RainState {
  constructor() {
    this.reset();
  }

  reset() {
    this.enabled = false;
    this.volume = 0.3;
    this.intensity = 0.5;
    this.activeSurfaces = [];
    this.worldConditions = {
      temperature: 20,
      humidity: 0.6,
      pressure: 1013,
    };
    this.dspState = {
      reverb: 0.2,
      stereoSpread: 0.8,
    };
  }

  updateVolume(value) {
    if (typeof value === 'number' && value >= 0 && value <= 1) {
      this.volume = value;
    }
  }

  updateIntensity(value) {
    if (typeof value === 'number' && value >= 0 && value <= 1) {
      this.intensity = value;
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }
}