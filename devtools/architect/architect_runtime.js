// /devtools/architect/architect_runtime.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Runtime
// Stable Runtime Edition
// -----------------------------------------------------------------------------

import ArchitectPatchEngine
from './architect_patch_engine.js';

import ArchitectRenderer
from './architect_renderer.js';

import * as ScannerModule
from './architect_scanner.js';

import * as PromptBuilder
from './architect_prompt_builder.js';

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

export default class ArchitectRuntime {

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    constructor(config = {}) {

        // ---------------------------------------------------------------------
        // API
        // ---------------------------------------------------------------------

        this.apiEndpoint =
            config.apiEndpoint ||
            '/api/architect';

        this.applyEndpoint =
            config.applyEndpoint ||
            '/api/apply-patch';

        // ---------------------------------------------------------------------
        // ROOT
        // ---------------------------------------------------------------------

        this.root =
            config.root || null;

        // ---------------------------------------------------------------------
        // DOM
        // ---------------------------------------------------------------------

        this.output =
            config.output || null;

        this.textarea =
            config.textarea || null;

        this.generateBtn =
            config.generateBtn || null;

        this.scanBtn =
            config.scanBtn || null;

        this.applyBtn =
            config.applyBtn || null;

        // ---------------------------------------------------------------------
        // ENGINE
        // ---------------------------------------------------------------------

        this.patchEngine =
            new ArchitectPatchEngine();

        // ---------------------------------------------------------------------
        // RENDERER
        // ---------------------------------------------------------------------

        this.renderer = null;

        if (!this.root) {

            console.warn(
                '[ArchitectRuntime] No root element provided.'
            );

        } else {

            try {

                this.renderer =
                    new ArchitectRenderer(
                        this.output
                    );

            } catch (err) {

                console.error(
                    '[ArchitectRuntime] Renderer init failed:',
                    err
                );
            }
        }

        // ---------------------------------------------------------------------
        // SCANNER
        // ---------------------------------------------------------------------

        this.scanner = null;

        try {

            if (
                typeof
                ScannerModule
                .createArchitectScanner ===
                'function'
            ) {

                this.scanner =
                    ScannerModule
                    .createArchitectScanner();
            }

        } catch (err) {

            console.error(
                '[ArchitectRuntime] Scanner init failed:',
                err
            );
        }

        // ---------------------------------------------------------------------
        // PROMPT BUILDER
        // ---------------------------------------------------------------------

        this.promptBuilder = null;

        try {

            if (
                typeof
                PromptBuilder
                .createPromptBuilder ===
                'function'
            ) {

                this.promptBuilder =
                    PromptBuilder
                    .createPromptBuilder();
            }

        } catch (err) {

            console.error(
                '[ArchitectRuntime] Prompt builder init failed:',
                err
            );
        }

        // ---------------------------------------------------------------------
        // STATE
        // ---------------------------------------------------------------------

        this.lastScan =
            null;

        this.lastPatch =
            null;

        this.isGenerating =
            false;

        this.isApplying =
            false;

        // ---------------------------------------------------------------------
        // INIT
        // ---------------------------------------------------------------------

        this.init();
    }

    // =========================================================================
    // INIT
    // =========================================================================

    init() {

        this.bindUI();

        this.safeRenderEmpty();

        console.log(
            '🧠 Architect Runtime ready.'
        );
    }

    // =========================================================================
    // SAFE RENDER HELPERS
    // =========================================================================

    safeRenderEmpty() {

        if (
            this.renderer &&
            typeof this.renderer.renderEmpty ===
            'function'
        ) {

            this.renderer.renderEmpty();
        }
    }

    safeRenderLoading(message) {

        if (
            this.renderer &&
            typeof this.renderer.renderLoading ===
            'function'
        ) {

            this.renderer.renderLoading(
                this.output,
                message
            );
        }
    }

    safeRenderError(message) {

        if (
            this.renderer &&
            typeof this.renderer.renderError ===
            'function'
        ) {

            this.renderer.renderError(
                this.output,
                message
            );
        }

        console.error(message);
    }

