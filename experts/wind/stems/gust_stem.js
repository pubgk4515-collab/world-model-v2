/**
 * stems/gust_stem.js
 * =========================================================
 * Dynamic Gust Layer
 * =========================================================
 *
 * PURPOSE:
 * --------
 * This stem creates:
 *
 *   "wind passing by you"
 *
 * instead of:
 *
 *   static boring airflow
 *
 * Real wind constantly changes pressure.
 * Tiny gusts + medium gusts + rare heavy swells
 * create realism.
 *
 * IMPORTANT:
 * ----------
 * This stem should NEVER dominate.
 *
 * If this layer is too loud:
 *   ❌ hurricane
 *   ❌ airplane engine
 *   ❌ earthquake
 *
 * This layer must feel:
 *
 *   atmospheric
 *   cinematic
 *   soft
 *   pressure-based
 *
 * CPU:
 * ----
 * Very lightweight.
 *
 * Only:
 * - one filtered pink noise stem
 * - slow gain automation
 * - slow stereo motion
 */

import StemPlayer from '../engine/stem_player.js';

import {
  getNoiseBuffers,
} from '../utils/noise.js';

export default class GustStem {

  constructor(ctx) {

    this.ctx = ctx;

    /* =====================================================
       OUTPUT
    ===================================================== */

    this.output = ctx.createGain();
    this.output.gain.value = 1;

    /* =====================================================
       SOURCE
    ===================================================== */

    const buffers =
      getNoiseBuffers(ctx);

    /**
     * Pink noise is PERFECT for gusts.
     *
     * White:
     *   harsh
     *
     * Brown:
     *   too soft
     *
     * Pink:
     *   natural air energy
     */

    this.player =
      new StemPlayer(
        ctx,
        buffers.pink
      );

    /* =====================================================
       FILTERS
    ===================================================== */

    /**
     * Remove low mud
     */

    this.highpass =
      ctx.createBiquadFilter();

    this.highpass.type =
      'highpass';

    this.highpass.frequency.value =
      180;

    /**
     * Gust softness
     */

    this.lowpass =
      ctx.createBiquadFilter();

    this.lowpass.type =
      'lowpass';

    this.lowpass.frequency.value =
      2400;

    this.lowpass.Q.value = 0.5;

    /**
     * Moving air body
     */

    this.bandpass =
      ctx.createBiquadFilter();

    this.bandpass.type =
      'bandpass';

    this.bandpass.frequency.value =
      700;

    this.bandpass.Q.value =
      0.8;

    /**
     * Dynamic gust gain
     */

    this.gustGain =
      ctx.createGain();

    this.gustGain.gain.value =
      0.0;

    /* =====================================================
       CHAIN
    ===================================================== */

    this.player.connect(
      this.highpass
    );

    this.highpass.connect(
      this.lowpass
    );

    this.lowpass.connect(
      this.bandpass
    );

    this.bandpass.connect(
      this.gustGain
    );

    this.gustGain.connect(
      this.output
    );

    /* =====================================================
       STATE
    ===================================================== */

    this.intensity = 0.3;

    this.isRunning = false;

    this.gustTimer = null;
  }

  /* =======================================================
     START
  ======================================================= */

  start() {

    if (this.isRunning) return;

    this.player.start();

    /**
     * VERY IMPORTANT:
     *
     * Gust layer should start SILENT.
     */

    this.player.setGain(0.25);

    /**
     * Wide stereo drift
     */

    this.player.startStereoDrift(
      0.22,
      12000
    );

    /**
     * Begin gust scheduling
     */

    this.scheduleNextGust();

    this.isRunning = true;
  }

  /* =======================================================
     STOP
  ======================================================= */

