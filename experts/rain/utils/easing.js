// Easing Functions
// Smooth interpolation functions

export const Easing = {
  linear(t) {
    return t;
  },

  easeInQuad(t) {
    return t * t;
  },

  easeOutQuad(t) {
    return t * (2 - t);
  },

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  },

  easeInCubic(t) {
    return t * t * t;
  },

  easeOutCubic(t) {
    return (--t) * t * t + 1;
  },

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  },

  easeInSine(t) {
    return 1 - Math.cos((t * Math.PI) / 2);
  },

  easeOutSine(t) {
    return Math.sin((t * Math.PI) / 2);
  },

  easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  },

  easeInExpo(t) {
    return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
  },

  easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  },

  easeInOutExpo(t) {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
};