/**
 * stems/resonance_stem.js
 * =========================================================
 * Continuous Atmospheric Resonance
 * =========================================================
 *
 * Philosophy:
 * - resonance should emerge from airflow
 * - never sound like synth whistles
 * - no random "events"
 * - always subtle
 * - cinematic cavity realism
 */

import StemPlayer from '../engine/stem_player.js';

import {
  getNoiseBuffers,
} from '../utils/noise.js';

export default class ResonanceStem {

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

    /**
     * Pink noise works best for
     * cavity excitation.
     */

    const buffers =
      getNoiseBuffers(ctx);

    this.player =
      new StemPlayer(
        ctx,
        buffers.pink
      );

    // =====================================================
    // SOURCE SMOOTHING
    // =====================================================

    /**
     * CRITICAL:
     * remove hiss BEFORE resonance.
     */

    this.preLowpass =
      ctx.createBiquadFilter();

    this.preLowpass.type =
      'lowpass';

    this.preLowpass.frequency.value =
      2400;

    this.preLowpass.Q.value =
      0.4;

    // =====================================================
    // SUB CLEANUP
    // =====================================================

    this.highpass =
      ctx.createBiquadFilter();

    this.highpass.type =
      'highpass';

    this.highpass.frequency.value =
      220;

    this.highpass.Q.value =
      0.5;

    // =====================================================
    // MAIN CAVITY
    // =====================================================

    /**
     * Lower Q = natural resonance
     * instead of whistle tones.
     */

    this.cavityA =
      ctx.createBiquadFilter();

    this.cavityA.type =
      'peaking';

    this.cavityA.frequency.value =
      620;

    this.cavityA.Q.value =
      1.4;

    this.cavityA.gain.value =
      0;

    // =====================================================
    // SECONDARY AIR COLUMN
    // =====================================================

    this.cavityB =
      ctx.createBiquadFilter();

    this.cavityB.type =
      'peaking';

    this.cavityB.frequency.value =
      1180;

    this.cavityB.Q.value =
      1.2;

    this.cavityB.gain.value =
      0;

    // =====================================================
    // UPPER AIR
    // =====================================================

    this.airPeak =
      ctx.createBiquadFilter();

    this.airPeak.type =
      'peaking';

    this.airPeak.frequency.value =
      1900;

    this.airPeak.Q.value =
      1.0;

    this.airPeak.gain.value =
      0;

    // =====================================================
    // FINAL TONE
    // =====================================================

    this.finalLowpass =
      ctx.createBiquadFilter();

    this.finalLowpass.type =
      'lowpass';

    this.finalLowpass.frequency.value =
      3400;

    this.finalLowpass.Q.value =
      0.5;

    // =====================================================
    // RESONANCE GAIN
    // =====================================================

    this.resonanceGain =
      ctx.createGain();

    /**
     * IMPORTANT:
     * Much lower baseline.
     */

    this.resonanceGain.gain.value =
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
      this.cavityA
    );

    this.cavityA.connect(
      this.cavityB
    );

    this.cavityB.connect(
      this.airPeak
    );

    this.airPeak.connect(
      this.finalLowpass
    );

    this.finalLowpass.connect(
      this.resonanceGain
    );

    this.resonanceGain.connect(
      this.output
    );

    // =====================================================
    // STATE
    // =====================================================

    this.intensity = 0.18;

    this.isRunning = false;

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
     * EXTREMELY low source floor.
     */

    this.player.setGain(
      0.01
    );

    this.player.startStereoDrift(
      0.06,
      32000
    );

    this.isRunning = true;
  }

  // =======================================================
  // STOP
  // =======================================================

  stop() {

    this.isRunning = false;

    this.player.stop(5);

    const now =
      this.ctx.currentTime;

    this.resonanceGain.gain
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
     * IMPORTANT:
     * resonance emerges late.
     */

    const emergence =
      Math.max(
        0,
        (value - 0.18) / 0.82
      );

    const energy =
      Math.pow(
        emergence,
        1.4
      );

    // =====================================================
    // SOURCE GAIN
    // =====================================================

    const sourceGain =
      0.004 +
      energy * 0.035;

    this.player.setGain(
      sourceGain,
      8
    );

    // =====================================================
    // RESONANCE OUTPUT
    // =====================================================

    /**
     * MUCH more subtle than before.
     */

    const outputGain =
      energy * 0.09;

    this.resonanceGain.gain
      .setTargetAtTime(
        outputGain,
        now,
        4
      );

    // =====================================================
    // SOURCE SMOOTHING
    // =====================================================

    const preLP =
      1800 +
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
      220 -
      energy * 80;

    this.highpass.frequency
      .setTargetAtTime(
        hp,
        now,
        5
      );

    // =====================================================
    // ORGANIC DRIFT
    // =====================================================

    this.motionPhase +=
      0.00008 +
      value * 0.00004;

    const drift =
      Math.sin(
        this.motionPhase
      ) * 24;

    // =====================================================
    // CAVITY TUNING
    // =====================================================

    this.cavityA.frequency
      .setTargetAtTime(
        620 + drift,
        now,
        4
      );

    this.cavityB.frequency
      .setTargetAtTime(
        1180 + drift * 0.6,
        now,
        4
      );

    this.airPeak.frequency
      .setTargetAtTime(
        1900 + drift * 0.4,
        now,
        4
      );

    // =====================================================
    // RESONANCE STRENGTH
    // =====================================================

    /**
     * Felt more than heard.
     */

    this.cavityA.gain
      .setTargetAtTime(
        energy * 5.2,
        now,
        4
      );

    this.cavityB.gain
      .setTargetAtTime(
        energy * 3.6,
        now,
        4
      );

    this.airPeak.gain
      .setTargetAtTime(
        energy * 1.8,
        now,
        4
      );

    // =====================================================
    // FINAL TONE
    // =====================================================

    const tone =
      2400 +
      energy * 2200;

    this.finalLowpass.frequency
      .setTargetAtTime(
        tone,
        now,
        4
      );

    // =====================================================
    // MOTION
    // =====================================================

    const rate =
      0.992 +
      value * 0.02;

    this.player.setPlaybackRate(
      rate,
      12
    );
  }

  // =======================================================
  // STATES
  // =======================================================

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