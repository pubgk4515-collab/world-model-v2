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
// Runtime Diagnostics
// ---------------------------------------------------------------------------
window.__runtimeErrors = [];
window.__runtimeWarnings = [];

window.addEventListener('error', (event) => {
  try {
    window.__runtimeErrors.push({
      message: event.message || 'Unknown error',
      source: event.filename || '',
      line: event.lineno || 0,
      column: event.colno || 0,
      stack: event.error?.stack || ''
    });
  } catch (_) {}
});

window.addEventListener('unhandledrejection', (event) => {
  try {
    window.__runtimeErrors.push({
      message: String(
        event.reason?.message ||
        event.reason ||
        'Unhandled rejection'
      ),
      stack: event.reason?.stack || ''
    });
  } catch (_) {}
});

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

const audioStateValue = document.getElementById('audioStateValue');
const expertCountValue = document.getElementById('expertCountValue');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function setRangeFill(input, value) {
  if (!input) return;

  const pct = Math.round(clamp01(value) * 100);

  input.style.background = `
    linear-gradient(
      90deg,
      rgba(124,58,237,0.92) 0%,
      rgba(37,99,235,0.92) ${pct}%,
      rgba(255,255,255,0.10) ${pct}%,
      rgba(255,255,255,0.10) 100%
    )
  `;
}

function syncPressureUI(value) {
  const v = clamp01(value);

  if (pressureValue) {
    pressureValue.textContent = v.toFixed(2);
  }

  if (pressureSlider) {
    pressureSlider.value = String(v);
    setRangeFill(pressureSlider, v);
  }
}

function refreshStatusTiles() {
  if (audioStateValue) {
    audioStateValue.textContent = audioCtx
      ? audioCtx.state
      : 'Ready';
  }

  if (expertCountValue) {
    expertCountValue.textContent = String(activeExperts.size);
  }
}

function updateState(changes = {}) {
  Object.assign(currentState, changes);

  activeExperts.forEach((expert) => {
    try {
      if (typeof expert.onWorldStateUpdate === 'function') {
        expert.onWorldStateUpdate({ ...currentState });
      }
    } catch (err) {
      console.error('[App] Expert update failed:', err);
    }
  });
}

function setBodyScrollLocked(locked) {
  document.documentElement.style.overflow = locked
    ? 'hidden'
    : '';

  document.body.style.overflow = locked
    ? 'hidden'
    : '';
}

// ---------------------------------------------------------------------------
// Audio Engine Initialization
// ---------------------------------------------------------------------------
async function initEngine() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    refreshStatusTiles();
    return;
  }

  const AudioContextCtor =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextCtor) {
    throw new Error(
      'Web Audio API is not supported on this browser.'
    );
  }

  audioCtx = new AudioContextCtor();

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  // Master Bus
  masterBus = audioCtx.createGain();
  masterBus.gain.value = 1.0;

  // Global LPF
  globalLowPassFilter = audioCtx.createBiquadFilter();
  globalLowPassFilter.type = 'lowpass';
  globalLowPassFilter.frequency.value = 20000;
  globalLowPassFilter.Q.value = 0.7;

  // Compressor
  compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 0;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.05;

  // Routing
  masterBus.connect(globalLowPassFilter);
  globalLowPassFilter.connect(compressor);
  compressor.connect(audioCtx.destination);

  console.log('✅ Audio engine initialised.');

  refreshStatusTiles();
}

// ---------------------------------------------------------------------------
// Modal Controls
// ---------------------------------------------------------------------------
function openModal() {
  if (!layerModal) return;

  layerModal.classList.add('open', 'active');
  layerModal.setAttribute('aria-hidden', 'false');

  setBodyScrollLocked(true);
}

function closeModal() {
  if (!layerModal) return;

  layerModal.classList.remove('open', 'active');
  layerModal.setAttribute('aria-hidden', 'true');

  setBodyScrollLocked(false);
}

// IMPORTANT:
// Do NOT stop propagation on the sheet.
// Modal interactions rely on bubbling.
if (sheet) {
  sheet.addEventListener('click', () => {
    // intentionally empty
  });
}

// ---------------------------------------------------------------------------
// Expert Factory
// ---------------------------------------------------------------------------
function createExpertByType(type) {
  switch (type) {
    case 'rain': {
      const rain = new RainExpert(audioCtx, masterBus);

      rain.type = 'rain';
      rain.id = rain.id || 'rain';

      return rain;
    }

    case 'wind': {
      const wind = new WindExpert(audioCtx, masterBus);

      wind.type = 'wind';
      wind.id = wind.id || 'wind';

      return wind;
    }

    default:
      throw new Error(`Unknown expert type: "${type}"`);
  }
}

// ---------------------------------------------------------------------------
// Expert UI Mounting
// ---------------------------------------------------------------------------
function addExpertToRack(expert, type) {
  if (!expert || !type) {
    throw new Error('Expert instance is invalid.');
  }

  if (typeof expert.getUICard !== 'function') {
    throw new Error('Expert missing getUICard().');
  }

  if (typeof expert.bindCardControls !== 'function') {
    throw new Error('Expert missing bindCardControls().');
  }

  if (!expertRack) {
    throw new Error('expertRack element not found.');
  }

  const wrapper = document.createElement('div');

  wrapper.innerHTML = String(
    expert.getUICard()
  ).trim();

  const card = wrapper.firstElementChild;

  if (!card) {
    throw new Error('Failed to mount expert card.');
  }

  card.dataset.id =
    card.dataset.id ||
    expert.id ||
    type;

  card.dataset.expertType = type;

  expertRack.appendChild(card);

  expert.bindCardControls(card);

  if (typeof expert.onWorldStateUpdate === 'function') {
    expert.onWorldStateUpdate({ ...currentState });
  }

  refreshStatusTiles();

  return card;
}

