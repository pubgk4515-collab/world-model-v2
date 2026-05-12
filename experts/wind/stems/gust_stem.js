/**
 * stems/gust_stem.js
 * =========================================================
 * Cinematic Pressure Gust System
 * =========================================================
 *
 * Philosophy:
 * - gusts should feel like pressure movement
 * - not noise bursts
 * - no harsh hiss
 * - wide slow atmospheric swells
 * - subtle realism
 */

import StemPlayer from '../engine/stem_player.js';

import {
  getNoiseBuffers,
} from '../utils/noise.js';

export default class GustStem {

  constructor(ctx) {

    this.ctx = ctx;

    // =====================================================
    // OUTPUT
    // =====================================================

    this.output =
      ctx.createGain();

    this.output.gain.value =
      1;

    // =====================================================
    // SOURCE
    // =====================================================

    const buffers =
      getNoiseBuffers(ctx);

    /**
     * Brown works better now
     * because airflow already
     * handles upper texture.
     */

    this.player =
      new StemPlayer(
        ctx,
        buffers.brown
      );

    // =====================================================
    // SOURCE SMOOTHING
    // =====================================================

    this.preLowpass =
      ctx.createBiquadFilter();

    this.preLowpass.type =
      'lowpass';

    this.preLowpass.frequency.value =
      1800;

    this.preLowpass.Q.value =
      0.5;

    // =====================================================
    // LOW CLEANUP
    // =====================================================

    this.highpass =
      ctx.createBiquadFilter();

    this.highpass.type =
      'highpass';

    this.highpass.frequency.value =
      70;

    this.highpass.Q.value =
      0.5;

    // =====================================================
    // PRESSURE BODY
    // =====================================================

    this.bodyPeak =
      ctx.createBiquadFilter();

    this.bodyPeak.type =
      'peaking';

    this.bodyPeak.frequency.value =
      420;

    this.bodyPeak.Q.value =
      0.8;

    this.bodyPeak.gain.value =
      0;

    // =====================================================
    // AIR SWELL
    // =====================================================

    this.airPeak =
      ctx.createBiquadFilter();

    this.airPeak.type =
      'peaking';

    this.airPeak.frequency.value =
      920;

    this.airPeak.Q.value =
      0.9;

    this.airPeak.gain.value =
      0;

    // =====================================================
    // FINAL SHAPING
    // =====================================================

    this.finalLowpass =
      ctx.createBiquadFilter();

    this.finalLowpass.type =
      'lowpass';

    this.finalLowpass.frequency.value =
      2600;

    this.finalLowpass.Q.value =
      0.5;

    // =====================================================
    // GUST GAIN
    // =====================================================

    this.gustGain =
      ctx.createGain();

    this.gustGain.gain.value =
      0;

    // =====================================================
    // SIGNAL CHAIN
    // =====================================================

    this.player.connect(
      this.preLowpass
    );

    this.preLowpass.connect(
      this.highpass
    );

    this.highpass.connect(
      this.bodyPeak
    );

    this.bodyPeak.connect(
      this.airPeak
    );

    this.airPeak.connect(
      this.finalLowpass
    );

    this.finalLowpass.connect(
      this.gustGain
    );

    this.gustGain.connect(
      this.output
    );

    // =====================================================
    // STATE
    // =====================================================

    this.intensity = 0.2;

    this.isRunning = false;

    this.gustTimer = null;

    this.motionPhase =
      Math.random() * Math.PI * 2;
  }

  // =======================================================
  // START
  // =======================================================

  start() {

    if (this.isRunning) return;

    this.player.start();

    /**
     * MUCH lower base gain.
     */

    this.player.setGain(
      0.01
    );

    this.player.startStereoDrift(
      0.05
    );

    this.scheduleNextGust();

    this.isRunning = true;
  }

  // =======================================================
  // STOP
  // =======================================================

  stop() {

    this.isRunning = false;

    if (this.gustTimer) {

      clearTimeout(
        this.gustTimer
      );

      this.gustTimer = null;
    }

    this.player.stop(5);

    const now =
      this.ctx.currentTime;

    this.gustGain.gain
      .setTargetAtTime(
        0,
        now,
        3
      );
  }

