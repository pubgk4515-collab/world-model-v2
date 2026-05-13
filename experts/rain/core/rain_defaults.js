// Rain Expert Default Configurations
// Lightweight presets for stable initialization

export const RAIN_DEFAULTS = {
  // Engine state
  enabled: false,
  volume: 0.3,
  intensity: 0.5,

  // Scheduling
  density: 0.7,
  burstProbability: 0.1,

  // DSP
  reverb: 0.2,
  stereoSpread: 0.8,

  // Surfaces
  activeSurfaces: ['concrete'],

  // World
  temperature: 20, // celsius
  humidity: 0.6,
  pressure: 1013, // hPa

  // UI
  showVisualizer: false,
  mobileLayout: true,
};