    safeRenderPatch(parsed) {

        if (
            this.renderer &&
            typeof
            this.renderer
            .renderPatchResult ===
            'function'
        ) {

            this.renderer.renderPatchResult(
                this.output,
                parsed
            );
        }
    }

    safeRenderSuccess(result) {

        if (
            this.renderer &&
            typeof
            this.renderer
            .renderApplySuccess ===
            'function'
        ) {

            this.renderer.renderApplySuccess(
                this.output,
                result
            );
        }
    }

    // =========================================================================
    // UI
    // =========================================================================

    bindUI() {

        // ---------------------------------------------------------------------
        // SCAN
        // ---------------------------------------------------------------------

        if (this.scanBtn) {

            this.scanBtn.addEventListener(
                'click',
                async () => {

                    await this.handleScan();
                }
            );
        }

        // ---------------------------------------------------------------------
        // GENERATE
        // ---------------------------------------------------------------------

        if (this.generateBtn) {

            this.generateBtn.addEventListener(
                'click',
                async () => {

                    await this.handleGenerate();
                }
            );
        }

        // ---------------------------------------------------------------------
        // APPLY
        // ---------------------------------------------------------------------

        if (this.applyBtn) {

            this.applyBtn.addEventListener(
                'click',
                async () => {

                    await this.handleApplyPatch();
                }
            );
        }
    }

    // =========================================================================
    // SCANNER
    // =========================================================================

