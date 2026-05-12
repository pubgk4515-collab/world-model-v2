/**
 * experts/wind/expert_wind.js
 * ---------------------------------------------------------
 * Symbiote Studio — Modular Wind Expert
 * NASA-Level Procedural Atmospheric Engine
 * ---------------------------------------------------------
 */

import {
  createWindCardHTML,
  bindWindUI
} from './ui/wind_ui.js';

import AirflowStem
from './stems/airflow_stem.js';

import GustStem
from './stems/gust_stem.js';

import ResonanceStem
from './stems/resonance_stem.js';

import TextureStem
from './stems/texture_stem.js';

import EnvironmentStem
from './stems/environment_stem.js';

import ModulationEngine
from './engine/modulation_engine.js';

export default class WindExpert {

  constructor(ctx, destination) {

    // -----------------------------------------------------
    // CORE
    // -----------------------------------------------------

    this.ctx = ctx;
    this.id = crypto.randomUUID();

    // -----------------------------------------------------
    // MASTER OUTPUT
    // -----------------------------------------------------

    this.output = ctx.createGain();
    this.output.gain.value = 0.85;

    // soft limiter
    this.masterCompressor =
      ctx.createDynamicsCompressor();

    this.masterCompressor.threshold.value = -14;
    this.masterCompressor.knee.value = 8;
    this.masterCompressor.ratio.value = 3;
    this.masterCompressor.attack.value = 0.01;
    this.masterCompressor.release.value = 0.25;

    // subtle tone smoothing
    this.masterTone =
      ctx.createBiquadFilter();

    this.masterTone.type = 'lowpass';
    this.masterTone.frequency.value = 12000;
    this.masterTone.Q.value = 0.4;

    // stereo panner
    this.stereo =
      ctx.createStereoPanner();

    // initial routing (will be updated after bloom setup)
    this.output.connect(this.masterTone);
    this.masterTone.connect(this.masterCompressor);
    this.masterCompressor.connect(this.stereo);
    this.stereo.connect(destination);

    // -----------------------------------------------------
    // DEFAULT PARAMS
    // -----------------------------------------------------

    this.intensity = 0.18;
    this.texture = 0.44;
    this.resonance = 0.36;
    this.movement = 0.52;
    this.stereoWidth = 0.70;
    this.bloom = 0.35;

    // -----------------------------------------------------
    // STEMS
    // -----------------------------------------------------

    this.airflow =
      new AirflowStem(ctx);

    this.gust =
      new GustStem(ctx);

    this.resonanceStem =
      new ResonanceStem(ctx);

    this.textureStem =
      new TextureStem(ctx);

    this.environment =
      new EnvironmentStem(ctx);

    // -----------------------------------------------------
    // CONNECT STEMS
    // -----------------------------------------------------

    this.airflow.connect(this.output);
    this.gust.connect(this.output);
    this.resonanceStem.connect(this.output);
    this.textureStem.connect(this.output);
    this.environment.connect(this.output);

    // -----------------------------------------------------
    // BLOOM DSP (CINEMATIC RESONANCE) - POST-PROCESSOR
    // -----------------------------------------------------

    // Dynamic lowpass (hiss reduction at low intensity)
    this.dynamicLowpass = ctx.createBiquadFilter();
    this.dynamicLowpass.type = 'lowpass';
    this.dynamicLowpass.frequency.value = 8000;
    this.dynamicLowpass.Q.value = 0.7;

    // Bloom resonance layer (subtle peaks at 320, 540, 870, 1.2khz)
    this.bloomPeakL = ctx.createBiquadFilter();
    this.bloomPeakL.type = 'peaking';
    this.bloomPeakL.frequency.value = 320;
    this.bloomPeakL.gain.value = 0;
    this.bloomPeakL.Q.value = 15;

    this.bloomPeakM = ctx.createBiquadFilter();
    this.bloomPeakM.type = 'peaking';
    this.bloomPeakM.frequency.value = 540;
    this.bloomPeakM.gain.value = 0;
    this.bloomPeakM.Q.value = 12;

    this.bloomPeakH = ctx.createBiquadFilter();
    this.bloomPeakH.type = 'peaking';
    this.bloomPeakH.frequency.value = 870;
    this.bloomPeakH.gain.value = 0;
    this.bloomPeakH.Q.value = 10;

    this.bloomPeakVH = ctx.createBiquadFilter();
    this.bloomPeakVH.type = 'peaking';
    this.bloomPeakVH.frequency.value = 1200;
    this.bloomPeakVH.gain.value = 0;
    this.bloomPeakVH.Q.value = 8;

    // Hiss reduction filter (highpass to control low-frequency noise)
    this.hissReductionFilter = ctx.createBiquadFilter();
    this.hissReductionFilter.type = 'highpass';
    this.hissReductionFilter.frequency.value = 80;
    this.hissReductionFilter.Q.value = 0.5;

    // Bloom modulation state
    this.bloomPhase = Math.random() * Math.PI * 2;
    this.bloomSweepPhase = Math.random() * Math.PI * 2;

    // Connect bloom chain: output → filters → master tone
    this.output.connect(this.dynamicLowpass);
    this.output.connect(this.hissReductionFilter);

    this.dynamicLowpass.connect(this.bloomPeakL);
    this.bloomPeakL.connect(this.bloomPeakM);
    this.bloomPeakM.connect(this.bloomPeakH);
    this.bloomPeakH.connect(this.bloomPeakVH);

    // Bloom peaks merge back to master tone
    this.bloomPeakVH.connect(this.masterTone);
    this.hissReductionFilter.connect(this.masterTone);

    // Main stem output also goes to master tone
    this.output.connect(this.masterTone);

    // -----------------------------------------------------
    // MODULATION ENGINE
    // -----------------------------------------------------

    this.modulation =
      new ModulationEngine(ctx);

    // -----------------------------------------------------
    // START EVERYTHING
    // -----------------------------------------------------

    this.airflow.start();
    this.gust.start();
    this.resonanceStem.start();
    this.textureStem.start();
    this.environment.start();

    this.modulation.start();

    // -----------------------------------------------------
    // INTERNAL STATE
    // -----------------------------------------------------

    this.worldPressure = 0.5;
    this.worldEnclosure = 'open';

    // -----------------------------------------------------
    // INITIAL APPLY
    // -----------------------------------------------------

    this.updateAll();

    console.log(
      '🌬️ WindExpert initialised:',
      this.id
    );
  }

