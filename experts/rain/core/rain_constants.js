// Rain Expert Constants
// Safe defaults for mobile and low-power environments

export const RAIN_CONSTANTS = {
  // Audio context settings
  SAMPLE_RATE: 44100,
  BIT_DEPTH: 16,

  // Engine limits
  MAX_VOICES: 32,
  MAX_SURFACES: 8,
  MAX_AMBIENCE_LAYERS: 4,

  // Scheduling
  MIN_DROP_INTERVAL: 0.01, // seconds
  MAX_DROP_INTERVAL: 2.0,

  // DSP parameters
  DEFAULT_VOLUME: 0.3,
  DEFAULT_PITCH: 1.0,
  DEFAULT_REVERB: 0.2,

  // Performance guards
  MAX_PROCESS_TIME: 10, // ms per frame
  IDLE_TIMEOUT: 30000, // ms
};