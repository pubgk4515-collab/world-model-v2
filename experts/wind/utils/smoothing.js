/**
 * utils/smoothing.js
 * =========================================================
 * Audio Parameter Smoothing
 * =========================================================
 *
 * PURPOSE:
 * --------
 * Prevent:
 *
 * ❌ clicks
 * ❌ pops
 * ❌ zipper noise
 * ❌ robotic transitions
 *
 * IMPORTANT:
 * ----------
 * Real atmosphere:
 *
 * NEVER changes instantly.
 *
 * Every parameter:
 * - gain
 * - filter
 * - resonance
 * - panning
 *
 * should evolve smoothly.
 */

/* =========================================================
   GENERIC PARAM SMOOTHING
========================================================= */

export function smoothParam(
  param,
  target,
  ctx,
  time = 0.08
) {

  if (!param || !ctx) return;

  const now =
    ctx.currentTime;

  param.cancelScheduledValues(
    now
  );

  param.setValueAtTime(
    param.value,
    now
  );

  param.setTargetAtTime(
    target,
    now,
    time
  );
}

/* =========================================================
   GAIN SMOOTHING
========================================================= */

export function smoothGain(
  gainNode,
  target,
  ctx,
  time = 0.12
) {

  if (
    !gainNode ||
    !gainNode.gain
  ) {
    return;
  }

  smoothParam(
    gainNode.gain,
    target,
    ctx,
    time
  );
}

/* =========================================================
   FILTER FREQUENCY SMOOTHING
========================================================= */

export function smoothFilter(
  filter,
  frequency,
  ctx,
  time = 0.15
) {

  if (!filter) return;

  smoothParam(
    filter.frequency,
    frequency,
    ctx,
    time
  );
}

/* =========================================================
   FILTER Q SMOOTHING
========================================================= */

export function smoothQ(
  filter,
  q,
  ctx,
  time = 0.15
) {

  if (!filter) return;

  smoothParam(
    filter.Q,
    q,
    ctx,
    time
  );
}

/* =========================================================
   PAN SMOOTHING
========================================================= */

export function smoothPan(
  panner,
  target,
  ctx,
  time = 0.2
) {

  if (
    !panner ||
    !panner.pan
  ) {
    return;
  }

  smoothParam(
    panner.pan,
    target,
    ctx,
    time
  );
}

/* =========================================================
   EXPONENTIAL SMOOTHING
========================================================= */

/**
 * Better for:
 * - frequencies
 * - positive-only params
 * - resonance
 */

export function smoothExp(
  param,
  target,
  ctx,
  time = 0.12
) {

  if (!param || !ctx) return;

  const now =
    ctx.currentTime;

  /**
   * exponential ramps
   * cannot hit 0
   */

  const safeTarget =
    Math.max(
      0.0001,
      target
    );

  const safeCurrent =
    Math.max(
      0.0001,
      param.value
    );

  param.cancelScheduledValues(
    now
  );

  param.setValueAtTime(
    safeCurrent,
    now
  );

  param.exponentialRampToValueAtTime(
    safeTarget,
    now + time
  );
}

/* =========================================================
   MULTI PARAM SMOOTHING
========================================================= */

/**
 * Smooth multiple params together.
 */

export function smoothMany(
  entries,
  ctx,
  time = 0.1
) {

  entries.forEach(
    ({
      param,
      value
    }) => {

      smoothParam(
        param,
        value,
        ctx,
        time
      );

    }
  );
}

/* =========================================================
   ATMOSPHERIC SWELL
========================================================= */

/**
 * Creates:
 * natural breathing movement.
 */

export function atmosphericSwell(
  gainNode,
  ctx,
  {
    peak = 1,
    rise = 4,
    fall = 8,
  } = {}
) {

  if (
    !gainNode ||
    !gainNode.gain
  ) {
    return;
  }

  const now =
    ctx.currentTime;

  const current =
    gainNode.gain.value;

  gainNode.gain
    .cancelScheduledValues(now);

  gainNode.gain
    .setValueAtTime(
      current,
      now
    );

  /**
   * Slow rise.
   */

  gainNode.gain
    .linearRampToValueAtTime(
      peak,
      now + rise
    );

  /**
   * Soft fall.
   */

  gainNode.gain
    .linearRampToValueAtTime(
      current,
      now + rise + fall
    );
}

/* =========================================================
   SOFT MUTE
========================================================= */

export function softMute(
  gainNode,
  ctx,
  time = 0.3
) {

  if (
    !gainNode ||
    !gainNode.gain
  ) {
    return;
  }

  smoothGain(
    gainNode,
    0.0001,
    ctx,
    time
  );
}

/* =========================================================
   SOFT UNMUTE
========================================================= */

export function softUnmute(
  gainNode,
  ctx,
  target = 1,
  time = 0.4
) {

  if (
    !gainNode ||
    !gainNode.gain
  ) {
    return;
  }

  smoothGain(
    gainNode,
    target,
    ctx,
    time
  );
}