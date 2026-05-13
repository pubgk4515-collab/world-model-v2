// Rain Metrics
// Performance and usage metrics

export class RainMetrics {
  constructor() {
    this.metrics = {
      dropsGenerated: 0,
      surfacesTriggered: 0,
      audioCallbacks: 0,
      averageLatency: 0,
      peakMemoryUsage: 0,
      startTime: Date.now(),
    };
    this.samples = [];
  }

  recordDrop() {
    this.metrics.dropsGenerated++;
  }

  recordSurfaceTrigger() {
    this.metrics.surfacesTriggered++;
  }

  recordAudioCallback(latency) {
    this.metrics.audioCallbacks++;
    this.samples.push(latency);
    if (this.samples.length > 100) {
      this.samples.shift();
    }
    this.updateAverageLatency();
  }

  updateAverageLatency() {
    if (this.samples.length === 0) return;
    this.metrics.averageLatency = this.samples.reduce((sum, val) => sum + val, 0) / this.samples.length;
  }

  recordMemoryUsage(usage) {
    this.metrics.peakMemoryUsage = Math.max(this.metrics.peakMemoryUsage, usage);
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      dropsPerSecond: this.metrics.dropsGenerated / ((Date.now() - this.metrics.startTime) / 1000),
    };
  }

  reset() {
    this.metrics.dropsGenerated = 0;
    this.metrics.surfacesTriggered = 0;
    this.metrics.audioCallbacks = 0;
    this.metrics.averageLatency = 0;
    this.metrics.peakMemoryUsage = 0;
    this.metrics.startTime = Date.now();
    this.samples = [];
  }

  export() {
    return JSON.stringify(this.getMetrics(), null, 2);
  }
}