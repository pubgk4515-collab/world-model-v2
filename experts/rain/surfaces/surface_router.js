// Rain Surface Router
// Routes rain events to appropriate surface simulations with material-dependent behavior

export class SurfaceRouter {
  constructor() {
    this.surfaces = new Map();
    this.activeSurfaces = ['open_air'];
    this.currentSurface = 'open_air';

    // Surface characteristics
    this.surfaceProfiles = {
      open_air: {
        frequencyOffset: 0,
        wetness: 0.3,
        resonance: 0.1,
        damping: 0.8,
        stereoSpread: 0.9,
        reflection: 0.0,
        hardness: 0.0,
      },
      umbrella: {
        frequencyOffset: 100,
        wetness: 0.7,
        resonance: 0.3,
        damping: 0.6,
        stereoSpread: 0.7,
        reflection: 0.2,
        hardness: 0.3,
      },
      tin_roof: {
        frequencyOffset: 300,
        wetness: 0.2,
        resonance: 0.9,
        damping: 0.3,
        stereoSpread: 0.5,
        reflection: 0.8,
        hardness: 0.9,
      },
      leaves: {
        frequencyOffset: -200,
        wetness: 0.8,
        resonance: 0.2,
        damping: 0.9,
        stereoSpread: 0.8,
        reflection: 0.1,
        hardness: 0.2,
      },
      puddle: {
        frequencyOffset: -100,
        wetness: 0.95,
        resonance: 0.7,
        damping: 0.7,
        stereoSpread: 1.0,
        reflection: 0.6,
        hardness: 0.1,
      },
      window: {
        frequencyOffset: 200,
        wetness: 0.4,
        resonance: 0.6,
        damping: 0.4,
        stereoSpread: 0.6,
        reflection: 0.7,
        hardness: 0.7,
      },
      concrete: {
        frequencyOffset: 50,
        wetness: 0.5,
        resonance: 0.5,
        damping: 0.5,
        stereoSpread: 0.4,
        reflection: 0.4,
        hardness: 0.8,
      },
      mud: {
        frequencyOffset: -150,
        wetness: 0.9,
        resonance: 0.3,
        damping: 0.8,
        stereoSpread: 0.3,
        reflection: 0.2,
        hardness: 0.1,
      },
    };
  }

  init() {
    // Initialize surface routing
  }

  connect(destination) {
    this.destination = destination;
  }

  updateSurface() {
    // Update surface parameters
  }

  build() {
    // Build surface connections
  }

  addSurface(name, surface) {
    this.surfaces.set(name, surface);
  }

  removeSurface(name) {
    this.surfaces.delete(name);
  }

  routeDrop(surfaceType = 'open_air', parameters = {}) {
    const surface = this.surfaces.get(surfaceType);
    if (surface && surface.trigger) {
      // Apply surface characteristics to parameters
      const profile = this.surfaceProfiles[surfaceType] || this.surfaceProfiles.open_air;
      const modifiedParams = {
        ...parameters,
        frequencyOffset: (parameters.frequencyOffset || 0) + profile.frequencyOffset,
        wetness: profile.wetness,
        resonance: profile.resonance,
        damping: profile.damping,
        stereoSpread: profile.stereoSpread,
        reflection: profile.reflection,
        hardness: profile.hardness,
      };

      surface.trigger(modifiedParams);
    }
  }

  setActiveSurfaces(surfaces) {
    this.activeSurfaces = surfaces || ['open_air'];
    this.currentSurface = this.activeSurfaces[0] || 'open_air';
  }

  getActiveSurfaces() {
    return this.activeSurfaces;
  }

  setCurrentSurface(surfaceType) {
    if (this.surfaceProfiles[surfaceType]) {
      this.currentSurface = surfaceType;
    }
  }

  getCurrentSurface() {
    return this.currentSurface;
  }

  getSurfaceProfile(surfaceType) {
    return this.surfaceProfiles[surfaceType] || this.surfaceProfiles.open_air;
  }

  // Route to current surface
  triggerDrop(parameters = {}) {
    this.routeDrop(this.currentSurface, parameters);
  }

  // Route to random active surface
  triggerRandomDrop(parameters = {}) {
    const surfaceType = this.activeSurfaces[Math.floor(Math.random() * this.activeSurfaces.length)];
    this.routeDrop(surfaceType, parameters);
  }
}