function getExpertKeyFromCard(card) {
  return (
    card?.dataset?.expertType ||
    card?.dataset?.id ||
    null
  );
}

// ---------------------------------------------------------------------------
// Pressure Slider
// ---------------------------------------------------------------------------
if (pressureSlider) {
  pressureSlider.addEventListener('input', (e) => {
    try {
      const value = parseFloat(e.target.value);

      syncPressureUI(value);

      updateState({
        atmosphericPressure: value
      });

      if (!audioCtx) {
        void initEngine();
      }
    } catch (err) {
      console.error(
        '[App] Slider update error:',
        err
      );
    }
  });
} else {
  console.warn(
    '[App] pressureSlider not found'
  );
}

// ---------------------------------------------------------------------------
// Enclosure Select
// ---------------------------------------------------------------------------
if (enclosureSelect) {
  enclosureSelect.addEventListener('change', (e) => {
    try {
      const value = e.target.value;

      updateState({
        enclosure: value
      });

      if (!audioCtx) {
        void initEngine();
      }
    } catch (err) {
      console.error(
        '[App] Enclosure update failed:',
        err
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Add Layer Button
// ---------------------------------------------------------------------------
if (addLayerBtn) {
  addLayerBtn.addEventListener('click', async () => {
    try {
      await initEngine();

      openModal();

      refreshStatusTiles();
    } catch (err) {
      console.error(
        '[App] Failed to open modal:',
        err
      );
    }
  });
} else {
  console.warn(
    '[App] addLayerBtn not found'
  );
}

// ---------------------------------------------------------------------------
// Modal Interaction
// ---------------------------------------------------------------------------
if (layerModal) {

  // backdrop close
  layerModal.addEventListener('click', (e) => {
    try {
      if (e.target === layerModal) {
        closeModal();
      }
    } catch (err) {
      console.error(
        '[App] Modal dismissal error:',
        err
      );
    }
  });

  // expert selection
  layerModal.addEventListener('click', async (e) => {
    try {
      const btn = e.target.closest('.sheet-btn');

      if (!btn) return;

      // injector button
      if (btn.id === 'injectCodeBtn') {
        closeModal();

        alert(
          'Custom expert injector is not wired yet.'
        );

        return;
      }

      const type = btn.dataset.expert;

      if (!type) return;

      await initEngine();

      if (!audioCtx || !masterBus) {
        throw new Error(
          'Audio engine not initialised.'
        );
      }

      // already exists
      if (activeExperts.has(type)) {

        const existingCard =
          expertRack?.querySelector(
            `[data-expert-type="${type}"]`
          );

        existingCard?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        closeModal();

        return;
      }

      // create + register
      const expert =
        createExpertByType(type);

      activeExperts.set(type, expert);

      addExpertToRack(expert, type);

      console.log(
        `✨ Expert Added: ${type} (${expert.id})`
      );

      closeModal();

      refreshStatusTiles();

    } catch (err) {
      console.error(
        '[App] Cannot add expert:',
        err
      );
    }
  });

} else {
  console.warn(
    '[App] layerModal not found'
  );
}

// ---------------------------------------------------------------------------
// Expert Removal
// ---------------------------------------------------------------------------
if (expertRack) {

  expertRack.addEventListener('click', (e) => {

    try {

      const removeBtn =
        e.target.closest('.remove-btn');

      if (!removeBtn) return;

      const card =
        removeBtn.closest('[data-id]');

      if (!card) return;

      const type =
        getExpertKeyFromCard(card);

      if (!type) return;

      const expert =
        activeExperts.get(type);

      // cleanup
      if (
        expert &&
        typeof expert.destroy === 'function'
      ) {
        try {
          expert.destroy();
        } catch (destroyErr) {
          console.warn(
            '[App] Expert destroy warning:',
            destroyErr
          );
        }
      }

      activeExperts.delete(type);

      // animation
      card.style.opacity = '0';
      card.style.transform =
        'scale(0.96) translateY(12px)';

      setTimeout(() => {
        try {
          card.remove();
          refreshStatusTiles();

          console.log(
            `🗑️ Expert removed: ${type}`
          );
        } catch (err) {
          console.error(
            '[App] Card cleanup failed:',
            err
          );
        }
      }, 180);

    } catch (err) {

      console.error(
        '[App] Error removing expert:',
        err
      );

      alert(
        'Error removing expert: ' +
        err.message
      );
    }
  });

} else {

  console.warn(
    '[App] expertRack element not found'
  );
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
  syncPressureUI(
    parseFloat(
      pressureSlider.value || '0.5'
    )
  );
}

if (enclosureSelect) {
  currentState.enclosure =
    enclosureSelect.value;
}

refreshStatusTiles();

// ---------------------------------------------------------------------------
// Global Debug Hooks
// ---------------------------------------------------------------------------
window.__symbioteState = currentState;
window.__activeExperts = activeExperts;

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
window.addEventListener('pagehide', () => {

  activeExperts.forEach((expert) => {

    try {

      if (
        expert &&
        typeof expert.destroy === 'function'
      ) {
        expert.destroy();
      }

    } catch (_) {
      // ignore cleanup errors
    }
  });

  activeExperts.clear();

  refreshStatusTiles();

  if (audioCtx) {
    try {
      audioCtx.close();
    } catch (_) {
      // ignore
    }
  }
});