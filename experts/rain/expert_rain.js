// Rain Expert
// Main entry point for the Rain Expert system

import { RainEngine } from './core/rain_engine.js';
import { DropScheduler } from './scheduling/drop_scheduler.js';
import { BurstEngine } from './scheduling/burst_engine.js';
import { DensityEngine } from './scheduling/density_engine.js';
import { ProbabilityField } from './scheduling/probability_field.js';
import { StochasticClock } from './scheduling/stochastic_clock.js';

import { RainNoise } from './synthesis/rain_noise.js';
import { TransientSynth } from './synthesis/transient_synth.js';
import { ResonanceSynth } from './synthesis/resonance_synth.js';
import { StereoField } from './synthesis/stereo_field.js';
import { Modulation } from './synthesis/modulation.js';
import { Damping } from './synthesis/damping.js';
import { Saturation } from './synthesis/saturation.js';
import { FilteredImpulse } from './synthesis/filtered_impulse.js';
import { LowpassDiffusion } from './synthesis/lowpass_diffusion.js';
import { WetAirLayer } from './synthesis/wet_air_layer.js';

import { SurfaceRouter } from './surfaces/surface_router.js';
import { ConcreteSurface } from './surfaces/concrete/concrete_surface.js';
import { LeavesSurface } from './surfaces/leaves/leaves_surface.js';
import { OpenAirSurface } from './surfaces/open_air/open_air_surface.js';
import { PuddleSurface } from './surfaces/puddle/puddle_surface.js';
import { TinSurface } from './surfaces/tin_roof/tin_surface.js';
import { UmbrellaSurface } from './surfaces/umbrella/umbrella_surface.js';
import { WindowSurface } from './surfaces/window/window_surface.js';

import { EnclosureRouter } from './world/enclosure_router.js';
import { HumidityModel } from './world/humidity_model.js';
import { PressureResponse } from './world/pressure_response.js';
import { TemperatureResponse } from './world/temperature_response.js';
import { WetnessMemory } from './world/wetness_memory.js';

import { DistantRain } from './ambience/distant_rain.js';
import { EnvironmentalBed } from './ambience/environmental_bed.js';
import { FogLayer } from './ambience/fog_layer.js';
import { GutterDrips } from './ambience/gutter_drips.js';
import { ThunderSend } from './ambience/thunder_send.js';
import { WaterFlow } from './ambience/water_flow.js';

import { RainUI } from './ui/rain_ui.js';
import { RainControls } from './ui/rain_controls.js';
import { RainVisualizer } from './ui/rain_visualizer.js';
import { RainPresets } from './ui/rain_presets.js';
import { RainMobileLayout } from './ui/rain_mobile_layout.js';
import { RainSurfaceSelector } from './ui/rain_surface_selector.js';

export default class RainExpert {
  constructor(audioContext, masterBus) {
    console.log('[RAIN] RainExpert constructor - audioContext:', audioContext, 'masterBus:', masterBus);
    this.audioContext = audioContext;
    this.masterBus = masterBus;
    this.engine = new RainEngine(audioContext);

    this.initializeModules();
    this.connectModules();
  }

  async initialize() {
    console.log('[RAIN] RainExpert.initialize() called');
    // Call engine start to finalize lifecycle
    await this.engine.start();
  }

  async dispose() {
    await this.engine.dispose();
  }

  initializeModules() {
    // Scheduling
    this.dropScheduler = new DropScheduler(this.audioContext);
    this.burstEngine = new BurstEngine();
    this.densityEngine = new DensityEngine();
    this.probabilityField = new ProbabilityField();
    this.stochasticClock = new StochasticClock();

    // Synthesis
    this.rainNoise = new RainNoise(this.audioContext);
    this.transientSynth = new TransientSynth(this.audioContext);
    this.resonanceSynth = new ResonanceSynth(this.audioContext);
    this.stereoField = new StereoField(this.audioContext);
    this.modulation = new Modulation();
    this.damping = new Damping(this.audioContext);
    this.saturation = new Saturation(this.audioContext);
    this.filteredImpulse = new FilteredImpulse(this.audioContext);
    this.lowpassDiffusion = new LowpassDiffusion(this.audioContext);
    this.wetAirLayer = new WetAirLayer(this.audioContext);

    // Surfaces
    this.surfaceRouter = new SurfaceRouter();
    this.concreteSurface = new ConcreteSurface(this.audioContext);
    this.leavesSurface = new LeavesSurface(this.audioContext);
    this.openAirSurface = new OpenAirSurface(this.audioContext);
    this.puddleSurface = new PuddleSurface(this.audioContext);
    this.tinSurface = new TinSurface(this.audioContext);
    this.umbrellaSurface = new UmbrellaSurface(this.audioContext);
    this.windowSurface = new WindowSurface(this.audioContext);

    // World
    this.enclosureRouter = new EnclosureRouter();
    this.humidityModel = new HumidityModel();
    this.pressureResponse = new PressureResponse();
    this.temperatureResponse = new TemperatureResponse();
    this.wetnessMemory = new WetnessMemory();

    // Ambience
    this.distantRain = new DistantRain(this.audioContext);
    this.environmentalBed = new EnvironmentalBed(this.audioContext);
    this.fogLayer = new FogLayer(this.audioContext);
    this.gutterDrips = new GutterDrips(this.audioContext);
    this.thunderSend = new ThunderSend(this.audioContext);
    this.waterFlow = new WaterFlow(this.audioContext);

    // UI
    this.rainUI = new RainUI();
    this.rainControls = new RainControls();
    this.rainVisualizer = new RainVisualizer();
    this.rainPresets = new RainPresets();
    this.rainMobileLayout = new RainMobileLayout();
    this.rainSurfaceSelector = new RainSurfaceSelector();
  }

