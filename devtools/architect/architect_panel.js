// /devtools/architect/architect_panel.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Console Panel
// Bulletproof Runtime Edition
// -----------------------------------------------------------------------------

import ArchitectRenderer
from './architect_renderer.js';

import ArchitectRuntime
from './architect_runtime.js';

import * as ScannerModule
from './architect_scanner.js';

import * as PromptBuilder
from './architect_prompt_builder.js';

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

export function createArchitectPanel() {

    // -------------------------------------------------------------------------
    // SINGLETON
    // -------------------------------------------------------------------------

    if (window.__architectPanelMounted) {

        console.warn(
            '[Architect] Panel already mounted.'
        );

        return window.__architectPanelAPI;
    }

    window.__architectPanelMounted = true;

    // -------------------------------------------------------------------------
    // ROOT
    // -------------------------------------------------------------------------

    const root =
        document.createElement('div');

    root.id =
        'architect-console-root';

    // -------------------------------------------------------------------------
    // HTML
    // -------------------------------------------------------------------------

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
                    id="architectCloseBtn"
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

    // -------------------------------------------------------------------------
    // APPEND
    // -------------------------------------------------------------------------

    document.body.appendChild(root);

    // -------------------------------------------------------------------------
    // PANEL ROOT
    // -------------------------------------------------------------------------

    const panelRoot =
        root.querySelector(
            '#architect-panel'
        );

    if (!panelRoot) {

        throw new Error(
            '[Architect] Panel root missing.'
        );
    }

    console.log(
        'ARCHITECT ROOT:',
        panelRoot
    );

    // -------------------------------------------------------------------------
    // DOM
    // -------------------------------------------------------------------------

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
            '#architectCloseBtn'
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

    // -------------------------------------------------------------------------
    // DOM VALIDATION
    // -------------------------------------------------------------------------

    const requiredElements = {

        promptEl,
        resultEl,
        scanBtn,
        fixBtn,
        closeBtn,
        includeDOM,
        includeConsole,
        includeAudio
    };

    for (
        const [key, value]
        of Object.entries(requiredElements)
    ) {

        if (!value) {

            throw new Error(
                `[Architect] Missing DOM element: ${key}`
            );
        }
    }

    // -------------------------------------------------------------------------
    // DEBUG
    // -------------------------------------------------------------------------

    console.log({

        promptEl,
        resultEl,
        scanBtn,
        fixBtn,
        closeBtn,
        includeDOM,
        includeConsole,
        includeAudio
    });

    // -------------------------------------------------------------------------
    // RENDERER
    // IMPORTANT:
    // Renderer ONLY controls result area.
    // NEVER pass panelRoot here.
    // -------------------------------------------------------------------------

    const renderer =
        new ArchitectRenderer(
            resultEl
        );

    // -------------------------------------------------------------------------
    // RUNTIME
    // IMPORTANT:
    // Runtime renderer target MUST be resultEl.
    // Otherwise renderer nukes full panel UI.
    // -------------------------------------------------------------------------

    const runtime =
        new ArchitectRuntime({

            root:
                resultEl,

            output:
                resultEl,

            textarea:
                promptEl,

            generateBtn:
                fixBtn,

            scanBtn:
                scanBtn
        });

    // -------------------------------------------------------------------------
    // SCANNER WRAPPER
    // -------------------------------------------------------------------------

    const scanner = {

        async scan(options = {}) {

            try {

                // Use factory export (only valid pattern)
                if (
                    typeof
                    ScannerModule
                    .createArchitectScanner ===
                    'function'
                ) {

                    const instance =
                        ScannerModule
                        .createArchitectScanner();

                    if (
                        instance &&
                        typeof instance.scan ===
                        'function'
                    ) {

                        return await
                            instance.scan(
                                options
                            );
                    }
                }

                throw new Error(
                    'Scanner not properly initialized.'
                );

            } catch (err) {

                console.error(
                    '[Architect Scanner Error]',
                    err
                );

                return {

                    success: false,

                    error:
                        err.message,

                    files: [],

                    console: [],

                    dom: {}
                };
            }
        }
    };

    // -------------------------------------------------------------------------
    // PROMPT BUILDER
    // -------------------------------------------------------------------------

    const promptBuilder = {

        build(payload = {}) {

            try {

                if (
                    typeof
                    PromptBuilder
                    .createPromptBuilder ===
                    'function'
                ) {

                    const instance =
                        PromptBuilder
                        .createPromptBuilder();

                    if (
                        instance &&
                        typeof instance.build ===
                        'function'
                    ) {

                        return instance.build(
                            payload
                        );
                    }
                }

            } catch (err) {

                console.error(
                    '[Prompt Builder Error]',
                    err
                );
            }

            return `
ARCHITECT ANALYSIS REQUEST

USER ISSUE:
${payload.userPrompt || ''}

SCAN DATA:
${JSON.stringify(
    payload.scan || {},
    null,
    2
)}
            `;
        }
    };

    // -------------------------------------------------------------------------
    // STATE
    // -------------------------------------------------------------------------

    let latestScan =
        null;

    // -------------------------------------------------------------------------
    // SCAN
    // -------------------------------------------------------------------------

    async function handleScan() {

        try {

            scanBtn.disabled =
                true;

            renderer.renderLoading(
                resultEl,
                'Scanning project runtime...'
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
                'Project scan failed.'
            );

        } finally {

            scanBtn.disabled =
                false;
        }
    }

    // -------------------------------------------------------------------------
    // FIX
    // -------------------------------------------------------------------------

    async function handleFix() {

        try {

            const userPrompt =
                promptEl.value.trim();

            if (!userPrompt) {

                renderer.renderError(
                    resultEl,
                    'Describe the issue first.'
                );

                return;
            }

            fixBtn.disabled =
                true;

            renderer.renderLoading(
                resultEl,
                'Generating AI repair plan...'
            );

            // -----------------------------------------------------------------
            // AUTO SCAN
            // -----------------------------------------------------------------

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

            // -----------------------------------------------------------------
            // BUILD PROMPT
            // -----------------------------------------------------------------

            const finalPrompt =
                promptBuilder.build({

                    userPrompt,
                    scan: latestScan
                });

            // -----------------------------------------------------------------
            // AI CALL
            // -----------------------------------------------------------------

            const response =
                await runtime.askArchitect(
                    finalPrompt,
                    latestScan
                );

            // -----------------------------------------------------------------
            // RENDER
            // -----------------------------------------------------------------

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

            fixBtn.disabled =
                false;
        }
    }

    // -------------------------------------------------------------------------
    // DESTROY
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // ESC
    // -------------------------------------------------------------------------

    function handleEscape(event) {

        if (
            event.key === 'Escape'
        ) {

            destroyPanel();
        }
    }

    // -------------------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------------------

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

    window.addEventListener(
        'keydown',
        handleEscape
    );

    // -------------------------------------------------------------------------
    // API
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // GLOBAL
    // -------------------------------------------------------------------------

    window.__architectPanelAPI =
        api;

    console.log(
        '🧠 Architect Console mounted successfully.'
    );

    return api;
}