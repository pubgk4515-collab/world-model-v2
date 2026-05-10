/**
 * utils/noise.js
 * =========================================================
 * Core Noise Foundation for Symbiote Atmosphere Engine
 * =========================================================
 *
 * PURPOSE:
 * --------
 * This file is the heartbeat of the entire atmosphere system.
 *
 * EVERYTHING depends on this:
 * - airflow
 * - turbulence
 * - gusts
 * - resonance excitation
 * - environmental body
 *
 * GOALS:
 * ------
 * 1. Zero clicks
 * 2. Long seamless playback
 * 3. Low CPU usage
 * 4. Reusable buffers
 * 5. Natural spectral balance
 *
 * IMPORTANT:
 * ----------
 * We DO NOT generate realtime random noise continuously.
 * That's wasteful.
 *
 * Instead:
 * - generate long buffers ONCE
 * - reuse forever
 * - manipulate later
 *
 * This gives:
 * - realistic movement
 * - low CPU
 * - stable playback
 */

const BUFFER_DURATION = 120; // seconds
const CROSSFADE_TIME = 0.08;

/* =========================================================
   RANDOM
========================================================= */

function randomFloat(min, max) {
  return min + Math.random() * (max - min);
}

/* =========================================================
   NORMALIZE
========================================================= */

function normalize(channelData, peak = 0.92) {
  let max = 0;

  for (let i = 0; i < channelData.length; i++) {
    const abs = Math.abs(channelData[i]);
    if (abs > max) max = abs;
  }

  if (max === 0) return;

  const scale = peak / max;

  for (let i = 0; i < channelData.length; i++) {
    channelData[i] *= scale;
  }
}

/* =========================================================
   FADE EDGES
========================================================= */

function applyEdgeFade(channelData, sampleRate) {
  const fadeSamples = Math.floor(sampleRate * CROSSFADE_TIME);

  for (let i = 0; i < fadeSamples; i++) {
    const fadeIn = i / fadeSamples;
    const fadeOut = 1 - fadeIn;

    channelData[i] *= fadeIn;

    channelData[channelData.length - 1 - i] *= fadeOut;
  }
}

/* =========================================================
   WHITE NOISE
========================================================= */

export function createWhiteNoiseBuffer(ctx) {
  const length = ctx.sampleRate * BUFFER_DURATION;

  const buffer = ctx.createBuffer(
    1,
    length,
    ctx.sampleRate
  );

  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  normalize(data);
  applyEdgeFade(data, ctx.sampleRate);

  return buffer;
}

/* =========================================================
   PINK NOISE
========================================================= */

export function createPinkNoiseBuffer(ctx) {
  const length = ctx.sampleRate * BUFFER_DURATION;

  const buffer = ctx.createBuffer(
    1,
    length,
    ctx.sampleRate
  );

  const output = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;

    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;

    const pink =
      b0 +
      b1 +
      b2 +
      b3 +
      b4 +
      b5 +
      b6 +
      white * 0.5362;

    b6 = white * 0.115926;

    output[i] = pink * 0.11;
  }

  normalize(output);
  applyEdgeFade(output, ctx.sampleRate);

  return buffer;
}

/* =========================================================
   BROWN NOISE
========================================================= */

export function createBrownNoiseBuffer(ctx) {
  const length = ctx.sampleRate * BUFFER_DURATION;

  const buffer = ctx.createBuffer(
    1,
    length,
    ctx.sampleRate
  );

  const output = buffer.getChannelData(0);

  let lastOut = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;

    output[i] =
      (lastOut + 0.02 * white) / 1.02;

    lastOut = output[i];

    output[i] *= 3.5;
  }

  normalize(output);
  applyEdgeFade(output, ctx.sampleRate);

  return buffer;
}

/* =========================================================
   LOOPABLE SOURCE
========================================================= */

export function createLoopingSource(
  ctx,
  buffer
) {
  const source = ctx.createBufferSource();

  source.buffer = buffer;
  source.loop = true;

  return source;
}

/* =========================================================
   RANDOM PLAYBACK RATE
========================================================= */

export function randomPlaybackRate(
  amount = 0.015
) {
  return randomFloat(
    1 - amount,
    1 + amount
  );
}

/* =========================================================
   VERY SLOW DRIFT VALUE
========================================================= */

export function randomDrift(
  center,
  range
) {
  return randomFloat(
    center - range,
    center + range
  );
}

/* =========================================================
   NOISE CACHE
========================================================= */

const noiseCache = new WeakMap();

/**
 * Prevents regenerating expensive buffers.
 */

export function getNoiseBuffers(ctx) {
  if (noiseCache.has(ctx)) {
    return noiseCache.get(ctx);
  }

  const buffers = {
    white: createWhiteNoiseBuffer(ctx),
    pink: createPinkNoiseBuffer(ctx),
    brown: createBrownNoiseBuffer(ctx),
  };

  noiseCache.set(ctx, buffers);

  return buffers;
}