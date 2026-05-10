/**
 * expert_rain.js
 * Gentle AAA-style procedural rain
 *
 * Design goals:
 * - softer, wetter, less crispy
 * - no runtime filters during playback
 * - pre-rendered buffer pools
 * - subtle pitch/gain randomization
 * - continuous rain wash layer for AAA realism
 *
 * Pool structure:
 * - nearPool: close, soft droplets
 * - farPool: diffuse multi-tick clusters
 * - washPool: very soft continuous rain glue
 */

export default class RainExpert {
  constructor(audioCtx, destinationNode, options = {}) {
    if (!audioCtx) {
      throw new Error("RainExpert requires an AudioContext.");
    }

    if (
      destinationNode &&
      destinationNode.context &&
      destinationNode.context !== audioCtx
    ) {
      throw new Error(
        "RainExpert destinationNode must belong to the same AudioContext."
      );
    }

    this.audioCtx = audioCtx;
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
    this._lookahead = 0.15;
    this._scheduledUntil = 0;

    // Stable conversion residues
    this._nearResidue = 0;
    this._farResidue = 0;
    this._washResidue = 0;

    // Active one-shot nodes
    this._activeEvents = new Set();

    // Pools
    this.nearPool = [];
    this.farPool = [];
    this.washPool = [];

    // Master chain
    this.outputGain = this.audioCtx.createGain();
    this.outputGain.gain.value = 0.74;

    this.limiter = this.audioCtx.createDynamicsCompressor();
    this.limiter.threshold.value = -12;
    this.limiter.knee.value = 12;
    this.limiter.ratio.value = 6;
    this.limiter.attack.value = 0.004;
    this.limiter.release.value = 0.18;

    this.outputGain.connect(this.limiter);
    this.limiter.connect(this.destination);

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

  _pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  _getIntensity() {
    return this._clamp(this.globalPressure * this.localDensity, 0, 1);
  }

  _enclosureTone() {
    switch (this.enclosure) {
      case "umbrella":
        return { gainMul: 0.94, densityMul: 0.96 };
      case "indoor":
        return { gainMul: 0.88, densityMul: 0.90 };
      case "vehicle":
        return { gainMul: 0.84, densityMul: 0.88 };
      case "tunnel":
        return { gainMul: 0.92, densityMul: 1.02 };
      case "open":
      default:
        return { gainMul: 1.0, densityMul: 1.0 };
    }
  }

  /* ============================================================
   * Pre-Bake Phase
   * ========================================================== */

  _preBakePools() {
    const nearSeeds = [
      0.08, 0.11, 0.14, 0.17, 0.20,
      0.23, 0.26, 0.30, 0.34, 0.38,
      0.42, 0.47, 0.53, 0.60, 0.68,
    ];

    const farSeeds = [
      0.28, 0.34, 0.40, 0.46, 0.52,
      0.60, 0.68, 0.76, 0.86, 0.96,
    ];

    const washSeeds = [
      0.10, 0.16, 0.22, 0.30, 0.40, 0.52,
    ];

    for (let i = 0; i < 15; i++) {
      this.nearPool.push(
        this._makeNearDropBuffer(nearSeeds[i], i)
      );
    }

    for (let i = 0; i < 10; i++) {
      this.farPool.push(
        this._makeFarClusterBuffer(farSeeds[i], i)
      );
    }

    for (let i = 0; i < 6; i++) {
      this.washPool.push(
        this._makeWashBuffer(washSeeds[i], i)
      );
    }

    this._log(
      `Pre-baked ${this.nearPool.length} near, ${this.farPool.length} far, ${this.washPool.length} wash buffers.`
    );
  }

  /**
   * Near-field droplet:
   * softer attack, longer decay, very dark baked body.
   */
  _makeNearDropBuffer(seed = 0.2, variantIndex = 0) {
    const sr = this.audioCtx.sampleRate;
    const duration = this._rand(0.085, 0.16) * this._lerp(0.92, 1.06, seed);
    const length = Math.max(1, Math.floor(sr * duration));
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    const attackMs = this._rand(28, 60);
    const decayMs = this._rand(180, 520);
    const attackSamples = Math.max(1, Math.floor((attackMs / 1000) * sr));
    const decaySamples = Math.max(1, Math.floor((decayMs / 1000) * sr));

    // Extremely dark bake to avoid frying-pan brightness.
    const lp = this._clamp(
      this._lerp(0.0018, 0.008, seed) + variantIndex * 0.00025,
      0.0015,
      0.012
    );

    let fast = 0;
    let slow = 0;
    const fastCoeff = this._clamp(this._lerp(0.015, 0.035, seed), 0.01, 0.05);
    const slowCoeff = this._clamp(this._lerp(0.0015, 0.006, seed), 0.001, 0.01);

    const bodyGain = this._lerp(0.42, 0.78, seed);

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

      // Very low high-frequency residue; the body should dominate.
      const dirt = this._rand(-0.002, 0.002) * (1 - i / length);

      const shaped = (slow * 0.985 + fast * 0.015 + dirt) * env;
      const soft = shaped / (1 + Math.abs(shaped) * 0.28);

      data[i] = soft * bodyGain * (0.84 + seed * 0.14);
    }

    return buffer;
  }

