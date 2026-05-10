/**
 * app.js — Master Controller for Symbiote Studio · MoE World Model
 *
 * Responsibilities:
 * - lazy-init Web Audio on first user gesture
 * - maintain global world state
 * - add/remove experts dynamically
 * - open/close modal reliably on mobile
 * - route state updates to all active experts
 */

import RainExpert from './expert_rain.js';
import WindExpert from './experts/wind/expert_wind.js';

// ---------------------------------------------------------------------------
// Audio Engine Globals
// ---------------------------------------------------------------------------
let audioCtx = null;
let masterBus = null;
let globalLowPassFilter = null;
let compressor = null;

// ---------------------------------------------------------------------------
// Global World State
// ---------------------------------------------------------------------------
const currentState = {
  atmosphericPressure: 0.5,
  enclosure: 'open',
};

// ---------------------------------------------------------------------------
// Active Experts Registry
// ---------------------------------------------------------------------------
const activeExperts = new Map();

// ---------------------------------------------------------------------------
// DOM References
// ---------------------------------------------------------------------------
const enclosureSelect = document.getElementById('enclosureSelect');
const pressureSlider = document.getElementById('pressureSlider');
const pressureValue = document.getElementById('pressureValue');
const addLayerBtn = document.getElementById('addLayerBtn');
const layerModal = document.getElementById('layerModal');
const expertRack = document.getElementById('expertRack');
const sheet = layerModal?.querySelector('.sheet');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function setRangeFill(input, value) {
  if (!input) return;

  const pct = Math.round(clamp01(value) * 100);
  input.style.background = `linear-gradient(
    90deg,
    rgba(124,58,237,0.92) 0%,
    rgba(37,99,235,0.92) ${pct}%,
    rgba(255,255,255,0.10) ${pct}%,
    rgba(255,255,255,0.10) 100%
  )`;
}

function syncPressureUI(value) {
  const v = clamp01(value);

  if (pressureValue) {
    pressureValue.textContent = v.toFixed(2);
  }

  if (pressureSlider) {
    setRangeFill(pressureSlider, v);
  }
}

function updateState(changes) {
  Object.assign(currentState, changes);

  activeExperts.forEach((expert) => {
    if (typeof expert.onWorldStateUpdate === 'function') {
      expert.onWorldStateUpdate(currentState);
    }
  });
}

// ---------------------------------------------------------------------------
// Audio Engine Initialization
// ---------------------------------------------------------------------------
async function initEngine() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    return;
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error('Web Audio API is not supported on this device/browser.');
  }

  audioCtx = new AudioContextCtor();

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  masterBus = audioCtx.createGain();
  masterBus.gain.value = 1.0;

  globalLowPassFilter = audioCtx.createBiquadFilter();
  globalLowPassFilter.type = 'lowpass';
  globalLowPassFilter.frequency.value = 20000;
  globalLowPassFilter.Q.value = 0.7;

  compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -12.0;
  compressor.knee.value = 0.0;
  compressor.ratio.value = 4.0;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.05;

  masterBus.connect(globalLowPassFilter);
  globalLowPassFilter.connect(compressor);
  compressor.connect(audioCtx.destination);

  console.log('✅ Audio engine initialised.');
}

// ---------------------------------------------------------------------------
// Modal Controls
// ---------------------------------------------------------------------------
function openModal() {
  if (!layerModal) return;
  layerModal.classList.add('open', 'active');
  layerModal.setAttribute('aria-hidden', 'false');
  document.documentElement.style.overflow = 'hidden';
}

function closeModal() {
  if (!layerModal) return;
  layerModal.classList.remove('open', 'active');
  layerModal.setAttribute('aria-hidden', 'true');
  document.documentElement.style.overflow = '';
}

