/**
 * engine/crossfade_engine.js
 * =========================================================
 * Atmospheric Crossfade Engine
 * =========================================================
 *
 * THIS FILE IS:
 * --------------
 * the invisible glue.
 *
 * PURPOSE:
 * --------
 * Prevent:
 *
 * ❌ clicks
 * ❌ pops
 * ❌ harsh transitions
 * ❌ loop exposure
 * ❌ robotic changes
 *
 * Create:
 *
 * ✅ cinematic blending
 * ✅ evolving atmosphere
 * ✅ perceptual continuity
 * ✅ realism
 *
 * IMPORTANT:
 * ----------
 * Human ears detect:
 *
 *   sudden changes
 *
 * VERY easily.
 *
 * Especially in:
 * - ambient sound
 * - wind
 * - rain
 * - drones
 *
 * So:
 * EVERYTHING must blend slowly.
 *
 * CPU:
 * ----
 * Nearly free.
 *
 * Only:
 * - gain ramps
 * - parameter smoothing
 * - timing control
 */

export default class CrossfadeEngine {

  constructor(ctx) {

    this.ctx = ctx;

    /* =====================================================
       ACTIVE FADES
    ===================================================== */

    this.activeFades = new Set();

    /* =====================================================
       DEFAULTS
    ===================================================== */

    /**
     * Slow cinematic movement.
     */

    this.defaultFade =
      4.0;

    /**
     * Faster for emergency changes.
     */

    this.fastFade =
      1.2;

    /**
     * Long atmospheric morph.
     */

    this.longFade =
      10.0;
  }

  /* =======================================================
     BASIC GAIN FADE
  ======================================================= */

  /**
   * Smoothly fades a GainNode.
   */

  fadeGain(
    gainNode,
    target,
    duration = this.defaultFade
  ) {

    if (
      !gainNode ||
      !gainNode.gain
    ) {
      return;
    }

    const now =
      this.ctx.currentTime;

    /**
     * Prevent clicks.
     */

    gainNode.gain
      .cancelScheduledValues(now);

    /**
     * Start from current value.
     */

    gainNode.gain
      .setValueAtTime(
        gainNode.gain.value,
        now
      );

    /**
     * Cinematic fade.
     */

    gainNode.gain
      .setTargetAtTime(
        target,
        now,
        duration * 0.35
      );
  }

  /* =======================================================
     PARAMETER MORPH
  ======================================================= */

  /**
   * Smoothly morphs AudioParams.
   */

