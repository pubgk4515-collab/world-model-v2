/**
 * utils/random.js
 * =========================================================
 * Atmospheric Random Utilities
 * =========================================================
 *
 * PURPOSE:
 * --------
 * Real nature is:
 *
 * ❌ NOT perfectly random
 * ❌ NOT perfectly periodic
 *
 * We need:
 *
 * ✅ organic variation
 * ✅ soft unpredictability
 * ✅ natural movement
 */

export function randomRange(min, max) {

  return (
    min +
    Math.random() *
    (max - min)
  );
}

/* =========================================================
   RANDOM FLOAT
========================================================= */

export function randomFloat(
  min,
  max
) {

  return (
    min +
    Math.random() *
    (max - min)
  );
}

/* =========================================================
   RANDOM INT
========================================================= */

export function randomInt(
  min,
  max
) {

  return Math.floor(
    randomRange(min, max + 1)
  );
}

/* =========================================================
   RANDOM SIGN
========================================================= */

export function randomSign() {

  return Math.random() > 0.5
    ? 1
    : -1;
}

/* =========================================================
   CHANCE
========================================================= */

export function chance(probability) {

  return Math.random() <
    probability;
}

/* =========================================================
   PICK RANDOM
========================================================= */

export function pickRandom(array) {

  return array[
    randomInt(
      0,
      array.length - 1
    )
  ];
}

/* =========================================================
   SOFT RANDOM
========================================================= */

/**
 * More centered.
 *
 * Less extreme.
 *
 * Better for nature.
 */

export function softRandom(
  min,
  max
) {

  const a = Math.random();
  const b = Math.random();

  const average =
    (a + b) * 0.5;

  return (
    min +
    average *
    (max - min)
  );
}

/* =========================================================
   BIASED RANDOM
========================================================= */

/**
 * bias > 1
 * favors lower values.
 *
 * bias < 1
 * favors higher values.
 */

export function biasedRandom(
  min,
  max,
  bias = 2
) {

  const t =
    Math.pow(
      Math.random(),
      bias
    );

  return (
    min +
    t *
    (max - min)
  );
}

/* =========================================================
   HUMANIZED INTERVAL
========================================================= */

/**
 * Prevents:
 *
 * robotic timing.
 */

export function humanInterval(
  base,
  variation = 0.25
) {

  const drift =
    base * variation;

  return randomRange(
    base - drift,
    base + drift
  );
}