/**
 * expert_rain.js
 * Procedural Acoustic World Simulator
 *
 * AAA architecture:
 * - Pre-rendered buffer pooling
 * - Pitch randomization ("19-20 difference")
 * - Zero runtime filter math during playback
 * - Density-driven scheduling
 *
 * Rain-only engine:
 * - no wind synthesis
 * - no oscillators/FM sweeps
 * - no live BiquadFilterNode creation during playback
 * - all coloration baked into the buffer pool
 */

export default class RainExpert {
  constructor(audioCtx, destinationNode, options = {}) {
    if (!audioCtx) {
      throw new Error("RainExpert requires an AudioContext.");
    }

    this.audioCtx = audioCtx;

    if (destinationNode && destinationNode.context && destinationNode.context !== audioCtx) {
      throw new Error("RainExpert destinationNode must belong to the same AudioContext.");
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

    // Active one-shot nodes for cleanup
    this._activeEvents = new Set();

    // Pre-baked pool buffers
    this.nearPool = [];
    this.farPool = [];

    // Master output chain
    this.outputGain = this.audioCtx.createGain();
    this.outputGain.gain.value = 0.84;

    this.limiter = this.audioCtx.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.knee.value = 10;
    this.limiter.ratio.value = 8;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.12;

    this.outputGain.connect(this.limiter);
    this.limiter.connect(this.destination);

    // Pre-bake buffers once.
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
        return { cutoffMul: 0.92, gainMul: 0.94, densityMul: 0.96 };
      case "indoor":
        return { cutoffMul: 0.84, gainMul: 0.88, densityMul: 0.90 };
      case "vehicle":
        return { cutoffMul: 0.78, gainMul: 0.84, densityMul: 0.88 };
      case "tunnel":
        return { cutoffMul: 0.90, gainMul: 0.92, densityMul: 1.04 };
      case "open":
      default:
        return { cutoffMul: 1.0, gainMul: 1.0, densityMul: 1.0 };
    }
  }

  _normalizeBufferToPool(map, key, bufferFactory, maxVariants = 6) {
    let variants = map.get(key);
    if (!variants) {
      variants = [];
      map.set(key, variants);
    }

    if (variants.length < maxVariants) {
      const buffer = bufferFactory();
      variants.push(buffer);
      return buffer;
    }

    return variants[(Math.random() * variants.length) | 0];
  }

  /* ============================================================
   * Pre-Bake Phase
   * ========================================================== */

  _preBakePools() {
    const intensitySeedsNear = [
      0.10, 0.14, 0.18, 0.22, 0.26,
      0.30, 0.34, 0.38, 0.42, 0.46,
      0.50, 0.56, 0.62, 0.70, 0.78,
    ];

    const intensitySeedsFar = [
      0.35, 0.42, 0.48, 0.55, 0.62,
      0.70, 0.78, 0.86, 0.92, 1.00,
    ];

    for (let i = 0; i < 15; i++) {
      const seed = intensitySeedsNear[i % intensitySeedsNear.length];
      this.nearPool.push(this._makeNearDropBuffer(seed, i));
    }

    for (let i = 0; i < 10; i++) {
      const seed = intensitySeedsFar[i % intensitySeedsFar.length];
      this.farPool.push(this._makeFarClusterBuffer(seed, i));
    }

    this._log(`Pre-baked ${this.nearPool.length} near buffers and ${this.farPool.length} far buffers.`);
  }

