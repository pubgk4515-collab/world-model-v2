// experts/rain/surfaces/tin_roof/tin_profile.js
// Cinematic Tin Roof Surface Profile
// Tuned for believable metallic rain behavior.
//
// GOALS:
// - avoid xylophone / musical ringing
// - create chaotic metal splatter
// - preserve soft atmospheric realism
// - support cinematic resonance bloom
// - maintain mobile-safe DSP behavior

export const TIN_PROFILE = {

  // =====================================================
  // IDENTITY
  // =====================================================

  id: 'tin_roof',

  name: 'Tin Roof',

  category: 'metallic_surface',

  description:
    'Thin resonant metal roofing with chaotic rain reflections',

  // =====================================================
  // CORE MATERIAL PHYSICS
  // =====================================================

  material: 'galvanized_metal',

  hardness: 0.82,

  porosity: 0.04,

  density: 0.92,

  elasticity: 0.78,

  roughness: 0.22,

  wetnessRetention: 0.18,

  // =====================================================
  // IMPACT CHARACTER
  // =====================================================

  impactSharpness: 0.72,

  impactBrightness: 0.68,

  impactNoiseAmount: 0.74,

  transientSnap: 0.62,

  microSplashAmount: 0.25,

  // =====================================================
  // RESONANCE
  // =====================================================

  resonance: 0.55,

  resonanceType: 'chaotic_metal',

  resonanceBloom: 0.35,

  resonanceChaos: 0.72,

  resonanceRandomness: 0.58,

  resonanceLayers: 3,

  resonanceDetune: 0.16,

  resonanceDamping: 0.48,

  // =====================================================
  // FREQUENCY SHAPING
  // =====================================================

  frequencyRange: {

    // IMPORTANT:
    // Lowered from musical xylophone range

    min: 420,

    max: 1450
  },

  spectralTilt: 0.38,

  lowFrequencyBody: 0.32,

  midPresence: 0.58,

  highFrequencyAir: 0.42,

  harshnessControl: 0.65,

  // =====================================================
  // NOISE COMPONENTS
  // =====================================================

  noiseColor: 'bright_brown',

  broadbandNoise: 0.62,

  filteredNoise: 0.74,

  granularScatter: 0.52,

  textureAmount: 0.66,

  // =====================================================
  // DECAY
  // =====================================================

  decayTime: 0.42,

  tailLength: 0.34,

  earlyReflectionDecay: 0.18,

  resonanceTailDecay: 0.44,

  // =====================================================
  // REFLECTIONS
  // =====================================================

  reflection: 0.74,

  reflectionDiffusion: 0.48,

  reflectionBlur: 0.22,

  stereoScatter: 0.68,

  // =====================================================
  // ENVIRONMENTAL RESPONSE
  // =====================================================

  rainDensityResponse: 0.82,

  windSensitivity: 0.34,

  humidityAbsorption: 0.18,

  pressureSensitivity: 0.26,

  // =====================================================
  // RANDOMIZATION
  // =====================================================

  pitchVariance: 0.42,

  transientVariance: 0.36,

  timingVariance: 0.24,

  resonanceVariance: 0.44,

  // =====================================================
  // CINEMATIC TUNING
  // =====================================================

  cinematicBloom: 0.28,

  atmosphericSoftness: 0.32,

  realismBias: 0.84,

  musicalitySuppression: 0.92,

  // =====================================================
  // MOBILE SAFETY
  // =====================================================

  maxSimultaneousResonances: 4,

  maxTransientLayers: 3,

  cpuCost: 'medium',

  mobileSafe: true
};