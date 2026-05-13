// experts/rain/synthesis/transient_synth.js
// Cinematic Rain Transient Synth
// Generates believable rain impacts,
// soft wet body resonance,
// subtle flute-like bloom,
// and non-harsh atmospheric tails.
//
// Designed for:
// - mobile safety
// - zero click transients
// - cinematic realism
// - soft immersive rain texture

export class TransientSynth {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.destination = null;

    this.isConnected = false;

    this.isInitialized = false;

    // =====================================================
    // CORE CHARACTER
    // =====================================================

    this.baseFrequency = 720;

    this.frequencyVariance = 240;

    this.attackTime = 0.003;

    this.decayTime = 0.08;

    this.releaseTime = 0.16;

    this.outputGain = 0.14;

    // =====================================================
    // ENVIRONMENT
    // =====================================================

    this.wetness = 0.65;

    this.resonance = 0.35;

    this.bloom = 0.25;

    this.darkness = 0.45;

    this.softness = 0.75;

    this.air = 0.4;

    // =====================================================
    // RANDOMIZATION
    // =====================================================

    this.stereoSpread = 0.25;

    this.pitchDrift = 0.08;

    this.microVariation = 0.15;

    // =====================================================
    // SAFETY
    // =====================================================

    this.maxFrequency = 6000;