  /**
   * Near-field drop:
   * - soft attack
   * - fast decay
   * - no hiss bed
   * - no runtime filtering
   */
  _makeNearDropBuffer(seed = 0.5, variantIndex = 0) {
    const sr = this.audioCtx.sampleRate;
    const dur = this._rand(0.035, 0.090) * this._lerp(0.88, 1.12, seed);
    const length = Math.max(1, Math.floor(sr * dur));
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    const attackMs = this._rand(8, 15);
    const decayMs = this._rand(30, 80);
    const attackSamples = Math.max(1, Math.floor((attackMs / 1000) * sr));
    const decaySamples = Math.max(1, Math.floor((decayMs / 1000) * sr));

    // Baked muffling via a simple one-pole lowpass in sample-gen.
    const lp = this._clamp(this._lerp(0.008, 0.035, seed) + variantIndex * 0.001, 0.008, 0.05);
    let low = 0;
    let softClamp = 0;

    // Slightly different transient shapes across variants.
    const transientCount = this._randInt(1, 3);

    const transientPositions = [];
    for (let t = 0; t < transientCount; t++) {
      transientPositions.push(
        Math.floor(this._rand(0, length * this._lerp(0.08, 0.18, seed)))
      );
    }

    for (let i = 0; i < length; i++) {
      const white = this._rand(-1, 1);

      // Attack / decay envelope.
      let env;
      if (i < attackSamples) {
        env = i / attackSamples;
      } else {
        const d = i - attackSamples;
        env = Math.exp(-d / decaySamples);
      }

      // Lowpass filter baked into the sample.
      low += (white - low) * lp;

      // Tiny, irregular transient snap to preserve "water hit" identity.
      let snap = 0;
      for (let p = 0; p < transientPositions.length; p++) {
        const pos = transientPositions[p];
        const dt = i - pos;
        if (dt >= 0 && dt < 5) {
          snap += (5 - dt) * 0.008;
        }
      }

      // Soft shape: enough texture to read as water, not hiss.
      const shaped = (low * 0.92 + white * 0.08 + snap) * env;

      // Slight nonlinearity for wet impact feel.
      softClamp = shaped * 1.3;
      softClamp = softClamp / (1 + Math.abs(softClamp) * 0.45);

      data[i] = softClamp * this._lerp(0.72, 1.0, seed);
    }

    return buffer;
  }

  /**
   * Far-field cluster:
   * - 3 to 5 rapid overlapping impact ticks baked into one buffer
   * - darker / more diffuse than near drops
   */
  _makeFarClusterBuffer(seed = 0.7, variantIndex = 0) {
    const sr = this.audioCtx.sampleRate;
    const duration = this._rand(0.085, 0.165) * this._lerp(0.92, 1.12, seed);
    const length = Math.max(1, Math.floor(sr * duration));
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    const tickCount = this._clamp(this._randInt(3, 5), 3, 5);
    const tickSpacing = duration / (tickCount + 1);

    // Darker than near drops.
    const lp = this._clamp(this._lerp(0.005, 0.02, seed) + variantIndex * 0.001, 0.005, 0.03);
    let low = 0;

    for (let tick = 0; tick < tickCount; tick++) {
      const center = (tick + 1) * tickSpacing + this._rand(-0.006, 0.006);
      const centerIdx = Math.max(0, Math.floor(center * sr));

      const attackMs = this._rand(8, 15);
      const decayMs = this._rand(30, 80);
      const attackSamples = Math.max(1, Math.floor((attackMs / 1000) * sr));
      const decaySamples = Math.max(1, Math.floor((decayMs / 1000) * sr));

      const tickLength = Math.max(10, Math.floor((this._rand(0.018, 0.040) * sr)));
      const tickGain = this._rand(0.55, 0.92) * this._lerp(0.82, 1.0, seed);

      for (let i = 0; i < tickLength; i++) {
        const idx = centerIdx + i;
        if (idx >= length) break;

        const white = this._rand(-1, 1);
        low += (white - low) * lp;

        let env;
        if (i < attackSamples) {
          env = i / attackSamples;
        } else {
          const d = i - attackSamples;
          env = Math.exp(-d / decaySamples);
        }

        const wet = (low * 0.94 + white * 0.06) * env * tickGain;
        data[idx] += wet;
      }
    }

    // Gentle normalization.
    for (let i = 0; i < length; i++) {
      data[i] *= 0.9;
    }

    return buffer;
  }

  /* ============================================================
   * Density Rules
   * ========================================================== */

