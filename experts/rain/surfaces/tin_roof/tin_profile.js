// Tin Roof Surface Profile
// Defines tin roof surface characteristics

export const TIN_PROFILE = {
  name: 'tin_roof',
  hardness: 0.9,
  porosity: 0.1,
  resonance: 0.9,
  frequencyRange: {
    min: 1000,
    max: 2000,
  },
  decayTime: 1.0,
  reflection: 0.8,
};