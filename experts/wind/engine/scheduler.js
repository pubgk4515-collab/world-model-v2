/**
 * engine/scheduler.js
 * =========================================================
 * Atmospheric Weather Brain
 * =========================================================
 *
 * THIS FILE IS:
 * --------------
 * the intelligence layer.
 *
 * WHY?
 * ----
 * Without this:
 *
 * ❌ random audio systems
 * ❌ disconnected movement
 * ❌ fake ambience
 *
 * With this:
 *
 * ✅ evolving weather
 * ✅ believable atmosphere
 * ✅ coordinated wind behavior
 *
 * IMPORTANT:
 * ----------
 * Real wind behaves in:
 *
 * STATES.
 *
 * Example:
 * - calm
 * - breeze
 * - windy
 * - stormy
 *
 * Atmosphere slowly transitions
 * between those states.
 *
 * THAT is realism.
 *
 * CPU:
 * ----
 * Extremely cheap.
 *
 * Only:
 * - timers
 * - parameter routing
 * - behavior coordination
 */

export default class Scheduler {

  constructor({
    airflow,
    gust,
    texture,
    resonance,
    environment,
    modulation,
  }) {

    /* =====================================================
       STEM REFERENCES
    ===================================================== */

    this.airflow =
      airflow;

    this.gust =
      gust;

    this.texture =
      texture;

    this.resonance =
      resonance;

    this.environment =
      environment;

    this.modulation =
      modulation;

    /* =====================================================
       STATE
    ===================================================== */

    this.currentState =
      'breeze';

    this.isRunning =
      false;

    this.stateTimer =
      null;

    this.eventTimer =
      null;

    /**
     * Global weather intensity.
     */

    this.intensity =
      0.3;
  }

  /* =======================================================
     START
  ======================================================= */

  start() {

    if (this.isRunning) return;

    this.isRunning = true;

    /**
     * Start default state.
     */

    this.setBreeze();

    /**
     * Begin long-form evolution.
     */

    this.startStateEvolution();

    /**
     * Begin atmospheric events.
     */

    this.startAtmosphericEvents();
  }

  /* =======================================================
     STOP
  ======================================================= */

  stop() {

    this.isRunning = false;

    if (this.stateTimer) {

      clearTimeout(
        this.stateTimer
      );

      this.stateTimer = null;
    }

    if (this.eventTimer) {

      clearTimeout(
        this.eventTimer
      );

      this.eventTimer = null;
    }
  }

  /* =======================================================
     MAIN WEATHER EVOLUTION
  ======================================================= */

  /**
   * THIS is where:
   * atmosphere becomes alive.
   */

  startStateEvolution() {

    const evolve = () => {

      if (!this.isRunning) return;

      /**
       * Weighted random states.
       *
       * Most of the time:
       * calm/breeze.
       */

      const r =
        Math.random();

      if (r < 0.35) {

        this.setCalm();

      } else if (r < 0.7) {

        this.setBreeze();

      } else if (r < 0.92) {

        this.setWindy();

      } else {

        this.setStorm();
      }

      /**
       * Long weather timing.
       */

      const next =
        25000 +
        Math.random() * 45000;

      this.stateTimer =
        setTimeout(
          evolve,
          next
        );
    };

    evolve();
  }

  /* =======================================================
     ATMOSPHERIC EVENTS
  ======================================================= */

  /**
   * Small living moments.
   *
   * Example:
   * - pressure swell
   * - sudden gust energy
   * - resonance bloom
   */

  startAtmosphericEvents() {

    const trigger = () => {

      if (!this.isRunning) return;

      this.triggerMicroEvent();

      const next =
        6000 +
        Math.random() * 14000;

      this.eventTimer =
        setTimeout(
          trigger,
          next
        );
    };

    trigger();
  }

  /* =======================================================
     MICRO EVENTS
  ======================================================= */

  triggerMicroEvent() {

    /**
     * Tiny realism moments.
     */

    const type =
      Math.floor(
        Math.random() * 4
      );

    switch (type) {

      /**
       * Air pressure swell.
       */

      case 0:

        this.airflow.setIntensity(
          this.intensity +
          Math.random() * 0.08
        );

        break;

      /**
       * Gust emphasis.
       */

      case 1:

        this.gust.triggerGust();

        break;

      /**
       * Resonance bloom.
       */

      case 2:

        this.resonance.triggerResonance();

        break;

      /**
       * Texture movement.
       */

      case 3:

        this.texture.setIntensity(
          this.intensity +
          Math.random() * 0.12
        );

        break;
    }
  }

