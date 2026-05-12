/**
 * experts/wind/ui/wind_ui.js
 * ---------------------------------------------------------
 * Symbiote Studio — Wind Expert UI Layer
 * Mobile-first glassmorphism control card
 * ---------------------------------------------------------
 */

export function createWindCardHTML(id) {
  return `
    <section class="expert-card wind-card" data-id="${id}">
      
      <div class="expert-header">
        <div>
          <div class="expert-label">
            ATMOSPHERE · WIND
          </div>

          <h2 class="expert-title">
            Wind Expert
          </h2>

          <p class="expert-description">
            Procedural atmospheric airflow synthesis with
            modular resonance and spatial movement.
          </p>
        </div>

        <button class="remove-btn">
          Remove
        </button>
      </div>

      <!-- STATUS GRID -->

      <div class="wind-status-grid">

        <div class="wind-status-box">
          <span class="status-label">STATE</span>
          <span class="status-value wind-mode">
            Gentle Breeze
          </span>
        </div>

        <div class="wind-status-box">
          <span class="status-label">PRESSURE</span>
          <span class="status-value wind-pressure">
            0.50
          </span>
        </div>

        <div class="wind-status-box">
          <span class="status-label">ENERGY</span>
          <span class="status-value wind-energy">
            18%
          </span>
        </div>

        <div class="wind-status-box">
          <span class="status-label">WIDTH</span>
          <span class="status-value wind-width-value">
            70%
          </span>
        </div>

      </div>

      <!-- CONTROLS -->

      <div class="wind-control-group">

        <!-- INTENSITY -->
        <div class="wind-slider-row">
          <div class="wind-slider-top">
            <span>INTENSITY</span>
            <span class="intensity-readout">0.18</span>
          </div>

          <input
            type="range"
            class="wind-slider intensity-slider"
            min="0"
            max="1"
            step="0.01"
            value="0.18"
          />
        </div>

        <!-- MOVEMENT -->
        <div class="wind-slider-row">
          <div class="wind-slider-top">
            <span>MOVEMENT</span>
            <span class="movement-readout">0.52</span>
          </div>

          <input
            type="range"
            class="wind-slider movement-slider"
            min="0"
            max="1"
            step="0.01"
            value="0.52"
          />
        </div>

        <!-- TEXTURE -->
        <div class="wind-slider-row">
          <div class="wind-slider-top">
            <span>TEXTURE</span>
            <span class="texture-readout">0.44</span>
          </div>

          <input
            type="range"
            class="wind-slider texture-slider"
            min="0"
            max="1"
            step="0.01"
            value="0.44"
          />
        </div>

        <!-- RESONANCE -->
        <div class="wind-slider-row">
          <div class="wind-slider-top">
            <span>RESONANCE</span>
            <span class="resonance-readout">0.36</span>
          </div>

          <input
            type="range"
            class="wind-slider resonance-slider"
            min="0"
            max="1"
            step="0.01"
            value="0.36"
          />
        </div>

        <!-- BLOOM -->
        <div class="wind-slider-row">
          <div class="wind-slider-top">
            <span>BLOOM</span>
            <span class="bloom-readout">0.35</span>
          </div>

          <input
            type="range"
            class="wind-slider bloom-slider"
            min="0"
            max="1"
            step="0.01"
            value="0.35"
          />
        </div>

        <!-- WIDTH -->
        <div class="wind-slider-row">
          <div class="wind-slider-top">
            <span>STEREO WIDTH</span>
            <span class="width-readout">0.70</span>
          </div>

          <input
            type="range"
            class="wind-slider width-slider"
            min="0"
            max="1"
            step="0.01"
            value="0.70"
          />
        </div>

      </div>

      <!-- FOOTER -->

      <div class="wind-footer-text">
        Real-time atmospheric synthesis engine active.
      </div>

    </section>
  `;
}

/**
 * ---------------------------------------------------------
 * Slider Fill Styling
 * ---------------------------------------------------------
 */

export function updateSliderVisual(slider) {
  const value = parseFloat(slider.value);
  const pct = value * 100;

  slider.style.background = `
    linear-gradient(
      90deg,
      rgba(124,58,237,0.95) 0%,
      rgba(59,130,246,0.95) ${pct}%,
      rgba(255,255,255,0.08) ${pct}%,
      rgba(255,255,255,0.08) 100%
    )
  `;
}

