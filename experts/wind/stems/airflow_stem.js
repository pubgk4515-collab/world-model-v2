/**
 * stems/airflow_stem.js
 * =========================================================
 * Primary Wind Airflow Stem
 * =========================================================
 *
 * THIS IS THE MOST IMPORTANT STEM.
 *
 * Why?
 * ----
 * Because real wind realism mostly comes from:
 *
 *   continuous believable airflow
 *
 * NOT:
 * - storms
 * - whistles
 * - crazy effects
 *
 * GOALS:
 * ------
 * 1. Soft endless air movement
 * 2. No TV static feeling
 * 3. No harsh hiss
 * 4. Warm evolving airflow
 * 5. Gentle at low intensity
 * 6. Strong body at high intensity
 *
 * IMPORTANT:
 * ----------
 * This stem should feel:
 *
 * LOW intensity:
 *   "soft moving air"
 *
 * HIGH intensity:
 *   "heavy atmospheric pressure"
 */

import StemPlayer from '../engine/stem_player.js';

import {
  getNoiseBuffers,
} from '../utils/noise.js';

export default class AirflowStem {

  constructor(ctx) {

    this.ctx = ctx;

    /* =====================================================
       OUTPUT
    ===================================================== */

    this.output = ctx.createGain();
    this.output.gain.value = 1;

    /* =====================================================
       NOISE SOURCE
    ===================================================== */

    const buffers = getNoiseBuffers(ctx);

    /**
     * Brown noise is MUCH smoother than white noise.
     *
     * White noise:
     *   TV static
     *
     * Brown noise:
     *   deep airflow movement
     */

    this.player =
      new StemPlayer(
        ctx,
        buffers.brown
      );

    /* =====================================================
       TONE SHAPING
    ===================================================== */

    /**
     * Highpass:
     * removes muddy sub rumble
     */

    this.highpass =
      ctx.createBiquadFilter();

    this.highpass.type = 'highpass';
    this.highpass.frequency.value = 110;
    this.highpass.Q.value = 0.7;

    /**
     * Main airflow body
     */

    this.lowpass =
      ctx.createBiquadFilter();

    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 4200;
    this.lowpass.Q.value = 0.6;

    /**
     * Gentle low-mid body
     *
     * This creates:
     * "air mass"
     */

    this.bodyEQ =
      ctx.createBiquadFilter();

    this.bodyEQ.type = 'lowshelf';
    this.bodyEQ.frequency.value = 260;
    this.bodyEQ.gain.value = 3;

    /**
     * Soft air presence
     */

    this.presenceEQ =
      ctx.createBiquadFilter();

    this.presenceEQ.type = 'peaking';
    this.presenceEQ.frequency.value = 1200;
    this.presenceEQ.Q.value = 0.8;
    this.presenceEQ.gain.value = 1.5;

    /* =====================================================
       SIGNAL CHAIN
    ===================================================== */

    this.player.connect(this.highpass);

    this.highpass.connect(this.lowpass);

    this.lowpass.connect(this.bodyEQ);

    this.bodyEQ.connect(this.presenceEQ);

    this.presenceEQ.connect(this.output);

    /* =====================================================
       STATE
    ===================================================== */

    this.intensity = 0.3;

    this.isRunning = false;
  }

  /* =======================================================
     START
  ======================================================= */

  start() {

    if (this.isRunning) return;

    this.player.start();

    /**
     * Initial ultra-soft state
     */

    this.player.setGain(0.12);

    /**
     * Slow atmospheric motion
     */

    this.player.startBreathing(
      0.10,
      0.16
    );

    /**
     * Slow stereo movement
     */

    this.player.startStereoDrift(
      0.18,
      18000
    );

    this.isRunning = true;
  }

  /* =======================================================
     STOP
  ======================================================= */

  stop() {

    this.player.stop(3.0);

    this.isRunning = false;
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
     INTENSITY
  ======================================================= */

  /**
   * THE MOST IMPORTANT METHOD.
   *
   * This controls:
   * - airflow strength
   * - spectral weight
   * - air pressure feeling
   * - smoothness
   */

  setIntensity(value) {

    /**
     * Clamp
     */

    value =
      Math.max(0, Math.min(1, value));

    this.intensity = value;

    const now = this.ctx.currentTime;

    /* =====================================================
       GAIN
    ===================================================== */

    /**
     * VERY important:
     *
     * Low intensity should remain soft.
     *
     * Avoid:
     * "always storm"
     */

    const gain =
      0.05 +
      Math.pow(value, 1.8) * 0.55;

    this.player.setGain(
      gain,
      4
    );

    /* =====================================================
       LOWPASS
    ===================================================== */

    /**
     * Low intensity:
     * darker
     *
     * High intensity:
     * brighter
     */

    const lowpassFreq =
      1800 +
      value * 5000;

    this.lowpass.frequency
      .setTargetAtTime(
        lowpassFreq,
        now,
        2.5
      );

    /* =====================================================
       HIGHPASS
    ===================================================== */

    /**
     * Higher intensity =
     * more pressure body
     */

    const highpassFreq =
      140 -
      value * 60;

    this.highpass.frequency
      .setTargetAtTime(
        highpassFreq,
        now,
        3
      );

    /* =====================================================
       BODY EQ
    ===================================================== */

    /**
     * Storm intensity
     * increases air mass feeling
     */

    const bodyGain =
      2 +
      value * 7;

    this.bodyEQ.gain
      .setTargetAtTime(
        bodyGain,
        now,
        3
      );

    /* =====================================================
       PRESENCE
    ===================================================== */

    /**
     * Slight upper-air detail
     */

    const presenceGain =
      1 +
      value * 2.5;

    this.presenceEQ.gain
      .setTargetAtTime(
        presenceGain,
        now,
        3
      );

    /* =====================================================
       PLAYBACK RATE
    ===================================================== */

    /**
     * Strong wind feels faster/heavier.
     */

    const playbackRate =
      0.97 +
      value * 0.08;

    this.player.setPlaybackRate(
      playbackRate,
      8
    );

    /* =====================================================
       STEREO WIDTH
    ===================================================== */

    /**
     * Bigger wind moves wider.
     */

    const stereoAmount =
      0.12 +
      value * 0.35;

    this.player.stopStereoDrift();

    this.player.startStereoDrift(
      stereoAmount,
      15000
    );

    /* =====================================================
       BREATHING
    ===================================================== */

    /**
     * Stronger wind =
     * stronger pressure movement
     */

    this.player.stopBreathing();

    const minBreath =
      gain * 0.82;

    const maxBreath =
      gain * 1.15;

    this.player.startBreathing(
      minBreath,
      maxBreath
    );
  }

  /* =======================================================
     ATMOSPHERIC STATES
  ======================================================= */

  setCalm() {

    this.setIntensity(0.15);

    this.lowpass.frequency
      .setTargetAtTime(
        2200,
        this.ctx.currentTime,
        5
      );
  }

  setBreeze() {

    this.setIntensity(0.32);
  }

  setWindy() {

    this.setIntensity(0.58);
  }

  setStorm() {

    this.setIntensity(0.9);

    /**
     * Slight extra darkness
     */

    this.lowpass.frequency
      .setTargetAtTime(
        5200,
        this.ctx.currentTime,
        3
      );
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