    this.minFrequency = 90;
  }

  // =====================================================
  // INIT
  // =====================================================

  init() {
    if (this.isInitialized) return;

    this.isInitialized = true;

    console.log('[RAIN] TransientSynth initialized');
  }

  // =====================================================
  // CONNECT
  // =====================================================

  connect(destination) {
    if (
      destination &&
      typeof destination.connect === 'function'
    ) {
      this.destination = destination;

      console.log(
        '[RAIN] TransientSynth connected'
      );
    } else {
      console.warn(
        '[RAIN] Invalid destination, using audioContext.destination'
      );

      this.destination =
        this.audioContext.destination;
    }

    this.isConnected = true;
  }

  disconnect() {
    this.destination = null;

    this.isConnected = false;
  }

  // =====================================================
  // MAIN DROP
  // =====================================================

  trigger(parameters = {}) {
    if (!this.isConnected || !this.destination) {
      console.warn(
        '[RAIN] TransientSynth.trigger() without valid destination'
      );

      return;
    }

    const now =
      this.audioContext.currentTime;

    // =====================================================
    // FREQUENCY
    // =====================================================

    const randomOffset =
      (Math.random() - 0.5) *
      this.frequencyVariance;

    const microOffset =
      (Math.random() - 0.5) *
      40 *
      this.microVariation;

    const frequency =
      Math.max(
        this.minFrequency,
        Math.min(
          this.maxFrequency,
          this.baseFrequency +
          randomOffset +
          microOffset +
          (parameters.frequencyOffset || 0)
        )
      );

    // =====================================================
    // MAIN BODY
    // =====================================================

    this.createMainTransient(
      now,
      frequency,
      parameters
    );

    // =====================================================
    // WET BODY
    // =====================================================

    if (this.wetness > 0.15) {
      this.createWetBody(
        now,
        frequency,
        parameters
      );
    }

    // =====================================================
    // RESONANT BLOOM
    // =====================================================

    if (this.resonance > 0.1) {
      this.createBloomTail(
        now,
        frequency,
        parameters
      );
    }

    // =====================================================
    // MICRO REFLECTIONS
    // =====================================================

    if (this.softness > 0.4) {
      this.createMicroReflections(
        now,
        frequency,
        parameters
      );
    }
  }

  // =====================================================
  // MAIN TRANSIENT
  // =====================================================

  createMainTransient(now, frequency) {
    const osc =
      this.audioContext.createOscillator();

    const gain =
      this.audioContext.createGain();

    const filter =
      this.audioContext.createBiquadFilter();

    const panner =
      this.audioContext.createStereoPanner();

    // =====================================================
    // OSC
    // =====================================================

    osc.type = 'sine';

    osc.frequency.value =
      frequency;

    // =====================================================
    // FILTER
    // =====================================================

    filter.type = 'bandpass';

    filter.frequency.value =
      frequency;

    filter.Q.value =
      1.4;

    // =====================================================
    // PAN
    // =====================================================

    panner.pan.value =
      (Math.random() - 0.5) *
      this.stereoSpread;

    // =====================================================
    // ENVELOPE
    // =====================================================

    const attackEnd =
      now + this.attackTime;

    const decayEnd =
      attackEnd + this.decayTime;

    const releaseEnd =
      decayEnd + this.releaseTime;

    gain.gain.setValueAtTime(
      0.0001,
      now
    );

    gain.gain.linearRampToValueAtTime(
      this.outputGain,
      attackEnd
    );

    gain.gain.exponentialRampToValueAtTime(
      0.02,
      decayEnd
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      releaseEnd
    );

    // =====================================================
    // ROUTING
    // =====================================================

    osc.connect(filter);

    filter.connect(gain);

    gain.connect(panner);

    panner.connect(this.destination);

    osc.start(now);

    osc.stop(releaseEnd);
  }

  // =====================================================
  // WET LOW BODY
  // =====================================================

  createWetBody(now, frequency) {
    const osc =
      this.audioContext.createOscillator();

    const gain =
      this.audioContext.createGain();

    const lowpass =
      this.audioContext.createBiquadFilter();

    osc.type = 'triangle';

    osc.frequency.value =
      frequency * 0.24;

    lowpass.type = 'lowpass';

    lowpass.frequency.value = 850;

    lowpass.Q.value = 0.2;

    const end =
      now + 0.08;

    gain.gain.setValueAtTime(
      0.0001,
      now
    );

    gain.gain.linearRampToValueAtTime(
      0.035 * this.wetness,
      now + 0.004
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      end
    );

    osc.connect(lowpass);

    lowpass.connect(gain);

    gain.connect(this.destination);

    osc.start(now);

    osc.stop(end);
  }

  // =====================================================
  // BLOOM TAIL
  // =====================================================

  createBloomTail(now, frequency) {
    const osc =
      this.audioContext.createOscillator();

    const gain =
      this.audioContext.createGain();

    const filter =
      this.audioContext.createBiquadFilter();

    const panner =
      this.audioContext.createStereoPanner();

    // Flute-like airy resonance
    osc.type = 'sine';

    osc.frequency.value =
      frequency *
      (1.25 + (Math.random() * 0.08));

    filter.type = 'bandpass';

    filter.frequency.value =
      frequency * 1.35;

    filter.Q.value =
      5 +
      (this.bloom * 6);

    panner.pan.value =
      (Math.random() - 0.5) * 0.4;

    const start =
      now + 0.01;

    const peak =
      start + 0.03;

    const end =
      start +
      0.18 +
      (this.bloom * 0.22);

    gain.gain.setValueAtTime(
      0.0001,
      now
    );

    gain.gain.setValueAtTime(
      0.0001,
      start
    );

    gain.gain.linearRampToValueAtTime(
      0.014 * this.resonance,
      peak
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      end
    );

    osc.connect(filter);

    filter.connect(gain);

    gain.connect(panner);

    panner.connect(this.destination);

    osc.start(start);

    osc.stop(end);
  }

  // =====================================================
  // MICRO REFLECTIONS
  // =====================================================

  createMicroReflections(now, frequency) {
    const count =
      1 +
      Math.floor(
        this.softness * 3
      );

    for (let i = 0; i < count; i++) {
      const osc =
        this.audioContext.createOscillator();

      const gain =
        this.audioContext.createGain();

      const filter =
        this.audioContext.createBiquadFilter();

      const delay =
        Math.random() * 0.025;

      const start =
        now + delay;

      const end =
        start + 0.04;

      osc.type = 'sine';

      osc.frequency.value =
        frequency *
        (0.8 + Math.random() * 0.5);

      filter.type = 'lowpass';

      filter.frequency.value =
        2200 -
        (this.darkness * 1200);

      filter.Q.value = 0.2;

      gain.gain.setValueAtTime(
        0.0001,
        start
      );

      gain.gain.linearRampToValueAtTime(
        0.006,
        start + 0.003
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        end
      );

      osc.connect(filter);

      filter.connect(gain);

      gain.connect(this.destination);

      osc.start(start);

      osc.stop(end);
    }
  }

  // =====================================================
  // CONTROLS
  // =====================================================

  setWetness(value) {
    this.wetness =
      Math.max(0, Math.min(1, value));
  }

  setResonance(value) {
    this.resonance =
      Math.max(0, Math.min(1, value));
  }

  setBloom(value) {
    this.bloom =
      Math.max(0, Math.min(1, value));
  }

  setDarkness(value) {
    this.darkness =
      Math.max(0, Math.min(1, value));
  }

  setSoftness(value) {
    this.softness =
      Math.max(0, Math.min(1, value));
  }

  setOutputGain(value) {
    this.outputGain =
      Math.max(0.01, Math.min(1, value));
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {
    this.disconnect();

    this.isInitialized = false;

    console.log('[RAIN] TransientSynth disposed');
  }
}