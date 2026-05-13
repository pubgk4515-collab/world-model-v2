// experts/rain/synthesis/stereo_field.js
// Cinematic Rain Stereo Field
// Creates soft environmental width,
// drifting spatial motion,
// atmospheric spread,
// and immersive rain depth.
//
// IMPORTANT:
// Avoid exaggerated ping-pong motion.
// Rain must feel natural and breathable.

export class StereoField {
  constructor(audioContext) {
    this.audioContext = audioContext;

    this.input = null;
    this.output = null;

    this.splitter = null;
    this.merger = null;

    this.leftGain = null;
    this.rightGain = null;

    this.leftDelay = null;
    this.rightDelay = null;

    this.stereoPanner = null;

    this.widthGain = null;

    this.isInitialized = false;
    this.isConnected = false;

    // =====================================================
    // STATE
    // =====================================================

    this.pan = 0;

    this.width = 0.65;

    this.airMovement = 0.25;

    this.distance = 0.3;

    this.driftAmount = 0.12;

    this.wetness = 0.5;

    this.darkness = 0.35;

    // Internal motion
    this.driftPhase = 0;

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

    // Stereo processors
    this.splitter =
      this.audioContext.createChannelSplitter(2);

    this.merger =
      this.audioContext.createChannelMerger(2);

    this.leftGain =
      this.audioContext.createGain();

    this.rightGain =
      this.audioContext.createGain();

    this.leftDelay =
      this.audioContext.createDelay(0.1);

    this.rightDelay =
      this.audioContext.createDelay(0.1);

    this.stereoPanner =
      this.audioContext.createStereoPanner();

    this.widthGain =
      this.audioContext.createGain();

    // =====================================================
    // DEFAULTS
    // =====================================================

    this.leftGain.gain.value = 1;
    this.rightGain.gain.value = 1;

    // Tiny decorrelation
    this.leftDelay.delayTime.value = 0.003;
    this.rightDelay.delayTime.value = 0.007;

    this.widthGain.gain.value = 1;

    this.stereoPanner.pan.value = 0;

    // =====================================================
    // ROUTING
    // =====================================================

    this.input.connect(this.stereoPanner);

    this.stereoPanner.connect(this.splitter);

    // LEFT
    this.splitter.connect(this.leftDelay, 0);

    this.leftDelay.connect(this.leftGain);

    this.leftGain.connect(this.merger, 0, 0);

    // RIGHT
    this.splitter.connect(this.rightDelay, 1);

    this.rightDelay.connect(this.rightGain);

    this.rightGain.connect(this.merger, 0, 1);

    // OUTPUT
    this.merger.connect(this.widthGain);

    this.widthGain.connect(this.output);

    this.isInitialized = true;

    console.log('[RAIN] StereoField initialized');
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
        '[RAIN] StereoField.connect() invalid destination'
      );

      return;
    }

    this.output.connect(destination);

    this.isConnected = true;

    console.log('[RAIN] StereoField connected');
  }

  disconnect() {
    try {
      if (this.output) {
        this.output.disconnect();
      }

      this.isConnected = false;
    } catch (error) {
      console.warn(
        '[RAIN] StereoField disconnect error:',
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

    console.log('[RAIN] StereoField started');
  }

  stop() {
    this.isRunning = false;

    if (this.animationFrame) {
      cancelAnimationFrame(
        this.animationFrame
      );

      this.animationFrame = null;
    }

    console.log('[RAIN] StereoField stopped');
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
    // NATURAL DRIFT
    // =====================================================

    this.driftPhase +=
      0.002 +
      (this.airMovement * 0.0015);

    const drift =
      Math.sin(this.driftPhase) *
      this.driftAmount;

    const finalPan =
      Math.max(
        -1,
        Math.min(
          1,
          this.pan + drift
        )
      );

    this.stereoPanner.pan
      .cancelScheduledValues(now);

    this.stereoPanner.pan
      .linearRampToValueAtTime(
        finalPan,
        now + 0.08
      );

    // =====================================================
    // WIDTH CONTROL
    // =====================================================

    const width =
      0.7 +
      (this.width * 0.5);

    this.leftGain.gain
      .cancelScheduledValues(now);

    this.rightGain.gain
      .cancelScheduledValues(now);

    this.leftGain.gain
      .linearRampToValueAtTime(
        width,
        now + 0.08
      );

    this.rightGain.gain
      .linearRampToValueAtTime(
        width,
        now + 0.08
      );

    // =====================================================
    // ATMOSPHERIC DELAY SPREAD
    // =====================================================

    const leftDelayTime =
      0.001 +
      (this.width * 0.006);

    const rightDelayTime =
      0.002 +
      (this.width * 0.008);

    this.leftDelay.delayTime
      .cancelScheduledValues(now);

    this.rightDelay.delayTime
      .cancelScheduledValues(now);

    this.leftDelay.delayTime
      .linearRampToValueAtTime(
        leftDelayTime,
        now + 0.08
      );

    this.rightDelay.delayTime
      .linearRampToValueAtTime(
        rightDelayTime,
        now + 0.08
      );

    // =====================================================
    // DISTANCE DARKENING
    // =====================================================

    const gain =
      1 -
      (this.distance * 0.25);

    this.widthGain.gain
      .cancelScheduledValues(now);

    this.widthGain.gain
      .linearRampToValueAtTime(
        gain,
        now + 0.08
      );
  }

  // =====================================================
  // PARAMETERS
  // =====================================================

  setPan(value) {
    this.pan =
      Math.max(-1, Math.min(1, value));
  }

  setWidth(value) {
    this.width =
      Math.max(0, Math.min(1, value));
  }

  setAirMovement(value) {
    this.airMovement =
      Math.max(0, Math.min(1, value));
  }

  setDistance(value) {
    this.distance =
      Math.max(0, Math.min(1, value));
  }

  setDriftAmount(value) {
    this.driftAmount =
      Math.max(0, Math.min(1, value));
  }

  setWetness(value) {
    this.wetness =
      Math.max(0, Math.min(1, value));
  }

  setDarkness(value) {
    this.darkness =
      Math.max(0, Math.min(1, value));
  }

  randomizePan() {
    this.setPan(
      (Math.random() - 0.5) * 0.6
    );
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

      if (this.splitter) this.splitter.disconnect();
      if (this.merger) this.merger.disconnect();

      if (this.leftGain) this.leftGain.disconnect();
      if (this.rightGain) this.rightGain.disconnect();

      if (this.leftDelay) this.leftDelay.disconnect();
      if (this.rightDelay) this.rightDelay.disconnect();

      if (this.stereoPanner) this.stereoPanner.disconnect();

      if (this.widthGain) this.widthGain.disconnect();

      this.isInitialized = false;

      console.log('[RAIN] StereoField disposed');
    } catch (error) {
      console.warn(
        '[RAIN] StereoField dispose error:',
        error
      );
    }
  }
}