/**
 * expert_rain.js
 * Procedural Acoustic World Simulator
 *
 * Rain-only engine:
 * - no wind layer
 * - no continuous hiss bed
 * - no oscillator AM
 * - no tonal pumping
 *
 * Rain model:
 * - Poisson-distributed burst scheduler
 * - each burst contains many microdroplets
 * - droplet density scales with intensity
 * - each droplet is a short transient impact
 * - shared spectral coloring keeps the field cohesive
 *
 * The result is meant to sound like actual rain density increasing,
 * not like louder static.
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

    this.globalPressure = this._clamp(
      options.globalPressure ?? 0.5,
      0,
      1
    );

    this.localDensity = this._clamp(
      options.localDensity ?? 0.5,
      0,
      1
    );

    this.enclosure = options.enclosure || "open";

    this._destroyed = false;
    this._started = false;
    this._burstTimer = null;

    this._activeEvents = new Set();
    this._maxConcurrentClusters = options.maxConcurrentClusters ?? 48;

    // Master output and shared spectral shaping.
    this.outputGain = this.audioCtx.createGain();
    this.outputGain.gain.value = 0.85;

    this.colorHP = this.audioCtx.createBiquadFilter();
    this.colorHP.type = "highpass";
    this.colorHP.frequency.value = 520;
    this.colorHP.Q.value = 0.707;

    this.colorLP = this.audioCtx.createBiquadFilter();
    this.colorLP.type = "lowpass";
    this.colorLP.frequency.value = 8600;
    this.colorLP.Q.value = 0.707;

    this.limiter = this.audioCtx.createDynamicsCompressor();
    this.limiter.threshold.value = -12;
    this.limiter.knee.value = 10;
    this.limiter.ratio.value = 8;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.12;

    this.colorHP.connect(this.colorLP);
    this.colorLP.connect(this.limiter);
    this.limiter.connect(this.outputGain);
    this.outputGain.connect(this.destination);

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

  _poissonDelaySeconds(ratePerSecond) {
    const rate = Math.max(0.2, ratePerSecond);
    return -Math.log(1 - Math.random()) / rate;
  }

  _getIntensity() {
    return this._clamp(this.globalPressure * this.localDensity, 0, 1);
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

    this._scheduleNextCluster();
    this._log("Started");
  }

  stop() {
    this._started = false;

    if (this._burstTimer) {
      clearTimeout(this._burstTimer);
      this._burstTimer = null;
    }

    this._log("Stopped scheduler");
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
      this.colorHP.disconnect();
      this.colorLP.disconnect();
      this.limiter.disconnect();
      this.outputGain.disconnect();
    } catch (_) {}

    this._activeEvents.clear();
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

    if (state.weather && typeof state.weather.rainIntensity === "number") {
      this.globalPressure = this._clamp(state.weather.rainIntensity, 0, 1);
    }

    if (typeof state.enclosure === "string") {
      this.enclosure = state.enclosure;
    } else if (state.listener && typeof state.listener.enclosure === "string") {
      this.enclosure = state.listener.enclosure;
    }

    this._applyMasterTone();
  }

  /* ============================================================
   * Scheduler
   * ========================================================== */

  _scheduleNextCluster() {
    if (this._destroyed || !this._started) return;

    const intensity = this._getIntensity();

    // Cluster rate controls the macro density of rain.
    // At full intensity, overlapping clusters create the impression
    // of thousands of droplets per second without node explosion.
    const clustersPerSecond =
      2.5 + Math.pow(intensity, 2.35) * 24.0;

    const delaySeconds =
      this._poissonDelaySeconds(clustersPerSecond) *
      this._rand(0.78, 1.12);

    this._burstTimer = setTimeout(() => {
      if (this._destroyed || !this._started) return;

      this._spawnCluster(this._getIntensity());
      this._scheduleNextCluster();
    }, Math.max(8, delaySeconds * 1000));
  }

  _pickClusterKind(intensity) {
    const r = Math.random();

    if (intensity < 0.25) {
      return r < 0.70 ? "sparse" : "spray";
    }

    if (intensity < 0.7) {
      return r < 0.45 ? "spray" : "sheet";
    }

    return r < 0.58 ? "sheet" : "burst";
  }

  _clusterDuration(kind, intensity) {
    const base =
      kind === "sparse"
        ? this._rand(0.07, 0.14)
        : kind === "spray"
        ? this._rand(0.09, 0.18)
        : kind === "sheet"
        ? this._rand(0.11, 0.22)
        : this._rand(0.12, 0.26);

    // Slightly longer clusters at higher intensity.
    return base + intensity * 0.03;
  }

  _dropletsPerCluster(kind, intensity) {
    const dense = Math.pow(intensity, 2.0);

    let count;
    if (kind === "sparse") {
      count = 3 + dense * 12;
    } else if (kind === "spray") {
      count = 7 + dense * 30;
    } else if (kind === "sheet") {
      count = 12 + dense * 58;
    } else {
      count = 18 + dense * 82;
    }

    return Math.max(2, Math.floor(count));
  }

  _clusterPeakGain(kind, intensity, dropletCount) {
    const densityComp = 1 / Math.sqrt(Math.max(1, dropletCount) / 12);
    const kindComp =
      kind === "sparse"
        ? 1.0
        : kind === "spray"
        ? 1.05
        : kind === "sheet"
        ? 1.1
        : 1.15;

    const peak =
      (0.03 + Math.pow(intensity, 1.45) * 0.09) *
      densityComp *
      kindComp;

    return this._clamp(peak, 0.015, 0.16);
  }

  _dropDuration(kind, intensity) {
    if (kind === "sparse") {
      return this._rand(0.006, 0.025) + (1 - intensity) * 0.006;
    }

    if (kind === "spray") {
      return this._rand(0.0045, 0.018) + (1 - intensity) * 0.004;
    }

    if (kind === "sheet") {
      return this._rand(0.0035, 0.014) + (1 - intensity) * 0.003;
    }

    return this._rand(0.0025, 0.011) + (1 - intensity) * 0.002;
  }

  _dropBrightness(kind, intensity) {
    if (kind === "sparse") {
      return this._clamp(0.34 + intensity * 0.10, 0.28, 0.52);
    }

    if (kind === "spray") {
      return this._clamp(0.42 + intensity * 0.14, 0.34, 0.60);
    }

    if (kind === "sheet") {
      return this._clamp(0.48 + intensity * 0.16, 0.38, 0.66);
    }

    return this._clamp(0.54 + intensity * 0.18, 0.42, 0.72);
  }

  _dropAmplitude(kind, intensity) {
    const base =
      kind === "sparse"
        ? 0.020
        : kind === "spray"
        ? 0.016
        : kind === "sheet"
        ? 0.013
        : 0.011;

    return (
      base *
      (0.35 + intensity * 0.95) *
      this._rand(0.65, 1.25)
    );
  }

  _spawnCluster(intensity) {
    if (this._activeEvents.size >= this._maxConcurrentClusters) {
      // Safety valve for mobile browsers.
      return;
    }

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const kind = this._pickClusterKind(intensity);
    const duration = this._clusterDuration(kind, intensity);
    const dropletCount = this._dropletsPerCluster(kind, intensity);
    const peakGain = this._clusterPeakGain(kind, intensity, dropletCount);

    const buffer = this._synthesizeClusterBuffer({
      duration,
      dropletCount,
      intensity,
      kind,
    });

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = this._clamp(this._rand(0.96, 1.05), 0.9, 1.1);

    const panner = ctx.createStereoPanner();
    panner.pan.value = this._rand(-1, 1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);

    const attack = Math.min(0.008, duration * 0.15);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(panner);
    panner.connect(gain);
    gain.connect(this.colorHP);

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

    source.start(now);
    source.stop(now + duration + 0.02);
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
   * Cluster Buffer Synthesis
   * ========================================================== */

  _synthesizeClusterBuffer({ duration, dropletCount, intensity, kind }) {
    const ctx = this.audioCtx;
    const sr = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sr * duration));

    const buffer = ctx.createBuffer(2, length, sr);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const brightness = this._dropBrightness(kind, intensity);
    const lowpassCoeff = this._clamp(0.08 + brightness * 0.42, 0.08, 0.62);

    let t = this._rand(0, duration * 0.15);

    for (let i = 0; i < dropletCount; i++) {
      // Poisson-like spacing inside the cluster.
      const spacing = (duration / Math.max(1, dropletCount)) * this._rand(0.28, 1.75);
      t += spacing;

      if (t >= duration) break;

      const start = Math.floor(t * sr);
      const dropDuration = this._dropDuration(kind, intensity);
      const dropLen = Math.max(6, Math.floor(dropDuration * sr));

      const amp = this._dropAmplitude(kind, intensity);
      const pan = this._rand(-1, 1);
      const leftMul = 0.5 * (1 - pan);
      const rightMul = 0.5 * (1 + pan);

      // Two decorrelated one-pole states to keep the rain field alive
      // without turning into hiss.
      let lpL = 0;
      let lpR = 0;
      let env = 1;

      const envDecay = Math.exp(
        -1 / Math.max(10, dropLen * (0.35 + brightness))
      );

      for (let n = 0; n < dropLen; n++) {
        const idx = start + n;
        if (idx >= length) break;

        const whiteL = this._rand(-1, 1);
        const whiteR = this._rand(-1, 1);

        lpL += (whiteL - lpL) * lowpassCoeff;
        lpR += (whiteR - lpR) * lowpassCoeff;

        // Transient first samples for droplet attack.
        const transient = n < 3 ? whiteL * 0.55 : 0;

        // Water-like impulse: not tonal, not steady hiss.
        const sampleL = (whiteL * 0.30 + lpL * 0.70 + transient) * env * amp;
        const sampleR = (whiteR * 0.30 + lpR * 0.70 + transient) * env * amp;

        left[idx] += sampleL * leftMul;
        right[idx] += sampleR * rightMul;

        env *= envDecay;
      }
    }

    return buffer;
  }

  /* ============================================================
   * Shared Tonal Coloring
   * ========================================================== */

  _applyMasterTone(smooth = false) {
    const intensity = this._getIntensity();
    const now = this.audioCtx.currentTime;
    const timeConst = smooth ? 0.08 : 0.06;

    // Rain is not hiss: keep the band bounded.
    let hp = this._lerp(860, 300, intensity);
    let lp = this._lerp(5600, 9800, intensity);

    switch (this.enclosure) {
      case "umbrella":
        hp *= 1.18;
        lp *= 0.76;
        break;
      case "indoor":
        hp *= 1.35;
        lp *= 0.60;
        break;
      case "vehicle":
        hp *= 1.22;
        lp *= 0.68;
        break;
      case "tunnel":
        hp *= 0.94;
        lp *= 0.84;
        break;
      case "open":
      default:
        break;
    }

    this.colorHP.frequency.setTargetAtTime(
      this._clamp(hp, 180, 1800),
      now,
      timeConst
    );

    this.colorLP.frequency.setTargetAtTime(
      this._clamp(lp, 1800, 14000),
      now,
      timeConst
    );

    // Keep output stable; density should mostly come from clusters,
    // not from master loudness.
    const output = this._clamp(0.82 + intensity * 0.10, 0.76, 0.94);
    this.outputGain.gain.setTargetAtTime(output, now, 0.12);
  }

  _lerp(a, b, t) {
    return a + (b - a) * t;
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
        this._restartScheduler();
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        this.destroy();
        card.remove();
      });
    }

    this._applyMasterTone(true);
    this.start();
  }

  _restartScheduler() {
    if (!this._started || this._destroyed) return;

    this.stop();
    this._started = true;
    this._scheduleNextCluster();
  }
}
