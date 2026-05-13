// Rain Mobile Layout
// Mobile-optimized rain interface

export class RainMobileLayout {
  constructor() {
    this.container = null;
    this.isTouch = false;
  }

  create(container) {
    this.container = container;
    this.detectTouch();
    this.buildMobileInterface();
  }

  bind(engine) {
    this.engine = engine;
    this.bindMobileControls();
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  detectTouch() {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  buildMobileInterface() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="rain-mobile-ui">
        <div class="mobile-controls">
          <div class="volume-control">
            <div class="control-label">Volume</div>
            <input type="range" class="mobile-slider volume-slider"
                   min="0" max="1" step="0.01" value="0.3" orient="vertical">
          </div>
          <div class="intensity-control">
            <div class="control-label">Intensity</div>
            <input type="range" class="mobile-slider intensity-slider"
                   min="0" max="1" step="0.01" value="0.5" orient="vertical">
          </div>
        </div>
        <div class="mobile-buttons">
          <button class="mobile-btn start-btn">▶️</button>
          <button class="mobile-btn stop-btn">⏹️</button>
        </div>
        <div class="mobile-visualizer"></div>
      </div>
    `;

    this.applyMobileStyling();
  }

  applyMobileStyling() {
    // Apply mobile-specific CSS if needed
    const style = document.createElement('style');
    style.textContent = `
      .rain-mobile-ui {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px;
      }
      .mobile-controls {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
      }
      .mobile-slider {
        writing-mode: bt-lr;
        width: 40px;
        height: 120px;
      }
      .mobile-buttons {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      .mobile-btn {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        font-size: 24px;
      }
    `;
    document.head.appendChild(style);
  }

  bindMobileControls() {
    const volumeSlider = this.container.querySelector('.volume-slider');
    const intensitySlider = this.container.querySelector('.intensity-slider');
    const startBtn = this.container.querySelector('.start-btn');
    const stopBtn = this.container.querySelector('.stop-btn');

    volumeSlider.addEventListener('input', (e) => {
      if (this.engine) {
        this.engine.updateState({ volume: parseFloat(e.target.value) });
      }
    });

    intensitySlider.addEventListener('input', (e) => {
      if (this.engine) {
        this.engine.updateState({ intensity: parseFloat(e.target.value) });
      }
    });

    startBtn.addEventListener('click', () => {
      if (this.engine) {
        this.engine.updateState({ enabled: true });
        this.engine.start();
      }
    });

    stopBtn.addEventListener('click', () => {
      if (this.engine) {
        this.engine.updateState({ enabled: false });
        this.engine.stop();
      }
    });
  }
}