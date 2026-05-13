// Rain Visualizer
// Visual representation of rain activity

export class RainVisualizer {
  constructor() {
    this.canvas = null;
    this.context = null;
    this.isActive = false;
    this.drops = [];
  }

  create(container) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 400;
    this.canvas.height = 200;
    this.canvas.className = 'rain-visualizer-canvas';
    this.context = this.canvas.getContext('2d');

    if (container) {
      container.appendChild(this.canvas);
    }

    this.clear();
  }

  bind(engine) {
    this.engine = engine;
    this.start();
  }

  destroy() {
    this.stop();
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.context = null;
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.animate();
  }

  stop() {
    this.isActive = false;
  }

  animate() {
    if (!this.isActive) return;

    this.update();
    this.draw();

    requestAnimationFrame(() => this.animate());
  }

  update() {
    // Update drop positions
    this.drops.forEach(drop => {
      drop.y += drop.speed;
      if (drop.y > this.canvas.height) {
        drop.y = 0;
        drop.x = Math.random() * this.canvas.width;
      }
    });

    // Add new drops occasionally
    if (Math.random() < 0.1) {
      this.drops.push({
        x: Math.random() * this.canvas.width,
        y: 0,
        speed: 2 + Math.random() * 3,
      });
    }

    // Limit drop count
    if (this.drops.length > 50) {
      this.drops = this.drops.slice(-50);
    }
  }

  draw() {
    if (!this.context) return;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.context.strokeStyle = '#4A90E2';
    this.context.lineWidth = 1;

    this.drops.forEach(drop => {
      this.context.beginPath();
      this.context.moveTo(drop.x, drop.y);
      this.context.lineTo(drop.x, drop.y + 10);
      this.context.stroke();
    });
  }

  clear() {
    if (this.context) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}