  // =====================================================
  // UI
  // =====================================================

  getUICard() {
    return createWindCardHTML(this.id);
  }

  bindCardControls(card) {
    bindWindUI(card, this);
  }

  // =====================================================
  // PARAMS
  // =====================================================

  setIntensity(v) {

    this.intensity =
      this._clamp(v);

    this.updateAll();
  }

  setMovement(v) {

    this.movement =
      this._clamp(v);

    this.updateAll();
  }

  setTexture(v) {

    this.texture =
      this._clamp(v);

    this.updateAll();
  }

  setResonance(v) {

    this.resonance =
      this._clamp(v);

    this.updateAll();
  }

  setStereoWidth(v) {

    this.stereoWidth =
      this._clamp(v);

    this.updateAll();
  }

  setBloom(v) {

    this.bloom =
      this._clamp(v);

    this.updateAll();
  }

  // =====================================================
  // MASTER UPDATE
  // =====================================================

  updateAll() {

    // ---------------------------------------------------
    // NORMALIZED ENERGY
    // ---------------------------------------------------

    const energy =
      Math.pow(this.intensity, 1.35);

    // ---------------------------------------------------
    // AIRFLOW
    // ---------------------------------------------------

    if (this.airflow?.setIntensity) {
      this.airflow.setIntensity(
        this.intensity
      );
    }

    // ---------------------------------------------------
    // GUSTS
    // ---------------------------------------------------

    if (this.gust?.setIntensity) {
      this.gust.setIntensity(
        energy * this.movement
      );
    }

    // ---------------------------------------------------
    // TEXTURE
    // ---------------------------------------------------

    if (this.textureStem?.setTexture) {
      this.textureStem.setTexture(
        this.texture
      );
    }

    // ---------------------------------------------------
    // RESONANCE
    // ---------------------------------------------------

    if (this.resonanceStem?.setIntensity) {
      this.resonanceStem.setIntensity(
        this.resonance * energy
      );
    }

    // ---------------------------------------------------
    // ENVIRONMENT
    // ---------------------------------------------------

    if (this.environment?.setWidth) {
      this.environment.setWidth(
        this.stereoWidth
      );
    }

    // ---------------------------------------------------
    // MODULATION DEPTH
    // ---------------------------------------------------

    if (this.modulation?.setDepth) {
      this.modulation.setDepth(
        this.movement * energy
      );
    }

    // ---------------------------------------------------
    // GLOBAL TONE
    // ---------------------------------------------------

    const tone =
      5000 +
      this.texture * 6000 +
      energy * 2000;

    this.masterTone.frequency
      .setTargetAtTime(
        tone,
        this.ctx.currentTime,
        0.2
      );

    // ---------------------------------------------------
    // STEREO
    // ---------------------------------------------------

    const pan =
      (Math.random() * 2 - 1) *
      this.stereoWidth *
      0.25;

    this.stereo.pan
      .setTargetAtTime(
        pan,
        this.ctx.currentTime,
        1.5
      );

    // ---------------------------------------------------
    // BLOOM RESONANCE DSP
    // ---------------------------------------------------

    // Bloom intensity scaled by bloom param and energy
    const bloomIntensity =
      this.bloom * energy * 0.6;

    // Dynamic lowpass: darker at low intensity
    const lowpassFreq =
      6000 +
      this.intensity * 6000;

    this.dynamicLowpass.frequency
      .setTargetAtTime(
        lowpassFreq,
        this.ctx.currentTime,
        0.15
      );

    // Slow resonance peak drift (10-40s evolution)
    this.bloomPhase +=
      0.0001 +
      this.intensity * 0.00005;

    const peakDrift =
      Math.sin(this.bloomPhase * 0.3) * 20;

    this.bloomPeakL.frequency
      .setTargetAtTime(
        320 + peakDrift,
        this.ctx.currentTime,
        0.5
      );

    this.bloomPeakM.frequency
      .setTargetAtTime(
        540 + peakDrift * 0.8,
        this.ctx.currentTime,
        0.5
      );

    this.bloomPeakH.frequency
      .setTargetAtTime(
        870 + peakDrift * 0.6,
        this.ctx.currentTime,
        0.5
      );

    this.bloomPeakVH.frequency
      .setTargetAtTime(
        1200 + peakDrift * 0.4,
        this.ctx.currentTime,
        0.5
      );

    // Slow gain swelling (atmospheric breathing)
    this.bloomSweepPhase += 0.00001;
    const gainSwell =
      0.6 +
      Math.sin(this.bloomSweepPhase) * 0.4;

    // Peak gains modulated by bloom and swell
    const peakGainScale =
      bloomIntensity * gainSwell;

    this.bloomPeakL.gain
      .setTargetAtTime(
        4 * peakGainScale,
        this.ctx.currentTime,
        0.8
      );

    this.bloomPeakM.gain
      .setTargetAtTime(
        3 * peakGainScale,
        this.ctx.currentTime,
        0.8
      );

    this.bloomPeakH.gain
      .setTargetAtTime(
        2.5 * peakGainScale,
        this.ctx.currentTime,
        0.8
      );

    this.bloomPeakVH.gain
      .setTargetAtTime(
        1.5 * peakGainScale,
        this.ctx.currentTime,
        0.8
      );

    // Hiss reduction: reduce high-pass at low intensity
    const hissFreq =
      80 +
      this.intensity * 120;

    this.hissReductionFilter.frequency
      .setTargetAtTime(
        hissFreq,
        this.ctx.currentTime,
        0.2
      );

    // ---------------------------------------------------
    // FINAL GAIN
    // ---------------------------------------------------

    let gain =
      0.22 +
      energy * 0.9;

    // pressure boost
    gain *=
      0.7 +
      this.worldPressure * 0.8;

    // enclosure damping
    if (this.worldEnclosure === 'closed') {
      gain *= 0.72;
    }

    this.output.gain
      .setTargetAtTime(
        gain,
        this.ctx.currentTime,
        0.3
      );
  }

