// experts/rain/expert_rain.js
// Symbiote Rain Expert
// Production-safe + app.js compatible + mobile-safe
// Audible DSP rain engine with proper UI lifecycle

import { RainEngine } from './core/rain_engine.js';

import { DropScheduler } from './scheduling/drop_scheduler.js';

import { RainNoise } from './synthesis/rain_noise.js';
import { TransientSynth } from './synthesis/transient_synth.js';

import { SurfaceRouter } from './surfaces/surface_router.js';

import { ConcreteSurface } from './surfaces/concrete/concrete_surface.js';
import { LeavesSurface } from './surfaces/leaves/leaves_surface.js';
import { OpenAirSurface } from './surfaces/open_air/open_air_surface.js';
import { PuddleSurface } from './surfaces/puddle/puddle_surface.js';
import { TinSurface } from './surfaces/tin_roof/tin_surface.js';
import { UmbrellaSurface } from './surfaces/umbrella/umbrella_surface.js';
import { WindowSurface } from './surfaces/window/window_surface.js';

export default class RainExpert {

  constructor(audioContext, masterBus = null) {

    console.log('[RAIN] Constructing RainExpert');

    this.audioContext = audioContext;

    this.masterBus =
      masterBus ||
      audioContext.destination;

    this.id =
      crypto.randomUUID();

    // =====================================================
    // STATE
    // =====================================================

    this.state = {
      density: 0.55,
      wetness: 0.6,
      resonance: 0.35,
      intensity: 0.45,
      surface: 'open_air',
      running: false
    };

    // =====================================================
    // CORE
    // =====================================================

    this.engine =
      new RainEngine(audioContext);

    // =====================================================
    // SCHEDULER
    // =====================================================

    this.dropScheduler =
      new DropScheduler(audioContext);

    // =====================================================
    // SYNTHESIS
    // =====================================================

    this.rainNoise =
      new RainNoise(audioContext);

    this.transientSynth =
      new TransientSynth(audioContext);

    // =====================================================
    // SURFACES
    // =====================================================

    this.surfaceRouter =
      new SurfaceRouter();

    this.concreteSurface =
      new ConcreteSurface(audioContext);

    this.leavesSurface =
      new LeavesSurface(audioContext);

    this.openAirSurface =
      new OpenAirSurface(audioContext);

    this.puddleSurface =
      new PuddleSurface(audioContext);

    this.tinSurface =
      new TinSurface(audioContext);

    this.umbrellaSurface =
      new UmbrellaSurface(audioContext);

    this.windowSurface =
      new WindowSurface(audioContext);

    // =====================================================
    // INIT
    // =====================================================

    this.init();
  }

  // =====================================================
  // INIT
  // =====================================================

  init() {

    console.log('[RAIN] Initializing modules...');

    // -----------------------------------------------------
    // INIT MODULES
    // -----------------------------------------------------

    this.rainNoise.init();

    this.transientSynth.init();

    this.dropScheduler.init();

    this.surfaceRouter.init();

    // -----------------------------------------------------
    // REGISTER SURFACES
    // -----------------------------------------------------

    this.surfaceRouter.addSurface(
      'concrete',
      this.concreteSurface
    );

    this.surfaceRouter.addSurface(
      'leaves',
      this.leavesSurface
    );

    this.surfaceRouter.addSurface(
      'open_air',
      this.openAirSurface
    );

    this.surfaceRouter.addSurface(
      'puddle',
      this.puddleSurface
    );

    this.surfaceRouter.addSurface(
      'tin_roof',
      this.tinSurface
    );

    this.surfaceRouter.addSurface(
      'umbrella',
      this.umbrellaSurface
    );

    this.surfaceRouter.addSurface(
      'window',
      this.windowSurface
    );

    // -----------------------------------------------------
    // CONNECT SURFACES
    // -----------------------------------------------------

    this.concreteSurface.connect(
      this.transientSynth
    );

    this.leavesSurface.connect(
      this.transientSynth
    );

    this.openAirSurface.connect(
      this.transientSynth
    );

    this.puddleSurface.connect(
      this.transientSynth
    );

    this.tinSurface.connect(
      this.transientSynth
    );

    this.umbrellaSurface.connect(
      this.transientSynth
    );

    this.windowSurface.connect(
      this.transientSynth
    );

    // -----------------------------------------------------
    // DROP ROUTING
    // -----------------------------------------------------

    this.dropScheduler.connect(() => {

      this.surfaceRouter.triggerDrop({
        intensity: this.state.intensity,
        wetness: this.state.wetness,
        resonance: this.state.resonance
      });

    });

    // -----------------------------------------------------
    // AUDIO ROUTING
    // -----------------------------------------------------

    this.transientSynth.connect(
      this.masterBus
    );

    this.rainNoise.connect(
      this.masterBus
    );

    console.log(
      '[RAIN] Audio routing connected'
    );
  }

  // =====================================================
  // START
  // =====================================================

