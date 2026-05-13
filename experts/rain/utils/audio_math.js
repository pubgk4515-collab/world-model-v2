// Audio Math Utilities
// Mathematical functions for audio processing

export const AudioMath = {
  // Convert linear amplitude to decibels
  linearToDb(linear) {
    return 20 * Math.log10(Math.max(linear, 0.00001));
  },

  // Convert decibels to linear amplitude
  dbToLinear(db) {
    return Math.pow(10, db / 20);
  },

  // Clamp value between min and max
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  // Linear interpolation
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // Smooth value with exponential moving average
  smooth(current, target, factor) {
    return current + (target - current) * factor;
  },

  // Generate random value between min and max
  random(min = 0, max = 1) {
    return min + Math.random() * (max - min);
  },

  // Convert frequency to MIDI note
  freqToMidi(freq) {
    return 69 + 12 * Math.log2(freq / 440);
  },

  // Convert MIDI note to frequency
  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  // Calculate distance between two points
  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  },

  // Calculate angle between two points
  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },
};