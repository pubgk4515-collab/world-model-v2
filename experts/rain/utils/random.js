// Random Utilities
// Random number generation functions

export function random(min = 0, max = 1) {
  return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
  return Math.floor(random(min, max + 1));
}

export function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomBool(probability = 0.5) {
  return Math.random() < probability;
}

export function randomSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

export function randomNormal(mean = 0, stdDev = 1) {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
}