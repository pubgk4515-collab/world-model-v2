// Rain Expert Core Engine
// Modular orchestration with safe lifecycle management

import { RainState } from './rain_state.js';
import { RainEvents } from './rain_events.js';
import { RainLifecycle } from './rain_lifecycle.js';
import { RAIN_DEFAULTS } from './rain_defaults.js';

export class RainEngine {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.state = new RainState();
    this.events = new RainEvents();
    this.lifecycle = new RainLifecycle();

    // Module references
    this.scheduling = null;
    this.synthesis = null;
    this.surfaces = null;
    this.world = null;
    this.ui = null;

    this.lifecycle.registerModule(this.state);
    this.lifecycle.registerModule(this.events);
  }

  async start() {
    console.log('[RAIN ENGINE] Starting...');
    await this.lifecycle.initialize();
    await this.lifecycle.start();

    // Connect modules only if they aren't already connected
    // (they may have been pre-connected by RainExpert.connectModules)
    if (this.synthesis && this.scheduling) {
      // Check if scheduler already has a callback set
      if (!this.scheduling.onDrop || typeof this.scheduling.onDrop !== 'function') {
        console.log('[RAIN ENGINE] Connecting scheduling to synthesis');
        this.scheduling.connect(this.synthesis);
      } else {
        console.log('[RAIN ENGINE] Scheduler already connected to surface router, skipping engine connection');
      }
    }
    if (this.synthesis && this.surfaces) {
      if (!this.surfaces.destination) {
        console.log('[RAIN ENGINE] Connecting surfaces to synthesis');
        this.surfaces.connect(this.synthesis);
      } else {
        console.log('[RAIN ENGINE] Surfaces already connected, skipping engine connection');
      }
    }

    this.events.emit('engine:started');
  }

  async stop() {
    await this.lifecycle.stop();
    this.events.emit('engine:stopped');
  }

  dispose() {
    this.lifecycle.dispose();
    this.events.emit('engine:disposed');
  }

  updateState(updates) {
    if (updates.volume !== undefined) {
      this.state.updateVolume(updates.volume);
    }
    if (updates.intensity !== undefined) {
      this.state.updateIntensity(updates.intensity);
    }
    if (updates.enabled !== undefined) {
      this.state.setEnabled(updates.enabled);
    }

    this.events.emit('state:updated', updates);
  }

  // Module registration
  setScheduling(scheduling) {
    this.scheduling = scheduling;
    this.lifecycle.registerModule(scheduling);
  }

  setSynthesis(synthesis) {
    this.synthesis = synthesis;
    this.lifecycle.registerModule(synthesis);
  }

  setSurfaces(surfaces) {
    this.surfaces = surfaces;
    this.lifecycle.registerModule(surfaces);
  }

  setWorld(world) {
    this.world = world;
    this.lifecycle.registerModule(world);
  }

  setUI(ui) {
    this.ui = ui;
    this.lifecycle.registerModule(ui);
  }
}