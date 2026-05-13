// experts/rain/surfaces/tin_roof/tin_resonance.js
// Cinematic Tin Roof Resonance
// Chaotic metallic rain resonance system.
//
// IMPORTANT:
// This is NOT musical resonance.
// Real tin roofs produce:
// - noisy metallic flutter
// - unstable reflections
// - diffuse ringing
// - chaotic broadband resonance
//
// GOALS:
// - remove xylophone feel
// - preserve metallic identity
// - create cinematic realism
// - mobile-safe DSP

export class TinResonance {

  constructor(audioContext) {

    this.audioContext = audioContext;

    // =====================================================
    // IO
    // =====================================================

    this.input = null;

    this.output = null;

    // =====================================================
    // FILTER NETWORK
    // =====================================================

    this.primaryBand = null;

    this.secondaryBand = null;

    this.noiseFilter = null;

    this.lowpass = null;

    // =====================================================
    // GAIN STAGES
    // =====================================================

    this.primaryGain = null;

    this.secondaryGain = null;

    this.noiseGain = null;

    this.outputGain = null;

    // =====================================================
    // MODULATION
    // =====================================================

    this.lfo = null;

    this.lfoGain = null;

    // =====================================================
    // STATE
    // =====================================================

    this.isInitialized = false;

    this.isConnected = false;

    this.resonance = 0.45;

    this.brightness = 0.5;

    this.chaos = 0.7;

    this.damping = 0.45;

    this.wetness = 0.35;

    this.stereoScatter = 0.4;
  }

  // =====================================================
  // BUILD
  // =====================================================

  build() {

    if (this.isInitialized) {
      return;
    }

    // =====================================================
    // IO
    // =====================================================

    this.input =
      this.audioContext.createGain();

    this.output =
      this.audioContext.createGain();

    // =====================================================
    // PRIMARY METAL BODY
    // =====================================================

    this.primaryBand =
      this.audioContext.createBiquadFilter();

    this.primaryBand.type =
      'bandpass';

    // IMPORTANT:
    // lower frequency to avoid toy xylophone

    this.primaryBand.frequency.value =
      780;

    this.primaryBand.Q.value =
      2.8;

    // =====================================================
    // SECONDARY CHAOTIC RING
    // =====================================================

    this.secondaryBand =
      this.audioContext.createBiquadFilter();

    this.secondaryBand.type =
      'bandpass';

    this.secondaryBand.frequency.value =
      1320;

    this.secondaryBand.Q.value =
      1.4;

    // =====================================================
    // NOISE TEXTURE
    // =====================================================

    this.noiseFilter =
      this.audioContext.createBiquadFilter();

    this.noiseFilter.type =
      'highpass';

    this.noiseFilter.frequency.value =
      420;

    this.noiseFilter.Q.value =
      0.4;

    // =====================================================
    // FINAL SOFTENING
    // =====================================================

    this.lowpass =
      this.audioContext.createBiquadFilter();

    this.lowpass.type =
      'lowpass';

    this.lowpass.frequency.value =
      4200;

    this.lowpass.Q.value =
      0.2;

    // =====================================================
    // GAINS
    // =====================================================

    this.primaryGain =
      this.audioContext.createGain();

    this.secondaryGain =
      this.audioContext.createGain();

    this.noiseGain =
      this.audioContext.createGain();

    this.outputGain =
      this.audioContext.createGain();

    this.primaryGain.gain.value =
      0.45;

    this.secondaryGain.gain.value =
      0.22;

    this.noiseGain.gain.value =
      0.14;

    this.outputGain.gain.value =
      0.7;

    // =====================================================
    // MODULATION
    // =====================================================

    this.lfo =
      this.audioContext.createOscillator();

    this.lfo.type =
      'sine';

    this.lfo.frequency.value =
      0.18;

    this.lfoGain =
      this.audioContext.createGain();

    this.lfoGain.gain.value =
      60;

    // subtle instability
    this.lfo.connect(this.lfoGain);

    this.lfoGain.connect(
      this.primaryBand.frequency
    );

    // =====================================================
    // ROUTING
    // =====================================================

    // PRIMARY
    this.input.connect(
      this.primaryBand
    );

    this.primaryBand.connect(
      this.primaryGain
    );

    // SECONDARY
    this.input.connect(
      this.secondaryBand
    );

    this.secondaryBand.connect(
      this.secondaryGain
    );

    // NOISE
    this.input.connect(
      this.noiseFilter
    );

    this.noiseFilter.connect(
      this.noiseGain
    );

    // MIX
    this.primaryGain.connect(
      this.lowpass
    );

    this.secondaryGain.connect(
      this.lowpass
    );

    this.noiseGain.connect(
      this.lowpass
    );

    this.lowpass.connect(
      this.outputGain
    );

    this.outputGain.connect(
      this.output
    );

    // =====================================================
    // START LFO
    // =====================================================

    this.lfo.start();

    this.isInitialized = true;

    console.log(
      '[RAIN] TinResonance built'
    );
  }

