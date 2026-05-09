/**
 * expert_rain.js
 * Procedural Acoustic World Simulator
 *
 * Rain-only engine built around precipitation density, not hiss.
 *
 * Design rules:
 * - No wind synthesis
 * - No oscillators / FM sweeps
 * - No continuous noise bed
 * - No high-pass static
 * - Heavy rain emerges from many short water-impact events
 *
 * Core model:
 * - Intensity I = globalPressure * localDensity
 * - D(I) = target drops per second over a virtual 1m² field
 * - Near field (< 0.4 distance): individual drops only
 * - Far field (> 0.4 distance): clustered micro-impact buffers when density is high
 * - Scheduler runs every 100ms and plans the next 150ms of audio
 */

export default class RainExpert {
  constructor(audioCtx, destinationNode, options = {}) {
    if (!audioCtx) {
      throw new Error("RainExpert requires an AudioContext.");
    }

    this.audioCtx = audioCtx;
    this.destination = destinationNode || audioCtx.destination;

    this.id =
      globalThis.crypto?.randomUUID?.() ??
      `rain-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    this.debug = !!options.debug;

    // World state inputs
    this.globalPressure = this._clamp(options.globalPressure ?? 0.5, 0, 1);
    this.localDensity = this._clamp(options.localDensity ?? 0.5, 0, 1);
    this.enclosure = options.enclosure || "open";

    // Lifecycle
    this._destroyed = false;
    this._started = false;

    // Scheduler
    this._scheduler = null;
    this._lookahead = 0.15; // 150ms window
    this._tickMs = 100; // setInterval every 100ms
    this._scheduledUntil = 0;

    // Residual accumulators for stable rate conversion
    this._nearResidue = 0;
    this._clusterResidue = 0;
    this._farResidue = 0;

    // Active one-shot events for cleanup
    this._activeEvents = new Set();

    // Small buffer caches to reduce repeated synthesis cost
    this._dropBufferCache = new Map();     // key -> [AudioBuffer...]
    this._clusterBufferCache = new Map();  // key -> [AudioBuffer...]
    this._cacheVariantLimit = 6;

    // Master output and safety limiter
    this.outputGain = this.audioCtx.createGain();
    this.outputGain.gain.value = 0.85;

    this.limiter = this.audioCtx.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.knee.value = 10;
    this.limiter.ratio.value = 8;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.12;

    this.outputGain.connect(this.limiter);
    this.limiter.connect(this.destination);

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

  _poissonDelaySeconds(ratePerSecond) {
    const rate = Math.max(0.2, ratePerSecond);
    return -Math.log(1 - Math.random()) / rate;
  }

  _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  _getIntensity() {
    return this._clamp(this.globalPressure * this.localDensity, 0, 1);
  }

  _bucketMs(valueMs, stepMs = 5) {
    return Math.max(stepMs, Math.round(valueMs / stepMs) * stepMs);
  }

  _getCachedVariant(map, key, factory) {
    let variants = map.get(key);
    if (!variants) {
      variants = [];
      map.set(key, variants);
    }

    if (variants.length < this._cacheVariantLimit) {
      const buffer = factory();
      variants.push(buffer);
      return buffer;
    }

    return variants[(Math.random() * variants.length) | 0];
  }

  /* ============================================================
   * Public Lifecycle
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
    this._scheduler = setInterval(() => this._pumpScheduler(), this._tickMs);

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

    this._activeEvents.clear();
    this._dropBufferCache.clear();
    this._clusterBufferCache.clear();

    this._log(`Destroyed ${this.id}`);
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
   * Rain Physics
   * ========================================================== */

  /**
   * Drops/sec over a virtual 1m² field.
   * Piecewise mapping to satisfy the requested density ranges.
   */
  _dropRate(intensity) {
    if (intensity <= 0.001) return 0;

    if (intensity < 0.3) {
      const t = intensity / 0.3;
      return 50 + 100 * t; // 50..150
    }

    if (intensity < 0.6) {
      const t = (intensity - 0.3) / 0.3;
      return 150 + 300 * t; // 150..450
    }

    if (intensity < 0.8) {
      const t = (intensity - 0.6) / 0.2;
      return 450 + 550 * t; // 450..1000
    }

    const t = (intensity - 0.8) / 0.2;
    return 1000 + 450 * Math.pow(t, 1.2); // 1000..1450+
  }

  /**
   * Near-field share decreases as density rises.
   * Heavy rain should mostly become far-field clustered texture.
   */
  _nearShare(intensity) {
    if (intensity < 0.3) {
      return this._lerp(0.68, 0.50, intensity / 0.3);
    }

    if (intensity < 0.6) {
      return this._lerp(0.50, 0.32, (intensity - 0.3) / 0.3);
    }

    if (intensity < 0.8) {
      return this._lerp(0.32, 0.23, (intensity - 0.6) / 0.2);
    }

    return this._lerp(0.23, 0.17, (intensity - 0.8) / 0.2);
  }

  _clusterTickCount(intensity) {
    if (intensity < 0.55) return 3;
    if (intensity < 0.85) return 4;
    return 5;
  }

  _enclosureTone() {
    switch (this.enclosure) {
      case "umbrella":
        return { cutoffMul: 0.86, gainMul: 0.90, decayMul: 1.02 };
      case "indoor":
        return { cutoffMul: 0.72, gainMul: 0.80, decayMul: 1.06 };
      case "vehicle":
        return { cutoffMul: 0.65, gainMul: 0.75, decayMul: 1.04 };
      case "tunnel":
        return { cutoffMul: 0.82, gainMul: 0.86, decayMul: 1.08 };
      case "open":
      default:
        return { cutoffMul: 1.0, gainMul: 1.0, decayMul: 1.0 };
    }
  }

  _applyMasterTone(smooth = false) {
    const intensity = this._getIntensity();
    const env = this._enclosureTone();
    const now = this.audioCtx.currentTime;
    const tc = smooth ? 0.08 : 0.05;

    // Rain should not become louder just because it gets denser.
    // Density is controlled by event count; output gain stays fairly stable.
    const targetGain = this._clamp(
      0.84 * env.gainMul + intensity * 0.02,
      0.55,
      0.92
    );

    this.outputGain.gain.setTargetAtTime(targetGain, now, tc);
  }

  _pumpScheduler() {
    if (this._destroyed || !this._started) return;

    const now = this.audioCtx.currentTime;
    const horizon = now + this._lookahead;

    if (this._scheduledUntil < now) {
      this._scheduledUntil = now;
    }

    if (this._scheduledUntil >= horizon) return;

    const frameStart = this._scheduledUntil;
    const frameDur = horizon - frameStart;

    if (frameDur <= 0) return;

    this._scheduleFrame(frameStart, frameDur);
    this._scheduledUntil = horizon;
  }

  _scheduleFrame(frameStart, frameDur) {
    const intensity = this._getIntensity();
    const totalRate = this._dropRate(intensity);

    if (totalRate <= 0) return;

    const nearShare = this._nearShare(intensity);

    if (totalRate <= 200) {
      // Low / moderate rain:
      // all events are individual drops, split between near and far strata.
      const nearRate = Math.min(150, totalRate * nearShare);
      const farRate = Math.max(0, totalRate - nearRate);

      const nearExpected = nearRate * frameDur + this._nearResidue;
      const farExpected = farRate * frameDur + this._farResidue;

      const nearCount = Math.floor(nearExpected);
      const farCount = Math.floor(farExpected);

      this._nearResidue = nearExpected - nearCount;
      this._farResidue = farExpected - farCount;

      for (let i = 0; i < nearCount; i++) {
        const t = frameStart + Math.random() * frameDur;
        this._spawnIndividualDrop(t, {
          intensity,
          totalRate,
          distance: Math.random() * 0.4,
          near: true,
        });
      }

      for (let i = 0; i < farCount; i++) {
        const t = frameStart + Math.random() * frameDur;
        this._spawnIndividualDrop(t, {
          intensity,
          totalRate,
          distance: 0.4 + Math.random() * 0.6,
          near: false,
        });
      }

      return;
    }

    // Heavy rain:
    // near field remains discrete (max ~150/sec),
    // far field becomes cluster-based to simulate massive density safely.
    const nearRate = Math.min(150, totalRate * nearShare);
    const farEquivalentRate = Math.max(0, totalRate - nearRate);
    const clusterSize = this._clusterTickCount(intensity);
    const clusterRate = farEquivalentRate / clusterSize;

    const nearExpected = nearRate * frameDur + this._nearResidue;
    const clusterExpected = clusterRate * frameDur + this._clusterResidue;

    const nearCount = Math.floor(nearExpected);
    const clusterCount = Math.floor(clusterExpected);

    this._nearResidue = nearExpected - nearCount;
    this._clusterResidue = clusterExpected - clusterCount;

    // Near-field: discrete drops only.
    for (let i = 0; i < nearCount; i++) {
      const t = frameStart + Math.random() * frameDur;
      this._spawnIndividualDrop(t, {
        intensity,
        totalRate,
        distance: Math.random() * 0.4,
        near: true,
      });
    }

    // Far-field: clustered micro-impact buffers.
    for (let i = 0; i < clusterCount; i++) {
      const t = frameStart + Math.random() * frameDur;
      this._spawnCluster(t, {
        intensity,
        totalRate,
        distance: 0.4 + Math.random() * 0.6,
        clusterSize,
      });
    }
  }

  /* ============================================================
   * Individual Drops
   * ========================================================== */

  _spawnIndividualDrop(startTime, { intensity, totalRate, distance, near }) {
    const ctx = this.audioCtx;
    const env = this._enclosureTone();

    // Ideal drop envelope:
    // attack 8-15ms, decay 30-80ms
    const attack = this._rand(0.008, 0.015);
    const decay = this._rand(0.03, 0.08) * env.decayMul;
    const duration = attack + decay + this._rand(0.005, 0.015);

    // Buffer is a shaped white-noise burst.
    const buffer = this._getDropBuffer(duration, near ? "near" : "far");

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = this._clamp(this._rand(0.96, 1.04), 0.9, 1.1);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";

    // Randomized surface filter in the requested 800Hz..2000Hz band.
    const distT = this._clamp(distance, 0, 1);
    const baseCut = this._lerp(2000, 800, distT);
    const modCut = baseCut * this._rand(0.9, 1.1) * env.cutoffMul;
    lowpass.frequency.value = this._clamp(modCut, 800, 2000);
    lowpass.Q.value = this._rand(0.55, 0.92);

    const panner = ctx.createStereoPanner();
    panner.pan.value = this._clamp(this._rand(-1, 1), -1, 1);

    const gain = ctx.createGain();

    // Density scaling: more rain => more nodes, but each node slightly quieter.
    const densityComp = 1 / Math.sqrt(1 + totalRate / 220);
    const distanceComp = this._clamp(1 - distT * 0.68, 0.25, 1.0);

    const peak =
      (near ? this._rand(0.028, 0.11) : this._rand(0.018, 0.075)) *
      densityComp *
      distanceComp *
      (0.55 + intensity * 0.45) *
      env.gainMul;

    const finalPeak = this._clamp(peak, 0.0025, 0.18);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(finalPeak, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(lowpass);
    lowpass.connect(panner);
    panner.connect(gain);
    gain.connect(this.outputGain);

    const event = {
      source,
      lowpass,
      panner,
      gain,
      cleaned: false,
    };

    this._activeEvents.add(event);

    source.onended = () => {
      this._cleanupEvent(event);
    };

    source.start(startTime);
    source.stop(startTime + duration + 0.02);
  }

  /* ============================================================
   * Far-Field Cluster
   * ========================================================== */

  _spawnCluster(startTime, { intensity, totalRate, distance, clusterSize }) {
    const ctx = this.audioCtx;
    const env = this._enclosureTone();

    // A cluster node should still feel like rain,
    // not like a machine-gun or hiss.
    const ticks = this._clusterTickCount(intensity);
    const attack = this._rand(0.008, 0.015);
    const decay = this._rand(0.03, 0.08) * env.decayMul;
    const duration = this._clamp(attack + decay + this._rand(0.008, 0.02), 0.045, 0.14);

    const buffer = this._getClusterBuffer(duration, ticks, intensity);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = this._clamp(this._rand(0.98, 1.03), 0.9, 1.1);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";

    // Far-field clusters are darker and softer than near drops.
    const baseCut = this._lerp(1600, 900, this._clamp(intensity, 0, 1));
    const modCut = baseCut * this._rand(0.85, 1.0) * env.cutoffMul;
    lowpass.frequency.value = this._clamp(modCut, 800, 2000);
    lowpass.Q.value = this._rand(0.5, 0.82);

    const panner = ctx.createStereoPanner();
    panner.pan.value = this._clamp(this._rand(-1, 1), -1, 1);

    const gain = ctx.createGain();

    const densityComp = 1 / Math.sqrt(1 + totalRate / 220);
    const clusterStrength = this._clamp(0.018 + intensity * 0.07, 0.015, 0.11);

    // A cluster node represents 3-5 rapid impact ticks,
    // so its audible peak can be slightly stronger than a single drop,
    // but still safely controlled.
    const finalPeak = this._clamp(
      clusterStrength *
        densityComp *
        (0.78 + ticks * 0.08) *
        this._rand(0.82, 1.18) *
        env.gainMul,
      0.002,
      0.14
    );

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(finalPeak, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(lowpass);
    lowpass.connect(panner);
    panner.connect(gain);
    gain.connect(this.outputGain);

    const event = {
      source,
      lowpass,
      panner,
      gain,
      cleaned: false,
    };

    this._activeEvents.add(event);

    source.onended = () => {
      this._cleanupEvent(event);
    };

    source.start(startTime);
    source.stop(startTime + duration + 0.02);
  }

  _cleanupEvent(event) {
    if (!event || event.cleaned) return;
    event.cleaned = true;

    try {
      event.source?.disconnect?.();
    } catch (_) {}

    try {
      event.lowpass?.disconnect?.();
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
   * Buffer Synthesis
   * ========================================================== */

  _getDropBuffer(duration, kind = "near") {
    const durMs = this._bucketMs(duration * 1000, 5);
    const key = `drop:${kind}:${durMs}`;

    return this._getCachedVariant(this._dropBufferCache, key, () =>
      this._makeDropBuffer(durMs / 1000, kind)
    );
  }

  _getClusterBuffer(duration, ticks, intensity) {
    const durMs = this._bucketMs(duration * 1000, 10);
    const key = `cluster:${durMs}:${ticks}:${Math.round(intensity * 4)}`;

    return this._getCachedVariant(this._clusterBufferCache, key, () =>
      this._makeClusterBuffer(durMs / 1000, ticks, intensity)
    );
  }

  _makeDropBuffer(durationSec, kind) {
    const sr = this.audioCtx.sampleRate;
    const length = Math.max(1, Math.floor(sr * durationSec));
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    // Slightly different smoothing for near vs far to avoid identical texture.
    const smoothing =
      kind === "near" ? 0.935 : kind === "far" ? 0.96 : 0.95;

    const attackSec = this._clamp(durationSec * 0.18, 0.008, 0.015);
    const decaySec = this._clamp(durationSec * 0.62, 0.03, 0.08);

    const attackSamples = Math.max(1, Math.floor(attackSec * sr));
    const decaySamples = Math.max(1, Math.floor(decaySec * sr));

    let state = this._rand(-1, 1);
    const amp = kind === "near" ? 0.9 : 0.78;

    for (let i = 0; i < length; i++) {
      const white = this._rand(-1, 1);
      state = state * smoothing + white * (1 - smoothing);

      let env;
      if (i < attackSamples) {
        env = i / attackSamples;
      } else {
        const d = i - attackSamples;
        env = Math.exp(-d / decaySamples);
      }

      // Slight curvature to keep it wet and not plasticky.
      const curve = Math.pow(env, 0.92);

      data[i] = state * curve * amp;
    }

    return buffer;
  }

  _makeClusterBuffer(durationSec, ticks, intensity) {
    const sr = this.audioCtx.sampleRate;
    const length = Math.max(1, Math.floor(sr * durationSec));
    const buffer = this.audioCtx.createBuffer(1, length, sr);
    const data = buffer.getChannelData(0);

    // Cluster is a handful of rapid impacts that merge perceptually.
    // 3-5 ticks is enough to imply far-field density without node explosion.
    const spacing = durationSec / (ticks + 1);
    const clusterScale = this._clamp(0.85 / Math.max(1, ticks), 0.12, 0.28);

    for (let t = 0; t < ticks; t++) {
      const center = (t + 1) * spacing + this._rand(-0.004, 0.004);
      const start = Math.max(0, Math.floor(center * sr));

      const tickDuration = this._clamp(
        this._rand(0.006, 0.018) + intensity * 0.004,
        0.006,
        0.022
      );

      const tickLength = Math.max(8, Math.floor(tickDuration * sr));
      const tickAttack = Math.max(1, Math.floor(this._rand(0.002, 0.0045) * sr));
      const tickDecay = Math.max(1, Math.floor(this._rand(0.008, 0.018) * sr));

      let state = this._rand(-1, 1);
      const smoothing = this._rand(0.91, 0.96);
      const tickAmp = clusterScale * this._rand(0.75, 1.2);

      for (let i = 0; i < tickLength; i++) {
        const idx = start + i;
        if (idx >= length) break;

        const white = this._rand(-1, 1);
        state = state * smoothing + white * (1 - smoothing);

        let env;
        if (i < tickAttack) {
          env = i / tickAttack;
        } else {
          const d = i - tickAttack;
          env = Math.exp(-d / tickDecay);
        }

        const curve = Math.pow(env, 0.9);
        data[idx] += state * curve * tickAmp;
      }
    }

    // Extra low-level normalization so cluster buffers do not spike.
    for (let i = 0; i < length; i++) {
      data[i] *= 0.92;
    }

    return buffer;
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
}
