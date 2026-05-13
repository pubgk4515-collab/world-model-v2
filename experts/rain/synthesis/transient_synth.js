// Rain Transient Synthesizer
// Generates believable droplet impacts with soft transients and wet characteristics

export class TransientSynth {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.isConnected = false;
    this.destination = null;

    // Transient characteristics
    this.baseFrequency = 800;
    this.frequencyVariance = 200;
    this.attackTime = 0.001;    // Very fast attack but not clicky
    this.decayTime = 0.08;      // Quick decay
    this.sustainLevel = 0.3;    // Low sustain
    this.releaseTime = 0.15;    // Gentle release
    this.wetness = 0.6;         // Wet character
    this.resonance = 0.4;       // Subtle resonance
  }

  init() {
    // Initialize transient synthesis parameters
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
    // Update transient parameters
  }

  trigger(parameters = {}) {
    if (!this.isConnected) return;

    const now = this.audioContext.currentTime;

    // Randomize frequency for natural variation
    const frequency = this.baseFrequency +
                     (Math.random() - 0.5) * this.frequencyVariance +
                     (parameters.frequencyOffset || 0);

    // Create main transient oscillator
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filterNode = this.audioContext.createBiquadFilter();

    // Soft transient body - sine wave with gentle attack
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // High-pass filter to remove low-end muddiness
    filterNode.type = 'highpass';
    filterNode.frequency.value = 200;
    filterNode.Q.value = 0.7;

    // Envelope: fast attack, quick decay, gentle release
    const attackEnd = now + this.attackTime;
    const decayEnd = attackEnd + this.decayTime;
    const releaseEnd = decayEnd + this.releaseTime;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, attackEnd);  // Soft attack bloom
    gainNode.gain.exponentialRampToValueAtTime(this.sustainLevel * 0.08, decayEnd);
    gainNode.gain.exponentialRampToValueAtTime(0.001, releaseEnd);

    // Connect: oscillator -> filter -> gain -> destination
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.destination);

    // Start and stop
    oscillator.start(now);
    oscillator.stop(releaseEnd);

    // Add subtle wet thud component (lower frequency)
    if (this.wetness > 0.3) {
      this.addWetThud(now, frequency * 0.3, parameters);
    }

    // Add gentle resonant tail
    if (this.resonance > 0.2) {
      this.addResonantTail(now, frequency * 1.2, parameters);
    }
  }

  addWetThud(now, frequency, parameters) {
    const thudOsc = this.audioContext.createOscillator();
    const thudGain = this.audioContext.createGain();

    thudOsc.frequency.value = frequency;
    thudOsc.type = 'triangle'; // Softer than sine

    // Shorter envelope for thud
    const thudAttack = now + 0.002;
    const thudDecay = thudAttack + 0.04;

    thudGain.gain.setValueAtTime(0, now);
    thudGain.gain.linearRampToValueAtTime(0.06 * this.wetness, thudAttack);
    thudGain.gain.exponentialRampToValueAtTime(0.001, thudDecay);

    thudOsc.connect(thudGain);
    thudGain.connect(this.destination);

    thudOsc.start(now);
    thudOsc.stop(thudDecay);
  }

  addResonantTail(now, frequency, parameters) {
    const tailOsc = this.audioContext.createOscillator();
    const tailGain = this.audioContext.createGain();
    const tailFilter = this.audioContext.createBiquadFilter();

    tailOsc.frequency.value = frequency;
    tailOsc.type = 'sine';

    // Bandpass for resonance
    tailFilter.type = 'bandpass';
    tailFilter.frequency.value = frequency;
    tailFilter.Q.value = 8; // Narrow resonance

    // Long gentle tail
    const tailStart = now + 0.01;
    const tailEnd = tailStart + 0.2;

    tailGain.gain.setValueAtTime(0, now);
    tailGain.gain.setValueAtTime(0, tailStart);
    tailGain.gain.exponentialRampToValueAtTime(0.02 * this.resonance, tailStart + 0.05);
    tailGain.gain.exponentialRampToValueAtTime(0.001, tailEnd);

    tailOsc.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(this.destination);

    tailOsc.start(tailStart);
    tailOsc.stop(tailEnd);
  }

  setBaseFrequency(value) {
    this.baseFrequency = Math.max(200, Math.min(2000, value));
  }

  setFrequencyVariance(value) {
    this.frequencyVariance = Math.max(0, Math.min(500, value));
  }

  setWetness(value) {
    this.wetness = Math.max(0, Math.min(1, value));
  }

  setResonance(value) {
    this.resonance = Math.max(0, Math.min(1, value));
  }

  setEnvelope(attack, decay, sustain, release) {
    this.attackTime = Math.max(0.0001, attack);
    this.decayTime = Math.max(0.01, decay);
    this.sustainLevel = Math.max(0, Math.min(1, sustain));
    this.releaseTime = Math.max(0.01, release);
  }
}