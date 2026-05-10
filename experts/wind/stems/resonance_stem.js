/**
 * stems/resonance_stem.js
 * =========================================================
 * Atmospheric Resonance System
 * =========================================================
 *
 * THIS FILE IS:
 * --------------
 * the soul of realism.
 *
 * WHY?
 * ----
 * Because real wind is NOT just noise.
 *
 * Real wind interacts with:
 * - gaps
 * - pipes
 * - trees
 * - windows
 * - corners
 * - cavities
 * - structures
 *
 * THAT interaction creates:
 *
 *   subtle flute-like tones
 *
 * which humans subconsciously recognize as:
 *
 *   "real moving air"
 *
 * IMPORTANT:
 * ----------
 * If overdone:
 *
 * ❌ sci-fi synth
 * ❌ horror ambience
 * ❌ ghost sounds
 *
 * If done correctly:
 *
 * ✅ believable air resonance
 * ✅ emotional realism
 * ✅ cinematic atmosphere
 *
 * RULE:
 * -----
 * Resonance should be:
 *
 *   FELT more than heard.
 *
 * CPU:
 * ----
 * Extremely lightweight.
 *
 * We use:
 * - one pink noise source
 * - narrow filters
 * - occasional activation
 *
 * instead of:
 * heavy physical modelling.
 */

import StemPlayer from '../engine/stem_player.js';

import {
  getNoiseBuffers,
} from '../utils/noise.js';

export default class ResonanceStem {

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
     * Pink noise excites
     * resonance naturally.
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
     * Remove mud
     */

    this.highpass =
      ctx.createBiquadFilter();

    this.highpass.type =
      'highpass';

    this.highpass.frequency.value =
      400;

    /**
     * Soft resonance body
     */

    this.lowpass =
      ctx.createBiquadFilter();

    this.lowpass.type =
      'lowpass';

    this.lowpass.frequency.value =
      3200;

    /**
     * Main resonance cavity
     */

    this.resonanceA =
      ctx.createBiquadFilter();

    this.resonanceA.type =
      'bandpass';

    this.resonanceA.frequency.value =
      620;

    this.resonanceA.Q.value =
      10;

    /**
     * Secondary cavity
     */

    this.resonanceB =
      ctx.createBiquadFilter();

    this.resonanceB.type =
      'bandpass';

    this.resonanceB.frequency.value =
      1100;

    this.resonanceB.Q.value =
      12;

    /**
     * High airy whistle
     */

    this.resonanceC =
      ctx.createBiquadFilter();

    this.resonanceC.type =
      'bandpass';

    this.resonanceC.frequency.value =
      1800;

    this.resonanceC.Q.value =
      14;

    /**
     * Soft resonance body gain
     */

    this.resonanceGain =
      ctx.createGain();

    /**
     * VERY IMPORTANT
     *
     * Tiny default level.
     */

    this.resonanceGain.gain.value =
      0.0;

    /* =====================================================
       SIGNAL CHAIN
    ===================================================== */

    this.player.connect(
      this.highpass
    );

    this.highpass.connect(
      this.lowpass
    );

    /**
     * Parallel cavities
     */

    this.lowpass.connect(
      this.resonanceA
    );

    this.lowpass.connect(
      this.resonanceB
    );

    this.lowpass.connect(
      this.resonanceC
    );

    /**
     * Merge
     */

    this.resonanceA.connect(
      this.resonanceGain
    );

    this.resonanceB.connect(
      this.resonanceGain
    );

    this.resonanceC.connect(
      this.resonanceGain
    );

    this.resonanceGain.connect(
      this.output
    );

    /* =====================================================
       STATE
    ===================================================== */

    this.intensity = 0.3;

    this.isRunning = false;