    async scanProject(options = {}) {

        try {

            // Use factory export (only valid pattern)
            if (
                typeof
                ScannerModule
                .createArchitectScanner ===
                'function'
            ) {

                const scanner =
                    ScannerModule
                    .createArchitectScanner();

                if (
                    scanner &&
                    typeof scanner.scan ===
                    'function'
                ) {

                    return await
                        scanner.scan(
                            options
                        );
                }
            }

            throw new Error(
                'Scanner not properly initialized.'
            );

        } catch (err) {

            console.error(
                '[ArchitectRuntime] Scanner failed:',
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

    // =========================================================================
    // SCAN
    // =========================================================================

    async handleScan() {

        try {

            this.safeRenderLoading(
                'Scanning runtime...'
            );

            const scan =
                await this.scanProject();

            this.lastScan =
                scan;

            console.log(
                '📡 Scan complete:',
                scan
            );

            this.safeRenderEmpty();

        } catch (err) {

            console.error(
                '[ArchitectRuntime] Scan failed:',
                err
            );

            this.safeRenderError(
                err.message ||
                'Project scan failed.'
            );
        }
    }

    // =========================================================================
    // GENERATE
    // =========================================================================

    async handleGenerate() {

        if (this.isGenerating) {
            return;
        }

        try {

            this.isGenerating = true;

            // -----------------------------------------------------------------
            // INPUT
            // -----------------------------------------------------------------

            const issue =
                this.textarea?.value?.trim();

            if (!issue) {

                this.safeRenderError(
                    'Describe a project issue first.'
                );

                return;
            }

            // -----------------------------------------------------------------
            // SCAN
            // -----------------------------------------------------------------

            this.safeRenderLoading(
                'Scanning project...'
            );

            const scan =
                this.lastScan ||
                await this.scanProject();

            this.lastScan =
                scan;

            // -----------------------------------------------------------------
            // BUILD PROMPT
            // -----------------------------------------------------------------

            let payload = {

                issue,
                scan
            };

            if (
                PromptBuilder &&
                typeof
                PromptBuilder
                .buildArchitectPrompt ===
                'function'
            ) {

                payload =
                    PromptBuilder
                    .buildArchitectPrompt({

                        issue,
                        scan
                    });
            }

            // -----------------------------------------------------------------
            // API
            // -----------------------------------------------------------------

            this.safeRenderLoading(
                'Generating AI repair patch...'
            );

            const response =
                await fetch(
                    this.apiEndpoint,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );

            if (!response.ok) {

                const errText =
                    await response.text();

                throw new Error(
                    errText ||
                    'Architect API failed.'
                );
            }

            const data =
                await response.json();

            if (!data.ok) {

                throw new Error(
                    data.error ||
                    'Patch generation failed.'
                );
            }

            // -----------------------------------------------------------------
            // PARSE PATCH
            // -----------------------------------------------------------------

            const parsed =
                this.patchEngine.parse(
                    data.raw
                );

            if (!parsed.ok) {

                this.safeRenderError(
                    parsed.error ||
                    'Patch parse failed.'
                );

                return;
            }

            // -----------------------------------------------------------------
            // SAVE
            // -----------------------------------------------------------------

            this.lastPatch =
                parsed.patch;

            // -----------------------------------------------------------------
            // RENDER
            // -----------------------------------------------------------------

            this.safeRenderPatch(
                parsed
            );

            console.log(
                '🛠️ Patch generated:',
                parsed.patch
            );

        } catch (err) {

            console.error(
                '[ArchitectRuntime] Generate failed:',
                err
            );

            this.safeRenderError(
                err.message ||
                'Patch generation failed.'
            );

        } finally {

            this.isGenerating = false;
        }
    }

    // =========================================================================
    // APPLY PATCH
    // =========================================================================

    async handleApplyPatch() {

        if (this.isApplying) {
            return;
        }

        try {

            this.isApplying = true;

            // -----------------------------------------------------------------
            // PATCH CHECK
            // -----------------------------------------------------------------

            if (!this.lastPatch) {

                this.safeRenderError(
                    'No patch available.'
                );

                return;
            }

            // -----------------------------------------------------------------
            // CONFIRM
            // -----------------------------------------------------------------

            const confirmed =
                window.confirm(
                    'Apply AI-generated patch to project files?'
                );

            if (!confirmed) {
                return;
            }

            // -----------------------------------------------------------------
            // LOADING
            // -----------------------------------------------------------------

            this.safeRenderLoading(
                'Applying patch safely...'
            );

            // -----------------------------------------------------------------
            // API
            // -----------------------------------------------------------------

            const response =
                await fetch(
                    this.applyEndpoint,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body:
                            JSON.stringify({

                                patch:
                                    this.lastPatch
                            })
                    }
                );

            if (!response.ok) {

                const errText =
                    await response.text();

                throw new Error(
                    errText ||
                    'Patch apply failed.'
                );
            }

            const result =
                await response.json();

            if (!result.ok) {

                throw new Error(
                    result.error ||
                    'Patch apply failed.'
                );
            }

            // -----------------------------------------------------------------
            // SUCCESS
            // -----------------------------------------------------------------

            this.safeRenderSuccess(
                result
            );

            console.log(
                '✅ Patch applied:',
                result
            );

        } catch (err) {

            console.error(
                '[ArchitectRuntime] Apply failed:',
                err
            );

            this.safeRenderError(
                err.message ||
                'Patch apply failed.'
            );

        } finally {

            this.isApplying = false;
        }
    }

    // =========================================================================
    // ASK ARCHITECT
    // =========================================================================

    async askArchitect(
        prompt,
        scan = {}
    ) {

        const response =
            await fetch(
                this.apiEndpoint,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({

                            prompt,
                            scan
                        })
                }
            );

        if (!response.ok) {

            const errText =
                await response.text();

            throw new Error(
                errText ||
                'Architect API request failed.'
            );
        }

        return await response.json();
    }

    // =========================================================================
    // PUBLIC
    // =========================================================================

    getLastPatch() {

        return this.lastPatch;
    }

    getLastScan() {

        return this.lastScan;
    }

    clearPatch() {

        this.lastPatch =
            null;

        if (
            this.patchEngine &&
            typeof this.patchEngine.clear ===
            'function'
        ) {

            this.patchEngine.clear();
        }

        this.safeRenderEmpty();
    }
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createArchitectRuntime(config = {}) {

    return new ArchitectRuntime(config);
}