  /**
   * Returns target drops/sec across a virtual 1m² field.
   * This hits the requested ranges:
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
    if (intensity < 0.3) return this._lerp(0.72, 0.54, intensity / 0.3);
    if (intensity < 0.6) return this._lerp(0.54, 0.36, (intensity - 0.3) / 0.3);
    if (intensity < 0.8) return this._lerp(0.36, 0.24, (intensity - 0.6) / 0.2);
    return this._lerp(0.24, 0.18, (intensity - 0.8) / 0.2);
  }

  _clusterTickCount(intensity) {
    if (intensity < 0.55) return 3;
    if (intensity < 0.85) return 4;
    return 5;
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

    if (totalRate <= 200) {
      // Low / moderate rain: use only near pool, individual drops.
      const expectedNear = nearRate * frameDur + this._nearResidue;
      const nearCount = Math.floor(expectedNear);
      this._nearResidue = expectedNear - nearCount;

      for (let i = 0; i < nearCount; i++) {
        const t = frameStart + Math.random() * frameDur;
        this._spawnDrop(t, {
          kind: "near",
          intensity,
          totalRate,
          env,
        });
      }

      return;
    }

    // Heavy rain:
    // keep near field discrete (max ~150/sec), and push the rest into far clusters.
    const farDropsEquivalent = Math.max(0, totalRate - nearRate);
    const clusterSize = this._clusterTickCount(intensity);

    const expectedNear = nearRate * frameDur + this._nearResidue;
    const expectedCluster = (farDropsEquivalent / clusterSize) * frameDur + this._farResidue;

    const nearCount = Math.floor(expectedNear);
    const clusterCount = Math.floor(expectedCluster);

    this._nearResidue = expectedNear - nearCount;
    this._farResidue = expectedCluster - clusterCount;

    for (let i = 0; i < nearCount; i++) {
      const t = frameStart + Math.random() * frameDur;
      this._spawnDrop(t, {
        kind: "near",
        intensity,
        totalRate,
        env,
      });
    }

    for (let i = 0; i < clusterCount; i++) {
      const t = frameStart + Math.random() * frameDur;
      this._spawnDrop(t, {
        kind: "far",
        intensity,
        totalRate,
        env,
        clusterSize,
      });
    }
  }

  /* ============================================================
   * Playback
   * ========================================================== */

  _spawnDrop(startTime, { kind, intensity, totalRate, env }) {
    const ctx = this.audioCtx;

    const pool = kind === "near" ? this.nearPool : this.farPool;
    if (!pool.length) return;

    const buffer = pool[(Math.random() * pool.length) | 0];
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // The "19-20 difference"
    source.playbackRate.value = this._clamp(this._rand(0.96, 1.04), 0.9, 1.1);

    const panner = ctx.createStereoPanner();
    panner.pan.value = this._clamp(this._rand(-1, 1), -1, 1);

    const gain = ctx.createGain();

    // Keep overall level stable; density is the perceptual driver.
    const densityComp = 1 / Math.sqrt(1 + totalRate / 240);

    const baseGain =
      kind === "near"
        ? this._rand(0.026, 0.11)
        : this._rand(0.016, 0.075);

    const intensityGain = 0.50 + intensity * 0.50;

    let finalGain = baseGain * densityComp * intensityGain * env.gainMul;
    finalGain = this._clamp(finalGain, 0.0015, 0.16);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(finalGain, startTime + this._rand(0.002, 0.006));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + this._getBufferDuration(buffer, kind));

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
      source.stop(startTime + this._getBufferDuration(buffer, kind) + 0.02);
    } catch (err) {
      this._warn("Drop playback failed:", err);
      this._cleanupEvent(event);
    }
  }

  _getBufferDuration(buffer, kind) {
    if (!buffer) return kind === "near" ? 0.08 : 0.12;
    // duration in seconds from AudioBuffer
    return Math.max(0.03, Math.min(buffer.duration || 0.12, kind === "near" ? 0.14 : 0.18));
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

    // No runtime filtering during playback. This only shapes the master loudness.
    const targetGain = this._clamp(
      0.82 * env.gainMul + intensity * 0.04,
      0.55,
      0.92
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
    this._activeEvents.clear();

    this._log(`Destroyed ${this.id}`);
  }
}