  // =====================================================
  // CONNECT
  // =====================================================

  connect(destination) {

    if (!this.isInitialized) {
      this.build();
    }

    if (!destination) {

      console.warn(
        '[RAIN] TinResonance invalid destination'
      );

      return;
    }

    this.output.connect(destination);

    this.isConnected = true;

    console.log(
      '[RAIN] TinResonance connected'
    );
  }

  disconnect() {

    try {

      if (this.output) {
        this.output.disconnect();
      }

      this.isConnected = false;

    } catch (error) {

      console.warn(
        '[RAIN] TinResonance disconnect error:',
        error
      );
    }
  }

  // =====================================================
  // INPUT
  // =====================================================

  getInput() {

    if (!this.isInitialized) {
      this.build();
    }

    return this.input;
  }

  // =====================================================
  // UPDATE
  // =====================================================

  updateSurface(parameters = {}) {

    if (!this.isInitialized) {
      return;
    }

    const now =
      this.audioContext.currentTime;

    // =====================================================
    // PARAMS
    // =====================================================

    const resonance =
      parameters.resonance ??
      this.resonance;

    const brightness =
      parameters.brightness ??
      this.brightness;

    const chaos =
      parameters.chaos ??
      this.chaos;

    const damping =
      parameters.damping ??
      this.damping;

    // =====================================================
    // PRIMARY
    // =====================================================

    const primaryFreq =
      620 +
      (brightness * 620);

    this.primaryBand.frequency
      .cancelScheduledValues(now);

    this.primaryBand.frequency
      .linearRampToValueAtTime(
        primaryFreq,
        now + 0.08
      );

    this.primaryBand.Q
      .linearRampToValueAtTime(
        1.8 + (resonance * 2.5),
        now + 0.08
      );

    // =====================================================
    // SECONDARY
    // =====================================================

    const secondaryFreq =
      980 +
      (chaos * 900);

    this.secondaryBand.frequency
      .cancelScheduledValues(now);

    this.secondaryBand.frequency
      .linearRampToValueAtTime(
        secondaryFreq,
        now + 0.08
      );

    this.secondaryBand.Q
      .linearRampToValueAtTime(
        0.8 + (chaos * 1.6),
        now + 0.08
      );

    // =====================================================
    // DAMPING
    // =====================================================

    const lowpassFreq =
      5200 -
      (damping * 2600);

    this.lowpass.frequency
      .cancelScheduledValues(now);

    this.lowpass.frequency
      .linearRampToValueAtTime(
        lowpassFreq,
        now + 0.08
      );

    // =====================================================
    // GAIN BALANCE
    // =====================================================

    this.primaryGain.gain
      .linearRampToValueAtTime(
        0.28 + resonance * 0.3,
        now + 0.08
      );

    this.secondaryGain.gain
      .linearRampToValueAtTime(
        0.1 + chaos * 0.18,
        now + 0.08
      );

    this.noiseGain.gain
      .linearRampToValueAtTime(
        0.08 + brightness * 0.12,
        now + 0.08
      );
  }

  // =====================================================
  // CONTROLS
  // =====================================================

  setResonanceFrequency(value) {

    if (!this.primaryBand) {
      return;
    }

    const freq =
      Math.max(
        220,
        Math.min(2200, value)
      );

    this.primaryBand.frequency.value =
      freq;
  }

  setResonance(value) {

    this.resonance =
      Math.max(0, Math.min(1, value));

    this.updateSurface();
  }

  setBrightness(value) {

    this.brightness =
      Math.max(0, Math.min(1, value));

    this.updateSurface();
  }

  setChaos(value) {

    this.chaos =
      Math.max(0, Math.min(1, value));

    this.updateSurface();
  }

  setDamping(value) {

    this.damping =
      Math.max(0, Math.min(1, value));

    this.updateSurface();
  }

  setWetness(value) {

    this.wetness =
      Math.max(0, Math.min(1, value));
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {

    try {

      this.disconnect();

      if (this.input) this.input.disconnect();
      if (this.output) this.output.disconnect();

      if (this.primaryBand) {
        this.primaryBand.disconnect();
      }

      if (this.secondaryBand) {
        this.secondaryBand.disconnect();
      }

      if (this.noiseFilter) {
        this.noiseFilter.disconnect();
      }

      if (this.lowpass) {
        this.lowpass.disconnect();
      }

      if (this.primaryGain) {
        this.primaryGain.disconnect();
      }

      if (this.secondaryGain) {
        this.secondaryGain.disconnect();
      }

      if (this.noiseGain) {
        this.noiseGain.disconnect();
      }

      if (this.outputGain) {
        this.outputGain.disconnect();
      }

      if (this.lfo) {
        this.lfo.stop();
        this.lfo.disconnect();
      }

      if (this.lfoGain) {
        this.lfoGain.disconnect();
      }

      this.isInitialized = false;

      console.log(
        '[RAIN] TinResonance disposed'
      );

    } catch (error) {

      console.warn(
        '[RAIN] TinResonance dispose error:',
        error
      );
    }
  }
}