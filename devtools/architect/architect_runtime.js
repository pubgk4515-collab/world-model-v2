// devtools/architect/architect_runtime.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Runtime
// Phase 2: AI Patch Generation + Safe Patch Apply
// -----------------------------------------------------------------------------

import ArchitectPatchEngine
from './architect_patch_engine.js';

import ArchitectRenderer
from './architect_renderer.js';

import * as Scanner
from './architect_scanner.js';

import * as PromptBuilder
from './architect_prompt_builder.js';

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

export default class ArchitectRuntime {

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
        // UI
        // ---------------------------------------------------------------------

        this.root =
            config.root || null;

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

        this.renderer =
            new ArchitectRenderer(
                this.output
            );

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

    // -------------------------------------------------------------------------
    // INIT
    // -------------------------------------------------------------------------

    init() {

        this.bindUI();

        this.renderer.renderEmpty();

        console.log(
            '🧠 Architect Runtime ready.'
        );
    }

    // -------------------------------------------------------------------------
    // UI
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // SCAN PROJECT
    // -------------------------------------------------------------------------

    async handleScan() {

        try {

            this.renderer.renderLoading(
                'Scanning project runtime...'
            );

            const scan =
                await Scanner.scanProject();

            this.lastScan =
                scan;

            console.log(
                '📡 Project scan complete:',
                scan
            );

            this.renderer.renderEmpty();

        } catch (err) {

            console.error(
                '[ArchitectRuntime] Scan failed:',
                err
            );

            this.renderer.renderError(
                err.message ||
                'Project scan failed.'
            );
        }
    }

    // -------------------------------------------------------------------------
    // GENERATE PATCH
    // -------------------------------------------------------------------------

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

                this.renderer.renderError(
                    'Describe a project issue first.'
                );

                return;
            }

            // -----------------------------------------------------------------
            // SCAN
            // -----------------------------------------------------------------

            this.renderer.renderLoading(
                'Scanning runtime...'
            );

            const scan =
                this.lastScan ||
                await Scanner.scanProject();

            this.lastScan =
                scan;

            // -----------------------------------------------------------------
            // PROMPT
            // -----------------------------------------------------------------

            const payload =
                PromptBuilder.buildArchitectPrompt({

                    issue,
                    scan
                });

            // -----------------------------------------------------------------
            // AI REQUEST
            // -----------------------------------------------------------------

            this.renderer.renderLoading(
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
                    'AI patch generation failed.'
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

                this.renderer.renderError(
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

            this.renderer.renderPatchResult(
                parsed
            );

            console.log(
                '🛠️ AI Patch Generated:',
                parsed.patch
            );

        } catch (err) {

            console.error(
                '[ArchitectRuntime] Generate failed:',
                err
            );

            this.renderer.renderError(
                err.message ||
                'Patch generation failed.'
            );

        } finally {

            this.isGenerating = false;
        }
    }

    // -------------------------------------------------------------------------
    // APPLY PATCH
    // -------------------------------------------------------------------------

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

                this.renderer.renderError(
                    'No patch available to apply.'
                );

                return;
            }

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

            this.renderer.renderLoading(
                'Applying patch safely...'
            );

            // -----------------------------------------------------------------
            // REQUEST
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
                    'Patch apply request failed.'
                );
            }

            const result =
                await response.json();

            // -----------------------------------------------------------------
            // FAILURE
            // -----------------------------------------------------------------

            if (!result.ok) {

                console.error(
                    '[ArchitectRuntime] Patch apply failed:',
                    result
                );

                this.renderer.renderError(

                    result.error ||

                    'Patch apply failed.'
                );

                return;
            }

            // -----------------------------------------------------------------
            // SUCCESS RENDER
            // -----------------------------------------------------------------

            this.renderer.renderApplySuccess(
                result
            );

            console.log(
                '✅ Patch applied successfully:',
                result
            );

        } catch (err) {

            console.error(
                '[ArchitectRuntime] Apply failed:',
                err
            );

            this.renderer.renderError(
                err.message ||
                'Patch apply failed.'
            );

        } finally {

            this.isApplying = false;
        }
    }

    // -------------------------------------------------------------------------
    // PUBLIC
    // -------------------------------------------------------------------------

    getLastPatch() {

        return this.lastPatch;
    }

    getLastScan() {

        return this.lastScan;
    }

    clearPatch() {

        this.lastPatch =
            null;

        this.patchEngine.clear();

        this.renderer.renderEmpty();
    }
}