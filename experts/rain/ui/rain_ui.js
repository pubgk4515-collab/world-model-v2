// Rain UI
// Main rain interface

export class RainUI {
  constructor() {
    this.container = null;
    this.controls = {};
    this.isBound = false;
  }

  create(container) {
    this.container = container;
    this.buildInterface();
  }

  bind(engine) {
    this.engine = engine;
    this.bindControls();
    this.isBound = true;
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.unbindControls();
    this.isBound = false;
  }

  buildInterface() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="rain-ui">
        <div class="rain-controls">
          <label>Volume: <input type="range" class="volume-slider" min="0" max="1" step="0.01" value="0.3"></label>
          <label>Intensity: <input type="range" class="intensity-slider" min="0" max="1" step="0.01" value="0.5"></label>
          <button class="start-btn">Start Rain</button>
          <button class="stop-btn">Stop Rain</button>
        </div>
        <div class="rain-visualizer"></div>
      </div>
    `;

    this.cacheControls();
  }

  cacheControls() {
    this.controls.volume = this.container.querySelector('.volume-slider');
    this.controls.intensity = this.container.querySelector('.intensity-slider');
    this.controls.startBtn = this.container.querySelector('.start-btn');
    this.controls.stopBtn = this.container.querySelector('.stop-btn');
  }

  bindControls() {
    if (!this.isBound || !this.engine) return;

    this.controls.volume.addEventListener('input', (e) => {
      this.engine.updateState({ volume: parseFloat(e.target.value) });
    });

    this.controls.intensity.addEventListener('input', (e) => {
      this.engine.updateState({ intensity: parseFloat(e.target.value) });
    });

    this.controls.startBtn.addEventListener('click', () => {
      this.engine.updateState({ enabled: true });
      this.engine.start();
    });

    this.controls.stopBtn.addEventListener('click', () => {
      this.engine.updateState({ enabled: false });
      this.engine.stop();
    });
  }

  unbindControls() {
    if (!this.controls.volume) return;

    // Remove event listeners if needed
    this.controls = {};
  }
}