  stop() {

    this.isRunning = false;

    if (this.gustTimer) {
      clearTimeout(this.gustTimer);
      this.gustTimer = null;
    }

    this.player.stop(3);

    const now =
      this.ctx.currentTime;

    this.gustGain.gain
      .setTargetAtTime(
        0,
        now,
        1.5
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
     MAIN GUST SYSTEM
  ======================================================= */

  /**
   * This is where realism happens.
   *
   * Real wind:
   * ----------
   * - not rhythmic
   * - not looping
   * - not predictable
   *
   * So:
   * - random timing
   * - random duration
   * - random strength
   */

  scheduleNextGust() {

    if (!this.isRunning) return;

    /**
     * Random timing
     */

    const delay =
      2000 +
      Math.random() * 7000;

    this.gustTimer =
      setTimeout(() => {

        this.triggerGust();

        this.scheduleNextGust();

      }, delay);
  }

  /* =======================================================
     GUST EVENT
  ======================================================= */

  triggerGust() {

    const now =
      this.ctx.currentTime;

    /**
     * Gust strength depends
     * on intensity.
     */

    const intensity =
      this.intensity;

    /**
     * Rare heavy gust chance
     */

    const heavyChance =
      Math.random();

    let targetGain;

    if (
      intensity > 0.7 &&
      heavyChance > 0.82
    ) {

      /**
       * Heavy atmospheric swell
       */

      targetGain =
        0.18 +
        Math.random() * 0.12;

    } else {

      /**
       * Normal soft gust
       */

      targetGain =
        0.03 +
        intensity * 0.12 +
        Math.random() * 0.05;
    }

    /**
     * Gust duration
     */

    const riseTime =
      1.5 +
      Math.random() * 2.5;

    const fallTime =
      2.5 +
      Math.random() * 5;

    /**
     * Frequency movement
     */

    const centerFreq =
      500 +
      Math.random() * 900;

    this.bandpass.frequency
      .setTargetAtTime(
        centerFreq,
        now,
        2
      );

    /**
     * Gust EQ shifts
     */

    const lpFreq =
      1800 +
      intensity * 2600;

    this.lowpass.frequency
      .setTargetAtTime(
        lpFreq,
        now,
        3
      );

    /* =====================================================
       GAIN ENVELOPE
    ===================================================== */

    /**
     * IMPORTANT:
     * We use CURVED ramps.
     *
     * Linear ramps sound fake.
     */

    const current =
      this.gustGain.gain.value;

    this.gustGain.gain.cancelScheduledValues(now);

    this.gustGain.gain
      .setValueAtTime(
        current,
        now
      );

    /**
     * Slow inhale
     */

    this.gustGain.gain
      .setTargetAtTime(
        targetGain,
        now,
        riseTime * 0.35
      );

    /**
     * Slow release
     */

    this.gustGain.gain
      .setTargetAtTime(
        0,
        now + riseTime,
        fallTime * 0.4
      );

    /* =====================================================
       PLAYBACK MOTION
    ===================================================== */

    /**
     * Tiny speed changes
     * make gusts feel alive.
     */

    const rate =
      0.98 +
      Math.random() * 0.06;

    this.player.setPlaybackRate(
      rate,
      4
    );

    /* =====================================================
       STEREO MOTION
    ===================================================== */

    /**
     * Gust sweeps across space.
     */

    const stereo =
      0.12 +
      Math.random() * 0.45;

    this.player.stopStereoDrift();

    this.player.startStereoDrift(
      stereo,
      4000 + Math.random() * 9000
    );
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
     * Gust density scaling
     */

    const playerGain =
      0.15 +
      value * 0.25;

    this.player.setGain(
      playerGain,
      3
    );

    /**
     * Strong wind =
     * brighter gusts
     */

    const lpFreq =
      1600 +
      value * 3000;

    this.lowpass.frequency
      .setTargetAtTime(
        lpFreq,
        now,
        4
      );

    /**
     * More pressure body
     */

    const hpFreq =
      220 -
      value * 70;

    this.highpass.frequency
      .setTargetAtTime(
        hpFreq,
        now,
        4
      );
  }

  /* =======================================================
     ENVIRONMENT MODES
  ======================================================= */

  setCalm() {

    this.setIntensity(0.12);
  }

  setBreeze() {

    this.setIntensity(0.3);
  }

  setWindy() {

    this.setIntensity(0.58);
  }

  setStorm() {

    this.setIntensity(0.92);
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