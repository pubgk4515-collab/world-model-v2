/**
 * stems/texture_stem.js
 * =========================================================
 * Air Turbulence / Texture Layer
 * =========================================================
 *
 * PURPOSE:
 * --------
 * This stem creates:
 *
 *   "air texture"
 *
 * without sounding like:
 * - TV static
 * - hiss
 * - white noise
 *
 * IMPORTANT:
 * ----------
 * Most fake wind fails HERE.
 *
 * WHY?
 * ----
 * Because developers use:
 *
 *   raw white noise
 *
 * which sounds:
 * - harsh
 * - digital
 * - flat
 * - synthetic
 *
 * Real wind texture is:
 * - soft
 * - moving
 * - filtered
 * - unstable
 * - airy
 *
 * CPU STRATEGY:
 * -------------
 * Cheap source
 * +
 * smart filtering
 * +
 * slow modulation
 *
 * instead of:
 * heavy realtime DSP.
 */

import StemPlayer from '../engine/stem_player.js';

import {
  getNoiseBuffers,
} from '../utils/noise.js';

export default class TextureStem {

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
     * Pink noise:
     * best for air texture.
     */

    this.player =
      new StemPlayer(
        ctx,
        buffers.pink
      );

    /* =====================================================
       FILTER BANK
    ===================================================== */

    /**
     * Remove digital harshness
     */

    this.highpass =
      ctx.createBiquadFilter();

    this.highpass.type =
      'highpass';

    this.highpass.frequency.value =
      500;

    /**
     * Remove ugly hiss
     */

    this.lowpass =
      ctx.createBiquadFilter();

    this.lowpass.type =
      'lowpass';

    this.lowpass.frequency.value =
      4500;

    /**
     * Air motion body
     */

    this.bandpassA =
      ctx.createBiquadFilter();

    this.bandpassA.type =
      'bandpass';

    this.bandpassA.frequency.value =
      1400;

    this.bandpassA.Q.value =
      0.8;

    /**
     * Secondary turbulence zone
     */

    this.bandpassB =
      ctx.createBiquadFilter();

    this.bandpassB.type =
      'bandpass';

    this.bandpassB.frequency.value =
      2600;

    this.bandpassB.Q.value =
      1.1;

    /**
     * Soft air sparkle
     */

    this.airPresence =
      ctx.createBiquadFilter();

    this.airPresence.type =
      'highshelf';

    this.airPresence.frequency.value =
      3200;

    this.airPresence.gain.value =
      2;

    /**
     * Dynamic texture output
     */

    this.textureGain =
      ctx.createGain();

    this.textureGain.gain.value =
      0.05;

    /* =====================================================
       PARALLEL TEXTURE PATHS
    ===================================================== */

    /**
     * Path A
     */

    this.player.connect(
      this.highpass
    );

    this.highpass.connect(
      this.lowpass
    );

    this.lowpass.connect(
      this.bandpassA
    );

    /**
     * Path B
     */

    this.lowpass.connect(
      this.bandpassB
    );

    /**
     * Merge
     */

    this.bandpassA.connect(
      this.airPresence
    );

    this.bandpassB.connect(
      this.airPresence
    );

    this.airPresence.connect(
      this.textureGain
    );

    this.textureGain.connect(
      this.output
    );

    /* =====================================================
       STATE
    ===================================================== */

    this.intensity = 0.3;

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
     * VERY subtle.
     *
     * Texture should be FELT.
     */

    this.player.setGain(0.08);

    /**
     * Wide stereo texture
     */

    this.player.startStereoDrift(
      0.35,
      9000
    );

    /**
     * Begin filter movement
     */

    this.startTextureMotion();

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

    this.player.stop(3);

    const now =
      this.ctx.currentTime;

    this.textureGain.gain
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
     TEXTURE MOTION
  ======================================================= */

  /**
   * THIS is where:
   * "living air"
   * happens.
   *
   * Slow evolving filter movement.
   */

  startTextureMotion() {

    this.motionTimer =
      setInterval(() => {

        if (!this.isRunning) return;

        const now =
          this.ctx.currentTime;

        /**
         * Slowly evolving turbulence zones
         */

        const freqA =
          1000 +
          Math.random() * 1200;

        const freqB =
          1800 +
          Math.random() * 1800;

        /**
         * Gentle Q changes
         */

        const qA =
          0.5 +
          Math.random() * 0.7;

        const qB =
          0.8 +
          Math.random() * 1.2;

        this.bandpassA.frequency
          .setTargetAtTime(
            freqA,
            now,
            5
          );

        this.bandpassB.frequency
          .setTargetAtTime(
            freqB,
            now,
            5
          );

        this.bandpassA.Q
          .setTargetAtTime(
            qA,
            now,
            4
          );

        this.bandpassB.Q
          .setTargetAtTime(
            qB,
            now,
            4
          );

        /**
         * Tiny stereo motion shifts
         */

        const stereo =
          (Math.random() * 2 - 1) * 0.4;

        this.player.setPan(
          stereo,
          8
        );

      }, 6000 + Math.random() * 8000);
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

    /* =====================================================
       TEXTURE GAIN
    ===================================================== */

    /**
     * VERY IMPORTANT:
     *
     * Keep subtle.
     *
     * This is support layer,
     * not main wind.
     */

    const gain =
      0.015 +
      Math.pow(value, 1.5) * 0.12;

    this.textureGain.gain
      .setTargetAtTime(
        gain,
        now,
        3
      );

    /**
     * Source level
     */

    const playerGain =
      0.04 +
      value * 0.16;

    this.player.setGain(
      playerGain,
      4
    );

    /* =====================================================
       FILTER OPENNESS
    ===================================================== */

    /**
     * Strong wind:
     * brighter turbulence
     */

    const lpFreq =
      2600 +
      value * 4500;

    this.lowpass.frequency
      .setTargetAtTime(
        lpFreq,
        now,
        4
      );

    /**
     * Calm wind:
     * smoother texture
     */

    const hpFreq =
      700 -
      value * 250;

    this.highpass.frequency
      .setTargetAtTime(
        hpFreq,
        now,
        4
      );

    /* =====================================================
       PRESENCE
    ===================================================== */

    /**
     * Slight air detail boost
     */

    const sparkle =
      value * 5;

    this.airPresence.gain
      .setTargetAtTime(
        sparkle,
        now,
        4
      );

    /* =====================================================
       PLAYBACK RATE
    ===================================================== */

    /**
     * Tiny movement speed.
     */

    const rate =
      0.985 +
      value * 0.04;

    this.player.setPlaybackRate(
      rate,
      10
    );
  }

  /* =======================================================
     ATMOSPHERIC STATES
  ======================================================= */

  setCalm() {

    this.setIntensity(0.08);
  }

  setBreeze() {

    this.setIntensity(0.28);
  }

  setWindy() {

    this.setIntensity(0.6);
  }

  setStorm() {

    this.setIntensity(1.0);

    /**
     * Slightly rougher
     */

    const now =
      this.ctx.currentTime;

    this.bandpassA.Q
      .setTargetAtTime(
        1.5,
        now,
        4
      );

    this.bandpassB.Q
      .setTargetAtTime(
        2.0,
        now,
        4
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