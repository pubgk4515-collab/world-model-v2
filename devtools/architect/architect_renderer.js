// /devtools/architect/architect_renderer.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Renderer
// Premium Runtime Workspace Renderer
// -----------------------------------------------------------------------------

export default class ArchitectRenderer {

    // -------------------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------------------

    constructor(rootElement) {

        if (!rootElement) {

            throw new Error(
                '[ArchitectRenderer] Missing root element.'
            );
        }

        this.root =
            rootElement;

        console.log(
            '🧠 ArchitectRenderer ready.'
        );
    }

    // -------------------------------------------------------------------------
    // INTERNAL
    // -------------------------------------------------------------------------

    clear() {

        this.root.innerHTML =
            '';
    }

    sanitize(value) {

        return String(
            value ?? ''
        )
            .replaceAll(
                '&',
                '&amp;'
            )
            .replaceAll(
                '<',
                '&lt;'
            )
            .replaceAll(
                '>',
                '&gt;'
            );
    }

    section(title, body) {

        return `
            <section class="architect-section">

                <div class="architect-section-title">
                    ${this.sanitize(title)}
                </div>

                <pre class="architect-pre">${body}</pre>

            </section>
        `;
    }

    codeBlock(title, code) {

        return `
            <div class="architect-code-wrap">

                <div class="architect-code-header">
                    ${this.sanitize(title)}
                </div>

                <pre class="architect-code-block">${this.sanitize(code)}</pre>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // EMPTY
    // -------------------------------------------------------------------------

    renderEmpty() {

        this.root.innerHTML = `
            <div class="architect-placeholder">

                <div class="architect-placeholder-icon">
                    ✦
                </div>

                <div class="architect-placeholder-title">
                    Architect Runtime Ready
                </div>

                <div class="architect-placeholder-text">
                    Describe a runtime issue to generate
                    structured AI repair patches.
                </div>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // LOADING
    // -------------------------------------------------------------------------

    renderLoading(message = 'Loading...') {

        this.root.innerHTML = `
            <div class="architect-loading">

                <div class="architect-spinner"></div>

                <div class="architect-loading-text">
                    ${this.sanitize(message)}
                </div>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // ERROR
    // -------------------------------------------------------------------------

    renderError(error) {

        const message =
            error?.message ||
            String(error) ||
            'Unknown renderer error.';

        this.root.innerHTML = `
            <div class="architect-error">

                <div class="architect-error-title">
                    Architect Runtime Error
                </div>

                <pre class="architect-error-body">${this.sanitize(message)}</pre>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------------------------

    renderResponse(response) {

        try {

            const normalized =
                this.normalizeAIResponse(
                    response
                );

            const summary =
                normalized.summary ||
                'AI repair response generated successfully.';

            const analysis =
                normalized.analysis ||
                'No analysis provided.';

            const patch =
                normalized.patch ||
                '';

            const notes =
                normalized.notes ||
                '';

            this.root.innerHTML = `
                <div class="architect-report">

                    <!-- HEADER -->

                    <section class="architect-section">

                        <div class="architect-section-title">
                            AI Runtime Analysis
                        </div>

                        <div class="architect-response-text">

                            ${this.sanitize(summary)}

                        </div>

                    </section>

                    <!-- ANALYSIS -->

                    ${this.section(
                        'Analysis',
                        this.sanitize(
                            analysis
                        )
                    )}

                    <!-- PATCH -->

                    ${
                        patch
                            ? this.codeBlock(
                                'Generated Patch',
                                patch
                            )
                            : ''
                    }

                    <!-- NOTES -->

                    ${
                        notes
                            ? this.section(
                                'Additional Notes',
                                this.sanitize(
                                    notes
                                )
                            )
                            : ''
                    }

                </div>
            `;

        } catch (err) {

            console.error(
                '[ArchitectRenderer] renderResponse failed:',
                err
            );

            this.renderError(
                err
            );
        }
    }

    // -------------------------------------------------------------------------
    // SCAN RESULT
    // -------------------------------------------------------------------------

    renderScanResult(scanResult = {}) {

        try {

            const runtimeErrors =
                Array.isArray(
                    scanResult.errors
                )
                    ? scanResult.errors
                    : [];

            const consoleLogs =
                Array.isArray(
                    scanResult.console
                )
                    ? scanResult.console
                    : [];

            const files =
                Array.isArray(
                    scanResult.files
                )
                    ? scanResult.files
                    : [];

            const dom =
                scanResult.dom ||
                {};

            this.root.innerHTML = `
                <div class="architect-report">

                    <!-- HEADER -->

                    <section class="architect-section">

                        <div class="architect-section-title">
                            Runtime Scan Complete
                        </div>

                        <div class="architect-response-text">

                            Runtime inspection completed successfully.

                        </div>

                    </section>

                    <!-- ERRORS -->

                    ${this.section(
                        'Runtime Errors',
                        runtimeErrors.length
                            ? runtimeErrors
                                .map((item) =>
                                    typeof item ===
                                    'string'
                                        ? item
                                        : JSON.stringify(
                                            item,
                                            null,
                                            2
                                        )
                                )
                                .join('\n\n')
                            : 'No runtime errors detected.'
                    )}

                    <!-- FILES -->

                    ${this.section(
                        'Scanned Files',
                        files.length
                            ? files.join('\n')
                            : 'No file metadata available.'
                    )}

                    <!-- CONSOLE -->

                    ${this.section(
                        'Console Output',
                        consoleLogs.length
                            ? consoleLogs
                                .map((item) =>
                                    typeof item ===
                                    'string'
                                        ? item
                                        : JSON.stringify(
                                            item,
                                            null,
                                            2
                                        )
                                )
                                .join('\n\n')
                            : 'No console logs captured.'
                    )}

                    <!-- DOM -->

                    ${this.section(
                        'DOM Snapshot',
                        JSON.stringify(
                            dom,
                            null,
                            2
                        )
                    )}

                </div>
            `;

        } catch (err) {

            console.error(
                '[ArchitectRenderer] renderScanResult failed:',
                err
            );

            this.renderError(
                err
            );
        }
    }

    // -------------------------------------------------------------------------
    // PATCH RESULT
    // -------------------------------------------------------------------------

    renderPatchResult(result = {}) {

        try {

            const patch =
                result.patch ||
                result.raw ||
                '';

            const summary =
                result.summary ||
                'AI patch generated successfully.';

            this.root.innerHTML = `
                <div class="architect-report">

                    <section class="architect-section">

                        <div class="architect-section-title">
                            Patch Generation Complete
                        </div>

                        <div class="architect-response-text">

                            ${this.sanitize(summary)}

                        </div>

                    </section>

                    ${this.codeBlock(
                        'Patch Output',
                        patch
                    )}

                </div>
            `;

        } catch (err) {

            console.error(
                '[ArchitectRenderer] renderPatchResult failed:',
                err
            );

            this.renderError(
                err
            );
        }
    }

    // -------------------------------------------------------------------------
    // APPLY SUCCESS
    // -------------------------------------------------------------------------

    renderApplySuccess(result = {}) {

        const message =
            result.message ||
            'Patch applied successfully.';

        const files =
            Array.isArray(
                result.files
            )
                ? result.files.join(
                    '\n'
                )
                : 'No modified file list available.';

        this.root.innerHTML = `
            <div class="architect-report">

                <section class="architect-section">

                    <div class="architect-section-title">
                        Patch Applied
                    </div>

                    <div class="architect-response-text">

                        ${this.sanitize(message)}

                    </div>

                </section>

                ${this.section(
                    'Modified Files',
                    this.sanitize(
                        files
                    )
                )}

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // NORMALIZER
    // -------------------------------------------------------------------------

    normalizeAIResponse(response) {

        // STRING RESPONSE

        if (
            typeof response ===
            'string'
        ) {

            return {

                summary:
                    'AI response received.',

                analysis:
                    response,

                patch:
                    ''
            };
        }

        // NULL SAFETY

        if (!response) {

            return {

                summary:
                    'Empty AI response.',

                analysis:
                    '',

                patch:
                    ''
            };
        }

        // RAW FORMAT

        if (response.raw) {

            return {

                summary:
                    response.summary ||
                    'AI response generated.',

                analysis:
                    response.analysis ||
                    response.raw,

                patch:
                    response.patch ||
                    '',

                notes:
                    response.notes ||
                    ''
            };
        }

        // GENERIC OBJECT

        return {

            summary:
                response.summary ||
                'AI runtime response generated.',

            analysis:
                response.analysis ||
                JSON.stringify(
                    response,
                    null,
                    2
                ),

            patch:
                response.patch ||
                '',

            notes:
                response.notes ||
                ''
        };
    }
}
