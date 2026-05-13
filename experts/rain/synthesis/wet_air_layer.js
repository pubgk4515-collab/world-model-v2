// experts/rain/synthesis/wet_air_layer.js
// Cinematic Wet Air Layer
// Simulates humid atmospheric absorption,
// fog softness,
// wet-distance blur,
// and storm-air movement.
//
// Designed to:
// - remove harsh digital edges
// - soften transients naturally
// - create humid cinematic depth
// - simulate rainy air pressure feel

export class WetAirLayer {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.input = null;
    this.output = null;

    // =====================================================
    // FILTER NETWORK
    // =====================================================

    this.highpass = null;

    this.lowpass = null;

    this.airShelf = null;

    this.presenceDip = null;

    // =====================================================
    // MIX
    // =====================================================

    this.wetGain = null;

    this.dryGain = null;

    // =====================================================
    // STATE
    // =====================================================

    this.isInitialized = false;

    this.isConnected = false;

    this.humidity = 0.65;

    this.darkness = 0.45;

    this.distance = 0.35;

    this.fogAmount = 0.4;

    this.airMovement = 0.25;

    this.wetness = 0.6;

    this.pressure = 0.4;

    // Internal modulation
    this.phase = 0;

    this.animationFrame = null;

    this.isRunning = false;

    this.lastUpdate = 0;

