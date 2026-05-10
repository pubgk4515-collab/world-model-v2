// /devtools/architect/architect_panel.js
// Symbiote Studio — Architect Console Panel
// Floating detachable AI debugging console

import {
    createArchitectRuntime
} from './architect_runtime.js';

import {
    createArchitectScanner
} from './architect_scanner.js';

import {
    createPromptBuilder
} from './architect_prompt_builder.js';

import {
    createArchitectRenderer
} from './architect_renderer.js';

export function createArchitectPanel() {

    // =====================================================
    // SINGLETON
    // =====================================================

    if (window.__architectPanelMounted) {
        return window.__architectPanelAPI;
    }

    window.__architectPanelMounted = true;

    // =====================================================
    // ROOT
    // =====================================================

    const root = document.createElement('div');

    root.id = 'architect-console';

    root.innerHTML = `
        <div class="architect-shell">

            <!-- HEADER -->
            <div class="architect-header">

                <div class="architect-header-left">

                    <div class="architect-dot"></div>

                    <div>
                        <div class="architect-title">
                            Architect Console
                        </div>

                        <div class="architect-subtitle">
                            Runtime AI Project Surgeon
                        </div>
                    </div>

                </div>

                <button
                    class="architect-close"
                    type="button"
                    aria-label="Close Architect"
                >
                    ✕
                </button>

            </div>

            <!-- STATUS -->
            <div class="architect-status">

                <div class="architect-status-pill">
                    PROJECT LINKED
                </div>

                <div class="architect-status-text">
                    VS Code bridge active
                </div>

            </div>

            <!-- INPUT -->
            <div class="architect-input-wrap">

                <textarea
                    id="architectPrompt"
                    class="architect-textarea"
                    placeholder="Describe the issue...\n\nExample:\nWind slider not updating intensity.\nRemove button broken.\nAudio crackling on Android."
                ></textarea>

            </div>

            <!-- ACTIONS -->
            <div class="architect-actions">

                <button
                    id="architectScanBtn"
                    class="architect-btn architect-btn-secondary"
                    type="button"
                >
                    Scan Project
                </button>

                <button
                    id="architectFixBtn"
                    class="architect-btn architect-btn-primary"
                    type="button"
                >
                    Generate Fix
                </button>

            </div>

            <!-- CHECKBOXES -->
            <div class="architect-flags">

                <label class="architect-flag">
                    <input
                        type="checkbox"
                        id="architectIncludeDOM"
                        checked
                    />
                    Include DOM
                </label>

                <label class="architect-flag">
                    <input
                        type="checkbox"
                        id="architectIncludeConsole"
                        checked
                    />
                    Include Console
                </label>

                <label class="architect-flag">
                    <input
                        type="checkbox"
                        id="architectIncludeAudio"
                        checked
                    />
                    Include Audio
                </label>

            </div>

            <!-- RESULT -->
            <div
                id="architectResult"
                class="architect-result"
            >
                <div class="architect-placeholder">
                    Waiting for analysis...
                </div>
            </div>

        </div>
    `;

    document.body.appendChild(root);

    // =====================================================
    // MODULES
    // =====================================================

    const scanner =
        createArchitectScanner();

    const runtime =
        createArchitectRuntime();

    const promptBuilder =
        createPromptBuilder();

    const renderer =
        createArchitectRenderer();

    // =====================================================
    // DOM
    // =====================================================

    const promptEl =
        root.querySelector('#architectPrompt');

    const resultEl =
        root.querySelector('#architectResult');

    const scanBtn =
        root.querySelector('#architectScanBtn');

    const fixBtn =
        root.querySelector('#architectFixBtn');

    const closeBtn =
        root.querySelector('.architect-close');

    const includeDOM =
        root.querySelector('#architectIncludeDOM');

    const includeConsole =
        root.querySelector('#architectIncludeConsole');

    const includeAudio =
        root.querySelector('#architectIncludeAudio');

    // =====================================================
    // STATE
    // =====================================================

    let latestScan = null;

    // =====================================================
    // SCAN
    // =====================================================

    scanBtn.addEventListener(
        'click',
        async () => {

            scanBtn.disabled = true;

            renderer.renderLoading(
                resultEl,
                'Scanning runtime...'
            );

            try {

                latestScan =
                    await scanner.scan({

                        includeDOM:
                            includeDOM.checked,

                        includeConsole:
                            includeConsole.checked,

                        includeAudio:
                            includeAudio.checked
                    });

                renderer.renderScanResult(
                    resultEl,
                    latestScan
                );

            } catch (err) {

                console.error(err);

                renderer.renderError(
                    resultEl,
                    err.message
                );

            } finally {

                scanBtn.disabled = false;
            }
        }
    );

    // =====================================================
    // FIX
    // =====================================================

    fixBtn.addEventListener(
        'click',
        async () => {

            const userPrompt =
                promptEl.value.trim();

            if (!userPrompt) {

                renderer.renderError(
                    resultEl,
                    'Describe the issue first.'
                );

                return;
            }

            fixBtn.disabled = true;

            renderer.renderLoading(
                resultEl,
                'Architect generating fixes...'
            );

            try {

                // -----------------------------------------
                // AUTO SCAN IF EMPTY
                // -----------------------------------------

                if (!latestScan) {

                    latestScan =
                        await scanner.scan({

                            includeDOM:
                                includeDOM.checked,

                            includeConsole:
                                includeConsole.checked,

                            includeAudio:
                                includeAudio.checked
                        });
                }

                // -----------------------------------------
                // BUILD PROMPT
                // -----------------------------------------

                const finalPrompt =
                    promptBuilder.build({

                        userPrompt,

                        scan: latestScan
                    });

                // -----------------------------------------
                // API CALL
                // -----------------------------------------

                const response =
                    await runtime.askArchitect(
                        finalPrompt,
                        latestScan
                    );

                // -----------------------------------------
                // RENDER
                // -----------------------------------------

                renderer.renderResponse(
                    resultEl,
                    response
                );

            } catch (err) {

                console.error(err);

                renderer.renderError(
                    resultEl,
                    err.message
                );

            } finally {

                fixBtn.disabled = false;
            }
        }
    );

    // =====================================================
    // CLOSE
    // =====================================================

    closeBtn.addEventListener(
        'click',
        () => {

            root.remove();

            window.__architectPanelMounted =
                false;

            window.__architectPanelAPI =
                null;
        }
    );

    // =====================================================
    // ESC KEY
    // =====================================================

    window.addEventListener(
        'keydown',
        (e) => {

            if (
                e.key === 'Escape'
                && document.body.contains(root)
            ) {

                root.remove();

                window.__architectPanelMounted =
                    false;

                window.__architectPanelAPI =
                    null;
            }
        }
    );

    // =====================================================
    // PUBLIC API
    // =====================================================

    const api = {

        open() {
            root.style.display = 'block';
        },

        close() {
            root.remove();

            window.__architectPanelMounted =
                false;

            window.__architectPanelAPI =
                null;
        },

        scan() {
            scanBtn.click();
        }
    };

    window.__architectPanelAPI = api;

    console.log(
        '🧠 Architect Console mounted.'
    );

    return api;
}