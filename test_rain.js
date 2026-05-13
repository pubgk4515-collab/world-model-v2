#!/usr/bin/env node
// Test script for RainExpert signal path tracing
import RainExpert from './experts/rain/expert_rain.js';

console.log('Testing RainExpert from experts/rain/...');

// Mock Web Audio API
const mockAudioContext = {
  createGain: () => ({
    gain: { value: 1.0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
    connect: () => {}
  }),
  createOscillator: () => ({
    frequency: { value: 800 },
    type: 'sine',
    connect: () => {},
    start: () => {},
    stop: () => {}
  }),
  createBiquadFilter: () => ({
    type: 'highpass',
    frequency: { value: 200 },
    Q: { value: 0.7 },
    connect: () => {}
  }),
  createStereoPanner: () => ({ connect: () => {} }),
  createBuffer: (channels, length, sampleRate) => ({
    getChannelData: () => new Float32Array(length)
  }),
  createBufferSource: () => ({
    buffer: null,
    loop: true,
    connect: () => {},
    start: () => {},
    stop: () => {}
  }),
  sampleRate: 44100,
  currentTime: 0,
  state: 'running',
  destination: { connect: () => {} }
};

const mockMasterBus = {
  gain: { value: 1.0 },
  connect: () => {}
};

try {
  console.log('RainExpert imported successfully');

  const rain = new RainExpert(mockAudioContext, mockMasterBus);
  console.log('RainExpert instantiated');

  // Try to start it
  rain.start();
  console.log('RainExpert started');

} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}