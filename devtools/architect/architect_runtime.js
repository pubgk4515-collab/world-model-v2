// /devtools/architect/architect_runtime.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Runtime
// Premium AI Runtime Engine
// -----------------------------------------------------------------------------

import ArchitectRenderer
from './architect_renderer.js';

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

export default class ArchitectRuntime {

    // -------------------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------------------

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
        // DOM
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
        // RENDERER
        // ---------------------------------------------------------------------

        if (!this.output) {

            throw new Error(
                '[ArchitectRuntime] Missing output root.'
            );
        }

        this.renderer =
            new ArchitectRenderer(
                this.output
            );

        // ---------------------------------------------------------------------
        // STATE
        // ---------------------------------------------------------------------

        this.lastPrompt =
            '';

        this.lastResponse =
            null;

        this.lastPatch =
            null;

        this.lastScan =
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
            '🧠 ArchitectRuntime ready.'
        );
    }

    // -------------------------------------------------------------------------
    // UI
    // -------------------------------------------------------------------------

    bindUI() {

        // GENERATE

        if (this.generateBtn) {

            this.generateBtn.addEventListener(
                'click',
                async () => {

                    await this.handleGenerate();
                }
            );
        }

        // APPLY

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
    // ASK ARCHITECT
    // -------------------------------------------------------------------------

    async askArchitect(
        prompt,
        scanData = {}
    ) {

        if (!prompt) {

            throw new Error(
                'Architect prompt is empty.'
            );
        }

        this.lastPrompt =
            prompt;

        this.lastScan =
            scanData;

        try {

            this.renderer.renderLoading(
                'Connecting to Architect AI runtime...'
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
                            JSON.stringify({

                                prompt,

                                scan:
                                    scanData
                            })
                    }
                );

            // -------------------------------------------------------------
            // NETWORK FAILURE
            // -------------------------------------------------------------

            if (!response.ok) {

                const text =
                    await response.text();

                throw new Error(

                    text ||

                    `Architect API failed (${response.status}).`
                );
            }

            // -------------------------------------------------------------
            // JSON
            // -------------------------------------------------------------

            const data =
                await response.json();

            // -------------------------------------------------------------
            // API FAILURE
            // -------------------------------------------------------------

            if (!data.ok) {

                throw new Error(

                    data.error ||

                    'Architect API returned failure.'
                );
            }

            // -------------------------------------------------------------
            // NORMALIZE
            // -------------------------------------------------------------

            const normalized =
                this.normalizeResponse(
                    data
                );

            // -------------------------------------------------------------
            // SAVE
            // -------------------------------------------------------------

            this.lastResponse =
                normalized;

            this.lastPatch =
                normalized.patch || '';

            // -------------------------------------------------------------
            // RETURN
            // -------------------------------------------------------------

            return normalized;

        } catch (err) {

            console.error(
                '[ArchitectRuntime] askArchitect failed:',
                err
            );

            throw err;
        }
    }

    // -------------------------------------------------------------------------
    // GENERATE
    // -------------------------------------------------------------------------

    async handleGenerate() {

        if (this.isGenerating) {

            return;
        }

        try {

            this.isGenerating =
                true;

            const issue =
                this.textarea?.value?.trim();

            if (!issue) {

                this.renderer.renderError(
                    'Describe the issue first.'
                );

                return;
            }

            this.renderer.renderLoading(
                'Generating AI repair patch...'
            );

            const result =
                await this.askArchitect(
                    issue,
                    this.lastScan || {}
                );

            this.renderer.renderResponse(
                result
            );

        } catch (err) {

            console.error(
                '[ArchitectRuntime] Generate failed:',
                err
            );

            this.renderer.renderError(
                err.message ||

                'AI patch generation failed.'
            );

        } finally {

            this.isGenerating =
                false;
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

            this.isApplying =
                true;

            // -------------------------------------------------------------
            // CHECK
            // -------------------------------------------------------------

            if (!this.lastPatch) {

                this.renderer.renderError(
                    'No patch available to apply.'
                );

                return;
            }

            // -------------------------------------------------------------
            // CONFIRM
            // -------------------------------------------------------------

            const confirmed =
                window.confirm(
                    'Apply AI-generated patch to project files?'
                );

            if (!confirmed) {

                return;
            }

            // -------------------------------------------------------------
            // LOADING
            // -------------------------------------------------------------

            this.renderer.renderLoading(
                'Applying repair patch safely...'
            );

            // -------------------------------------------------------------
            // REQUEST
            // -------------------------------------------------------------

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

            // -------------------------------------------------------------
            // NETWORK FAILURE
            // -------------------------------------------------------------

            if (!response.ok) {

                const text =
                    await response.text();

                throw new Error(

                    text ||

                    `Patch apply failed (${response.status}).`
                );
            }

            // -------------------------------------------------------------
            // JSON
            // -------------------------------------------------------------

            const result =
                await response.json();

            // -------------------------------------------------------------
            // FAILURE
            // -------------------------------------------------------------

            if (!result.ok) {

                throw new Error(

                    result.error ||

                    'Patch apply failed.'
                );
            }

            // -------------------------------------------------------------
            // SUCCESS
            // -------------------------------------------------------------

            this.renderer.renderApplySuccess(
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

            this.renderer.renderError(
                err.message ||

                'Patch apply failed.'
            );

        } finally {

            this.isApplying =
                false;
        }
    }

    // -------------------------------------------------------------------------
    // NORMALIZER
    // -------------------------------------------------------------------------

    normalizeResponse(data = {}) {

        // -------------------------------------------------------------
        // RAW STRING
        // -------------------------------------------------------------

        if (
            typeof data ===
            'string'
        ) {

            return {

                ok: true,

                summary:
                    'AI response generated.',

                analysis:
                    data,

                patch:
                    ''
            };
        }

        // -------------------------------------------------------------
        // RAW FIELD
        // -------------------------------------------------------------

        if (data.raw) {

            return {

                ok: true,

                summary:
                    data.summary ||

                    'Architect analysis complete.',

                analysis:
                    data.analysis ||

                    data.raw,

                patch:
                    data.patch ||

                    '',

                notes:
                    data.notes ||

                    ''
            };
        }

        // -------------------------------------------------------------
        // OPENAI FORMAT
        // -------------------------------------------------------------

        if (
            data.choices &&
            Array.isArray(
                data.choices
            )
        ) {

            const content =
                data.choices?.[0]
                    ?.message
                    ?.content || '';

            return {

                ok: true,

                summary:
                    'AI response generated.',

                analysis:
                    content,

                patch:
                    ''
            };
        }

        // -------------------------------------------------------------
        // GENERIC
        // -------------------------------------------------------------

        return {

            ok: true,

            summary:
                data.summary ||

                'Architect runtime completed.',

            analysis:
                data.analysis ||

                JSON.stringify(
                    data,
                    null,
                    2
                ),

            patch:
                data.patch ||

                '',

            notes:
                data.notes ||

                ''
        };
    }

    // -------------------------------------------------------------------------
    // PUBLIC
    // -------------------------------------------------------------------------

    getLastPatch() {

        return this.lastPatch;
    }

    getLastResponse() {

        return this.lastResponse;
    }

    getLastScan() {

        return this.lastScan;
    }

    clear() {

        this.lastPatch =
            null;

        this.lastResponse =
            null;

        this.renderer.renderEmpty();
    }
}