  /**
   * Far-field cluster:
   * 3-5 merged ticks baked into one buffer, diffuse and gentle.
   */
  _makeFarClusterBuffer(seed = 0.4, variantIndex = 0) {
    const sr = this.audioCtx.sampleRate;
    const duration = this._rand(0.22, 0.52) * this._lerp(0.90, 1.06, seed);
    const length = Math.max(1, Math.floor(sr * duration));
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    const tickCount = this._clamp(this._randInt(3, 5), 3, 5);
    const tickSpacing = duration / (tickCount + 1);

    const lp = this._clamp(
      this._lerp(0.001, 0.0045, seed) + variantIndex * 0.00018,
      0.001,
      0.006
    );

    for (let tick = 0; tick < tickCount; tick++) {
      const center = (tick + 1) * tickSpacing + this._rand(-0.012, 0.012);
      const centerIdx = Math.max(0, Math.floor(center * sr));

      const attackMs = this._rand(24, 48);
      const decayMs = this._rand(260, 620);
      const attackSamples = Math.max(1, Math.floor((attackMs / 1000) * sr));
      const decaySamples = Math.max(1, Math.floor((decayMs / 1000) * sr));

      const tickLength = Math.max(
        20,
        Math.floor(this._rand(0.08, 0.18) * sr)
      );

      const tickGain = this._rand(0.12, 0.34) * this._lerp(0.74, 0.94, seed);

      let fast = 0;
      let slow = 0;
      const fastCoeff = this._clamp(this._lerp(0.01, 0.03, seed), 0.008, 0.04);
      const slowCoeff = this._clamp(this._lerp(0.001, 0.004, seed), 0.0008, 0.008);

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

        const body = (slow * 0.988 + fast * 0.012) * env;
        const wet = body / (1 + Math.abs(body) * 0.24);

        data[idx] += wet * tickGain;
      }
    }

    for (let i = 0; i < length; i++) {
      data[i] *= 0.94;
    }

