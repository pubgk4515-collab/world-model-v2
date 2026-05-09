/**
 * app.js – Master Controller for Symbiote Studio · MoE World Model
 *
 * This file orchestrates UI interactions, manages the global audio engine,
 * routes world state to active experts, and handles dynamic expert
 * instantiation/removal. It is the only JavaScript file needed on top of
 * the pre-built index.html skeleton.
 *
 * Expert modules (e.g. RainExpert) are imported statically and must conform
 * to the required interface (getUICard, bindCardControls, onWorldStateUpdate,
 * destroy). The audio master bus feeds all expert audio through a low-pass
 * filter and a limiter before reaching the system output.
 *
 * Architecture:
 *  - Global AudioContext and master chain (created lazily on first user
 *    interaction to satisfy autoplay policies).
 *  - Reactive world state (enclosure, atmospheric pressure) updated from
 *    the Router Console UI and propagated to every active expert.
 *  - Bottom sheet modal for adding experts with full error handling.
 *  - Event delegation on the Expert Rack for reliable remove-button handling.
 */

// ---------------------------------------------------------------------------
// Static Imports (expert modules)
// ---------------------------------------------------------------------------
import RainExpert from './expert_rain.js';   // Future native module
import WindExpert from './expert_wind.js';


// ---------------------------------------------------------------------------
// Audio Engine Globals
// ---------------------------------------------------------------------------
let audioCtx = null;            // The single shared AudioContext
let masterBus = null;          // GainNode that sums all expert outputs
let globalLowPassFilter = null;// BiquadFilter – enclosure-tailored LPF
let compressor = null;         // DynamicsCompressor acting as limiter

// ---------------------------------------------------------------------------
// Global World State (single source of truth)
// ---------------------------------------------------------------------------
const currentState = {
  atmosphericPressure: 0.5,    // Range 0.0 – 1.0 (matched to #pressureSlider)
  enclosure: 'open',           // 'open' | 'umbrella' | 'indoor'
};

// ---------------------------------------------------------------------------
// Active Experts Map (id → expert instance)
// ---------------------------------------------------------------------------
const activeExperts = new Map();

// ---------------------------------------------------------------------------
// DOM References (cached once)
// ---------------------------------------------------------------------------
const enclosureSelect = document.getElementById('enclosureSelect');
const pressureSlider = document.getElementById('pressureSlider');
const sliderValueIndicator = document.querySelector('.slider-value-indicator');
const addLayerBtn = document.getElementById('addLayerBtn');
const layerModal = document.getElementById('layerModal');
const expertRack = document.getElementById('expertRack');

// ---------------------------------------------------------------------------
// 1. Audio Engine Initialization (The Failsafe)
// ---------------------------------------------------------------------------
/**
 * Initialises the Web Audio API context, creates the master audio chain,
 * and resumes the context if suspended (mobile autoplay policies).
 * Safe to call multiple times – only runs once.
 */
async function initEngine() {
  if (audioCtx) {
    // Already initialised – just resume if needed
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    return;
  }

  try {
    // Create AudioContext (with legacy vendor prefix fallback)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Autoplay policy workaround – must be resumed inside a user gesture
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    // ── Master Audio Chain ──────────────────────────────────────────
    // inputBus (masterBus) → globalLowPassFilter → compressor → destination

    masterBus = audioCtx.createGain();
    masterBus.gain.value = 1.0;          // Unity gain – sum point for experts

    globalLowPassFilter = audioCtx.createBiquadFilter();
    globalLowPassFilter.type = 'lowpass';
    globalLowPassFilter.frequency.value = 20000; // Wide open by default
    globalLowPassFilter.Q.value = 0.7;           // Gentle slope

    compressor = audioCtx.createDynamicsCompressor();
    // Configured as a transparent limiter to protect output hardware
    compressor.threshold.value = -1.0;   // dBFS – catch peaks near 0 dB
    compressor.knee.value = 0.0;         // Hard knee for brickwall limiting
    compressor.ratio.value = 20.0;       // High ratio
    compressor.attack.value = 0.005;     // 5 ms – fast enough for transients
    compressor.release.value = 0.05;     // 50 ms – quick recovery

    // Wire the chain
    masterBus.connect(globalLowPassFilter);
    globalLowPassFilter.connect(compressor);
    compressor.connect(audioCtx.destination);

    console.log('✅ Audio engine initialised. Master bus active.');
  } catch (err) {
    console.error('❌ Audio engine init failure:', err);
    throw err; // Re-throw so calling code can handle
  }
}