    this.resonanceTimer = null;
  }

  /* =======================================================
     START
  ======================================================= */

  start() {

    if (this.isRunning) return;

    this.player.start();

    /**
     * VERY low source level.
     */

    this.player.setGain(0.08);

    /**
     * Slow stereo movement.
     */

    this.player.startStereoDrift(
      0.3,
      15000
    );

    /**
     * Begin resonance events.
     */

    this.scheduleNextResonance();

    this.isRunning = true;
  }

  /* =======================================================
     STOP
  ======================================================= */

  stop() {

    this.isRunning = false;

    if (this.resonanceTimer) {

      clearTimeout(
        this.resonanceTimer
      );

      this.resonanceTimer = null;
    }

    this.player.stop(4);

    const now =
      this.ctx.currentTime;

    this.resonanceGain.gain
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
     RESONANCE SCHEDULER
  ======================================================= */

  /**
   * Real resonance:
   * rare
   * unpredictable
   * subtle
   */

  scheduleNextResonance() {

    if (!this.isRunning) return;

    /**
     * Long random spacing.
     */

    const delay =
      4000 +
      Math.random() * 14000;

    this.resonanceTimer =
      setTimeout(() => {

        this.triggerResonance();

        this.scheduleNextResonance();

      }, delay);
  }

  /* =======================================================
     RESONANCE EVENT
  ======================================================= */

  triggerResonance() {

    const now =
      this.ctx.currentTime;

    /**
     * Intensity scaling.
     */

    const intensity =
      this.intensity;

    /**
     * Strong wind =
     * stronger cavities.
     */

    const targetGain =
      0.005 +
      intensity * 0.045 +
      Math.random() * 0.02;

    /**
     * Long soft movement.
     */

    const rise =
      2 +
      Math.random() * 4;

    const fall =
      4 +
      Math.random() * 8;

    /* =====================================================
       RANDOM CAVITY TUNING
    ===================================================== */

    /**
     * THIS is where:
     * flute realism happens.
     *
     * Tiny moving resonances.
     */

    const freqA =
      450 +
      Math.random() * 350;

    const freqB =
      900 +
      Math.random() * 500;

    const freqC =
      1400 +
      Math.random() * 900;

    this.resonanceA.frequency
      .setTargetAtTime(
        freqA,
        now,
        3
      );

    this.resonanceB.frequency
      .setTargetAtTime(
        freqB,
        now,
        3
      );

    this.resonanceC.frequency
      .setTargetAtTime(
        freqC,
        now,
        3
      );

    /**
     * Slight Q drift.
     */

    this.resonanceA.Q
      .setTargetAtTime(
        8 + Math.random() * 5,
        now,
        3
      );

    this.resonanceB.Q
      .setTargetAtTime(
        10 + Math.random() * 6,
        now,
        3
      );

    this.resonanceC.Q
      .setTargetAtTime(
        12 + Math.random() * 8,
        now,
        3
      );

    /* =====================================================
       ENVELOPE
    ===================================================== */

    const current =
      this.resonanceGain.gain.value;

    this.resonanceGain.gain
      .cancelScheduledValues(now);

    this.resonanceGain.gain
      .setValueAtTime(
        current,
        now
      );

    /**
     * Slow appearance.
     */

    this.resonanceGain.gain
      .setTargetAtTime(
        targetGain,
        now,
        rise * 0.35
      );

    /**
     * Long soft fade.
     */

    this.resonanceGain.gain
      .setTargetAtTime(
        0,
        now + rise,
        fall * 0.4
      );

    /* =====================================================
       PLAYBACK DRIFT
    ===================================================== */

    /**
     * Tiny pitch movement.
     */

    const rate =
      0.985 +
      Math.random() * 0.04;

    this.player.setPlaybackRate(
      rate,
      8
    );

    /* =====================================================
       SPATIAL FEEL
    ===================================================== */

    const pan =
      (Math.random() * 2 - 1) * 0.5;

    this.player.setPan(
      pan,
      10
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
     * Stronger wind:
     * brighter resonance.
     */

    const lpFreq =
      2200 +
      value * 3200;

    this.lowpass.frequency
      .setTargetAtTime(
        lpFreq,
        now,
        5
      );

    /**
     * More pressure body.
     */

    const hpFreq =
      500 -
      value * 180;

    this.highpass.frequency
      .setTargetAtTime(
        hpFreq,
        now,
        5
      );

    /**
     * Source energy.
     */

    const playerGain =
      0.04 +
      value * 0.12;

    this.player.setGain(
      playerGain,
      6
    );
  }

  /* =======================================================
     ATMOSPHERIC STATES
  ======================================================= */

  setCalm() {

    this.setIntensity(0.08);
  }

  setBreeze() {

    this.setIntensity(0.25);
  }

  setWindy() {

    this.setIntensity(0.6);
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