  morphParam(
    param,
    target,
    duration = this.defaultFade
  ) {

    if (!param) return;

    const now =
      this.ctx.currentTime;

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
      duration * 0.3
    );
  }

  /* =======================================================
     CROSSFADE BETWEEN TWO GAINS
  ======================================================= */

  /**
   * Example:
   *
   * calmLayer ↓
   * stormLayer ↑
   */

  crossfade(
    fromGain,
    toGain,
    duration = this.defaultFade
  ) {

    this.fadeGain(
      fromGain,
      0,
      duration
    );

    this.fadeGain(
      toGain,
      1,
      duration
    );
  }

  /* =======================================================
     ATMOSPHERIC SWELL
  ======================================================= */

  /**
   * Creates:
   * breathing atmosphere.
   */

  createSwell(
    gainNode,
    {
      peak = 1,
      rise = 8,
      fall = 12,
    } = {}
  ) {

    if (
      !gainNode ||
      !gainNode.gain
    ) {
      return;
    }

    const now =
      this.ctx.currentTime;

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
      .setTargetAtTime(
        peak,
        now,
        rise * 0.3
      );

    /**
     * Long soft decay.
     */

    gainNode.gain
      .setTargetAtTime(
        current,
        now + rise,
        fall * 0.35
      );
  }

  /* =======================================================
     RANDOMIZED FADE TIME
  ======================================================= */

  /**
   * Avoids:
   * mechanical timing.
   */

  randomFade(
    base = 4,
    variance = 2
  ) {

    return (
      base +
      (Math.random() * 2 - 1)
      * variance
    );
  }

  /* =======================================================
     SOFT MUTE
  ======================================================= */

  /**
   * Never hard mute audio.
   */

  softMute(
    gainNode,
    duration = this.fastFade
  ) {

    this.fadeGain(
      gainNode,
      0.0001,
      duration
    );
  }

  /* =======================================================
     SOFT UNMUTE
  ======================================================= */

  softUnmute(
    gainNode,
    target = 1,
    duration = this.defaultFade
  ) {

    this.fadeGain(
      gainNode,
      target,
      duration
    );
  }

  /* =======================================================
     LOOP MASKING
  ======================================================= */

  /**
   * IMPORTANT:
   *
   * Tiny gain drift
   * hides looping perception.
   */

  startLoopMasking(
    gainNode,
    {
      amount = 0.04,
      intervalMin = 6000,
      intervalMax = 14000,
    } = {}
  ) {

    const run = () => {

      if (!gainNode) return;

      const current =
        gainNode.gain.value;

      /**
       * Tiny invisible drift.
       */

      const target =
        current +
        (
          (Math.random() * 2 - 1)
          * amount
        );

      /**
       * Safety clamp.
       */

      const safe =
        Math.max(
          0.0001,
          Math.min(1.2, target)
        );

      this.fadeGain(
        gainNode,
        safe,
        this.randomFade(6, 2)
      );

      const next =
        intervalMin +
        Math.random() *
        (intervalMax - intervalMin);

      const timer =
        setTimeout(
          run,
          next
        );

      this.activeFades.add(timer);
    };

    run();
  }

  /* =======================================================
     STEREO MOTION
  ======================================================= */

  /**
   * Very slow cinematic pan drift.
   */

  startStereoDrift(
    panNode,
    {
      amount = 0.25,
      intervalMin = 10000,
      intervalMax = 24000,
    } = {}
  ) {

    if (!panNode) return;

    const run = () => {

      const target =
        (
          Math.random() * 2 - 1
        ) * amount;

      this.morphParam(
        panNode.pan,
        target,
        this.randomFade(10, 4)
      );

      const next =
        intervalMin +
        Math.random() *
        (intervalMax - intervalMin);

      const timer =
        setTimeout(
          run,
          next
        );

      this.activeFades.add(timer);

    };

    run();
  }

  /* =======================================================
     FILTER MOTION
  ======================================================= */

  /**
   * Tiny evolving filter movement.
   */

  startFilterMotion(
    filter,
    {
      min = 800,
      max = 3000,
      intervalMin = 8000,
      intervalMax = 18000,
    } = {}
  ) {

    if (!filter) return;

    const run = () => {

      const target =
        min +
        Math.random() *
        (max - min);

      this.morphParam(
        filter.frequency,
        target,
        this.randomFade(8, 3)
      );

      const next =
        intervalMin +
        Math.random() *
        (intervalMax - intervalMin);

      const timer =
        setTimeout(
          run,
          next
        );

      this.activeFades.add(timer);

    };

    run();
  }

  /* =======================================================
     ATMOSPHERIC ENERGY CURVE
  ======================================================= */

  /**
   * Used for:
   * long-form weather evolution.
   */

  atmosphericCurve(
    intensity
  ) {

    /**
     * Prevents:
     * harsh linear response.
     */

    return Math.pow(
      intensity,
      1.4
    );
  }

  /* =======================================================
     WEATHER TRANSITION
  ======================================================= */

  /**
   * Centralized weather morphing.
   */

  transitionWeather(
    callback,
    {
      duration = 12,
    } = {}
  ) {

    /**
     * Slowly apply
     * atmospheric changes.
     */

    callback(
      this.atmosphericCurve(
        duration / 12
      )
    );
  }

  /* =======================================================
     STOP ALL ACTIVE TIMERS
  ======================================================= */

  stopAll() {

    this.activeFades.forEach(
      timer => {

        clearTimeout(timer);

      }
    );

    this.activeFades.clear();
  }

  /* =======================================================
     DESTROY
  ======================================================= */

  destroy() {

    this.stopAll();
  }
}