/**
 * engine/stem_player.js
 * =========================================================
 * Universal Atmospheric Stem Player
 * =========================================================
 *
 * PURPOSE:
 * --------
 * This system plays:
 * - airflow stems
 * - gust stems
 * - resonance stems
 * - texture stems
 *
 * RESPONSIBILITIES:
 * -----------------
 * 1. Seamless looping
 * 2. Smooth gain control
 * 3. CPU-cheap playback
 * 4. Soft pitch drift
 * 5. Stereo movement support
 * 6. Zero click transitions
 *
 * IMPORTANT:
 * ----------
 * This is NOT a simple audio player.
 *
 * This is:
 * "living atmospheric playback"
 */

import {
  createLoopingSource,
  randomPlaybackRate,
} from '../utils/noise.js';

/* =========================================================
   STEM PLAYER
========================================================= */

export default class StemPlayer {

  constructor(ctx, buffer) {

    this.ctx = ctx;
    this.buffer = buffer;

    /* =====================================================
       OUTPUT
    ===================================================== */

    this.output = ctx.createGain();
    this.output.gain.value = 0;

    /* =====================================================
       INTERNAL GRAPH
    ===================================================== */

    this.inputGain = ctx.createGain();

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 20000;

    this.stereo = ctx.createStereoPanner();
    this.stereo.pan.value = 0;

    this.inputGain.connect(this.filter);
    this.filter.connect(this.stereo);
    this.stereo.connect(this.output);

    /* =====================================================
       STATE
    ===================================================== */

    this.source = null;

    this.isPlaying = false;

    this.targetGain = 0;
    this.currentRate = 1;

    this.driftInterval = null;
  }

  /* =======================================================
     CREATE SOURCE
  ======================================================= */

  _buildSource() {

    const source = createLoopingSource(
      this.ctx,
      this.buffer
    );

    source.playbackRate.value =
      randomPlaybackRate(0.01);

    source.connect(this.inputGain);

    return source;
  }

  /* =======================================================
     START
  ======================================================= */

  start() {

    if (this.isPlaying) return;

    this.source = this._buildSource();

    this.source.start();

    this.isPlaying = true;

    this._startMicroDrift();
  }

  /* =======================================================
     STOP
  ======================================================= */

  stop(fadeTime = 2.0) {

    if (!this.isPlaying) return;

    const now = this.ctx.currentTime;

    this.output.gain.cancelScheduledValues(now);

    this.output.gain.setTargetAtTime(
      0,
      now,
      fadeTime * 0.25
    );

    setTimeout(() => {

      try {

        if (this.source) {
          this.source.stop();
          this.source.disconnect();
        }

      } catch (_) {}

      this.source = null;

    }, fadeTime * 1000 + 100);

    this.isPlaying = false;

    this._stopMicroDrift();
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
     GAIN
  ======================================================= */

  setGain(value, smooth = 2.0) {

    this.targetGain = value;

    const now = this.ctx.currentTime;

    this.output.gain.cancelScheduledValues(now);

    this.output.gain.setTargetAtTime(
      value,
      now,
      smooth * 0.25
    );
  }

  /* =======================================================
     FILTER
  ======================================================= */

  setLowpass(freq, smooth = 3.0) {

    const now = this.ctx.currentTime;

    this.filter.frequency.cancelScheduledValues(now);

    this.filter.frequency.setTargetAtTime(
      freq,
      now,
      smooth * 0.25
    );
  }

  /* =======================================================
     STEREO
  ======================================================= */

  setPan(value, smooth = 4.0) {

    const now = this.ctx.currentTime;

    this.stereo.pan.cancelScheduledValues(now);

    this.stereo.pan.setTargetAtTime(
      value,
      now,
      smooth * 0.25
    );
  }

  /* =======================================================
     PLAYBACK RATE
  ======================================================= */

  setPlaybackRate(rate, smooth = 6.0) {

    if (!this.source) return;

    const now = this.ctx.currentTime;

    this.source.playbackRate.cancelScheduledValues(now);

    this.source.playbackRate.setTargetAtTime(
      rate,
      now,
      smooth * 0.25
    );

    this.currentRate = rate;
  }

  /* =======================================================
     MICRO DRIFT
  ======================================================= */

  /**
   * Tiny ultra-slow pitch movement.
   *
   * This prevents:
   * - machine feeling
   * - static looping
   * - repetition detection
   */

  _startMicroDrift() {

    this._stopMicroDrift();

    this.driftInterval = setInterval(() => {

      if (!this.source) return;

      const nextRate =
        randomPlaybackRate(0.008);

      this.setPlaybackRate(
        nextRate,
        8.0
      );

    }, 12000 + Math.random() * 10000);
  }

  _stopMicroDrift() {

    if (this.driftInterval) {

      clearInterval(this.driftInterval);

      this.driftInterval = null;
    }
  }

  /* =======================================================
     ATMOSPHERIC MOVEMENT
  ======================================================= */

  /**
   * Slowly drift stereo position.
   */

  startStereoDrift(
    amount = 0.25,
    interval = 14000
  ) {

    this.stereoDrift = setInterval(() => {

      const target =
        (Math.random() * 2 - 1) * amount;

      this.setPan(target, 10);

    }, interval);
  }

  stopStereoDrift() {

    if (this.stereoDrift) {

      clearInterval(this.stereoDrift);

      this.stereoDrift = null;
    }
  }

  /* =======================================================
     SOFT ATMOSPHERIC SWELL
  ======================================================= */

  /**
   * Creates subtle breathing motion.
   */

  startBreathing(
    minGain = 0.15,
    maxGain = 0.3
  ) {

    this.stopBreathing();

    this.breathingInterval = setInterval(() => {

      const target =
        minGain +
        Math.random() *
        (maxGain - minGain);

      this.setGain(target, 8);

    }, 9000 + Math.random() * 12000);
  }

  stopBreathing() {

    if (this.breathingInterval) {

      clearInterval(this.breathingInterval);

      this.breathingInterval = null;
    }
  }

  /* =======================================================
     CLEANUP
  ======================================================= */

  destroy() {

    this.stop();

    this.stopStereoDrift();

    this.stopBreathing();

    try {
      this.disconnect();
    } catch (_) {}
  }
}