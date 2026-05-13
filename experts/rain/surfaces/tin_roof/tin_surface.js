// experts/rain/surfaces/tin_roof/tin_surface.js
// Cinematic Tin Roof Surface
// Realistic metallic rain impact simulation.
//
// GOALS:
// - remove toy xylophone sound
// - create chaotic metallic rain texture
// - preserve soft cinematic ambience
// - avoid tonal ringing
// - generate noisy splatter + unstable resonance
//
// IMPORTANT:
// Real tin roofs are:
// - broadband
// - noisy
// - unstable
// - chaotic
// NOT musical oscillators.

import { TIN_PROFILE } from './tin_profile.js';
import { TinResonance } from './tin_resonance.js';

export class TinSurface {

  constructor(audioContext) {

    this.audioContext = audioContext;

    this.transientSynth = null;

    this.resonance = null;

    this.isConnected = false;

    this.isInitialized = false;

    // =====================================================
    // STATE
    // =====================================================

    this.profile =
      TIN_PROFILE;

    this.lastTriggerTime = 0;

    this.clusterEnergy = 0;

    this.wetnessAccumulation = 0.2;

    this.metalTemperature = 0.5;

    this.surfaceRandomness = Math.random();
  }

  // =====================================================
  // BUILD
  // =====================================================

  build() {

    if (this.isInitialized) {
      return;
    }

    // =====================================================
    // RESONANCE ENGINE
    // =====================================================

    this.resonance =
      new TinResonance(
        this.audioContext
      );

    this.resonance.build();

    this.isInitialized = true;

    console.log(
      '[RAIN] TinSurface built'
    );
  }

  // =====================================================
  // CONNECT
  // =====================================================

  connect(transientSynth) {

    if (!this.isInitialized) {
      this.build();
    }

    this.transientSynth =
      transientSynth;

    this.isConnected = true;

    console.log(
      '[RAIN] TinSurface connected'
    );
  }

  disconnect() {

    this.transientSynth = null;

    this.isConnected = false;
  }

  // =====================================================
  // UPDATE
  // =====================================================

  updateSurface(parameters = {}) {

    if (!this.resonance) {
      return;
    }

    this.resonance.updateSurface({

      resonance:
        parameters.resonance ??
        this.profile.resonance,

      brightness:
        parameters.brightness ??
        this.profile.impactBrightness,

      chaos:
        parameters.chaos ??
        this.profile.resonanceChaos,

      damping:
        parameters.damping ??
        this.profile.resonanceDamping
    });
  }

  // =====================================================
  // MAIN TRIGGER
  // =====================================================

  trigger(parameters = {}) {

    if (
      !this.isConnected ||
      !this.transientSynth
    ) {
      return;
    }

    const now =
      this.audioContext.currentTime;

    const delta =
      now - this.lastTriggerTime;

    this.lastTriggerTime = now;

    // =====================================================
    // CLUSTER ENERGY
    // =====================================================

    // Fast impacts create chaotic roof chatter

    if (delta < 0.08) {

      this.clusterEnergy =
        Math.min(
          1,
          this.clusterEnergy + 0.12
        );

    } else {

      this.clusterEnergy *= 0.92;
    }

    // =====================================================
    // RANDOMIZATION
    // =====================================================

    const pitchChaos =
      (Math.random() - 0.5) *
      240;

    const resonanceChaos =
      (Math.random() - 0.5) *
      0.25;

    const wetnessVariation =
      (Math.random() - 0.5) *
      0.08;

    // =====================================================
    // NON-MUSICAL METAL IMPACT
    // =====================================================

    const impactFrequency =
      420 +
      Math.random() * 720 +
      pitchChaos;

    // =====================================================
    // BUILD TRANSIENT
    // =====================================================

    const tinParams = {

      ...parameters,

      // IMPORTANT:
      // no musical high pitch anymore

      frequencyOffset:
        impactFrequency - 720,

      // ===================================================
      // MATERIAL CHARACTER
      // ===================================================

      wetness:
        0.18 +
        wetnessVariation,

      resonance:
        0.38 +
        resonanceChaos +
        (this.clusterEnergy * 0.18),

      damping:
        0.52,

      hardness:
        0.82,

      softness:
        0.18,

      darkness:
        0.32,

      air:
        0.24,

      // ===================================================
      // CHAOTIC METAL
      // ===================================================

      metallic:
        true,

      noisy:
        true,

      chaotic:
        true,

      broadband:
        true,

      reflection:
        0.72,

      texture:
        0.66,

      brightness:
        0.52,

      bloom:
        0.12,

      // ===================================================
      // STEREO
      // ===================================================

      stereoSpread:
        0.62,

      // ===================================================
      // SUPPRESS MUSICALITY
      // ===================================================

      tonal:
        false,

      musical:
        false,

      xylophoneSuppression:
        1.0
    };

    // =====================================================
    // MAIN IMPACT
    // =====================================================

    this.transientSynth.trigger(
      tinParams
    );

    // =====================================================
    // CHAOTIC SECONDARY HITS
    // =====================================================

    // Real tin roofs create scattered reflections

    if (Math.random() < 0.38) {

      const secondaryDelay =
        0.008 +
        Math.random() * 0.022;

      setTimeout(() => {

        if (!this.isConnected) {
          return;
        }

        this.transientSynth.trigger({

          ...tinParams,

          frequencyOffset:
            tinParams.frequencyOffset +
            ((Math.random() - 0.5) * 180),

          resonance:
            tinParams.resonance * 0.7,

          wetness:
            tinParams.wetness * 0.8,

          brightness:
            tinParams.brightness * 0.92,

          stereoSpread:
            0.82
        });

      }, secondaryDelay * 1000);
    }

    // =====================================================
    // UPDATE RESONANCE
    // =====================================================

    this.updateSurface(tinParams);
  }

  // =====================================================
  // STATE
  // =====================================================

  setWetnessAccumulation(value) {

    this.wetnessAccumulation =
      Math.max(0, Math.min(1, value));
  }

  setMetalTemperature(value) {

    this.metalTemperature =
      Math.max(0, Math.min(1, value));
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {

    try {

      this.disconnect();

      if (this.resonance) {
        this.resonance.dispose();
      }

      console.log(
        '[RAIN] TinSurface disposed'
      );

    } catch (error) {

      console.warn(
        '[RAIN] TinSurface dispose error:',
        error
      );
    }
  }
}