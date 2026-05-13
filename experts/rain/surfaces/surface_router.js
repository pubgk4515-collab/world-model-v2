// Rain Surface Router
// Routes rain events to appropriate surface simulations

export class SurfaceRouter {
  constructor() {
    this.surfaces = new Map();
    this.activeSurfaces = ['concrete'];
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

  routeDrop(surfaceType = 'concrete', parameters = {}) {
    const surface = this.surfaces.get(surfaceType);
    if (surface && surface.trigger) {
      surface.trigger(parameters);
    }
  }

  setActiveSurfaces(surfaces) {
    this.activeSurfaces = surfaces || ['concrete'];
  }

  getActiveSurfaces() {
    return this.activeSurfaces;
  }
}