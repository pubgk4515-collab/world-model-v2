// /devtools/architect/architect_panel.js
// Symbiote Studio — Architect Console Panel
// Stable Runtime Edition

import ArchitectRenderer
from './architect_renderer.js';

import scanProject
from './architect_scanner.js';

import * as PromptBuilder
from './architect_prompt_builder.js';

import ArchitectRuntime
from './architect_runtime.js';

// =========================================================
// MAIN
// =========================================================

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

    const root =
        document.createElement('div');

    root.id =
        'architect-console';

    // =====================================================
    // HTML
    // =====================================================

    root.innerHTML = `
        <div
            id="architect-panel"
            class="architect-shell"
        >

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
                    placeholder="Describe the issue...

Example:
Wind slider not updating intensity.
Remove button broken.
Audio crackling on Android."
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

            <!-- FLAGS -->
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

    // =====================================================
    // APPEND
    // =====================================================

    document.body.appendChild(root);

    // =====================================================
    // PANEL ROOT
    // =====================================================

    const panelRoot =
        root.querySelector(
            '#architect-panel'
        );

    console.log(
        'ARCHITECT ROOT:',
        panelRoot
    );

    if (!panelRoot) {

        throw new Error(
            'Architect panel root missing.'
        );
    }

    // =====================================================
    // MODULES
    // =====================================================

    const scanner = {

        async scan(options = {}) {

            if (
                typeof scanProject === 'function'
            ) {

                return await scanProject(
                    options
                );
            }

            return {
                success: true,
                warning:
                    'Scanner unavailable.',
                files: [],
                console: [],
                dom: {}
            };
        }
    };

    const runtime =
        new ArchitectRuntime({
            root: panelRoot
        });

    const renderer =
        new ArchitectRenderer(
            panelRoot
        );

    // =====================================================
    // PROMPT BUILDER SAFE WRAPPER
    // =====================================================

    const promptBuilder = {

        build(payload = {}) {

            if (
                PromptBuilder &&
                typeof PromptBuilder.build ===
                    'function'
            ) {

                return PromptBuilder.build(
                    payload
                );
            }

            return `
Architect Analysis Request

USER ISSUE:
${payload.userPrompt || ''}

SCAN:
${JSON.stringify(
    payload.scan || {},
    null,
    2
)}
            `;
        }
    };

    // =====================================================
    // DOM
    // =====================================================

    const promptEl =
        root.querySelector(
            '#architectPrompt'
        );

    const resultEl =
        root.querySelector(
            '#architectResult'
        );

    const scanBtn =
        root.querySelector(
            '#architectScanBtn'
        );

    const fixBtn =
        root.querySelector(
            '#architectFixBtn'
        );

    const closeBtn =
        root.querySelector(
            '.architect-close'
        );

    const includeDOM =
        root.querySelector(
            '#architectIncludeDOM'
        );

    const includeConsole =
        root.querySelector(
            '#architectIncludeConsole'
        );

    const includeAudio =
        root.querySelector(
            '#architectIncludeAudio'
        );

    // =====================================================
    // STATE
    // =====================================================

    let latestScan = null;

    // =====================================================
    // SCAN HANDLER
    // =====================================================

    async function handleScan() {

        scanBtn.disabled = true;

        try {

            renderer.renderLoading(
                resultEl,
                'Scanning project...'
            );

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
                err.message ||
                'Scan failed.'
            );

        } finally {

            scanBtn.disabled = false;
        }
    }

    // =====================================================
    // FIX HANDLER
    // =====================================================

    async function handleFix() {

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

        try {

            renderer.renderLoading(
                resultEl,
                'Generating repair plan...'
            );

            // AUTO SCAN
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

            // BUILD PROMPT
            const finalPrompt =
                promptBuilder.build({

                    userPrompt,
                    scan: latestScan
                });

            // RUNTIME
            const response =
                await runtime.askArchitect(
                    finalPrompt,
                    latestScan
                );

            renderer.renderResponse(
                resultEl,
                response
            );

        } catch (err) {

            console.error(err);

            renderer.renderError(
                resultEl,
                err.message ||
                'Fix generation failed.'
            );

        } finally {

            fixBtn.disabled = false;
        }
    }

    // =====================================================
    // EVENTS
    // =====================================================

    scanBtn.addEventListener(
        'click',
        handleScan
    );

    fixBtn.addEventListener(
        'click',
        handleFix
    );

    closeBtn.addEventListener(
        'click',
        destroyPanel
    );

    // =====================================================
    // ESC
    // =====================================================

    function handleEscape(e) {

        if (
            e.key === 'Escape'
        ) {

            destroyPanel();
        }
    }

    window.addEventListener(
        'keydown',
        handleEscape
    );

    // =====================================================
    // DESTROY
    // =====================================================

    function destroyPanel() {

        try {

            window.removeEventListener(
                'keydown',
                handleEscape
            );

            root.remove();

        } catch (err) {

            console.error(err);
        }

        window.__architectPanelMounted =
            false;

        window.__architectPanelAPI =
            null;
    }

    // =====================================================
    // API
    // =====================================================

    const api = {

        open() {

            root.style.display =
                'block';
        },

        close() {

            destroyPanel();
        },

        scan() {

            handleScan();
        },

        fix() {

            handleFix();
        }
    };

    window.__architectPanelAPI =
        api;

    console.log(
        '🧠 Architect Console mounted.'
    );

    return api;
}