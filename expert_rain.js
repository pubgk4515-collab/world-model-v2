/**
 * expert_rain.js
 * Procedural Acoustic World Simulator
 *
 * Gentle AAA rain rewrite:
 * - Pre-rendered buffer pooling
 * - Slight pitch randomization ("19-20 difference")
 * - Zero runtime filter math during playback
 * - Density-driven scheduling
 * - Softer, darker, less crispy rainfall
 *
 * Rain-only engine:
 * - no wind synthesis
 * - no oscillators/FM sweeps
 * - no live BiquadFilterNode creation during playback
 * - all coloration baked into the buffer pool
 *
 * Additional improvement for gentler rain:
 * - nearPool: softer close drops
 * - farPool: diffuse multi-tick clusters
 * - washPool: subtle atmospheric rain glue layer
 */

export default class RainExpert {
  constructor(audioCtx, destinationNode, options = {}) {
    if (!audioCtx) {
      throw new Error("RainExpert requires an AudioContext.");
    }

    this.audioCtx = audioCtx;

    if (
      destinationNode &&
      destinationNode.context &&
      destinationNode.context !== audioCtx
    ) {
      throw new Error(
        "RainExpert destinationNode must belong to the same AudioContext."
      );
    }

    this.destination = destinationNode || audioCtx.destination;

    this.id =
      globalThis.crypto?.randomUUID?.() ??
      `rain-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    this.debug = !!options.debug;

    this.globalPressure = this._clamp(options.globalPressure ?? 0.5, 0, 1);
    this.localDensity = this._clamp(options.localDensity ?? 0.5, 0, 1);
    this.enclosure = options.enclosure || "open";

    this._destroyed = false;
    this._started = false;

    // Scheduler
    this._scheduler = null;
    this._tickMs = 100;
    this._lookahead = 0.15; // schedule 150ms ahead
    this._scheduledUntil = 0;

    // Residuals for stable density conversion
    this._nearResidue = 0;
    this._farResidue = 0;
    this._washResidue = 0;

    // Active one-shot nodes for cleanup
    this._activeEvents = new Set();

    // Pre-baked pools
    this.nearPool = [];
    this.farPool = [];
    this.washPool = [];

    // Master output chain
    this.outputGain = this.audioCtx.createGain();
    this.outputGain.gain.value = 0.76;

    this.limiter = this.audioCtx.createDynamicsCompressor();
    this.limiter.threshold.value = -12;
    this.limiter.knee.value = 10;
    this.limiter.ratio.value = 6;
    this.limiter.attack.value = 0.004;
    this.limiter.release.value = 0.18;

    this.outputGain.connect(this.limiter);
    this.limiter.connect(this.destination);

    // Pre-bake once.
    this._preBakePools();

    this._applyMasterTone(true);
  }

  /* ============================================================
   * Logging / Helpers
   * ========================================================== */

  _log(...args) {
    if (this.debug) console.log("[RainExpert]", ...args);
  }

  _warn(...args) {
    console.warn("[RainExpert]", ...args);
  }

  _clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  _rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  _randInt(min, max) {
    return Math.floor(this._rand(min, max + 1));
  }

  _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  _poissonDelaySeconds(ratePerSecond) {
    const rate = Math.max(0.2, ratePerSecond);
    return -Math.log(1 - Math.random()) / rate;
  }

  _bucketMs(valueMs, stepMs = 5) {
    return Math.max(stepMs, Math.round(valueMs / stepMs) * stepMs);
  }

  _getIntensity() {
    return this._clamp(this.globalPressure * this.localDensity, 0, 1);
  }

  _enclosureTone() {
    switch (this.enclosure) {
      case "umbrella":
        return { gainMul: 0.92, densityMul: 0.94 };
      case "indoor":
        return { gainMul: 0.84, densityMul: 0.90 };
      case "vehicle":
        return { gainMul: 0.80, densityMul: 0.88 };
      case "tunnel":
        return { gainMul: 0.90, densityMul: 1.02 };
      case "open":
      default:
        return { gainMul: 1.0, densityMul: 1.0 };
    }
  }

  _pick(array) {
    return array[(Math.random() * array.length) | 0];
  }

  /* ============================================================
   * Pre-Bake Phase
   * ========================================================== */

  _preBakePools() {
    const intensitySeedsNear = [
      0.08, 0.12, 0.16, 0.20, 0.24,
      0.28, 0.32, 0.36, 0.40, 0.44,
      0.48, 0.54, 0.60, 0.68, 0.76,
    ];

    const intensitySeedsFar = [
      0.30, 0.38, 0.45, 0.52, 0.60,
      0.68, 0.76, 0.84, 0.92, 1.00,
    ];

    const intensitySeedsWash = [
      0.12, 0.20, 0.28, 0.38, 0.48, 0.60,
    ];

    for (let i = 0; i < 15; i++) {
      const seed = intensitySeedsNear[i % intensitySeedsNear.length];
      this.nearPool.push(this._makeNearDropBuffer(seed, i));
    }

    for (let i = 0; i < 10; i++) {
      const seed = intensitySeedsFar[i % intensitySeedsFar.length];
      this.farPool.push(this._makeFarClusterBuffer(seed, i));
    }

    for (let i = 0; i < 6; i++) {
      const seed = intensitySeedsWash[i % intensitySeedsWash.length];
      this.washPool.push(this._makeWashBuffer(seed, i));
    }

    this._log(
      `Pre-baked ${this.nearPool.length} near buffers, ${this.farPool.length} far buffers, and ${this.washPool.length} wash buffers.`
    );
  }

  /**
   * Near-field drop:
   * - softened transient
   * - darker, wetter body
   * - minimal crispness
   */
  _makeNearDropBuffer(seed = 0.5, variantIndex = 0) {
    const sr = this.audioCtx.sampleRate;

    const dur = this._rand(0.07, 0.14) * this._lerp(0.92, 1.08, seed);
    const length = Math.max(1, Math.floor(sr * dur));
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    const attackMs = this._rand(14, 28);
    const decayMs = this._rand(80, 180);
    const attackSamples = Math.max(1, Math.floor((attackMs / 1000) * sr));
    const decaySamples = Math.max(1, Math.floor((decayMs / 1000) * sr));

    // Softer lowpass bake, much darker than before.
    const lp = this._clamp(
      this._lerp(0.003, 0.018, seed) + variantIndex * 0.0008,
      0.003,
      0.022
    );

    // Two-stage smoothing makes the drop feel wet, not crispy.
    let fast = 0;
    let slow = 0;

    const fastCoeff = this._clamp(this._lerp(0.035, 0.075, seed), 0.02, 0.10);
    const slowCoeff = this._clamp(this._lerp(0.004, 0.014, seed), 0.003, 0.018);

    // Gentle variation so the 15 pooled drops don't collapse into identical timbres.
    const bodyGain = this._lerp(0.60, 0.92, seed);

    for (let i = 0; i < length; i++) {
      const white = this._rand(-1, 1);

      let env;
      if (i < attackSamples) {
        env = i / attackSamples;
      } else {
        const d = i - attackSamples;
        env = Math.exp(-d / decaySamples);
      }

      fast += (white - fast) * fastCoeff;
      slow += (fast - slow) * slowCoeff;

      // Very subtle short-range irregularity, kept much lower than before.
      const micro = this._rand(-0.006, 0.006) * (1 - i / length);

      // Very small high component; most energy lives in the low / mid body.
      const shaped = (slow * 0.95 + fast * 0.05 + micro) * env;

      // Extra softening to remove the frying-pan edge.
      const soft = shaped / (1 + Math.abs(shaped) * 0.38);

      data[i] = soft * bodyGain * (0.82 + seed * 0.18);
    }

    return buffer;
  }

  /**
   * Far-field cluster:
   * - 3 to 5 rapid overlapping impact ticks baked into one buffer
   * - dark, diffuse, and smeared
   */
  _makeFarClusterBuffer(seed = 0.7, variantIndex = 0) {
    const sr = this.audioCtx.sampleRate;

    const duration = this._rand(0.18, 0.36) * this._lerp(0.92, 1.08, seed);
    const length = Math.max(1, Math.floor(sr * duration));
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    const tickCount = this._clamp(this._randInt(3, 5), 3, 5);
    const tickSpacing = duration / (tickCount + 1);

    const lp = this._clamp(
      this._lerp(0.0015, 0.008, seed) + variantIndex * 0.0005,
      0.0015,
      0.010
    );

    for (let tick = 0; tick < tickCount; tick++) {
      const center = (tick + 1) * tickSpacing + this._rand(-0.01, 0.01);
      const centerIdx = Math.max(0, Math.floor(center * sr));

      const attackMs = this._rand(16, 32);
      const decayMs = this._rand(120, 240);
      const attackSamples = Math.max(1, Math.floor((attackMs / 1000) * sr));
      const decaySamples = Math.max(1, Math.floor((decayMs / 1000) * sr));

      const tickLength = Math.max(
        16,
        Math.floor(this._rand(0.05, 0.12) * sr)
      );

      const tickGain = this._rand(0.22, 0.52) * this._lerp(0.76, 0.95, seed);

      let fast = 0;
      let slow = 0;
      const fastCoeff = this._clamp(this._lerp(0.02, 0.05, seed), 0.015, 0.06);
      const slowCoeff = this._clamp(this._lerp(0.002, 0.008, seed), 0.0015, 0.01);

      for (let i = 0; i < tickLength; i++) {
        const idx = centerIdx + i;
        if (idx >= length) break;

        const white = this._rand(-1, 1);

        let env;
        if (i < attackSamples) {
          env = i / attackSamples;
        } else {
          const d = i - attackSamples;
          env = Math.exp(-d / decaySamples);
        }

        fast += (white - fast) * fastCoeff;
        slow += (fast - slow) * slowCoeff;

        const body = (slow * 0.97 + fast * 0.03) * env;
        const wet = body / (1 + Math.abs(body) * 0.34);

        data[idx] += wet * tickGain;
      }
    }

    for (let i = 0; i < length; i++) {
      data[i] *= 0.92;
    }

    return buffer;
  }

  /**
   * Wash buffer:
   * - subtle diffuse rain glue
   * - very soft, very dark
   * - no hiss, no sharp transient
   */
  _makeWashBuffer(seed = 0.4, variantIndex = 0) {
    const sr = this.audioCtx.sampleRate;

    const duration = this._rand(1.6, 3.8) * this._lerp(0.92, 1.08, seed);
    const length = Math.max(1, Math.floor(sr * duration));
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    let a = 0;
    let b = 0;
    let c = 0;

    const coeffA = this._clamp(this._lerp(0.0012, 0.004, seed), 0.001, 0.006);
    const coeffB = this._clamp(this._lerp(0.0008, 0.0025, seed), 0.0006, 0.004);
    const coeffC = this._clamp(this._lerp(0.0018, 0.005, seed), 0.0015, 0.006);

    for (let i = 0; i < length; i++) {
      const white1 = this._rand(-1, 1);
      const white2 = this._rand(-1, 1);

      a += (white1 - a) * coeffA;
      b += (a - b) * coeffB;
      c += (white2 - c) * coeffC;

      const t = i / (length - 1);
      const rise = t < 0.12 ? t / 0.12 : 1;
      const fall = t > 0.72 ? (1 - t) / 0.28 : 1;
      const env = Math.pow(this._clamp(Math.min(rise, fall), 0, 1), 0.72);

      const body = (b * 0.62 + c * 0.28 + a * 0.10) * env;
      const soft = body / (1 + Math.abs(body) * 0.30);

      // Very low-level texture; this is glue, not a foreground event.
      data[i] = soft * this._lerp(0.28, 0.55, seed) * this._lerp(0.96, 1.04, variantIndex / 5);
    }

    return buffer;
  }

  /* ============================================================
   * Density Rules
   * ========================================================== */

  /**
   * Returns target drops/sec across a virtual 1m² field.
   * This keeps the same overall density expectation:
   * - light rain: 50..150
   * - moderate rain: 300..500 around 0.5
   * - heavy rain: 1000+
   */
  _dropRate(intensity) {
    if (intensity <= 0.001) return 0;

    if (intensity < 0.3) {
      const t = intensity / 0.3;
      return 50 + 100 * t; // 50..150
    }

    if (intensity < 0.6) {
      const t = (intensity - 0.3) / 0.3;
      return 150 + 350 * t; // 150..500
    }

    if (intensity < 0.8) {
      const t = (intensity - 0.6) / 0.2;
      return 500 + 500 * t; // 500..1000
    }

    const t = (intensity - 0.8) / 0.2;
    return 1000 + 1200 * Math.pow(t, 1.3); // 1000+
  }

  _nearShare(intensity) {
    if (intensity < 0.3) return this._lerp(0.68, 0.50, intensity / 0.3);
    if (intensity < 0.6) return this._lerp(0.50, 0.32, (intensity - 0.3) / 0.3);
    if (intensity < 0.8) return this._lerp(0.32, 0.22, (intensity - 0.6) / 0.2);
    return this._lerp(0.22, 0.12, (intensity - 0.8) / 0.2);
  }

  _clusterTickCount(intensity) {
    if (intensity < 0.55) return 3;
    if (intensity < 0.85) return 4;
    return 5;
  }

  _washRate(intensity) {
    // Gentle diffuse background wash that smooths out the "frying pan" character.
    return 0.12 + Math.pow(intensity, 1.45) * 4.0;
  }

  /* ============================================================
   * Scheduler
   * ========================================================== */

  async start() {
    if (this._destroyed || this._started) return;
    this._started = true;

    try {
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }
    } catch (err) {
      this._warn("AudioContext resume failed:", err);
    }

    this._scheduledUntil = this.audioCtx.currentTime;
    this._scheduler = setInterval(() => this._schedulerTick(), this._tickMs);

    this._applyMasterTone(true);
    this._log("Started");
  }

  stop() {
    this._started = false;

    if (this._scheduler) {
      clearInterval(this._scheduler);
      this._scheduler = null;
    }

    this._log("Stopped");
  }

  _schedulerTick() {
    if (this._destroyed || !this._started) return;

    const now = this.audioCtx.currentTime;
    const horizon = now + this._lookahead;

    if (this._scheduledUntil < now) {
      this._scheduledUntil = now;
    }

    while (this._scheduledUntil < horizon) {
      const frameStart = this._scheduledUntil;
      const frameEnd = Math.min(horizon, frameStart + this._lookahead);
      const frameDur = Math.max(0, frameEnd - frameStart);

      if (frameDur <= 0) break;

      this._scheduleFrame(frameStart, frameDur);
      this._scheduledUntil = frameEnd;
    }
  }

  _scheduleFrame(frameStart, frameDur) {
    const intensity = this._getIntensity();
    const env = this._enclosureTone();
    const totalRate = this._dropRate(intensity) * env.densityMul;

    if (totalRate <= 0) return;

    const nearShare = this._nearShare(intensity);
    const nearRate = Math.min(150, totalRate * nearShare);
    const farEquivalentRate = Math.max(0, totalRate - nearRate);
    const clusterSize = this._clusterTickCount(intensity);
    const washRate = this._washRate(intensity) * env.densityMul;

    // Near-field and far-field counts
    const nearExpected = nearRate * frameDur + this._nearResidue;
    const farExpected = (farEquivalentRate / clusterSize) * frameDur + this._farResidue;
    const washExpected = washRate * frameDur + this._washResidue;

    const nearCount = Math.floor(nearExpected);
    const farCount = Math.floor(farExpected);
    const washCount = Math.floor(washExpected);

    this._nearResidue = nearExpected - nearCount;
    this._farResidue = farExpected - farCount;
    this._washResidue = washExpected - washCount;

    // Low / moderate rain: near drops plus subtle wash.
    // Heavy rain: near drops, far clusters, and wash all together.
    for (let i = 0; i < nearCount; i++) {
      const t = frameStart + Math.random() * frameDur;
      this._spawnDrop(t, {
        kind: "near",
        intensity,
        totalRate,
        env,
      });
    }

    if (totalRate > 200) {
      for (let i = 0; i < farCount; i++) {
        const t = frameStart + Math.random() * frameDur;
        this._spawnDrop(t, {
          kind: "far",
          intensity,
          totalRate,
          env,
        });
      }
    }

    for (let i = 0; i < washCount; i++) {
      const t = frameStart + Math.random() * frameDur;
      this._spawnDrop(t, {
        kind: "wash",
        intensity,
        totalRate,
        env,
      });
    }
  }

  /* ============================================================
   * Playback
   * ========================================================== */

  _spawnDrop(startTime, { kind, intensity, totalRate, env }) {
    const ctx = this.audioCtx;

    let pool;
    if (kind === "near") pool = this.nearPool;
    else if (kind === "far") pool = this.farPool;
    else pool = this.washPool;

    if (!pool.length) return;

    const buffer = this._pick(pool);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Slight playback variation only; no extra DSP during playback.
    if (kind === "near") {
      source.playbackRate.value = this._clamp(this._rand(0.985, 1.015), 0.95, 1.05);
    } else if (kind === "far") {
      source.playbackRate.value = this._clamp(this._rand(0.99, 1.01), 0.96, 1.04);
    } else {
      source.playbackRate.value = this._clamp(this._rand(0.995, 1.005), 0.97, 1.03);
    }

    const panner = ctx.createStereoPanner();
    if (kind === "near") {
      panner.pan.value = this._clamp(this._rand(-1, 1), -1, 1);
    } else if (kind === "far") {
      panner.pan.value = this._clamp(this._rand(-0.9, 0.9), -1, 1);
    } else {
      panner.pan.value = this._clamp(this._rand(-0.7, 0.7), -1, 1);
    }

    const gain = ctx.createGain();

    const densityComp = 1 / Math.sqrt(1 + totalRate / 240);
    const intensityGain = 0.42 + intensity * 0.58;

    let baseGain;
    if (kind === "near") {
      baseGain = this._rand(0.010, 0.055);
    } else if (kind === "far") {
      baseGain = this._rand(0.006, 0.028);
    } else {
      baseGain = this._rand(0.0035, 0.015);
    }

    let finalGain = baseGain * densityComp * intensityGain * env.gainMul;
    if (kind === "wash") {
      finalGain *= 0.8;
    }

    finalGain = this._clamp(finalGain, 0.001, 0.08);

    const attack = kind === "wash" ? this._rand(0.008, 0.016) : this._rand(0.004, 0.012);
    const releaseTail =
      kind === "wash"
        ? this._rand(0.20, 0.60)
        : kind === "far"
        ? this._rand(0.06, 0.16)
        : this._rand(0.04, 0.12);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(finalGain, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + this._getBufferDuration(buffer, kind) + releaseTail
    );

    source.connect(panner);
    panner.connect(gain);
    gain.connect(this.outputGain);

    const event = {
      source,
      panner,
      gain,
      cleaned: false,
    };

    this._activeEvents.add(event);

    source.onended = () => {
      this._cleanupEvent(event);
    };

    try {
      source.start(startTime);
      source.stop(startTime + this._getBufferDuration(buffer, kind) + releaseTail + 0.02);
    } catch (err) {
      this._warn("Drop playback failed:", err);
      this._cleanupEvent(event);
    }
  }

  _getBufferDuration(buffer, kind) {
    if (!buffer) {
      if (kind === "near") return 0.1;
      if (kind === "far") return 0.2;
      return 1.4;
    }

    return Math.max(
      0.03,
      Math.min(
        buffer.duration || 0.12,
        kind === "near" ? 0.16 : kind === "far" ? 0.36 : 4.0
      )
    );
  }

  _cleanupEvent(event) {
    if (!event || event.cleaned) return;
    event.cleaned = true;

    try {
      event.source?.disconnect?.();
    } catch (_) {}

    try {
      event.panner?.disconnect?.();
    } catch (_) {}

    try {
      event.gain?.disconnect?.();
    } catch (_) {}

    this._activeEvents.delete(event);
  }

  /* ============================================================
   * Tone / Master
   * ========================================================== */

  _applyMasterTone(smooth = false) {
    const intensity = this._getIntensity();
    const env = this._enclosureTone();
    const now = this.audioCtx.currentTime;
    const tc = smooth ? 0.08 : 0.05;

    // Output gain remains conservative; density should be perceived,
    // not simply louder.
    const targetGain = this._clamp(
      0.74 * env.gainMul + intensity * 0.05,
      0.48,
      0.88
    );

    this.outputGain.gain.setTargetAtTime(targetGain, now, tc);
  }

  /* ============================================================
   * World State
   * ========================================================== */

  onWorldStateUpdate(state) {
    if (!state) return;

    if (typeof state.atmosphericPressure === "number") {
      this.globalPressure = this._clamp(state.atmosphericPressure, 0, 1);
    }

    if (typeof state.rainIntensity === "number") {
      this.globalPressure = this._clamp(state.rainIntensity, 0, 1);
    }

    if (typeof state?.weather?.rainIntensity === "number") {
      this.globalPressure = this._clamp(state.weather.rainIntensity, 0, 1);
    }

    if (typeof state?.listener?.enclosure === "string") {
      this.enclosure = state.listener.enclosure;
    } else if (typeof state.enclosure === "string") {
      this.enclosure = state.enclosure;
    }

    this._applyMasterTone(true);
  }

  /* ============================================================
   * UI
   * ========================================================== */

  getUICard() {
    return `
      <article class="expert-card glass-card" data-id="${this.id}">
        <h3 style="font-size:1rem; margin-bottom:12px; color:rgba(255,255,255,0.9); font-weight:600;">
          Rain Expert
        </h3>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:0.75rem; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:0.05em;">
            Density
          </label>
          <input
            type="range"
            class="density-slider"
            min="0"
            max="1"
            step="0.01"
            value="${this.localDensity.toFixed(2)}"
            style="width:100%;"
          >
        </div>

        <button class="remove-btn"
          style="
            margin-top:16px;
            width:100%;
            background:rgba(255,255,255,0.06);
            border:1px solid rgba(255,255,255,0.1);
            color:rgba(255,255,255,0.8);
            padding:10px 12px;
            border-radius:14px;
            font-size:0.85rem;
            font-weight:500;
            cursor:pointer;
          ">
          Remove Expert
        </button>
      </article>
    `;
  }

  bindCardControls(card) {
    if (!card) return;

    const slider = card.querySelector(".density-slider");
    const removeBtn = card.querySelector(".remove-btn");

    if (slider) {
      slider.addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        this.localDensity = this._clamp(value, 0, 1);
        this._applyMasterTone(true);
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        this.destroy();
        card.remove();
      });
    }

    this._applyMasterTone(true);
    this.start().catch((err) => this._warn("Start failed:", err));
  }

  /* ============================================================
   * Destroy
   * ========================================================== */

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this.stop();

    for (const ev of [...this._activeEvents]) {
      this._cleanupEvent(ev);
      try {
        ev.source?.stop?.();
      } catch (_) {}
    }

    try {
      this.outputGain.disconnect();
    } catch (_) {}

    try {
      this.limiter.disconnect();
    } catch (_) {}

    this.nearPool.length = 0;
    this.farPool.length = 0;
    this.washPool.length = 0;
    this._activeEvents.clear();

    this._log(`Destroyed ${this.id}`);
  }
}