// ---------------------------------------------------------------------------
// 2. World State Propagation
// ---------------------------------------------------------------------------
/**
 * Merges the supplied changes into the global state and immediately
 * notifies every active expert so they can adapt their synthesis.
 */
function updateState(changes) {
  Object.assign(currentState, changes);

  // Propagate to all running experts
  activeExperts.forEach((expert) => {
    if (typeof expert.onWorldStateUpdate === 'function') {
      expert.onWorldStateUpdate(currentState);
    }
  });
}

// ---------------------------------------------------------------------------
// 3. Bottom Sheet Modal Logic
// ---------------------------------------------------------------------------
function openModal() {
  layerModal.classList.add('active');
}

function closeModal() {
  layerModal.classList.remove('active');
}

// ---------------------------------------------------------------------------
// 4. UI Event Bindings (with explicit error alerts)
// ---------------------------------------------------------------------------

// 4.1 Atmospheric Pressure Slider
pressureSlider.addEventListener('input', (e) => {
  try {
    const value = parseFloat(e.target.value);
    if (sliderValueIndicator) {
      sliderValueIndicator.textContent = value.toFixed(2);
    }

    // First interaction may also need to trigger audio init
    if (!audioCtx) initEngine(); // Fire‑and‑forget (no await needed here)

    updateState({ atmosphericPressure: value });
  } catch (err) {
    console.error(err);
    alert('Slider update error: ' + err.message);
  }
});

// 4.2 Enclosure Select
enclosureSelect.addEventListener('change', (e) => {
  try {
    const value = e.target.value;
    if (!audioCtx) initEngine();
    updateState({ enclosure: value });
  } catch (err) {
    console.error(err);
    alert('Enclosure selection error: ' + err.message);
  }
});

// 4.3 "Add Acoustic Expert" Button
addLayerBtn.addEventListener('click', async (e) => {
  try {
    await initEngine();
    openModal();
  } catch (err) {
    console.error(err);
    alert('Failed to open expert sheet: ' + err.message);
  }
});

// 4.4 Close modal when clicking the semi‑transparent backdrop
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

// 4.5 Expert selection buttons inside the modal (CORRECTED)
layerModal.addEventListener('click', async (e) => {
  try {
    const btn = e.target.closest('.sheet-btn');
    if (!btn) return;

    // "Custom · Paste Expert Code" closes the sheet but does nothing else yet
    if (btn.id === 'injectCodeBtn') {
      closeModal();
      return;
    }

    const expertType = btn.dataset.expert;
    if (!expertType) return;

    // Ensure audio engine is fully initialised before creating any expert
    await initEngine();

    // Extra safety – both audioCtx and masterBus must exist
    if (!audioCtx || !masterBus) {
      throw new Error('Audio engine not properly initialised. Tap "Add Expert" again.');
    }

        // ---- Instantiate the requested expert ----
    let expert = null;

    if (expertType === 'rain') {
      expert = new RainExpert(audioCtx, masterBus);
    } else if (expertType === 'wind') {
      expert = new WindExpert(audioCtx, masterBus);
    } else {
      throw new Error(`Unknown expert type: "${expertType}"`);
    }

    // Har expert ke paas apna internal .id hota hai (from constructor)
    const id = expert.id; 
    activeExperts.set(id, expert);

    // Expert card UI generate karo aur Rack mein daalo
    const uiCardHTML = expert.getUICard();
    expertRack.insertAdjacentHTML('beforeend', uiCardHTML);
    
    // Last added card ko pakdo aur controls bind karo
    const card = expertRack.lastElementChild;
    expert.bindCardControls(card);

    // Immediately sync with the current world state
    expert.onWorldStateUpdate(currentState);
    
    console.log(`✨ Expert Added: ${expertType} (ID: ${id})`);
    closeModal();
  } catch (err) {
    console.error(err);
    alert('Cannot add expert: ' + err.message);
  }
});

// ---------------------------------------------------------------------------
// 5. The Killer – Event Delegation for Expert Removal
// ---------------------------------------------------------------------------
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
    console.log(`🗑️ Expert ${id} removed`);
  } catch (err) {
    console.error(err);
    alert('Error removing expert: ' + err.message);
  }
});

// ---------------------------------------------------------------------------
// Utility: Fallback UUID generator (for browsers without crypto.randomUUID)
// ---------------------------------------------------------------------------
function fallbackUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Final Initialisation
// ---------------------------------------------------------------------------
if (sliderValueIndicator) {
  sliderValueIndicator.textContent = pressureSlider.value;
}
currentState.enclosure = enclosureSelect.value;

// Expose internal state for debugging (can be removed in production)
window.__symbioteState = currentState;
window.__activeExperts = activeExperts;