  // =======================================================
  // CONNECT
  // =======================================================

  connect(destination) {
    this.output.connect(destination);
  }

  disconnect() {
    this.output.disconnect();
  }

  // =======================================================
  // GUST SCHEDULER
  // =======================================================

  scheduleNextGust() {

    if (!this.isRunning) return;

    /**
     * MUCH slower pacing.
     */

    const intensityFactor =
      1 - this.intensity;

    const delay =
      6000 +
      intensityFactor * 8000 +
      Math.random() * 12000;

    this.gustTimer =
      setTimeout(() => {

        this.triggerGust();

        this.scheduleNextGust();

      }, delay);
  }

  // =======================================================
  // GUST EVENT
  // =======================================================

  triggerGust() {

    const now =
      this.ctx.currentTime;

    const value =
      this.intensity;

    /**
     * Gust emergence.
     *
     * Calm wind should
     * barely gust.
     */

    const emergence =
      Math.max(
        0,
        (value - 0.18) / 0.82
      );

    const energy =
      Math.pow(
        emergence,
        1.3
      );

    /**
     * Much softer target.
     */

    const targetGain =
      0.01 +
      energy * 0.07;

    // =====================================================
    // LONG SWELLS
    // =====================================================

    const rise =
      4 +
      Math.random() * 5;

    const fall =
      7 +
      Math.random() * 9;

    // =====================================================
    // ORGANIC DRIFT
    // =====================================================

    this.motionPhase +=
      0.12 +
      Math.random() * 0.08;

    const drift =
      Math.sin(
        this.motionPhase
      ) * 60;

    // =====================================================
    // PRESSURE BODY
    // =====================================================

    this.bodyPeak.frequency
      .setTargetAtTime(
        420 + drift,
        now,
        4
      );

    this.bodyPeak.gain
      .setTargetAtTime(
        energy * 5,
        now,
        5
      );

    // =====================================================
    // AIR SWELL
    // =====================================================

    this.airPeak.frequency
      .setTargetAtTime(
        920 + drift * 0.5,
        now,
        5
      );

    this.airPeak.gain
      .setTargetAtTime(
        energy * 2.5,
        now,
        5
      );

    // =====================================================
    // TONE
    // =====================================================

    const tone =
      1600 +
      energy * 2200;

    this.finalLowpass.frequency
      .setTargetAtTime(
        tone,
        now,
        5
      );

    // =====================================================
    // ENVELOPE
    // =====================================================

    this.gustGain.gain
      .cancelScheduledValues(now);

    this.gustGain.gain
      .setTargetAtTime(
        targetGain,
        now,
        rise * 0.45
      );

    this.gustGain.gain
      .setTargetAtTime(
        0,
        now + rise,
        fall * 0.55
      );

    // =====================================================
    // MOTION
    // =====================================================

    const rate =
      0.992 +
      energy * 0.018;

    this.player.setPlaybackRate(
      rate,
      12
    );
  }

  // =======================================================
  // INTENSITY
  // =======================================================

  setIntensity(value) {

    value =
      Math.max(
        0,
        Math.min(1, value)
      );

    this.intensity = value;

    const now =
      this.ctx.currentTime;

    const energy =
      Math.pow(value, 1.4);

    // =====================================================
    // SOURCE GAIN
    // =====================================================

    /**
     * CRITICAL:
     * gust layer should remain subtle.
     */

    const sourceGain =
      0.004 +
      energy * 0.04;

    this.player.setGain(
      sourceGain,
      6
    );

    // =====================================================
    // SOURCE SMOOTHING
    // =====================================================

    const preLP =
      1200 +
      energy * 2600;

    this.preLowpass.frequency
      .setTargetAtTime(
        preLP,
        now,
        5
      );

    // =====================================================
    // LOW CLEANUP
    // =====================================================

    const hp =
      70 +
      energy * 50;

    this.highpass.frequency
      .setTargetAtTime(
        hp,
        now,
        5
      );
  }

  // =======================================================
  // STATES
  // =======================================================

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

  // =======================================================
  // DESTROY
  // =======================================================

  destroy() {

    this.stop();

    try {
      this.disconnect();
    } catch (_) {}

    this.player?.destroy?.();
  }
}