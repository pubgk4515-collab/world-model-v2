// Temperature Response
// Models temperature effects on rain

export class TemperatureResponse {
  constructor() {
    this.temperature = 20; // celsius
  }

  init() {
    // Initialize temperature response
  }

  connect(target) {
    this.target = target;
  }

  update() {
    // Update temperature effects
    if (this.target && this.target.setTemperature) {
      this.target.setTemperature(this.temperature);
    }
  }

  setTemperature(value) {
    this.temperature = Math.max(-10, Math.min(40, value));
    this.update();
  }

  getTemperature() {
    return this.temperature;
  }
}