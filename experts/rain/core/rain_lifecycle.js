// Rain Expert Lifecycle Manager
// Safe initialization and disposal patterns

export class RainLifecycle {
  constructor() {
    this.initialized = false;
    this.running = false;
    this.modules = [];
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize modules in order
      for (const module of this.modules) {
        if (module.init) {
          await module.init();
        }
      }
      this.initialized = true;
    } catch (error) {
      console.error('Rain lifecycle initialization failed:', error);
      this.dispose();
      throw error;
    }
  }

  async start() {
    if (!this.initialized || this.running) return;

    try {
      for (const module of this.modules) {
        if (module.start) {
          await module.start();
        }
      }
      this.running = true;
    } catch (error) {
      console.error('Rain lifecycle start failed:', error);
      this.stop();
      throw error;
    }
  }

  async stop() {
    if (!this.running) return;

    try {
      for (const module of this.modules) {
        if (module.stop) {
          await module.stop();
        }
      }
      this.running = false;
    } catch (error) {
      console.error('Rain lifecycle stop failed:', error);
    }
  }

  dispose() {
    this.stop();
    for (const module of this.modules) {
      if (module.dispose) {
        try {
          module.dispose();
        } catch (error) {
          console.warn('Module dispose error:', error);
        }
      }
    }
    this.modules = [];
    this.initialized = false;
  }

  registerModule(module) {
    if (module) {
      this.modules.push(module);
    }
  }
}