if (sheet) {
  sheet.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// ---------------------------------------------------------------------------
// Expert Factory
// ---------------------------------------------------------------------------
function createExpertByType(type) {
  switch (type) {
    case 'rain':
      return new RainExpert(audioCtx, masterBus);

    case 'wind':
      return new WindExpert(audioCtx, masterBus);

    default:
      throw new Error(`Unknown expert type: "${type}"`);
  }
}

function addExpertToRack(expert) {
  if (!expert || !expert.id) {
    throw new Error('Expert instance is invalid.');
  }

  if (typeof expert.getUICard !== 'function') {
    throw new Error('Expert is missing getUICard().');
  }

  if (typeof expert.bindCardControls !== 'function') {
    throw new Error('Expert is missing bindCardControls().');
  }

  const uiCardHTML = expert.getUICard();
  expertRack.insertAdjacentHTML('beforeend', uiCardHTML);

  const card = expertRack.lastElementChild;
  if (!card) {
    throw new Error('Failed to mount expert card.');
  }

  expert.bindCardControls(card);

  if (typeof expert.onWorldStateUpdate === 'function') {
    expert.onWorldStateUpdate(currentState);
  }
}

// ---------------------------------------------------------------------------
// UI Event Bindings
// ---------------------------------------------------------------------------
if (pressureSlider) {
  pressureSlider.addEventListener('input', (e) => {
    try {
      const value = parseFloat(e.target.value);
      syncPressureUI(value);
      updateState({ atmosphericPressure: value });

      if (!audioCtx) {
        void initEngine();
      }
    } catch (err) {
      console.error(err);
      alert('Slider update error: ' + err.message);
    }
  });
}

if (enclosureSelect) {
  enclosureSelect.addEventListener('change', (e) => {
    try {
      const value = e.target.value;
      updateState({ enclosure: value });

      if (!audioCtx) {
        void initEngine();
      }
    } catch (err) {
      console.error(err);
      alert('Enclosure selection error: ' + err.message);
    }
  });
}

if (addLayerBtn) {
  addLayerBtn.addEventListener('click', async () => {
    try {
      await initEngine();
      openModal();
    } catch (err) {
      console.error(err);
      alert('Failed to open expert sheet: ' + err.message);
    }
  });
}

if (layerModal) {
  layerModal.addEventListener('click', (e) => {
    try {
      if (e.target === layerModal) {
        closeModal();
      }
    } catch (err) {
      console.error(err);
      alert('Modal dismissal error: ' + err.message);
    }
  });

  layerModal.addEventListener('click', async (e) => {
    try {
      const btn = e.target.closest('.sheet-btn');
      if (!btn) return;

      if (btn.id === 'injectCodeBtn') {
        closeModal();
        alert('Custom expert injector is not wired yet.');
        return;
      }

      const expertType = btn.dataset.expert;
      if (!expertType) return;

      await initEngine();

      if (!audioCtx || !masterBus) {
        throw new Error('Audio engine not properly initialised.');
      }

      const expert = createExpertByType(expertType);
      activeExperts.set(expert.id, expert);

      addExpertToRack(expert);
      console.log(`✨ Expert Added: ${expertType} (${expert.id})`);

      closeModal();
    } catch (err) {
      console.error(err);
      alert('Cannot add expert: ' + err.message);
    }
  });
}

// ---------------------------------------------------------------------------
// Expert Removal via Event Delegation
// ---------------------------------------------------------------------------
if (expertRack) {
  expertRack.addEventListener('click', (e) => {
    try {
      const removeBtn = e.target.closest('.remove-btn');
      if (!removeBtn) return;

      const card = removeBtn.closest('[data-id]');
      if (!card) return;

      const id = card.getAttribute('data-id');
      if (!id) return;

      const expert = activeExperts.get(id);
      if (expert) {
        if (typeof expert.destroy === 'function') {
          expert.destroy();
        }
        activeExperts.delete(id);
      }

      card.remove();
      console.log(`🗑️ Expert removed: ${id}`);
    } catch (err) {
      console.error(err);
      alert('Error removing expert: ' + err.message);
    }
  });
}

// ---------------------------------------------------------------------------
// Keyboard UX
// ---------------------------------------------------------------------------
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// ---------------------------------------------------------------------------
// Final Initialisation
// ---------------------------------------------------------------------------
if (pressureSlider) {
  syncPressureUI(parseFloat(pressureSlider.value || '0.5'));
}

if (enclosureSelect) {
  currentState.enclosure = enclosureSelect.value;
}

window.__symbioteState = currentState;
window.__activeExperts = activeExperts;

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
window.addEventListener('pagehide', () => {
  activeExperts.forEach((expert) => {
    try {
      if (typeof expert.destroy === 'function') {
        expert.destroy();
      }
    } catch (_) {
      // ignore cleanup errors
    }
  });

  activeExperts.clear();

  if (audioCtx) {
    try {
      audioCtx.close();
    } catch (_) {
      // ignore
    }
  }
});