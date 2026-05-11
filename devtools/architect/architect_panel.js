// /devtools/architect/architect_panel.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Dock
// Premium Floating AI Workspace
// Production Runtime Edition
// -----------------------------------------------------------------------------

import ArchitectRuntime
from './architect_runtime.js';

import ArchitectRenderer
from './architect_renderer.js';

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

    if (window.__architectDockMounted) {

        console.warn(
            '[ArchitectDock] Already mounted.'
        );

        return window.__architectDockAPI;
    }

    window.__architectDockMounted =
        true;

    // -------------------------------------------------------------------------
    // ROOT
    // -------------------------------------------------------------------------

    const root =
        document.createElement('div');

    root.id =
        'architect-console-root';

    // -------------------------------------------------------------------------
    // TEMPLATE
    // -------------------------------------------------------------------------

    root.innerHTML = `
        <section
            id="architectDock"
            class="architect-dock"
        >

            <!-- ========================================================== -->
            <!-- TOPBAR -->
            <!-- ========================================================== -->

            <header class="architect-topbar">

                <div class="architect-brand">

                    <div class="architect-brand-orb"></div>

                    <div class="architect-brand-copy">

                        <div class="architect-brand-title">
                            Architect AI
                        </div>

                        <div class="architect-brand-subtitle">
                            Runtime Development Workspace
                        </div>

                    </div>

                </div>

                <div class="architect-topbar-actions">

                    <button
                        id="architectMinimizeBtn"
                        class="architect-icon-btn"
                        type="button"
                        aria-label="Minimize"
                    >
                        —
                    </button>

                    <button
                        id="architectCloseBtn"
                        class="architect-icon-btn"
                        type="button"
                        aria-label="Close"
                    >
                        ✕
                    </button>

                </div>

            </header>

            <!-- ========================================================== -->
            <!-- STATUS -->
            <!-- ========================================================== -->

            <section class="architect-runtime-strip">

                <div class="architect-runtime-pill">
                    CONNECTED
                </div>

                <div class="architect-runtime-meta">

                    <div class="architect-runtime-dot"></div>

                    <span>
                        OpenAI Runtime Active
                    </span>

                </div>

            </section>

            <!-- ========================================================== -->
            <!-- NAVIGATION -->
            <!-- ========================================================== -->

            <nav class="architect-tabs">

                <button
                    class="architect-tab active"
                    data-tab="workspace"
                    type="button"
                >
                    Workspace
                </button>

                <button
                    class="architect-tab"
                    data-tab="scan"
                    type="button"
                >
                    Scan
                </button>

                <button
                    class="architect-tab"
                    data-tab="logs"
                    type="button"
                >
                    Logs
                </button>

                <button
                    class="architect-tab"
                    data-tab="patches"
                    type="button"
                >
                    Patches
                </button>

            </nav>

            <!-- ========================================================== -->
            <!-- WORKSPACE -->
            <!-- ========================================================== -->

            <main
                id="architectWorkspace"
                class="architect-workspace"
            >

                <div class="architect-welcome">

                    <div class="architect-welcome-badge">
                        ARCHITECT ONLINE
                    </div>

                    <h2 class="architect-welcome-title">
                        Symbiote Development Runtime
                    </h2>

                    <p class="architect-welcome-text">
                        Scan project state, inspect runtime logs,
                        generate AI patches, and apply fixes safely.
                    </p>

                </div>

                <!-- LIVE OUTPUT -->

                <div
                    id="architectResult"
                    class="architect-result"
                >

                    <div class="architect-placeholder">

                        <div class="architect-placeholder-icon">
                            ◉
                        </div>

                        <div class="architect-placeholder-title">
                            Architect Ready
                        </div>

                        <div class="architect-placeholder-text">
                            Waiting for runtime instructions...
                        </div>

                    </div>

                </div>

            </main>

            <!-- ========================================================== -->
            <!-- CONTROLS -->
            <!-- ========================================================== -->

            <section class="architect-controls">

                <label class="architect-toggle">

                    <input
                        type="checkbox"
                        id="architectIncludeDOM"
                        checked
                    />

                    <span>
                        Include DOM
                    </span>

                </label>

                <label class="architect-toggle">

                    <input
                        type="checkbox"
                        id="architectIncludeConsole"
                        checked
                    />

                    <span>
                        Include Console
                    </span>

                </label>

                <label class="architect-toggle">

                    <input
                        type="checkbox"
                        id="architectIncludeAudio"
                        checked
                    />

                    <span>
                        Include Audio
                    </span>

                </label>

            </section>

            <!-- ========================================================== -->
            <!-- COMPOSER -->
            <!-- ========================================================== -->

            <footer class="architect-composer">

                <textarea
                    id="architectPrompt"
                    class="architect-composer-input"
                    placeholder="Describe the issue...

Examples:
• Wind slider not updating
• Audio crackling on Android
• Remove button broken
• UI not responsive on mobile"
                ></textarea>

                <div class="architect-composer-actions">

                    <button
                        id="architectScanBtn"
                        class="architect-secondary-btn"
                        type="button"
                    >
                        Scan Runtime
                    </button>

                    <button
                        id="architectFixBtn"
                        class="architect-primary-btn"
                        type="button"
                    >
                        Generate Patch
                    </button>

                </div>

            </footer>

        </section>
    `;

    // -------------------------------------------------------------------------
    // APPEND
    // -------------------------------------------------------------------------

    document.body.appendChild(root);

    // -------------------------------------------------------------------------
    // DOM
    // -------------------------------------------------------------------------

    const dock =
        root.querySelector(
            '#architectDock'
        );

    const workspace =
        root.querySelector(
            '#architectWorkspace'
        );

    const resultEl =
        root.querySelector(
            '#architectResult'
        );

    const promptEl =
        root.querySelector(
            '#architectPrompt'
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

    const minimizeBtn =
        root.querySelector(
            '#architectMinimizeBtn'
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

    const tabs =
        Array.from(
            root.querySelectorAll(
                '.architect-tab'
            )
        );

    // -------------------------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------------------------

    const required = {

        dock,
        workspace,
        resultEl,
        promptEl,
        scanBtn,
        fixBtn,
        closeBtn,
        minimizeBtn
    };

    for (
        const [key, value]
        of Object.entries(required)
    ) {

        if (!value) {

            throw new Error(
                `[ArchitectDock] Missing element: ${key}`
            );
        }
    }

    // -------------------------------------------------------------------------
    // RENDERER
    // -------------------------------------------------------------------------

    const renderer =
        new ArchitectRenderer(
            resultEl
        );

    // -------------------------------------------------------------------------
    // RUNTIME
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
    // SCANNER
    // -------------------------------------------------------------------------

    const scanner = {

        async scan(options = {}) {

            try {

                // DEFAULT EXPORT

                if (
                    typeof
                    ScannerModule.default ===
                    'function'
                ) {

                    return await
                        ScannerModule.default(
                            options
                        );
                }

                // FACTORY

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

                // scanProject()

                if (
                    typeof
                    ScannerModule.scanProject ===
                    'function'
                ) {

                    return await
                        ScannerModule.scanProject(
                            options
                        );
                }

                throw new Error(
                    'No scanner implementation found.'
                );

            } catch (err) {

                console.error(
                    '[ArchitectDock Scanner]',
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
                    PromptBuilder.build ===
                    'function'
                ) {

                    return PromptBuilder.build(
                        payload
                    );
                }

                if (
                    typeof
                    PromptBuilder
                    .buildArchitectPrompt ===
                    'function'
                ) {

                    return PromptBuilder
                        .buildArchitectPrompt(
                            payload
                        );
                }

            } catch (err) {

                console.error(
                    '[ArchitectDock Prompt]',
                    err
                );
            }

            return `
ARCHITECT AI ANALYSIS

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

    // -------------------------------------------------------------------------
    // STATE
    // -------------------------------------------------------------------------

    let latestScan =
        null;

    let isMinimized =
        false;

    // -------------------------------------------------------------------------
    // SCAN
    // -------------------------------------------------------------------------

    async function handleScan() {

        try {

            scanBtn.disabled =
                true;

            renderer.renderLoading(
                resultEl,
                'Scanning runtime workspace...'
            );

            latestScan =
                await scanner.scan({

                    includeDOM:
                        includeDOM?.checked ?? true,

                    includeConsole:
                        includeConsole?.checked ?? true,

                    includeAudio:
                        includeAudio?.checked ?? true
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
                'Runtime scan failed.'
            );

        } finally {

            scanBtn.disabled =
                false;
        }
    }

    // -------------------------------------------------------------------------
    // GENERATE
    // -------------------------------------------------------------------------

    async function handleFix() {

        try {

            const userPrompt =
                promptEl?.value?.trim();

            if (!userPrompt) {

                renderer.renderError(
                    resultEl,
                    'Describe an issue first.'
                );

                return;
            }

            fixBtn.disabled =
                true;

            renderer.renderLoading(
                resultEl,
                'Generating AI repair patch...'
            );

            // AUTO SCAN

            if (!latestScan) {

                latestScan =
                    await scanner.scan({

                        includeDOM:
                            includeDOM?.checked ?? true,

                        includeConsole:
                            includeConsole?.checked ?? true,

                        includeAudio:
                            includeAudio?.checked ?? true
                    });
            }

            // PROMPT

            const finalPrompt =
                promptBuilder.build({

                    userPrompt,
                    scan:
                        latestScan
                });

            // AI

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
                'Patch generation failed.'
            );

        } finally {

            fixBtn.disabled =
                false;
        }
    }

    // -------------------------------------------------------------------------
    // MINIMIZE
    // -------------------------------------------------------------------------

    function toggleMinimize() {

        isMinimized =
            !isMinimized;

        dock.classList.toggle(
            'architect-minimized',
            isMinimized
        );
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

        window.__architectDockMounted =
            false;

        window.__architectDockAPI =
            null;
    }

    // -------------------------------------------------------------------------
    // ESCAPE
    // -------------------------------------------------------------------------

    function handleEscape(event) {

        if (
            event.key === 'Escape'
        ) {

            destroyPanel();
        }
    }

    // -------------------------------------------------------------------------
    // TABS
    // -------------------------------------------------------------------------

    function handleTabClick(event) {

        const current =
            event.currentTarget;

        tabs.forEach(tab => {

            tab.classList.remove(
                'active'
            );
        });

        current.classList.add(
            'active'
        );
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

    minimizeBtn.addEventListener(
        'click',
        toggleMinimize
    );

    tabs.forEach(tab => {

        tab.addEventListener(
            'click',
            handleTabClick
        );
    });

    window.addEventListener(
        'keydown',
        handleEscape
    );

    // -------------------------------------------------------------------------
    // API
    // -------------------------------------------------------------------------

    const api = {

        open() {

            dock.style.display =
                'flex';
        },

        close() {

            destroyPanel();
        },

        minimize() {

            toggleMinimize();
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

    window.__architectDockAPI =
        api;

    console.log(
        '🧠 Architect Dock mounted.'
    );

    return api;
}
