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
    await this.lifecycle.initialize();
    await this.lifecycle.start();

    // Connect modules
    if (this.synthesis && this.scheduling) {
      this.scheduling.connect(this.synthesis);
    }
    if (this.synthesis && this.surfaces) {
      this.surfaces.connect(this.synthesis);
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