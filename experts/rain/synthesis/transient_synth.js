// experts/rain/synthesis/transient_synth.js
// Symbiote Cinematic Rain Transient Synth
//
// PURPOSE:
// Realistic rain impact synthesis without toy/xylophone artifacts.
//
// DESIGN GOALS:
// - darker rain texture
// - believable low-mid droplet body
// - soft cinematic bloom
// - zero harsh resonance
// - no glassy toy sound
// - mobile-safe
// - smooth atmospheric tails
//
// IMPORTANT:
//
// OLD PROBLEM:
// frequencies were WAY too high.
//
// OLD:
// 700Hz - 1500Hz+
//
// NEW TARGET:
// 180Hz - 650Hz
//
// This instantly removes the
// "toy percussion / xylophone" feeling.

export class TransientSynth {

  constructor(audioContext) {

    this.audioContext = audioContext;

    this.destination = null;

    this.isConnected = false;

    this.isInitialized = false;

    // =====================================================
    // CORE CHARACTER
    // =====================================================

    // MUCH darker + lower

    this.baseFrequency = 280;

    this.frequencyVariance = 110;

    // softer envelope

    this.attackTime = 0.004;

    this.decayTime = 0.11;

    this.releaseTime = 0.18;

    // safer output

    this.outputGain = 0.11;

    // =====================================================
    // ENVIRONMENT
    // =====================================================

    this.wetness = 0.65;

    this.resonance = 0.28;

    this.bloom = 0.18;

    this.darkness = 0.62;

    this.softness = 0.82;

    this.air = 0.36;

    // =====================================================
    // RANDOMIZATION
    // =====================================================

    this.stereoSpread = 0.18;

    this.pitchDrift = 0.04;

    this.microVariation = 0.08;

    // =====================================================
    // SAFETY
    // =====================================================

    this.maxFrequency = 1800;

    this.minFrequency = 80;
  }

  // =====================================================
  // INIT
  // =====================================================

  init() {

    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    console.log(
      '[RAIN] TransientSynth initialized'
    );
  }

  // =====================================================
  // CONNECT
  // =====================================================

  connect(destination) {

    if (
      destination &&
      typeof destination.connect ===
      'function'
    ) {

      this.destination = destination;

    } else {

      console.warn(
        '[RAIN] Invalid destination, fallback used'
      );

      this.destination =
        this.audioContext.destination;
    }

    this.isConnected = true;

    console.log(
      '[RAIN] TransientSynth connected'
    );
  }

  disconnect() {

    this.destination = null;

    this.isConnected = false;
  }

  // =====================================================
  // MAIN DROP
  // =====================================================

  trigger(parameters = {}) {

    if (
      !this.isConnected ||
      !this.destination
    ) {

      console.warn(
        '[RAIN] trigger() without destination'
      );

      return;
    }

    const now =
      this.audioContext.currentTime;

    // =====================================================
    // LOWER + DARKER FREQUENCY
    // =====================================================

    const randomOffset =
      (Math.random() - 0.5) *
      this.frequencyVariance;

    const microOffset =
      (Math.random() - 0.5) *
      25 *
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

    if (this.wetness > 0.12) {

      this.createWetBody(
        now,
        frequency,
        parameters
      );
    }

    // =====================================================
    // SOFT BLOOM
    // =====================================================

    if (this.resonance > 0.08) {

      this.createBloomTail(
        now,
        frequency,
        parameters
      );
    }

    // =====================================================
    // MICRO REFLECTIONS
    // =====================================================

    if (this.softness > 0.45) {

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

    // IMPORTANT:
    // triangle is MUCH softer
    // than sine in this frequency range

    osc.type = 'triangle';

    osc.frequency.value =
      frequency;

    // =====================================================
    // FILTER
    // =====================================================

    filter.type = 'lowpass';

    filter.frequency.value =
      1200 -
      (this.darkness * 500);

    filter.Q.value = 0.45;

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
      0.012,
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

    // lower + darker

    osc.type = 'triangle';

    osc.frequency.value =
      Math.max(
        60,
        frequency * 0.18
      );

    lowpass.type = 'lowpass';

    lowpass.frequency.value =
      520;

    lowpass.Q.value = 0.1;

    const end =
      now + 0.11;

    gain.gain.setValueAtTime(
      0.0001,
      now
    );

    gain.gain.linearRampToValueAtTime(
      0.028 * this.wetness,
      now + 0.006
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

    // IMPORTANT:
    // softer airy tail
    // not whistle resonance

    osc.type = 'sine';

    osc.frequency.value =
      frequency * 0.82;

    filter.type = 'bandpass';

    filter.frequency.value =
      frequency * 0.9;

    // HUGE FIX:
    // low Q prevents ringing

    filter.Q.value = 1.8;

    panner.pan.value =
      (Math.random() - 0.5) *
      0.25;

    const start =
      now + 0.012;

    const peak =
      start + 0.045;

    const end =
      start +
      0.16 +
      (this.bloom * 0.12);

    gain.gain.setValueAtTime(
      0.0001,
      now
    );

    gain.gain.setValueAtTime(
      0.0001,
      start
    );

    gain.gain.linearRampToValueAtTime(
      0.008 * this.resonance,
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
        this.softness * 2
      );

    for (let i = 0; i < count; i++) {

      const osc =
        this.audioContext.createOscillator();

      const gain =
        this.audioContext.createGain();

      const filter =
        this.audioContext.createBiquadFilter();

      const delay =
        Math.random() * 0.02;

      const start =
        now + delay;

      const end =
        start + 0.05;

      osc.type = 'triangle';

      osc.frequency.value =
        frequency *
        (0.55 + Math.random() * 0.25);

      filter.type = 'lowpass';

      filter.frequency.value =
        1000 -
        (this.darkness * 400);

      filter.Q.value = 0.08;

      gain.gain.setValueAtTime(
        0.0001,
        start
      );

      gain.gain.linearRampToValueAtTime(
        0.0035,
        start + 0.004
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
      Math.max(
        0.01,
        Math.min(1, value)
      );
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {

    this.disconnect();

    this.isInitialized = false;

    console.log(
      '[RAIN] TransientSynth disposed'
    );
  }
}