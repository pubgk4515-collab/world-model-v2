// Enclosure Router
// Routes environmental effects based on enclosure type

export class EnclosureRouter {
  constructor() {
    this.enclosureType = 'outdoor';
    this.effects = new Map();
  }

  init() {
    // Initialize enclosure routing
  }

  connect(target) {
    this.target = target;
  }

  update() {
    // Update enclosure parameters
  }

  setEnclosureType(type) {
    this.enclosureType = type;
    this.applyEnclosureEffects();
  }

  applyEnclosureEffects() {
    // Apply reverb, filtering based on enclosure
    const effects = this.effects.get(this.enclosureType);
    if (effects && this.target) {
      effects.forEach(effect => {
        if (this.target.updateEffect) {
          this.target.updateEffect(effect);
        }
      });
    }
  }

  addEffect(enclosureType, effect) {
    if (!this.effects.has(enclosureType)) {
      this.effects.set(enclosureType, []);
    }
    this.effects.get(enclosureType).push(effect);
  }

  getEnclosureType() {
    return this.enclosureType;
  }
}