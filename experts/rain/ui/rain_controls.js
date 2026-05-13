// Rain Controls
// Control logic for rain parameters

export class RainControls {
  constructor() {
    this.parameters = {
      volume: 0.3,
      intensity: 0.5,
      density: 0.7,
      reverb: 0.2,
    };
    this.listeners = [];
  }

  create(container) {
    this.container = container;
    this.buildControls();
  }

  bind(callback) {
    this.listeners.push(callback);
  }

  destroy() {
    this.listeners = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  buildControls() {
    if (!this.container) return;

    // Build control interface
    this.container.innerHTML = `
      <div class="rain-parameter-controls">
        ${Object.keys(this.parameters).map(key => `
          <div class="control-group">
            <label>${key}: <span class="value">${this.parameters[key]}</span></label>
            <input type="range" class="param-slider" data-param="${key}"
                   min="0" max="1" step="0.01" value="${this.parameters[key]}">
          </div>
        `).join('')}
      </div>
    `;

    this.bindSliders();
  }

  bindSliders() {
    const sliders = this.container.querySelectorAll('.param-slider');
    sliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        const param = e.target.dataset.param;
        const value = parseFloat(e.target.value);
        this.setParameter(param, value);
      });
    });
  }

  setParameter(key, value) {
    if (this.parameters.hasOwnProperty(key)) {
      this.parameters[key] = value;
      this.updateDisplay(key);
      this.notifyListeners(key, value);
    }
  }

  updateDisplay(key) {
    const valueSpan = this.container.querySelector(`[data-param="${key}"]`).parentElement.querySelector('.value');
    if (valueSpan) {
      valueSpan.textContent = this.parameters[key].toFixed(2);
    }
  }

  notifyListeners(key, value) {
    this.listeners.forEach(callback => {
      try {
        callback(key, value);
      } catch (error) {
        console.warn('Control callback error:', error);
      }
    });
  }

  getParameters() {
    return { ...this.parameters };
  }
}