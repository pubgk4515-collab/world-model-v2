/**
 * engine/stem_player.js
 * =========================================================
 * Cinematic Atmospheric Stem Engine
 * =========================================================
 *
 * Goals:
 * - zero zipper noise
 * - no modulation stacking
 * - ultra smooth atmospheric motion
 * - continuous drift instead of jumps
 * - stable stereo image
 * - cinematic airflow realism
 */

import {
  createLoopingSource,
  randomPlaybackRate,
} from '../utils/noise.js';

export default class StemPlayer {

  constructor(ctx, buffer) {

    this.ctx = ctx;
    this.buffer = buffer;

    // =====================================================
    // OUTPUT
    // =====================================================

    this.output =
      ctx.createGain();

    this.output.gain.value = 0;

    // =====================================================
    // INTERNAL GRAPH
    // =====================================================

    this.inputGain =
      ctx.createGain();

    this.filter =
      ctx.createBiquadFilter();

    this.filter.type =
      'lowpass';

    this.filter.frequency.value =
      20000;

    this.filter.Q.value =
      0.5;

    this.stereo =
      ctx.createStereoPanner();

    this.stereo.pan.value = 0;

    this.inputGain.connect(
      this.filter
    );

    this.filter.connect(
      this.stereo
    );

    this.stereo.connect(
      this.output
    );

    // =====================================================
    // STATE
    // =====================================================

    this.source = null;

    this.isPlaying = false;

    this.baseGain = 0;
    this.currentRate = 1;

    // continuous motion
    this.animationFrame = null;

    // breathing
    this.breathMin = 0;
    this.breathMax = 0;
    this.breathEnabled = false;

    // stereo drift
    this.stereoAmount = 0;
    this.stereoEnabled = false;

    // modulation phase
    this.phaseA =
      Math.random() * Math.PI * 2;

    this.phaseB =
      Math.random() * Math.PI * 2;

    this.phaseC =
      Math.random() * Math.PI * 2;
  }

  // =======================================================
  // SOURCE
  // =======================================================

  _buildSource() {

    const source =
      createLoopingSource(
        this.ctx,
        this.buffer
      );

    source.playbackRate.value =
      randomPlaybackRate(0.003);

    source.connect(
      this.inputGain
    );

    return source;
  }

  // =======================================================
  // START
  // =======================================================

  start() {

    if (this.isPlaying) return;

    this.source =
      this._buildSource();

    this.source.start();

    this.isPlaying = true;

    this._startMotionLoop();
  }

  // =======================================================
  // STOP
  // =======================================================

  stop(fadeTime = 3) {

    if (!this.isPlaying) return;

    this.isPlaying = false;

    const now =
      this.ctx.currentTime;

    this.output.gain
      .cancelScheduledValues(now);

    this.output.gain
      .setTargetAtTime(
        0,
        now,
        fadeTime * 0.45
      );

    setTimeout(() => {

      try {

        this.source?.stop?.();
        this.source?.disconnect?.();

      } catch (_) {}

      this.source = null;

    }, fadeTime * 1000 + 120);

    this._stopMotionLoop();
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
  // GAIN
  // =======================================================

  setGain(value, smooth = 4) {

    this.baseGain = value;

    const now =
      this.ctx.currentTime;

    this.output.gain
      .cancelScheduledValues(now);

    this.output.gain
      .setTargetAtTime(
        value,
        now,
        smooth * 0.35
      );
  }

  // =======================================================
  // FILTER
  // =======================================================

  setLowpass(freq, smooth = 4) {

    const now =
      this.ctx.currentTime;

    this.filter.frequency
      .cancelScheduledValues(now);

    this.filter.frequency
      .setTargetAtTime(
        freq,
        now,
        smooth * 0.35
      );
  }

  // =======================================================
  // PAN
  // =======================================================

  setPan(value, smooth = 6) {

    const now =
      this.ctx.currentTime;

    this.stereo.pan
      .cancelScheduledValues(now);

    this.stereo.pan
      .setTargetAtTime(
        value,
        now,
        smooth * 0.4
      );
  }

  // =======================================================
  // PLAYBACK RATE
  // =======================================================

  setPlaybackRate(rate, smooth = 8) {

    if (!this.source) return;

    this.currentRate = rate;

    const now =
      this.ctx.currentTime;

    this.source.playbackRate
      .cancelScheduledValues(now);

    this.source.playbackRate
      .setTargetAtTime(
        rate,
        now,
        smooth * 0.45
      );
  }

  // =======================================================
  // BREATHING
  // =======================================================

  startBreathing(
    minGain = 0.1,
    maxGain = 0.2
  ) {

    this.breathMin = minGain;
    this.breathMax = maxGain;

    this.breathEnabled = true;
  }

  stopBreathing() {

    this.breathEnabled = false;
  }

  // =======================================================
  // STEREO DRIFT
  // =======================================================

  startStereoDrift(
    amount = 0.1
  ) {

    this.stereoAmount = amount;

    this.stereoEnabled = true;
  }

  stopStereoDrift() {

    this.stereoEnabled = false;

    this.setPan(0, 12);
  }

  // =======================================================
  // CONTINUOUS ATMOSPHERIC MOTION
  // =======================================================

  /**
   * CRITICAL FIX:
   *
   * Replace interval jumps
   * with continuous organic motion.
   */

  _startMotionLoop() {

    this._stopMotionLoop();

    const loop = () => {

      if (!this.isPlaying) return;

      const now =
        this.ctx.currentTime;

      // ================================================
      // PHASE EVOLUTION
      // ================================================

      this.phaseA += 0.00017;
      this.phaseB += 0.00009;
      this.phaseC += 0.00005;

      // ================================================
      // BREATHING
      // ================================================

      if (this.breathEnabled) {

        const blend =
          (
            Math.sin(this.phaseA) * 0.5 +
            Math.sin(this.phaseB) * 0.35 +
            Math.sin(this.phaseC) * 0.15
          ) * 0.5 + 0.5;

        const targetGain =
          this.breathMin +
          (
            this.breathMax -
            this.breathMin
          ) * blend;

        this.output.gain
          .setTargetAtTime(
            targetGain,
            now,
            3.5
          );
      }

      // ================================================
      // STEREO
      // ================================================

      if (this.stereoEnabled) {

        const pan =
          (
            Math.sin(
              this.phaseB * 0.7
            ) * 0.7 +
            Math.sin(
              this.phaseC * 0.4
            ) * 0.3
          ) * this.stereoAmount;

        this.stereo.pan
          .setTargetAtTime(
            pan,
            now,
            6
          );
      }

      // ================================================
      // MICRO PLAYBACK DRIFT
      // ================================================

      if (this.source) {

        const drift =
          Math.sin(
            this.phaseA * 0.3
          ) * 0.0025;

        const targetRate =
          this.currentRate + drift;

        this.source.playbackRate
          .setTargetAtTime(
            targetRate,
            now,
            8
          );
      }

      this.animationFrame =
        requestAnimationFrame(loop);
    };

    loop();
  }

  _stopMotionLoop() {

    if (this.animationFrame) {

      cancelAnimationFrame(
        this.animationFrame
      );

      this.animationFrame = null;
    }
  }

  // =======================================================
  // CLEANUP
  // =======================================================

  destroy() {

    this.stop();

    this.stopBreathing();

    this.stopStereoDrift();

    try {
      this.disconnect();
    } catch (_) {}
  }
}