// Rain Surface Selector
// Interface for selecting active surfaces

export class RainSurfaceSelector {
  constructor() {
    this.surfaces = ['concrete', 'leaves', 'open_air', 'puddle', 'tin_roof', 'umbrella', 'window'];
    this.activeSurfaces = ['concrete'];
  }

  create(container) {
    this.container = container;
    this.buildSelector();
  }

  bind(callback) {
    this.onSurfaceChange = callback;
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  buildSelector() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="surface-selector">
        <div class="selector-title">Active Surfaces</div>
        <div class="surface-grid">
          ${this.surfaces.map(surface => `
            <label class="surface-option">
              <input type="checkbox" value="${surface}"
                     ${this.activeSurfaces.includes(surface) ? 'checked' : ''}>
              <span class="surface-label">${surface.replace('_', ' ')}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    this.bindCheckboxes();
  }

  bindCheckboxes() {
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateActiveSurfaces();
      });
    });
  }

  updateActiveSurfaces() {
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"]:checked');
    this.activeSurfaces = Array.from(checkboxes).map(cb => cb.value);

    if (this.onSurfaceChange) {
      this.onSurfaceChange(this.activeSurfaces);
    }
  }

  setActiveSurfaces(surfaces) {
    this.activeSurfaces = surfaces;
    this.updateCheckboxes();
  }

  updateCheckboxes() {
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = this.activeSurfaces.includes(checkbox.value);
    });
  }

  getActiveSurfaces() {
    return [...this.activeSurfaces];
  }

  addSurface(surface) {
    if (!this.surfaces.includes(surface)) {
      this.surfaces.push(surface);
      this.refreshSelector();
    }
  }

  removeSurface(surface) {
    const index = this.surfaces.indexOf(surface);
    if (index > -1) {
      this.surfaces.splice(index, 1);
      const activeIndex = this.activeSurfaces.indexOf(surface);
      if (activeIndex > -1) {
        this.activeSurfaces.splice(activeIndex, 1);
      }
      this.refreshSelector();
    }
  }

  refreshSelector() {
    this.buildSelector();
  }
}