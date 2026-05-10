/**
 * engine/modulation_engine.js
 * =========================================================
 * Global Atmospheric Motion Engine
 * =========================================================
 *
 * THIS FILE IS:
 * --------------
 * the "life system"
 * of the atmosphere.
 *
 * WHY?
 * ----
 * Without modulation:
 *
 * ❌ static
 * ❌ robotic
 * ❌ looping
 * ❌ fake
 *
 * With modulation:
 *
 * ✅ evolving
 * ✅ breathing
 * ✅ atmospheric
 * ✅ organic
 *
 * IMPORTANT:
 * ----------
 * Real wind changes:
 * VERY slowly.
 *
 * So:
 * - no fast LFO madness
 * - no synth wobble
 * - no obvious movement
 *
 * Instead:
 * tiny long-term evolution.
 *
 * CPU STRATEGY:
 * -------------
 * One central modulation system
 * controls everything.
 *
 * NOT:
 * 20 separate oscillators.
 */

export default class ModulationEngine {

  constructor(ctx) {

    this.ctx = ctx;

    /* =====================================================
       MOD TARGETS
    ===================================================== */

    this.targets = [];

    /* =====================================================
       STATE
    ===================================================== */

    this.isRunning = false;

    this.modulationTimer = null;

    /**
     * Global atmosphere energy.
     */

    this.intensity = 0.3;
  }

  /* =======================================================
     REGISTER TARGET
  ======================================================= */

  /**
   * Adds a modulation target.
   *
   * Example:
   *
   * engine.addTarget({
   *   object: airflowStem,
   *   property: 'setIntensity',
   *   min: 0.2,
   *   max: 0.4
   * });
   */

  addTarget(config) {

    this.targets.push({

      object:
        config.object,

      property:
        config.property,

      min:
        config.min ?? 0,

      max:
        config.max ?? 1,

      smoothness:
        config.smoothness ?? 1,

      type:
        config.type ?? 'float',
    });
  }

  /* =======================================================
     START
  ======================================================= */

  start() {

    if (this.isRunning) return;

    this.isRunning = true;

    /**
     * Begin slow atmosphere evolution.
     */

    this.startGlobalMotion();
  }

  /* =======================================================
     STOP
  ======================================================= */

  stop() {

    this.isRunning = false;

    if (this.modulationTimer) {

      clearInterval(
        this.modulationTimer
      );

      this.modulationTimer = null;
    }
  }

  /* =======================================================
     MAIN ATMOSPHERIC EVOLUTION
  ======================================================= */

  /**
   * THIS is where:
   * "living atmosphere"
   * happens.
   *
   * Very slow random movement.
   */

  startGlobalMotion() {

    this.modulationTimer =
      setInterval(() => {

        if (!this.isRunning) return;

        /**
         * Modulate all targets.
         */

        this.targets.forEach(
          target => {

            this.modulateTarget(
              target
            );

          }
        );

      }, 5000 + Math.random() * 8000);
  }

  /* =======================================================
     TARGET MODULATION
  ======================================================= */

  modulateTarget(target) {

    if (
      !target.object ||
      !target.property
    ) {
      return;
    }

    /**
     * Create soft random movement.
     */

    const value =
      target.min +
      Math.random() *
      (target.max - target.min);

    /**
     * Apply modulation.
     */

    try {

      /**
       * Function style
       */

      if (
        typeof target.object[
          target.property
        ] === 'function'
      ) {

        target.object[
          target.property
        ](value);

      }

      /**
       * Direct property style
       */

      else {

        target.object[
          target.property
        ] = value;
      }

    } catch (err) {

      console.warn(
        '[ModulationEngine]',
        err
      );
    }
  }

  /* =======================================================
     GLOBAL INTENSITY
  ======================================================= */

  /**
   * Changes overall modulation energy.
   *
   * Calm:
   * subtle movement
   *
   * Storm:
   * more evolution
   */

  setIntensity(value) {

    value =
      Math.max(0, Math.min(1, value));

    this.intensity = value;
  }

  /* =======================================================
     ATMOSPHERIC STATES
  ======================================================= */

  setCalmMode() {

    this.setIntensity(0.1);
  }

  setBreezeMode() {

    this.setIntensity(0.3);
  }

  setWindyMode() {

    this.setIntensity(0.6);
  }

  setStormMode() {

    this.setIntensity(1.0);
  }

  /* =======================================================
     RANDOM ATMOSPHERIC CURVES
  ======================================================= */

  /**
   * Creates ultra-soft movement curves.
   */

  randomAtmosphericValue(
    min,
    max,
    bias = 1.5
  ) {

    /**
     * Curved randomness.
     *
     * Prevents:
     * robotic equal distribution.
     */

    const t =
      Math.pow(
        Math.random(),
        bias
      );

    return min + t * (max - min);
  }

  /* =======================================================
     SLOW PAN DRIFT
  ======================================================= */

  /**
   * Helper for stereo motion.
   */

  randomPan(
    amount = 0.3
  ) {

    return (
      (Math.random() * 2 - 1)
      * amount
    );
  }

  /* =======================================================
     SLOW FILTER MOVEMENT
  ======================================================= */

  /**
   * Helper for filter evolution.
   */

  randomFrequency(
    center,
    spread
  ) {

    return (
      center +
      (Math.random() * 2 - 1)
      * spread
    );
  }

  /* =======================================================
     LONG-FORM ATMOSPHERIC SWELL
  ======================================================= */

  /**
   * Creates:
   * very slow weather movement.
   */

  createLongSwell(
    callback,
    {
      min = 0.2,
      max = 0.8,
      intervalMin = 12000,
      intervalMax = 30000,
    } = {}
  ) {

    const run = () => {

      if (!this.isRunning) return;

      const value =
        this.randomAtmosphericValue(
          min,
          max,
          1.8
        );

      callback(value);

      const next =
        intervalMin +
        Math.random() *
        (intervalMax - intervalMin);

      setTimeout(
        run,
        next
      );
    };

    run();
  }

  /* =======================================================
     DESTROY
  ======================================================= */

  destroy() {

    this.stop();

    this.targets = [];
  }
}