/**
 * stems/environment_stem.js
 * =========================================================
 * Environmental Space / Acoustic World Layer
 * =========================================================
 *
 * PURPOSE:
 * --------
 * This stem creates:
 *
 *   "where the wind exists"
 *
 * instead of:
 *
 *   floating abstract noise.
 *
 * WHY THIS MATTERS:
 * -----------------
 * Real wind always interacts with:
 * - walls
 * - trees
 * - valleys
 * - windows
 * - buildings
 * - open skies
 *
 * That interaction creates:
 * - reflections
 * - damping
 * - space
 * - depth
 *
 * Without environment:
 * sound feels:
 * ❌ fake
 * ❌ flat
 * ❌ disconnected
 *
 * IMPORTANT:
 * ----------
 * We are NOT building:
 * expensive convolution reverb.
 *
 * Instead:
 * - filtered delays
 * - soft reflections
 * - moving ambience
 *
 * This gives:
 * ✅ realism
 * ✅ low CPU
 * ✅ cinematic depth
 */

import StemPlayer from '../engine/stem_player.js';

import {
  getNoiseBuffers,
} from '../utils/noise.js';

export default class EnvironmentStem {

  constructor(ctx) {

    this.ctx = ctx;

    /* =====================================================
       OUTPUT
    ===================================================== */

    this.output =
      ctx.createGain();

    this.output.gain.value = 1;

    /* =====================================================
       SOURCE
    ===================================================== */

    const buffers =
      getNoiseBuffers(ctx);

    /**
     * Brown noise gives:
     * atmospheric body.
     */

    this.player =
      new StemPlayer(
        ctx,
        buffers.brown
      );

    /* =====================================================
       FILTERS
    ===================================================== */

    /**
     * Remove mud.
     */

    this.highpass =
      ctx.createBiquadFilter();

    this.highpass.type =
      'highpass';

    this.highpass.frequency.value =
      180;

    /**
     * Space darkness.
     */

    this.lowpass =
      ctx.createBiquadFilter();

    this.lowpass.type =
      'lowpass';

    this.lowpass.frequency.value =
      2600;

    /**
     * Reflection body.
     */

    this.spaceEQ =
      ctx.createBiquadFilter();

    this.spaceEQ.type =
      'peaking';

    this.spaceEQ.frequency.value =
      700;

    this.spaceEQ.Q.value =
      0.8;

    this.spaceEQ.gain.value =
      3;

    /* =====================================================
       REFLECTION NETWORK
    ===================================================== */

    /**
     * Cheap cinematic space.
     */

    this.delayA =
      ctx.createDelay(1.0);

    this.delayA.delayTime.value =
      0.08;

    this.delayB =
      ctx.createDelay(1.0);

    this.delayB.delayTime.value =
      0.13;

    /**
     * Reflection damping.
     */

    this.feedbackA =
      ctx.createGain();

    this.feedbackA.gain.value =
      0.18;

    this.feedbackB =
      ctx.createGain();

    this.feedbackB.gain.value =
      0.14;

    /**
     * Dark reflection tone.
     */

    this.reflectionLPF =
      ctx.createBiquadFilter();

    this.reflectionLPF.type =
      'lowpass';

    this.reflectionLPF.frequency.value =
      1800;

    /**
     * Environment output gain.
     */

    this.environmentGain =
      ctx.createGain();

    /**
     * VERY subtle.
     */

    this.environmentGain.gain.value =
      0.04;

    /* =====================================================
       DRY CHAIN
    ===================================================== */

    this.player.connect(
      this.highpass
    );

    this.highpass.connect(
      this.lowpass
    );

    this.lowpass.connect(
      this.spaceEQ
    );

    /* =====================================================
       REFLECTION PATH
    ===================================================== */

    this.spaceEQ.connect(
      this.delayA
    );

    this.spaceEQ.connect(
      this.delayB
    );

    /**
     * Feedback loops.
     */

    this.delayA.connect(
      this.feedbackA
    );

    this.feedbackA.connect(
      this.delayA
    );

    this.delayB.connect(
      this.feedbackB
    );

    this.feedbackB.connect(
      this.delayB
    );

    /**
     * Merge reflections.
     */

    this.delayA.connect(
      this.reflectionLPF
    );

    this.delayB.connect(
      this.reflectionLPF
    );

    this.reflectionLPF.connect(
      this.environmentGain
    );

    this.environmentGain.connect(
      this.output
    );

    /* =====================================================
       STATE
    ===================================================== */

    this.intensity = 0.3;

    this.environment = 'open';

    this.isRunning = false;

    this.motionTimer = null;
  }

  /* =======================================================
     START
  ======================================================= */

  start() {

    if (this.isRunning) return;

    this.player.start();

    /**
     * Barely audible.
     */

    this.player.setGain(0.05);

    /**
     * Huge stereo motion.
     */

    this.player.startStereoDrift(
      0.45,
      12000
    );

    /**
     * Space movement.
     */

    this.startEnvironmentMotion();

    this.isRunning = true;
  }