  // =====================================================
  // WORLD STATE
  // =====================================================

  onWorldStateUpdate(state) {

    this.worldPressure =
      state.atmosphericPressure ?? 0.5;

    this.worldEnclosure =
      state.enclosure ?? 'open';

    // notify UI of pressure change
    if (typeof this.onPressureChange === 'function') {
      this.onPressureChange(this.worldPressure);
    }

    // enclosed spaces reduce highs

    if (this.worldEnclosure === 'closed') {

      this.masterTone.frequency
        .setTargetAtTime(
          4200,
          this.ctx.currentTime,
          0.5
        );

    } else {

      this.masterTone.frequency
        .setTargetAtTime(
          12000,
          this.ctx.currentTime,
          0.5
        );
    }

    this.updateAll();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  _clamp(v) {
    return Math.max(
      0,
      Math.min(1, v)
    );
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  destroy() {

    console.log(
      '🗑️ Destroying WindExpert:',
      this.id
    );

    try {

      this.airflow?.destroy?.();
      this.gust?.destroy?.();
      this.resonanceStem?.destroy?.();
      this.textureStem?.destroy?.();
      this.environment?.destroy?.();

      this.modulation?.destroy?.();

      this.output?.disconnect?.();
      this.masterTone?.disconnect?.();
      this.masterCompressor?.disconnect?.();
      this.stereo?.disconnect?.();

    } catch (err) {

      console.warn(
        'WindExpert cleanup warning:',
        err
      );
    }
  }
}