    return buffer;
  }

  /**
   * Soft wash layer:
   * a very gentle diffuse background glue for AAA-style rain.
   */
  _makeWashBuffer(seed = 0.2, variantIndex = 0) {
    const sr = this.audioCtx.sampleRate;
    const duration = this._rand(1.8, 4.8) * this._lerp(0.92, 1.06, seed);
    const length = Math.max(1, Math.floor(sr * duration));
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    let a = 0;
    let b = 0;
    let c = 0;

    const coeffA = this._clamp(this._lerp(0.0008, 0.0025, seed), 0.0006, 0.004);
    const coeffB = this._clamp(this._lerp(0.0005, 0.0018, seed), 0.0004, 0.003);
    const coeffC = this._clamp(this._lerp(0.001, 0.0032, seed), 0.0008, 0.004);

    for (let i = 0; i < length; i++) {
      const white1 = this._rand(-1, 1);
      const white2 = this._rand(-1, 1);

      a += (white1 - a) * coeffA;
      b += (a - b) * coeffB;
      c += (white2 - c) * coeffC;

      const t = i / (length - 1);
      const rise = t < 0.12 ? t / 0.12 : 1;
      const fall = t > 0.76 ? (1 - t) / 0.24 : 1;
      const env = Math.pow(this._clamp(Math.min(rise, fall), 0, 1), 0.82);

      const body = (b * 0.68 + c * 0.24 + a * 0.08) * env;
      const soft = body / (1 + Math.abs(body) * 0.22);

      data[i] = soft * this._lerp(0.18, 0.42, seed) * this._lerp(0.96, 1.04, variantIndex / 5);
    }

    return buffer;
  }

  /* ============================================================
   * Density Rules
   * ========================================================== */

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
    return 1000 + 1200 * Math.pow(t, 1.3);
  }

  _nearShare(intensity) {
    if (intensity < 0.3) return this._lerp(0.62, 0.46, intensity / 0.3);
    if (intensity < 0.6) return this._lerp(0.46, 0.28, (intensity - 0.3) / 0.3);
    if (intensity < 0.8) return this._lerp(0.28, 0.18, (intensity - 0.6) / 0.2);
    return this._lerp(0.18, 0.10, (intensity - 0.8) / 0.2);
  }

  _clusterTickCount(intensity) {
    if (intensity < 0.55) return 3;
    if (intensity < 0.85) return 4;
    return 5;
  }

  _washRate(intensity) {
    return 0.20 + Math.pow(intensity, 1.38) * 5.2;
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
    const nearRate = Math.min(90, totalRate * nearShare);
    const farEquivalentRate = Math.max(0, totalRate - nearRate);
    const clusterSize = this._clusterTickCount(intensity);
    const washRate = this._washRate(intensity) * env.densityMul;

    const nearExpected = nearRate * frameDur + this._nearResidue;
    const farExpected = (farEquivalentRate / clusterSize) * frameDur + this._farResidue;
    const washExpected = washRate * frameDur + this._washResidue;

    const nearCount = Math.floor(nearExpected);
    const farCount = Math.floor(farExpected);
    const washCount = Math.floor(washExpected);

    this._nearResidue = nearExpected - nearCount;
    this._farResidue = farExpected - farCount;
    this._washResidue = washExpected - washCount;

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

    // Gentle variation only.
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
      panner.pan.value = this._clamp(this._rand(-0.6, 0.6), -1, 1);
    }

    const gain = ctx.createGain();

    const densityComp = 1 / Math.sqrt(1 + totalRate / 240);
    const intensityGain = 0.40 + intensity * 0.60;

    let baseGain;
    if (kind === "near") {
      baseGain = this._rand(0.006, 0.030);
    } else if (kind === "far") {
      baseGain = this._rand(0.004, 0.016);
    } else {
      baseGain = this._rand(0.0018, 0.008);
    }

    let finalGain = baseGain * densityComp * intensityGain * env.gainMul;
    if (kind === "wash") {
      finalGain *= 0.7;
    }

    finalGain = this._clamp(finalGain, 0.0008, 0.05);

    const attack =
      kind === "wash"
        ? this._rand(0.012, 0.028)
        : kind === "far"
        ? this._rand(0.018, 0.040)
        : this._rand(0.024, 0.060);

    const releaseTail =
      kind === "wash"
        ? this._rand(0.35, 1.10)
        : kind === "far"
        ? this._rand(0.16, 0.52)
        : this._rand(0.10, 0.28);

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
      if (kind === "near") return 0.14;
      if (kind === "far") return 0.32;
      return 3.0;
    }

    return Math.max(
      0.05,
      Math.min(
        buffer.duration || 0.2,
        kind === "near" ? 0.18 : kind === "far" ? 0.52 : 5.0
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
   * Master Tone
   * ========================================================== */

  _applyMasterTone(smooth = false) {
    const intensity = this._getIntensity();
    const env = this._enclosureTone();
    const now = this.audioCtx.currentTime;
    const tc = smooth ? 0.08 : 0.05;

    const targetGain = this._clamp(
      0.70 * env.gainMul + intensity * 0.05,
      0.42,
      0.84
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
