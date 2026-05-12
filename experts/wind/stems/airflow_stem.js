/**
 * stems/airflow_stem.js
 * =========================================================
 * Physically-Smoothed Airflow Stem
 * =========================================================
 *
 * Goals:
 * - eliminate low-level hiss
 * - preserve soft atmospheric motion
 * - support flute-like bloom resonance
 * - darker low intensity
 * - pressure body at high intensity
 */

import StemPlayer from '../engine/stem_player.js';

import {
  getNoiseBuffers,
} from '../utils/noise.js';

export default class AirflowStem {

  constructor(ctx) {

    this.ctx = ctx;

    // =====================================================
    // OUTPUT
    // =====================================================

    this.output = ctx.createGain();
    this.output.gain.value = 1;

    // =====================================================
    // SOURCE
    // =====================================================

    const buffers =
      getNoiseBuffers(ctx);

    this.player =
      new StemPlayer(
        ctx,
        buffers.brown
      );

    // =====================================================
    // PRE-TURBULENCE SMOOTHING
    // =====================================================

    /**
     * CRITICAL FIX:
     * Remove upper-band hiss BEFORE
     * resonance shaping.
     */

    this.preLowpass =
      ctx.createBiquadFilter();

    this.preLowpass.type =
      'lowpass';

    this.preLowpass.frequency.value =
      2400;

    this.preLowpass.Q.value = 0.4;

    // =====================================================
    // SUB CLEANUP
    // =====================================================

    this.highpass =
      ctx.createBiquadFilter();

    this.highpass.type =
      'highpass';

    this.highpass.frequency.value =
      45;

    this.highpass.Q.value = 0.5;

    // =====================================================
    // AIR MASS
    // =====================================================

    this.bodyEQ =
      ctx.createBiquadFilter();

    this.bodyEQ.type =
      'lowshelf';

    this.bodyEQ.frequency.value =
      210;

    this.bodyEQ.gain.value =
      4;

    // =====================================================
    // FLUTE CAVITY
    // =====================================================

    /**
     * THIS is the missing piece.
     *
     * Real wind gets tonal bloom from:
     * - cavities
     * - openings
     * - pressure resonances
     */

    this.cavityPeak =
      ctx.createBiquadFilter();

    this.cavityPeak.type =
      'peaking';

    this.cavityPeak.frequency.value =
      640;

    this.cavityPeak.Q.value =
      1.8;

    this.cavityPeak.gain.value =
      0;

    // =====================================================
    // SECONDARY BLOOM
    // =====================================================

    this.airBloom =
      ctx.createBiquadFilter();

    this.airBloom.type =
      'peaking';

    this.airBloom.frequency.value =
      1180;

    this.airBloom.Q.value =
      1.2;

    this.airBloom.gain.value =
      0;

    // =====================================================
    // FINAL TONE
    // =====================================================

    this.finalLowpass =
      ctx.createBiquadFilter();

    this.finalLowpass.type =
      'lowpass';

    this.finalLowpass.frequency.value =
      4200;

    this.finalLowpass.Q.value =
      0.5;

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
      this.bodyEQ
    );

    this.bodyEQ.connect(
      this.cavityPeak
    );

    this.cavityPeak.connect(
      this.airBloom
    );

    this.airBloom.connect(
      this.finalLowpass
    );

    this.finalLowpass.connect(
      this.output
    );

    // =====================================================
    // STATE
    // =====================================================

    this.intensity = 0.18;

    this.isRunning = false;

    // slow organic modulation
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
     * MUCH lower startup floor.
     *
     * Removes permanent hiss bed.
     */

    this.player.setGain(0.015);

    this.player.startBreathing(
      0.015,
      0.028
    );

    this.player.startStereoDrift(
      0.08,
      24000
    );

    this.isRunning = true;
  }

  // =======================================================
  // STOP
  // =======================================================

  stop() {

    this.player.stop(4);

    this.isRunning = false;
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

    /**
     * NONLINEAR ENERGY
     *
     * Keeps low-end softer.
     */

    const energy =
      Math.pow(value, 1.9);

    // =====================================================
    // MASTER GAIN
    // =====================================================

    /**
     * CRITICAL:
     * ultra low floor at calm states
     */

    const gain =
      0.008 +
      energy * 0.42;

    this.player.setGain(
      gain,
      6
    );

    // =====================================================
    // PRE SMOOTHING
    // =====================================================

    /**
     * Removes hiss before bloom.
     */

    const preLP =
      1400 +
      energy * 5200;

    this.preLowpass.frequency
      .setTargetAtTime(
        preLP,
        now,
        3.5
      );

    // =====================================================
    // FINAL TONE
    // =====================================================

    const finalTone =
      2600 +
      energy * 4800;

    this.finalLowpass.frequency
      .setTargetAtTime(
        finalTone,
        now,
        3
      );

    // =====================================================
    // SUB CLEANUP
    // =====================================================

    const hp =
      45 +
      energy * 30;

    this.highpass.frequency
      .setTargetAtTime(
        hp,
        now,
        4
      );

    // =====================================================
    // BODY MASS
    // =====================================================

    const body =
      2 +
      energy * 8;

    this.bodyEQ.gain
      .setTargetAtTime(
        body,
        now,
        4
      );

    // =====================================================
    // FLUTE BLOOM
    // =====================================================

    /**
     * Only emerges after airflow exists.
     *
     * Prevents fake whistling.
     */

    const bloomStart =
      Math.max(
        0,
        (value - 0.16) / 0.84
      );

    const cavityGain =
      bloomStart * 7;

    const bloomGain =
      bloomStart * 4.2;

    this.motionPhase +=
      0.00012 +
      value * 0.00008;

    const drift =
      Math.sin(
        this.motionPhase
      ) * 18;

    this.cavityPeak.frequency
      .setTargetAtTime(
        640 + drift,
        now,
        2
      );

    this.airBloom.frequency
      .setTargetAtTime(
        1180 + drift * 0.5,
        now,
        2
      );

    this.cavityPeak.gain
      .setTargetAtTime(
        cavityGain,
        now,
        2.8
      );

    this.airBloom.gain
      .setTargetAtTime(
        bloomGain,
        now,
        2.8
      );

    // =====================================================
    // PLAYBACK MOTION
    // =====================================================

    const playbackRate =
      0.985 +
      value * 0.045;

    this.player.setPlaybackRate(
      playbackRate,
      10
    );

    // =====================================================
    // STEREO
    // =====================================================

    const stereo =
      0.05 +
      value * 0.22;

    this.player.stopStereoDrift();

    this.player.startStereoDrift(
      stereo,
      26000
    );

    // =====================================================
    // BREATHING
    // =====================================================

    this.player.stopBreathing();

    this.player.startBreathing(
      gain * 0.92,
      gain * (
        1.05 +
        value * 0.08
      )
    );
  }

  // =======================================================
  // STATES
  // =======================================================

  setCalm() {
    this.setIntensity(0.12);
  }

  setBreeze() {
    this.setIntensity(0.32);
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