  /* =======================================================
     STOP
  ======================================================= */

  stop() {

    this.isRunning = false;

    if (this.motionTimer) {

      clearInterval(this.motionTimer);

      this.motionTimer = null;
    }

    this.player.stop(4);

    const now =
      this.ctx.currentTime;

    this.environmentGain.gain
      .setTargetAtTime(
        0,
        now,
        2
      );
  }

  /* =======================================================
     CONNECT
  ======================================================= */

  connect(destination) {
    this.output.connect(destination);
  }

  disconnect() {
    this.output.disconnect();
  }

  /* =======================================================
     ENVIRONMENT MOTION
  ======================================================= */

  /**
   * Tiny evolving space motion.
   */

  startEnvironmentMotion() {

    this.motionTimer =
      setInterval(() => {

        if (!this.isRunning) return;

        const now =
          this.ctx.currentTime;

        /**
         * Tiny reflection movement.
         */

        const delayA =
          0.06 +
          Math.random() * 0.04;

        const delayB =
          0.1 +
          Math.random() * 0.06;

        this.delayA.delayTime
          .setTargetAtTime(
            delayA,
            now,
            6
          );

        this.delayB.delayTime
          .setTargetAtTime(
            delayB,
            now,
            6
          );

        /**
         * Space drift.
         */

        const pan =
          (Math.random() * 2 - 1) * 0.55;

        this.player.setPan(
          pan,
          10
        );

      }, 8000 + Math.random() * 12000);
  }

  /* =======================================================
     INTENSITY
  ======================================================= */

  setIntensity(value) {

    value =
      Math.max(0, Math.min(1, value));

    this.intensity = value;

    const now =
      this.ctx.currentTime;

    /**
     * Stronger wind =
     * more environmental reflections.
     */

    const gain =
      0.015 +
      value * 0.12;

    this.environmentGain.gain
      .setTargetAtTime(
        gain,
        now,
        5
      );

    /**
     * More space energy.
     */

    const playerGain =
      0.03 +
      value * 0.08;

    this.player.setGain(
      playerGain,
      5
    );

    /**
     * Strong wind:
     * brighter reflections.
     */

    const lpFreq =
      1400 +
      value * 2600;

    this.reflectionLPF.frequency
      .setTargetAtTime(
        lpFreq,
        now,
        5
      );
  }

  /* =======================================================
     ENVIRONMENTS
  ======================================================= */

  /**
   * OPEN SKY
   */

  setOpenEnvironment() {

    this.environment = 'open';

    const now =
      this.ctx.currentTime;

    /**
     * Very subtle reflections.
     */

    this.feedbackA.gain
      .setTargetAtTime(
        0.12,
        now,
        4
      );

    this.feedbackB.gain
      .setTargetAtTime(
        0.08,
        now,
        4
      );

    this.lowpass.frequency
      .setTargetAtTime(
        4200,
        now,
        4
      );
  }

  /**
   * FOREST
   */

  setForestEnvironment() {

    this.environment = 'forest';

    const now =
      this.ctx.currentTime;

    /**
     * Softer darker reflections.
     */

    this.feedbackA.gain
      .setTargetAtTime(
        0.18,
        now,
        4
      );

    this.feedbackB.gain
      .setTargetAtTime(
        0.15,
        now,
        4
      );

    this.lowpass.frequency
      .setTargetAtTime(
        2500,
        now,
        4
      );
  }

  /**
   * CANYON
   */

  setCanyonEnvironment() {

    this.environment = 'canyon';

    const now =
      this.ctx.currentTime;

    /**
     * Bigger reflections.
     */

    this.feedbackA.gain
      .setTargetAtTime(
        0.28,
        now,
        4
      );

    this.feedbackB.gain
      .setTargetAtTime(
        0.24,
        now,
        4
      );

    this.lowpass.frequency
      .setTargetAtTime(
        3800,
        now,
        4
      );
  }

  /**
   * INDOOR
   */

  setIndoorEnvironment() {

    this.environment = 'indoor';

    const now =
      this.ctx.currentTime;

    /**
     * Tight warm reflections.
     */

    this.feedbackA.gain
      .setTargetAtTime(
        0.22,
        now,
        4
      );

    this.feedbackB.gain
      .setTargetAtTime(
        0.18,
        now,
        4
      );

    this.lowpass.frequency
      .setTargetAtTime(
        2000,
        now,
        4
      );
  }

  /* =======================================================
     ATMOSPHERIC STATES
  ======================================================= */

  setCalm() {

    this.setIntensity(0.08);
  }

  setBreeze() {

    this.setIntensity(0.3);
  }

  setWindy() {

    this.setIntensity(0.65);
  }

  setStorm() {

    this.setIntensity(1.0);
  }

  /* =======================================================
     DESTROY
  ======================================================= */

  destroy() {

    this.stop();

    try {
      this.disconnect();
    } catch (_) {}

    this.player.destroy();
  }
}