  connectModules() {
    // Register scheduling with engine
    this.engine.setScheduling(this.dropScheduler);

    // Register synthesis with engine
    this.engine.setSynthesis(this.transientSynth);

    // Register surfaces with engine
    this.engine.setSurfaces(this.surfaceRouter);

    // Register world with engine
    this.engine.setWorld(this.enclosureRouter);

    // Register UI with engine
    this.engine.setUI(this.rainUI);

    // Initialize synthesis modules BEFORE connecting
    console.log('[RAIN] Initializing synthesis modules...');
    this.rainNoise.init();
    this.transientSynth.init();
    this.surfaceRouter.init();
    this.dropScheduler.init();

    // Connect surfaces to router and transient synth
    this.surfaceRouter.addSurface('concrete', this.concreteSurface);
    this.surfaceRouter.addSurface('leaves', this.leavesSurface);
    this.surfaceRouter.addSurface('open_air', this.openAirSurface);
    this.surfaceRouter.addSurface('puddle', this.puddleSurface);
    this.surfaceRouter.addSurface('tin_roof', this.tinSurface);
    this.surfaceRouter.addSurface('umbrella', this.umbrellaSurface);
    this.surfaceRouter.addSurface('window', this.windowSurface);

    // Connect transient synth to all surfaces
    this.concreteSurface.connect(this.transientSynth);
    this.leavesSurface.connect(this.transientSynth);
    this.openAirSurface.connect(this.transientSynth);
    this.puddleSurface.connect(this.transientSynth);
    this.tinSurface.connect(this.transientSynth);
    this.umbrellaSurface.connect(this.transientSynth);
    this.windowSurface.connect(this.transientSynth);

    // Connect drop scheduler to surface router callback (which routes to appropriate surface)
    console.log('[RAIN] Connecting drop scheduler to surface router trigger...');
    this.dropScheduler.connect(() => {
      this.surfaceRouter.triggerDrop();
    });

    // Connect rain noise to transient synth output for mixing
    console.log('[RAIN] Connecting rain noise to transient synth...');
    this.rainNoise.connect(this.transientSynth.destination || this.audioContext.destination);

    // Connect transient synth to master bus if available, otherwise to destination
    if (this.masterBus) {
      console.log('[RAIN] Connecting transient synth to master bus');
      this.transientSynth.connect(this.masterBus);
    } else {
      console.log('[RAIN] No master bus, connecting transient synth to audioContext.destination');
      this.transientSynth.connect(this.audioContext.destination);
    }

    // NOTE: Engine's start() will try to reconnect modules, but we've already done it here
    // The engine connections are overridden by our explicit connections above
  }

  // Public API
  start() {
    console.log('[RAIN] Starting RainExpert...');
    console.log('[RAIN] AudioContext state:', this.audioContext.state);
    console.log('[RAIN] Master bus gain:', this.masterBus ? this.masterBus.gain.value : 'No master bus');

    // Start the noise bed
    console.log('[RAIN] Starting rain noise...');
    this.rainNoise.start();

    // Start the drop scheduler
    console.log('[RAIN] Starting drop scheduler...');
    this.dropScheduler.start();

    console.log('[RAIN] RainExpert fully started - audio signal path active');
    return this.initialize();
  }

  stop() {
    this.rainNoise.stop();
    return this.engine.stop();
  }

  setVolume(volume) {
    this.engine.updateState({ volume });
  }

  setIntensity(intensity) {
    this.engine.updateState({ intensity });
    this.rainNoise.setIntensity(intensity);
  }

  setDensity(density) {
    this.dropScheduler.setDensity(density);
  }

  setWetness(wetness) {
    this.transientSynth.setWetness(wetness);
  }

  setResonance(resonance) {
    this.transientSynth.setResonance(resonance);
  }

  setStereoWidth(width) {
    // This would connect to stereo processing if implemented
  }

  setSurfaceType(surfaceType) {
    this.surfaceRouter.setCurrentSurface(surfaceType);
  }

  setRandomness(randomness) {
    this.dropScheduler.setRandomness(randomness);
  }

  setClusterAmount(clusterAmount) {
    this.dropScheduler.setClusterAmount(clusterAmount);
  }

  setCalmness(calmness) {
    this.dropScheduler.setCalmness(calmness);
  }

  createUI(container) {
    this.rainUI.create(container);
    this.rainUI.bind(this.engine);
  }

  createControls(container) {
    this.rainControls.create(container);
    this.rainControls.bind((key, value) => {
      this.engine.updateState({ [key]: value });
    });
  }

  createVisualizer(container) {
    this.rainVisualizer.create(container);
    this.rainVisualizer.bind(this.engine);
  }
}