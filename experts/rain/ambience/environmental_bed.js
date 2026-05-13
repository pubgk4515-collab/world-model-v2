// Environmental Bed
// Base environmental ambience layer

export class EnvironmentalBed {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.sources = [];
    this.isConnected = false;
  }

  init() {
    // Initialize environmental bed
  }

  connect(destination) {
    this.destination = destination;
    this.isConnected = true;
  }

  disconnect() {
    this.destination = null;
    this.isConnected = false;
  }

  update() {
    // Update environmental parameters
  }

  addSource(source) {
    if (source && this.isConnected) {
      source.connect(this.destination);
      this.sources.push(source);
    }
  }

  removeSource(source) {
    const index = this.sources.indexOf(source);
    if (index > -1) {
      source.disconnect();
      this.sources.splice(index, 1);
    }
  }

  setVolume(value) {
    this.sources.forEach(source => {
      if (source.setVolume) {
        source.setVolume(value);
      }
    });
  }
}