/**
 * ---------------------------------------------------------
 * Update Wind Status Labels
 * ---------------------------------------------------------
 */

export function updateWindStatus(card, intensity) {
  const mode = card.querySelector('.wind-mode');
  const energy = card.querySelector('.wind-energy');

  if (!mode || !energy) return;

  let label = 'Gentle Breeze';

  if (intensity > 0.25) {
    label = 'Open Wind';
  }

  if (intensity > 0.45) {
    label = 'Moving Gusts';
  }

  if (intensity > 0.65) {
    label = 'Heavy Atmosphere';
  }

  if (intensity > 0.82) {
    label = 'Storm Front';
  }

  mode.textContent = label;
  energy.textContent = `${Math.round(intensity * 100)}%`;
}

/**
 * ---------------------------------------------------------
 * Initialize UI Bindings
 * ---------------------------------------------------------
 */

export function bindWindUI(card, expert) {

  const intensitySlider =
    card.querySelector('.intensity-slider');

  const movementSlider =
    card.querySelector('.movement-slider');

  const textureSlider =
    card.querySelector('.texture-slider');

  const resonanceSlider =
    card.querySelector('.resonance-slider');

  const bloomSlider =
    card.querySelector('.bloom-slider');

  const widthSlider =
    card.querySelector('.width-slider');

  const pressureText =
    card.querySelector('.wind-pressure');

  const widthText =
    card.querySelector('.wind-width-value');

  // -------------------------------------------------------
  // Slider Setup
  // -------------------------------------------------------

  [
    intensitySlider,
    movementSlider,
    textureSlider,
    resonanceSlider,
    bloomSlider,
    widthSlider
  ].forEach(updateSliderVisual);

  // -------------------------------------------------------
  // Intensity
  // -------------------------------------------------------

  intensitySlider.addEventListener('input', (e) => {

    const v = parseFloat(e.target.value);

    card.querySelector('.intensity-readout')
      .textContent = v.toFixed(2);

    updateSliderVisual(e.target);
    updateWindStatus(card, v);

    expert.setIntensity(v);
  });

  // -------------------------------------------------------
  // Movement
  // -------------------------------------------------------

  movementSlider.addEventListener('input', (e) => {

    const v = parseFloat(e.target.value);

    card.querySelector('.movement-readout')
      .textContent = v.toFixed(2);

    updateSliderVisual(e.target);

    expert.setMovement(v);
  });

  // -------------------------------------------------------
  // Texture
  // -------------------------------------------------------

  textureSlider.addEventListener('input', (e) => {

    const v = parseFloat(e.target.value);

    card.querySelector('.texture-readout')
      .textContent = v.toFixed(2);

    updateSliderVisual(e.target);

    expert.setTexture(v);
  });

  // -------------------------------------------------------
  // Resonance
  // -------------------------------------------------------

  resonanceSlider.addEventListener('input', (e) => {

    const v = parseFloat(e.target.value);

    card.querySelector('.resonance-readout')
      .textContent = v.toFixed(2);

    updateSliderVisual(e.target);

    expert.setResonance(v);
  });

  // -------------------------------------------------------
  // Bloom
  // -------------------------------------------------------

  bloomSlider.addEventListener('input', (e) => {

    const v = parseFloat(e.target.value);

    card.querySelector('.bloom-readout')
      .textContent = v.toFixed(2);

    updateSliderVisual(e.target);

    expert.setBloom(v);
  });

  // -------------------------------------------------------
  // Width
  // -------------------------------------------------------

  widthSlider.addEventListener('input', (e) => {

    const v = parseFloat(e.target.value);

    card.querySelector('.width-readout')
      .textContent = v.toFixed(2);

    widthText.textContent =
      `${Math.round(v * 100)}%`;

    updateSliderVisual(e.target);

    expert.setStereoWidth(v);
  });

  // -------------------------------------------------------
  // Pressure Updates From World State
  // -------------------------------------------------------

  expert.onPressureChange = (pressure) => {
    pressureText.textContent =
      pressure.toFixed(2);
  };

  // -------------------------------------------------------
  // Initial State
  // -------------------------------------------------------

  updateWindStatus(
    card,
    parseFloat(intensitySlider.value)
  );
}