  /* =======================================================
     CALM
  ======================================================= */

  setCalm() {

    this.currentState =
      'calm';

    this.intensity =
      0.12;

    /**
     * Airflow dominates.
     */

    this.airflow.setCalm();

    /**
     * Tiny gusts only.
     */

    this.gust.setCalm();

    /**
     * Almost invisible texture.
     */

    this.texture.setCalm();

    /**
     * Rare resonance.
     */

    this.resonance.setCalm();

    /**
     * Open soft space.
     */

    this.environment.setCalm();

    this.environment
      .setOpenEnvironment();

    /**
     * Slow modulation.
     */

    this.modulation
      .setCalmMode();

    console.log(
      '🌫️ Atmosphere → CALM'
    );
  }

  /* =======================================================
     BREEZE
  ======================================================= */

  setBreeze() {

    this.currentState =
      'breeze';

    this.intensity =
      0.32;

    this.airflow.setBreeze();

    this.gust.setBreeze();

    this.texture.setBreeze();

    this.resonance.setBreeze();

    this.environment.setBreeze();

    this.environment
      .setOpenEnvironment();

    this.modulation
      .setBreezeMode();

    console.log(
      '🍃 Atmosphere → BREEZE'
    );
  }

  /* =======================================================
     WINDY
  ======================================================= */

  setWindy() {

    this.currentState =
      'windy';

    this.intensity =
      0.62;

    this.airflow.setWindy();

    this.gust.setWindy();

    this.texture.setWindy();

    this.resonance.setWindy();

    this.environment.setWindy();

    /**
     * Bigger environment.
     */

    const env =
      Math.random();

    if (env < 0.5) {

      this.environment
        .setForestEnvironment();

    } else {

      this.environment
        .setCanyonEnvironment();
    }

    this.modulation
      .setWindyMode();

    console.log(
      '🌬️ Atmosphere → WINDY'
    );
  }

  /* =======================================================
     STORM
  ======================================================= */

  setStorm() {

    this.currentState =
      'storm';

    this.intensity =
      1.0;

    /**
     * IMPORTANT:
     *
     * Even storm should remain:
     * cinematic.
     *
     * NOT:
     * distortion chaos.
     */

    this.airflow.setStorm();

    this.gust.setStorm();

    this.texture.setStorm();

    this.resonance.setStorm();

    this.environment.setStorm();

    /**
     * Storm space.
     */

    this.environment
      .setCanyonEnvironment();

    /**
     * Higher atmospheric energy.
     */

    this.modulation
      .setStormMode();

    /**
     * Extra gust burst.
     */

    this.gust.triggerGust();

    console.log(
      '⛈️ Atmosphere → STORM'
    );
  }

  /* =======================================================
     MANUAL INTENSITY
  ======================================================= */

  /**
   * UI control support.
   */

  setIntensity(value) {

    value =
      Math.max(0, Math.min(1, value));

    this.intensity = value;

    /**
     * Directly route
     * to all systems.
     */

    this.airflow.setIntensity(
      value
    );

    this.gust.setIntensity(
      value
    );

    this.texture.setIntensity(
      value
    );

    this.resonance.setIntensity(
      value
    );

    this.environment.setIntensity(
      value
    );

    this.modulation.setIntensity(
      value
    );
  }

  /* =======================================================
     ENVIRONMENT ROUTING
  ======================================================= */

  setEnvironment(type) {

    switch (type) {

      case 'open':

        this.environment
          .setOpenEnvironment();

        break;

      case 'forest':

        this.environment
          .setForestEnvironment();

        break;

      case 'canyon':

        this.environment
          .setCanyonEnvironment();

        break;

      case 'indoor':

        this.environment
          .setIndoorEnvironment();

        break;
    }
  }

  /* =======================================================
     DESTROY
  ======================================================= */

  destroy() {

    this.stop();

    this.airflow = null;
    this.gust = null;
    this.texture = null;
    this.resonance = null;
    this.environment = null;
    this.modulation = null;
  }
}