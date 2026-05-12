/**
 * utils/noise.js
 * =========================================================
 * Cinematic Atmospheric Noise System
 * =========================================================
 *
 * Goals:
 * - ultra smooth looping
 * - low hiss floor
 * - DC-safe buffers
 * - darker atmospheric spectra
 * - cinematic airflow foundations
 * - soft resonance excitation
 */

const BUFFER_DURATION = 180;

/**
 * Longer fades reduce
 * loop-edge spectral jumps.
 */

const EDGE_FADE_TIME = 1.5;

/**
 * IMPORTANT:
 * Lower normalization massively
 * reduces perceived hiss.
 */

const TARGET_PEAK = 0.34;

// =========================================================
// RANDOM
// =========================================================

function randomFloat(min, max) {

  return (
    min +
    Math.random() * (max - min)
  );
}

// =========================================================
// DC OFFSET REMOVAL
// =========================================================

function removeDCOffset(data) {

  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }

  const mean =
    sum / data.length;

  for (let i = 0; i < data.length; i++) {
    data[i] -= mean;
  }
}

// =========================================================
// NORMALIZATION
// =========================================================

function normalize(
  data,
  peak = TARGET_PEAK
) {

  let max = 0;

  for (let i = 0; i < data.length; i++) {

    const abs =
      Math.abs(data[i]);

    if (abs > max) {
      max = abs;
    }
  }

  if (max <= 0.00001) return;

  const scale =
    peak / max;

  for (let i = 0; i < data.length; i++) {
    data[i] *= scale;
  }
}

// =========================================================
// EDGE SMOOTHING
// =========================================================

/**
 * MUCH smoother than
 * simple linear fades.
 */

function applyEdgeSmoothing(
  data,
  sampleRate
) {

  const fadeSamples =
    Math.floor(
      sampleRate *
      EDGE_FADE_TIME
    );

  for (
    let i = 0;
    i < fadeSamples;
    i++
  ) {

    const phase =
      i / fadeSamples;

    /**
     * cosine smoothing
     */

    const fadeIn =
      0.5 -
      Math.cos(
        phase * Math.PI
      ) * 0.5;

    const fadeOut =
      1 - fadeIn;

    data[i] *= fadeIn;

    data[
      data.length - 1 - i
    ] *= fadeOut;
  }
}

// =========================================================
// GENTLE SPECTRAL DAMPING
// =========================================================

/**
 * Removes brittle HF energy.
 */

function dampHighs(data) {

  let previous = 0;

  for (let i = 0; i < data.length; i++) {

    previous =
      previous * 0.985 +
      data[i] * 0.015;

    data[i] =
      previous * 0.92 +
      data[i] * 0.08;
  }
}

// =========================================================
// WHITE NOISE
// =========================================================

export function createWhiteNoiseBuffer(ctx) {

  const length =
    ctx.sampleRate *
    BUFFER_DURATION;

  const buffer =
    ctx.createBuffer(
      1,
      length,
      ctx.sampleRate
    );

  const data =
    buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {

    /**
     * softer white distribution
     */

    const a =
      Math.random() * 2 - 1;

    const b =
      Math.random() * 2 - 1;

    data[i] =
      (a + b) * 0.5;
  }

  dampHighs(data);

  removeDCOffset(data);

  normalize(data, 0.22);

  applyEdgeSmoothing(
    data,
    ctx.sampleRate
  );

  return buffer;
}

// =========================================================
// PINK NOISE
// =========================================================

export function createPinkNoiseBuffer(ctx) {

  const length =
    ctx.sampleRate *
    BUFFER_DURATION;

  const buffer =
    ctx.createBuffer(
      1,
      length,
      ctx.sampleRate
    );

  const output =
    buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i++) {

    const white =
      Math.random() * 2 - 1;

    b0 =
      0.99886 * b0 +
      white * 0.0555179;

    b1 =
      0.99332 * b1 +
      white * 0.0750759;

    b2 =
      0.96900 * b2 +
      white * 0.1538520;

    b3 =
      0.86650 * b3 +
      white * 0.3104856;

    b4 =
      0.55000 * b4 +
      white * 0.5329522;

    b5 =
      -0.7616 * b5 -
      white * 0.0168980;

    const pink =
      b0 +
      b1 +
      b2 +
      b3 +
      b4 +
      b5 +
      b6 +
      white * 0.5362;

    b6 =
      white * 0.115926;

    output[i] =
      pink * 0.055;
  }

  dampHighs(output);

  removeDCOffset(output);

  normalize(output, 0.26);

  applyEdgeSmoothing(
    output,
    ctx.sampleRate
  );

  return buffer;
}

// =========================================================
// BROWN NOISE
// =========================================================

export function createBrownNoiseBuffer(ctx) {

  const length =
    ctx.sampleRate *
    BUFFER_DURATION;

  const buffer =
    ctx.createBuffer(
      1,
      length,
      ctx.sampleRate
    );

  const output =
    buffer.getChannelData(0);

  let lastOut = 0;

  for (let i = 0; i < length; i++) {

    const white =
      (Math.random() * 2 - 1) * 0.65;

    /**
     * smoother brown integration
     */

    lastOut =
      (
        lastOut * 0.992 +
        white * 0.008
      );

    output[i] =
      lastOut;
  }

  /**
   * removes excessive mud
   */

  dampHighs(output);

  removeDCOffset(output);

  normalize(output, 0.30);

  applyEdgeSmoothing(
    output,
    ctx.sampleRate
  );

  return buffer;
}

// =========================================================
// LOOPING SOURCE
// =========================================================

export function createLoopingSource(
  ctx,
  buffer
) {

  const source =
    ctx.createBufferSource();

  source.buffer = buffer;

  source.loop = true;

  return source;
}

// =========================================================
// PLAYBACK RATE
// =========================================================

export function randomPlaybackRate(
  amount = 0.004
) {

  return randomFloat(
    1 - amount,
    1 + amount
  );
}

// =========================================================
// RANDOM DRIFT
// =========================================================

export function randomDrift(
  center,
  range
) {

  return randomFloat(
    center - range,
    center + range
  );
}

// =========================================================
// CACHE
// =========================================================

const noiseCache =
  new WeakMap();

export function getNoiseBuffers(ctx) {

  if (noiseCache.has(ctx)) {
    return noiseCache.get(ctx);
  }

  const buffers = {

    white:
      createWhiteNoiseBuffer(ctx),

    pink:
      createPinkNoiseBuffer(ctx),

    brown:
      createBrownNoiseBuffer(ctx),
  };

  noiseCache.set(
    ctx,
    buffers
  );

  return buffers;
}