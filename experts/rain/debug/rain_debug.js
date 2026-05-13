// Rain Debug Utilities
// Debugging and logging utilities

export class RainDebug {
  constructor(enabled = false) {
    this.enabled = enabled;
    this.logs = [];
    this.maxLogs = 100;
  }

  log(message, data = null) {
    if (!this.enabled) return;

    const entry = {
      timestamp: Date.now(),
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.log('[Rain Debug]', message, data);
  }

  warn(message, data = null) {
    if (!this.enabled) return;
    console.warn('[Rain Warning]', message, data);
  }

  error(message, error = null) {
    console.error('[Rain Error]', message, error);
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}