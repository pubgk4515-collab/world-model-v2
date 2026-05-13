// Clamp Utility
// Value clamping functions

export function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

export function clamp01(value) {
  return clamp(value, 0, 1);
}

export function clampDb(value, minDb = -60, maxDb = 0) {
  return clamp(value, minDb, maxDb);
}

export function clampFreq(value, minFreq = 20, maxFreq = 20000) {
  return clamp(value, minFreq, maxFreq);
}