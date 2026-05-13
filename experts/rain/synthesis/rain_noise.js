// experts/rain/synthesis/rain_noise.js
// Cinematic Rain Noise Generator
// Soft atmospheric rain bed with humid movement,
// stereo drift, dark wet-air texture,
// and zero harsh digital hiss.

export class RainNoise {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.source = null;

    this.input = null;
    this.output = null;

    this.masterGain = null;

    this.lowpass = null;
    this.highpass = null;
    this.presenceFilter = null;

    this.stereoPanner = null;

    this.isConnected = false;
    this.isRunning = false;
    this.isInitialized = false;

    // =====================================================
    // STATE
    // =====================================================

    this.intensity = 0.25;

    this.stereoDrift = 0;
    this.driftPhase = 0;

    this.darkness = 0.55;
    this.wetness = 0.65;
    this.airMovement = 0.3;

    // Internal modulation
    this.animationFrame = null;
    this.lastUpdate = 0;
    this.updateRate = 30;
  }

  // =====================================================
  // INIT
  // =====================================================

  init() {
    if (this.isInitialized) return;

    // =====================================================
    // IO
    // =====================================================

    this.input =
      this.audioContext.createGain();

    this.output =
      this.audioContext.createGain();

    this.masterGain =
      this.audioContext.createGain();

    // =====================================================
    // FILTERS
    // =====================================================

    this.lowpass =
      this.audioContext.createBiquadFilter();

    this.lowpass.type = 'lowpass';

    this.lowpass.frequency.value = 3200;

    this.lowpass.Q.value = 0.25;

    // Remove muddy sub-rumble
    this.highpass =
      this.audioContext.createBiquadFilter();

    this.highpass.type = 'highpass';

    this.highpass.frequency.value = 80;

    this.highpass.Q.value = 0.4;

    // Soft presence shaping
    this.presenceFilter =
      this.audioContext.createBiquadFilter();

    this.presenceFilter.type = 'peaking';

    this.presenceFilter.frequency.value = 1800;

    this.presenceFilter.Q.value = 0.6;

    this.presenceFilter.gain.value = -2;

    // =====================================================
    // STEREO
    // =====================================================

    this.stereoPanner =
      this.audioContext.createStereoPanner();

    // =====================================================
    // NOISE BUFFER
    // =====================================================

    const buffer =
      this.generateNoiseBuffer();

    this.source =
      this.audioContext.createBufferSource();

    this.source.buffer = buffer;

    this.source.loop = true;

    // =====================================================
    // GAIN
    // =====================================================

    this.masterGain.gain.value = 0.012;

    // =====================================================
    // ROUTING
    // =====================================================

    this.source.connect(this.highpass);

    this.highpass.connect(this.lowpass);

    this.lowpass.connect(this.presenceFilter);

    this.presenceFilter.connect(this.masterGain);

    this.masterGain.connect(this.stereoPanner);

    this.stereoPanner.connect(this.output);

    this.isInitialized = true;

    console.log('[RAIN] RainNoise initialized');
  }

  // =====================================================
  // NOISE GENERATION
  // =====================================================

  generateNoiseBuffer() {
    const sampleRate =
      this.audioContext.sampleRate;

    const duration = 5;

    const length =
      sampleRate * duration;

    const buffer =
      this.audioContext.createBuffer(
        2,
        length,
        sampleRate
      );

    for (let channel = 0; channel < 2; channel++) {
      const data =
        buffer.getChannelData(channel);

      let brown = 0;

      let previous = 0;

      for (let i = 0; i < length; i++) {
        const white =
          (Math.random() * 2 - 1);

        // Brown movement
        brown +=
          (white - brown) * 0.018;

        // Diffused smoothing
        previous =
          previous * 0.985 +
          brown * 0.015;

        // Air softness
        const soft =
          previous * 0.55 +
          brown * 0.45;

        // Stereo decorrelation
        const stereoOffset =
          channel === 0
            ? 1
            : 0.985 + (Math.random() * 0.03);

        data[i] =
          soft *
          stereoOffset *
          0.45;
      }
    }

    return buffer;
  }

  // =====================================================
  // CONNECT
  // =====================================================

  connect(destination) {
    if (!this.isInitialized) {
      this.init();
    }

    if (!destination) {
      console.warn(
        '[RAIN] RainNoise.connect() invalid destination'
      );

      return;
    }

    this.output.connect(destination);

    this.isConnected = true;

    console.log('[RAIN] RainNoise connected');
  }

  disconnect() {
    try {
      if (this.output) {
        this.output.disconnect();
      }

      this.isConnected = false;
    } catch (error) {
      console.warn(
        '[RAIN] RainNoise disconnect error:',
        error
      );
    }
  }

  // =====================================================
  // START
  // =====================================================

  start() {
    if (this.isRunning) return;

    if (!this.isInitialized) {
      this.init();
    }

    this.isRunning = true;

    try {
      this.source.start();

      this.updateLoop();

      console.log('[RAIN] RainNoise started');
    } catch (error) {
      console.warn(
        '[RAIN] RainNoise start error:',
        error
      );
    }
  }

  stop() {
    this.isRunning = false;

    if (this.animationFrame) {
      cancelAnimationFrame(
        this.animationFrame
      );

      this.animationFrame = null;
    }

    try {
      if (this.source) {
        this.source.stop();
      }
    } catch {}

    console.log('[RAIN] RainNoise stopped');
  }

  // =====================================================
  // UPDATE LOOP
  // =====================================================

  updateLoop() {
    if (!this.isRunning) return;

    this.animationFrame =
      requestAnimationFrame(() => {
        this.updateLoop();
      });

    const now = performance.now();

    if (
      now - this.lastUpdate <
      (1000 / this.updateRate)
    ) {
      return;
    }

    this.lastUpdate = now;

    this.update();
  }

  // =====================================================
  // UPDATE
  // =====================================================

  update() {
    if (!this.isRunning) return;

    const now =
      this.audioContext.currentTime;

    // =====================================================
    // STEREO DRIFT
    // =====================================================

    this.driftPhase +=
      0.003 +
      (this.airMovement * 0.002);

    this.stereoDrift =
      Math.sin(this.driftPhase) * 0.12;

    this.stereoPanner.pan
      .cancelScheduledValues(now);

    this.stereoPanner.pan
      .linearRampToValueAtTime(
        this.stereoDrift,
        now + 0.08
      );

    // =====================================================
    // GAIN EVOLUTION
    // =====================================================

    const targetGain =
      Math.max(
        0.002,
        0.008 +
        (this.intensity * 0.035)
      );

    this.masterGain.gain
      .cancelScheduledValues(now);

    this.masterGain.gain
      .linearRampToValueAtTime(
        targetGain,
        now + 0.2
      );

    // =====================================================
    // FILTER EVOLUTION
    // =====================================================

    const cutoff =
      5200 -
      (this.darkness * 2500) -
      (this.wetness * 1200);

    this.lowpass.frequency
      .cancelScheduledValues(now);

    this.lowpass.frequency
      .linearRampToValueAtTime(
        cutoff,
        now + 0.12
      );
  }

  // =====================================================
  // PARAMETERS
  // =====================================================

  setIntensity(value) {
    this.intensity =
      Math.max(0, Math.min(1, value));
  }

  setDarkness(value) {
    this.darkness =
      Math.max(0, Math.min(1, value));
  }

  setWetness(value) {
    this.wetness =
      Math.max(0, Math.min(1, value));
  }

  setAirMovement(value) {
    this.airMovement =
      Math.max(0, Math.min(1, value));
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {
    try {
      this.stop();

      this.disconnect();

      if (this.source) {
        this.source.disconnect();
      }

      if (this.input) {
        this.input.disconnect();
      }

      if (this.output) {
        this.output.disconnect();
      }

      if (this.masterGain) {
        this.masterGain.disconnect();
      }

      if (this.lowpass) {
        this.lowpass.disconnect();
      }

      if (this.highpass) {
        this.highpass.disconnect();
      }

      if (this.presenceFilter) {
        this.presenceFilter.disconnect();
      }

      if (this.stereoPanner) {
        this.stereoPanner.disconnect();
      }

      this.isInitialized = false;

      console.log('[RAIN] RainNoise disposed');
    } catch (error) {
      console.warn(
        '[RAIN] RainNoise dispose error:',
        error
      );
    }
  }
}