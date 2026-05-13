// experts/rain/expert_rain.js
// Stable Rain Expert Runtime
// Mobile-safe + App-compatible + UI-compatible

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
    this.masterBus = masterBus;

    this.id = crypto.randomUUID();

    this.state = {
      density: 0.5,
      wetness: 0.5,
      resonance: 0.4,
      surface: 'open_air',
      running: false
    };

    // =====================================================
    // CORE
    // =====================================================

    this.engine = new RainEngine(audioContext);

    // =====================================================
    // SCHEDULING
    // =====================================================

    this.dropScheduler = new DropScheduler(audioContext);

    // =====================================================
    // SYNTHESIS
    // =====================================================

    this.rainNoise = new RainNoise(audioContext);

    this.transientSynth = new TransientSynth(audioContext);

    // =====================================================
    // SURFACES
    // =====================================================

    this.surfaceRouter = new SurfaceRouter();

    this.concreteSurface = new ConcreteSurface(audioContext);
    this.leavesSurface = new LeavesSurface(audioContext);
    this.openAirSurface = new OpenAirSurface(audioContext);
    this.puddleSurface = new PuddleSurface(audioContext);
    this.tinSurface = new TinSurface(audioContext);
    this.umbrellaSurface = new UmbrellaSurface(audioContext);
    this.windowSurface = new WindowSurface(audioContext);

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

    // init dsp
    this.rainNoise.init();
    this.transientSynth.init();

    // init scheduler
    this.dropScheduler.init();

    // init router
    this.surfaceRouter.init();

    // =====================================================
    // REGISTER SURFACES
    // =====================================================

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

    // =====================================================
    // CONNECT SURFACES
    // =====================================================

    this.concreteSurface.connect(this.transientSynth);
    this.leavesSurface.connect(this.transientSynth);
    this.openAirSurface.connect(this.transientSynth);
    this.puddleSurface.connect(this.transientSynth);
    this.tinSurface.connect(this.transientSynth);
    this.umbrellaSurface.connect(this.transientSynth);
    this.windowSurface.connect(this.transientSynth);

    // =====================================================
    // DROP CALLBACK
    // =====================================================

    this.dropScheduler.connect(() => {
      this.surfaceRouter.triggerDrop();
    });

    // =====================================================
    // AUDIO ROUTING
    // =====================================================

    const output =
      this.masterBus ||
      this.audioContext.destination;

    this.transientSynth.connect(output);

    this.rainNoise.connect(output);

    console.log('[RAIN] Audio routing connected');
  }

  // =====================================================
  // START
  // =====================================================

  async start() {
    if (this.state.running) return;

    console.log('[RAIN] Starting rain expert');

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.state.running = true;

    this.rainNoise.start();

    this.dropScheduler.start();

    console.log('[RAIN] Rain started');
  }

  // =====================================================
  // STOP
  // =====================================================

  stop() {
    this.state.running = false;

    this.rainNoise.stop();

    this.dropScheduler.stop();

    console.log('[RAIN] Rain stopped');
  }

  // =====================================================
  // DESTROY
  // =====================================================

  destroy() {
    this.stop();

    if (this.transientSynth.dispose) {
      this.transientSynth.dispose();
    }

    if (this.rainNoise.dispose) {
      this.rainNoise.dispose();
    }

    console.log('[RAIN] Destroyed');
  }

  // =====================================================
  // CONTROLS
  // =====================================================

  setDensity(value) {
    this.state.density = value;

    if (this.dropScheduler.setDensity) {
      this.dropScheduler.setDensity(value);
    }
  }

  setWetness(value) {
    this.state.wetness = value;

    if (this.transientSynth.setWetness) {
      this.transientSynth.setWetness(value);
    }
  }

  setResonance(value) {
    this.state.resonance = value;

    if (this.transientSynth.setResonance) {
      this.transientSynth.setResonance(value);
    }
  }

  setSurfaceType(type) {
    this.state.surface = type;

    this.surfaceRouter.setCurrentSurface(type);
  }

  // =====================================================
  // UI CARD
  // =====================================================

  getUICard() {
    const card = document.createElement('div');

    card.className = 'expert-card rain-card';

    card.innerHTML = `
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
          <option value="open_air">Open Air</option>
          <option value="tin_roof">Tin Roof</option>
          <option value="window">Window</option>
          <option value="umbrella">Umbrella</option>
          <option value="concrete">Concrete</option>
          <option value="puddle">Puddle</option>
          <option value="leaves">Leaves</option>
        </select>

        <button class="rain-remove-btn">
          Remove Expert
        </button>

      </div>
    `;

    // =====================================================
    // EVENTS
    // =====================================================

    const density =
      card.querySelector('.rain-density');

    const wetness =
      card.querySelector('.rain-wetness');

    const resonance =
      card.querySelector('.rain-resonance');

    const surface =
      card.querySelector('.rain-surface');

    density.addEventListener('input', e => {
      this.setDensity(parseFloat(e.target.value));
    });

    wetness.addEventListener('input', e => {
      this.setWetness(parseFloat(e.target.value));
    });

    resonance.addEventListener('input', e => {
      this.setResonance(parseFloat(e.target.value));
    });

    surface.addEventListener('change', e => {
      this.setSurfaceType(e.target.value);
    });

    return card;
  }
}