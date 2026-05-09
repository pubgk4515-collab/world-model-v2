/**
 * expert_wind.js
 * Procedural Acoustic World Simulator
 *
 * AAA wind module:
 * - Continuous pre-baked noise source
 * - Native sine LFO for gust motion
 * - No synthesis timers
 * - No main-thread animation loops
 * - Smooth world-state parameter morphing
 *
 * Sound design target:
 * - gentle distant rumble at low intensity
 * - cinematic howling gusts at high intensity
 * - dark, organic, mobile-safe
 *
 * Graph:
 *   WindNoiseBufferSource -> InputGain -> BandpassFilter -> OutputGain -> MasterBus
 *                                 ^             ^
 *                                 |             |
 *                          LFO -> FreqDepth  LFO -> GustDepth (subtle amplitude motion)
 */

export default class WindExpert {
  constructor(audioCtx, destinationNode, options = {}) {
    if (!audioCtx) {
      throw new Error("WindExpert requires an AudioContext.");
    }

    if (
      destinationNode &&
      destinationNode.context &&
      destinationNode.context !== audioCtx
    ) {
      throw new Error(
        "WindExpert destinationNode must belong to the same AudioContext."
      );
    }

    this.audioCtx = audioCtx;
    this.destination = destinationNode || audioCtx.destination;

    this.id =
      globalThis.crypto?.randomUUID?.() ??
      `wind-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    this.debug = !!options.debug;

    this.globalPressure = this._clamp(options.globalPressure ?? 0.5, 0, 1);
    this.localDensity = this._clamp(options.localDensity ?? 0.5, 0, 1);
    this.enclosure = options.enclosure || "open";

    this._destroyed = false;
    this._started = false;
    this._uiBound = false;

    // Master output chain
    this.outputGain = this.audioCtx.createGain();
    this.outputGain.gain.value = 0.08;

    this.limiter = this.audioCtx.createDynamicsCompressor();
    this.limiter.threshold.value = -12;
    this.limiter.knee.value = 12;
    this.limiter.ratio.value = 6;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.18;

    this.outputGain.connect(this.limiter);
    this.limiter.connect(this.destination);

    // Wind signal graph nodes
    this.windSource = this.audioCtx.createBufferSource();
    this.windSource.buffer = this._createWindNoiseBuffer(14);
    this.windSource.loop = true;
    this.windSource.loopStart = 1.0;
    this.windSource.loopEnd = 13.0;

    this.windInputGain = this.audioCtx.createGain();
    this.windInputGain.gain.value = 0.18;

    this.windFilter = this.audioCtx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 220;
    this.windFilter.Q.value = 1.15;

    this.windOutputGain = this.audioCtx.createGain();
    this.windOutputGain.gain.value = 0.06;

    // Native LFO modulation
    this.windLfo = this.audioCtx.createOscillator();
    this.windLfo.type = "sine";
    this.windLfo.frequency.value = 0.12;

    this.freqDepthGain = this.audioCtx.createGain();
    this.freqDepthGain.gain.value = 90;

    this.gustDepthGain = this.audioCtx.createGain();
    this.gustDepthGain.gain.value = 0.008;

    // Routing
    this.windSource.connect(this.windInputGain);
    this.windInputGain.connect(this.windFilter);
    this.windFilter.connect(this.windOutputGain);
    this.windOutputGain.connect(this.outputGain);

    this.windLfo.connect(this.freqDepthGain);
    this.freqDepthGain.connect(this.windFilter.frequency);

    this.windLfo.connect(this.gustDepthGain);
    this.gustDepthGain.connect(this.windOutputGain.gain);

    // Initial tone shaping
    this._applyWindState(true);
  }

  /* ============================================================
   * Logging / Helpers
   * ========================================================== */

  _log(...args) {
    if (this.debug) console.log("[WindExpert]", ...args);
  }

  _warn(...args) {
    console.warn("[WindExpert]", ...args);
  }

  _clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  _rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  _getIntensity() {
    return this._clamp(this.globalPressure * this.localDensity, 0, 1);
  }

  _enclosureTone() {
    switch (this.enclosure) {
      case "umbrella":
        return { gainMul: 0.88, filterMul: 0.86, depthMul: 0.84, qMul: 0.92 };
      case "indoor":
        return { gainMul: 0.72, filterMul: 0.72, depthMul: 0.62, qMul: 0.88 };
      case "vehicle":
        return { gainMul: 0.68, filterMul: 0.64, depthMul: 0.56, qMul: 0.84 };
      case "tunnel":
        return { gainMul: 0.84, filterMul: 1.10, depthMul: 0.96, qMul: 1.02 };
      case "open":
      default:
        return { gainMul: 1.0, filterMul: 1.0, depthMul: 1.0, qMul: 1.0 };
    }
  }

  _smoothParam(param, value, timeConstant = 0.08) {
    const now = this.audioCtx.currentTime;
    try {
      param.cancelScheduledValues(now);
    } catch (_) {}
    param.setTargetAtTime(value, now, timeConstant);
  }

  /* ============================================================
   * Noise Buffer Generation
   * ========================================================== */

  _createWindNoiseBuffer(durationSeconds = 14) {
    const sr = this.audioCtx.sampleRate;
    const length = Math.max(1, Math.floor(sr * durationSeconds));
    const buffer = this.audioCtx.createBuffer(2, length, sr);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Brown/pink-ish noise via slow random walks, baked once at init.
    let aL = 0, bL = 0, cL = 0, driftL = 0;
    let aR = 0, bR = 0, cR = 0, driftR = 0;

    const coeffA = 0.0022;
    const coeffB = 0.0009;
    const coeffC = 0.00045;

    for (let i = 0; i < length; i++) {
      const t = i / (length - 1);

      const edgeIn = t < 0.12 ? t / 0.12 : 1;
      const edgeOut = t > 0.88 ? (1 - t) / 0.12 : 1;
      const env = Math.pow(this._clamp(Math.min(edgeIn, edgeOut), 0, 1), 0.75);

      const w1 = this._rand(-1, 1);
      const w2 = this._rand(-1, 1);

      // Left channel
      aL += (w1 - aL) * coeffA;
      bL += (aL - bL) * coeffB;
      cL += (bL - cL) * coeffC;
      driftL += this._rand(-0.00008, 0.00008);
      const leftBody = (cL * 0.88 + bL * 0.10 + aL * 0.02) * (1 + driftL * 0.8);
      left[i] = this._softClip(leftBody * env * 1.35) * 0.55;

      // Right channel (decorrelated slightly)
      aR += (w2 - aR) * (coeffA * 0.97);
      bR += (aR - bR) * (coeffB * 0.98);
      cR += (bR - cR) * (coeffC * 1.01);
      driftR += this._rand(-0.00008, 0.00008);
      const rightBody = (cR * 0.88 + bR * 0.10 + aR * 0.02) * (1 + driftR * 0.8);
      right[i] = this._softClip(rightBody * env * 1.35) * 0.55;
    }

    return buffer;
  }

  _softClip(x) {
    return x / (1 + Math.abs(x) * 0.35);
  }

  /* ============================================================
   * Lifecycle
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

    try {
      const now = this.audioCtx.currentTime;
      this.windSource.start(now);
      this.windLfo.start(now);
      this._applyWindState(true);
      this._log("Started");
    } catch (err) {
      this._warn("Failed to start wind graph:", err);
    }
  }

  stop() {
    this._started = false;

    try {
      this.windSource.stop();
    } catch (_) {}

    try {
      this.windLfo.stop();
    } catch (_) {}

    this._log("Stopped");
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this.stop();

    try {
      this.windSource.disconnect();
    } catch (_) {}

    try {
      this.windInputGain.disconnect();
    } catch (_) {}

    try {
      this.windFilter.disconnect();
    } catch (_) {}

    try {
      this.windOutputGain.disconnect();
    } catch (_) {}

    try {
      this.windLfo.disconnect();
    } catch (_) {}

    try {
      this.freqDepthGain.disconnect();
    } catch (_) {}

    try {
      this.gustDepthGain.disconnect();
    } catch (_) {}

    try {
      this.outputGain.disconnect();
    } catch (_) {}

    try {
      this.limiter.disconnect();
    } catch (_) {}

    this._log(`Destroyed ${this.id}`);
  }

  /* ============================================================
   * World State / Smoothing
   * ========================================================== */

  _applyWindState(smooth = false) {
    const intensity = this._getIntensity();
    const env = this._enclosureTone();
    const now = this.audioCtx.currentTime;
    const tc = smooth ? 0.08 : 0.05;

    // LFO rate: 0.1Hz to 0.4Hz
    const lfoRate = this._lerp(0.10, 0.40, intensity);

    // Filter base frequency:
    // low intensity = distant rumble
    // high intensity = roaring storm
    const baseFreq = this._lerp(180, 900, intensity) * env.filterMul;

    // LFO depth controls the sweep width.
    const depth = this._lerp(60, 700, intensity) * env.depthMul;

    // Q adds the howling character.
    const q = this._lerp(1.0, 1.8, intensity) * env.qMul;

    // Overall wind body
    const inputGain = this._lerp(0.18, 0.52, intensity) * env.gainMul;

    // Wet output after the filter
    const outputGain = this._lerp(0.05, 0.18, intensity) * env.gainMul;

    // Gentle gust amplitude wobble (subtle, so it stays cinematic)
    const gustDepth = this._lerp(0.006, 0.035, intensity) * env.gainMul;

    this._smoothParam(this.windLfo.frequency, lfoRate, tc);
    this._smoothParam(this.windFilter.frequency, baseFreq, tc);
    this._smoothParam(this.windFilter.Q, q, tc);
    this._smoothParam(this.windInputGain.gain, inputGain, tc);
    this._smoothParam(this.windOutputGain.gain, outputGain, tc);
    this._smoothParam(this.freqDepthGain.gain, depth, tc);
    this._smoothParam(this.gustDepthGain.gain, gustDepth, tc);

    // Final master bed
    const masterGain = this._clamp(0.78 + intensity * 0.08, 0.55, 0.92);
    this._smoothParam(this.outputGain.gain, masterGain * env.gainMul, tc);
  }

  onWorldStateUpdate(state) {
    try {
      if (!state) return;

      if (typeof state.atmosphericPressure === "number") {
        this.globalPressure = this._clamp(state.atmosphericPressure, 0, 1);
      }

      if (typeof state.windIntensity === "number") {
        this.globalPressure = this._clamp(state.windIntensity, 0, 1);
      }

      if (typeof state?.weather?.windIntensity === "number") {
        this.globalPressure = this._clamp(state.weather.windIntensity, 0, 1);
      }

      if (typeof state?.listener?.enclosure === "string") {
        this.enclosure = state.listener.enclosure;
      } else if (typeof state.enclosure === "string") {
        this.enclosure = state.enclosure;
      }

      this._applyWindState(true);
    } catch (err) {
      this._warn("World state update failed:", err);
    }
  }

  /* ============================================================
   * UI
   * ========================================================== */

  getUICard() {
    return `
      <article class="expert-card glass-card" data-id="${this.id}">
        <h3 style="
          font-size:1rem;
          margin-bottom:12px;
          color:rgba(255,255,255,0.9);
          font-weight:600;
        ">
          Wind Expert
        </h3>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="
            font-size:0.75rem;
            color:rgba(255,255,255,0.5);
            text-transform:uppercase;
            letter-spacing:0.05em;
          ">
            Wind Density
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
            backdrop-filter:blur(12px);
            -webkit-backdrop-filter:blur(12px);
          ">
          Remove Expert
        </button>
      </article>
    `;
  }

  bindCardControls(cardElement) {
    try {
      if (!cardElement) return;

      if (this._uiBound) return;
      this._uiBound = true;

      const slider = cardElement.querySelector(".density-slider");
      const removeBtn = cardElement.querySelector(".remove-btn");

      if (slider) {
        slider.addEventListener("input", (e) => {
          try {
            const value = parseFloat(e.target.value);
            this.localDensity = this._clamp(value, 0, 1);
            this._applyWindState(true);
          } catch (err) {
            this._warn("Wind density slider error:", err);
          }
        });
      }

      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          try {
            this.destroy();
            cardElement.remove();
          } catch (err) {
            this._warn("Remove expert failed:", err);
          }
        });
      }

      this._applyWindState(true);
      this.start().catch((err) => this._warn("Start failed:", err));
    } catch (err) {
      this._warn("bindCardControls failed:", err);
    }
  }
}
