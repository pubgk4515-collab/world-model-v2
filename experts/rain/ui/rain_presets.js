// Rain Presets
// Preset configurations for rain

export class RainPresets {
  constructor() {
    this.presets = new Map();
    this.loadDefaultPresets();
  }

  create(container) {
    this.container = container;
    this.buildPresetSelector();
  }

  bind(callback) {
    this.onPresetSelect = callback;
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  buildPresetSelector() {
    if (!this.container) return;

    const presetNames = Array.from(this.presets.keys());
    this.container.innerHTML = `
      <div class="rain-presets">
        <select class="preset-selector">
          <option value="">Select Preset</option>
          ${presetNames.map(name => `<option value="${name}">${name}</option>`).join('')}
        </select>
      </div>
    `;

    this.bindSelector();
  }

  bindSelector() {
    const selector = this.container.querySelector('.preset-selector');
    if (selector) {
      selector.addEventListener('change', (e) => {
        const presetName = e.target.value;
        if (presetName && this.onPresetSelect) {
          const preset = this.presets.get(presetName);
          this.onPresetSelect(preset);
        }
      });
    }
  }

  loadDefaultPresets() {
    this.presets.set('gentle', {
      volume: 0.2,
      intensity: 0.3,
      density: 0.5,
      reverb: 0.3,
    });

    this.presets.set('moderate', {
      volume: 0.4,
      intensity: 0.6,
      density: 0.7,
      reverb: 0.2,
    });

    this.presets.set('heavy', {
      volume: 0.6,
      intensity: 0.8,
      density: 0.9,
      reverb: 0.1,
    });
  }

  addPreset(name, config) {
    this.presets.set(name, config);
    this.refreshSelector();
  }

  removePreset(name) {
    this.presets.delete(name);
    this.refreshSelector();
  }

  getPreset(name) {
    return this.presets.get(name);
  }

  getAllPresets() {
    return Object.fromEntries(this.presets);
  }

  refreshSelector() {
    if (this.container) {
      this.buildPresetSelector();
    }
  }
}