  async start() {

    if (this.state.running) {
      return;
    }

    console.log('[RAIN] Starting...');

    if (
      this.audioContext &&
      this.audioContext.state === 'suspended'
    ) {
      await this.audioContext.resume();
    }

    this.state.running = true;

    this.rainNoise.setIntensity(
      this.state.intensity
    );

    this.rainNoise.start();

    this.dropScheduler.start();

    console.log(
      '[RAIN] Rain started successfully'
    );
  }

  // =====================================================
  // STOP
  // =====================================================

  stop() {

    this.state.running = false;

    this.dropScheduler.stop();

    this.rainNoise.stop();

    console.log('[RAIN] Stopped');
  }

  // =====================================================
  // DESTROY
  // =====================================================

  destroy() {

    this.stop();

    try {

      this.dropScheduler.dispose?.();

      this.rainNoise.dispose?.();

      this.transientSynth.dispose?.();

    } catch (err) {

      console.warn(
        '[RAIN] Destroy cleanup warning:',
        err
      );
    }

    console.log('[RAIN] Destroyed');
  }

  // =====================================================
  // WORLD STATE
  // =====================================================

  onWorldStateUpdate(worldState = {}) {

    if (
      typeof worldState.atmosphericPressure ===
      'number'
    ) {

      const pressure =
        worldState.atmosphericPressure;

      const intensity =
        0.2 + pressure * 0.8;

      this.setIntensity(intensity);
    }

    if (worldState.enclosure) {

      switch (worldState.enclosure) {

        case 'indoor':
          this.setSurfaceType('window');
          break;

        case 'vehicle':
          this.setSurfaceType('tin_roof');
          break;

        case 'outside':
        default:
          this.setSurfaceType('open_air');
          break;
      }
    }
  }

  // =====================================================
  // CONTROLS
  // =====================================================

  setDensity(value) {

    const v =
      Math.max(0, Math.min(1, value));

    this.state.density = v;

    this.dropScheduler.setDensity(v);
  }

  setWetness(value) {

    const v =
      Math.max(0, Math.min(1, value));

    this.state.wetness = v;

    this.transientSynth.setWetness(v);
  }

  setResonance(value) {

    const v =
      Math.max(0, Math.min(1, value));

    this.state.resonance = v;

    this.transientSynth.setResonance(v);
  }

  setIntensity(value) {

    const v =
      Math.max(0, Math.min(1, value));

    this.state.intensity = v;

    this.rainNoise.setIntensity(v);
  }

  setSurfaceType(type) {

    this.state.surface = type;

    this.surfaceRouter.setCurrentSurface(type);
  }

  // =====================================================
  // UI
  // =====================================================

  getUICard() {

    return `
      <div
        class="expert-card rain-card"
        data-id="${this.id}"
        data-expert-type="rain"
      >

        <div class="expert-header">
          <h3>Rain Expert</h3>
        </div>

        <div class="expert-controls">

          <label>DENSITY</label>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value="${this.state.density}"
            class="rain-density"
          />

          <label>WETNESS</label>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value="${this.state.wetness}"
            class="rain-wetness"
          />

          <label>RESONANCE</label>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value="${this.state.resonance}"
            class="rain-resonance"
          />

          <label>SURFACE</label>

          <select class="rain-surface">

            <option value="open_air">
              Open Air
            </option>

            <option value="tin_roof">
              Tin Roof
            </option>

            <option value="window">
              Window
            </option>

            <option value="umbrella">
              Umbrella
            </option>

            <option value="concrete">
              Concrete
            </option>

            <option value="puddle">
              Puddle
            </option>

            <option value="leaves">
              Leaves
            </option>

          </select>

          <button class="remove-btn">
            Remove Expert
          </button>

        </div>

      </div>
    `;
  }

  // =====================================================
  // BIND CONTROLS
  // =====================================================

  bindCardControls(card) {

    if (!card) return;

    const density =
      card.querySelector('.rain-density');

    const wetness =
      card.querySelector('.rain-wetness');

    const resonance =
      card.querySelector('.rain-resonance');

    const surface =
      card.querySelector('.rain-surface');

    // -----------------------------------------------------
    // DENSITY
    // -----------------------------------------------------

    if (density) {

      density.addEventListener(
        'input',
        (e) => {

          this.setDensity(
            parseFloat(e.target.value)
          );

        }
      );
    }

    // -----------------------------------------------------
    // WETNESS
    // -----------------------------------------------------

    if (wetness) {

      wetness.addEventListener(
        'input',
        (e) => {

          this.setWetness(
            parseFloat(e.target.value)
          );

        }
      );
    }

    // -----------------------------------------------------
    // RESONANCE
    // -----------------------------------------------------

    if (resonance) {

      resonance.addEventListener(
        'input',
        (e) => {

          this.setResonance(
            parseFloat(e.target.value)
          );

        }
      );
    }

    // -----------------------------------------------------
    // SURFACE
    // -----------------------------------------------------

    if (surface) {

      surface.addEventListener(
        'change',
        (e) => {

          this.setSurfaceType(
            e.target.value
          );

        }
      );
    }

    // -----------------------------------------------------
    // AUTO START
    // -----------------------------------------------------

    this.start().catch((err) => {

      console.error(
        '[RAIN] Auto-start failed:',
        err
      );

    });
  }
}