    this.updateRate = 30;
  }

  // =====================================================
  // INIT
  // =====================================================

  init() {
    if (this.isInitialized) return;

    // IO
    this.input =
      this.audioContext.createGain();

    this.output =
      this.audioContext.createGain();

    // =====================================================
    // FILTERS
    // =====================================================

    // Remove muddy sub-rumble
    this.highpass =
      this.audioContext.createBiquadFilter();

    this.highpass.type = 'highpass';

    this.highpass.frequency.value = 90;

    this.highpass.Q.value = 0.4;

    // Humid air absorption
    this.lowpass =
      this.audioContext.createBiquadFilter();

    this.lowpass.type = 'lowpass';

    this.lowpass.frequency.value = 5200;

    this.lowpass.Q.value = 0.25;

    // Soft wet-air shelf
    this.airShelf =
      this.audioContext.createBiquadFilter();

    this.airShelf.type = 'highshelf';

    this.airShelf.frequency.value = 3200;

    this.airShelf.gain.value = -4;

    // Presence dip for fog softness
    this.presenceDip =
      this.audioContext.createBiquadFilter();

    this.presenceDip.type = 'peaking';

    this.presenceDip.frequency.value = 2400;

    this.presenceDip.Q.value = 0.7;

    this.presenceDip.gain.value = -2;

    // =====================================================
    // MIX
    // =====================================================

    this.wetGain =
      this.audioContext.createGain();

    this.dryGain =
      this.audioContext.createGain();

    this.wetGain.gain.value = 0.35;

    this.dryGain.gain.value = 0.92;

    // =====================================================
    // ROUTING
    // =====================================================

    // Dry
    this.input.connect(this.dryGain);

    this.dryGain.connect(this.output);

    // Wet atmospheric chain
    this.input.connect(this.highpass);

    this.highpass.connect(this.lowpass);

    this.lowpass.connect(this.airShelf);

    this.airShelf.connect(this.presenceDip);

    this.presenceDip.connect(this.wetGain);

    this.wetGain.connect(this.output);

    this.isInitialized = true;

    console.log('[RAIN] WetAirLayer initialized');
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
        '[RAIN] WetAirLayer.connect() invalid destination'
      );

      return;
    }

    this.output.connect(destination);

    this.isConnected = true;

    console.log('[RAIN] WetAirLayer connected');
  }

  disconnect() {
    try {
      if (this.output) {
        this.output.disconnect();
      }

      this.isConnected = false;
    } catch (error) {
      console.warn(
        '[RAIN] WetAirLayer disconnect error:',
        error
      );
    }
  }

  getInput() {
    if (!this.isInitialized) {
      this.init();
    }

    return this.input;
  }

  // =====================================================
  // START / STOP
  // =====================================================

  start() {
    if (this.isRunning) return;

    this.isRunning = true;

    this.updateLoop();

    console.log('[RAIN] WetAirLayer started');
  }

  stop() {
    this.isRunning = false;

    if (this.animationFrame) {
      cancelAnimationFrame(
        this.animationFrame
      );

      this.animationFrame = null;
    }

    console.log('[RAIN] WetAirLayer stopped');
  }

  // =====================================================
  // LOOP
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
    if (!this.isInitialized) return;

    const now =
      this.audioContext.currentTime;

    // =====================================================
    // AIR MOVEMENT
    // =====================================================

    this.phase +=
      0.002 +
      (this.airMovement * 0.002);

    const movement =
      Math.sin(this.phase) * 0.08;

    // =====================================================
    // LOWPASS ABSORPTION
    // =====================================================

    const lpFreq =
      7800 -
      (this.humidity * 2600) -
      (this.darkness * 1800) -
      (this.distance * 1500) -
      (this.fogAmount * 900);

    this.lowpass.frequency
      .cancelScheduledValues(now);

    this.lowpass.frequency
      .linearRampToValueAtTime(
        Math.max(900, lpFreq + (movement * 120)),
        now + 0.08
      );

    // =====================================================
    // AIR SHELF
    // =====================================================

    const shelfGain =
      -1 -
      (this.humidity * 5) -
      (this.fogAmount * 3);

    this.airShelf.gain
      .cancelScheduledValues(now);

    this.airShelf.gain
      .linearRampToValueAtTime(
        shelfGain,
        now + 0.08
      );

    // =====================================================
    // PRESENCE DIP
    // =====================================================

    const presenceGain =
      -1 -
      (this.fogAmount * 5);

    this.presenceDip.gain
      .cancelScheduledValues(now);

    this.presenceDip.gain
      .linearRampToValueAtTime(
        presenceGain,
        now + 0.08
      );

    // =====================================================
    // WET MIX
    // =====================================================

    const wetLevel =
      0.08 +
      (this.wetness * 0.45);

    this.wetGain.gain
      .cancelScheduledValues(now);

    this.wetGain.gain
      .linearRampToValueAtTime(
        wetLevel,
        now + 0.08
      );
  }

  // =====================================================
  // PARAMETERS
  // =====================================================

  setHumidity(value) {
    this.humidity =
      Math.max(0, Math.min(1, value));
  }

  setDarkness(value) {
    this.darkness =
      Math.max(0, Math.min(1, value));
  }

  setDistance(value) {
    this.distance =
      Math.max(0, Math.min(1, value));
  }

  setFogAmount(value) {
    this.fogAmount =
      Math.max(0, Math.min(1, value));
  }

  setAirMovement(value) {
    this.airMovement =
      Math.max(0, Math.min(1, value));
  }

  setWetness(value) {
    this.wetness =
      Math.max(0, Math.min(1, value));
  }

  setPressure(value) {
    this.pressure =
      Math.max(0, Math.min(1, value));
  }

  // =====================================================
  // DISPOSE
  // =====================================================

  dispose() {
    try {
      this.stop();

      this.disconnect();

      if (this.input) this.input.disconnect();
      if (this.output) this.output.disconnect();

      if (this.highpass) this.highpass.disconnect();
      if (this.lowpass) this.lowpass.disconnect();

      if (this.airShelf) this.airShelf.disconnect();
      if (this.presenceDip) this.presenceDip.disconnect();

      if (this.wetGain) this.wetGain.disconnect();
      if (this.dryGain) this.dryGain.disconnect();

      this.isInitialized = false;

      console.log('[RAIN] WetAirLayer disposed');
    } catch (error) {
      console.warn(
        '[RAIN] WetAirLayer dispose error:',
        error
      );
    }
  }
}