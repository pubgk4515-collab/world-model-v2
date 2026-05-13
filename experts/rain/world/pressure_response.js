// Pressure Response
// Models atmospheric pressure effects

export class PressureResponse {
  constructor() {
    this.pressure = 1013; // hPa
    this.basePressure = 1013;
  }

  init() {
    // Initialize pressure response
  }

  connect(target) {
    this.target = target;
  }

  update() {
    // Update pressure effects
    const pressureRatio = this.pressure / this.basePressure;
    if (this.target && this.target.setPressureRatio) {
      this.target.setPressureRatio(pressureRatio);
    }
  }

  setPressure(value) {
    this.pressure = Math.max(900, Math.min(1100, value));
    this.update();
  }

  getPressure() {
    return this.pressure;
  }
}