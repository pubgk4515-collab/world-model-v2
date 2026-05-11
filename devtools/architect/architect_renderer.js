// /devtools/architect/architect_renderer.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Renderer
// Premium AI Workspace Renderer
// -----------------------------------------------------------------------------

import architectState
from './architect_state.js';

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function escapeHtml(value = '') {

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function nl2br(value = '') {

    return escapeHtml(value)
        .replace(/\n/g, '<br>');
}

function createCodeBlock(
    title,
    content
) {

    return `
        <div class="architect-code-wrap">

            <div class="architect-code-header">
                ${escapeHtml(title)}
            </div>

            <pre class="architect-code-block">${escapeHtml(content)}</pre>

        </div>
    `;
}

function createSection(
    title,
    body
) {

    return `
        <section class="architect-section">

            <div class="architect-section-title">
                ${escapeHtml(title)}
            </div>

            <div class="architect-section-body">
                ${body}
            </div>

        </section>
    `;
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

export default class ArchitectRenderer {

    // -------------------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------------------

    constructor(root) {

        if (!root) {

            throw new Error(
                '[ArchitectRenderer] Missing root.'
            );
        }

        this.root =
            root;

        this.unsubscribe =
            null;

        this.bindState();

        console.log(
            '🎨 ArchitectRenderer ready.'
        );
    }

    // -------------------------------------------------------------------------
    // STATE
    // -------------------------------------------------------------------------

    bindState() {

        this.unsubscribe =
            architectState.subscribe(
                (state) => {

                    this.handleStateUpdate(
                        state
                    );
                }
            );
    }

    handleStateUpdate(state) {

        // ---------------------------------------------------------------------
        // MINIMIZED
        // ---------------------------------------------------------------------

        if (state.minimized) {

            this.root.classList.add(
                'architect-minimized'
            );

        } else {

            this.root.classList.remove(
                'architect-minimized'
            );
        }
    }

    // -------------------------------------------------------------------------
    // EMPTY
    // -------------------------------------------------------------------------

    renderEmpty() {

        this.root.innerHTML = `
            <div class="architect-empty">

                <div class="architect-empty-icon">
                    🧠
                </div>

                <div class="architect-empty-title">
                    Architect Runtime Ready
                </div>

                <div class="architect-empty-text">
                    Describe a project issue to generate
                    structured AI repair patches.
                </div>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // LOADING
    // -------------------------------------------------------------------------

    renderLoading(
        message =
            'Loading...'
    ) {

        architectState.setLoading(
            true
        );

        this.root.innerHTML = `
            <div class="architect-loading">

                <div class="architect-spinner"></div>

                <div class="architect-loading-text">
                    ${escapeHtml(message)}
                </div>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // ERROR
    // -------------------------------------------------------------------------

    renderError(
        message =
            'Unknown error.'
    ) {

        architectState.setError(
            message
        );

        this.root.innerHTML = `
            <div class="architect-error">

                <div class="architect-error-title">
                    Runtime Failure
                </div>

                <pre class="architect-error-body">${escapeHtml(message)}</pre>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------------------------

    renderResponse(
        response = {}
    ) {

        architectState.setResponse(
            response
        );

        const summary =
            response.summary || '';

        const analysis =
            response.analysis || '';

        const patch =
            response.patch || '';

        const notes =
            response.notes || '';

        let html =
            `
            <div class="architect-report">
        `;

        // ---------------------------------------------------------------------
        // HEADER
        // ---------------------------------------------------------------------

        html += `
            <div class="architect-report-header">

                <div>

                    <div class="architect-report-title">
                        Architect Analysis
                    </div>

                    <div class="architect-report-subtitle">
                        AI Runtime Diagnostics
                    </div>

                </div>

            </div>
        `;

        // ---------------------------------------------------------------------
        // SUMMARY
        // ---------------------------------------------------------------------

        if (summary) {

            html += createSection(
                'Summary',
                `
                <div class="architect-response-text">
                    ${nl2br(summary)}
                </div>
                `
            );
        }

        // ---------------------------------------------------------------------
        // ANALYSIS
        // ---------------------------------------------------------------------

        if (analysis) {

            html += createSection(
                'Root Cause Analysis',
                `
                <div class="architect-response-text">
                    ${nl2br(analysis)}
                </div>
                `
            );
        }

        // ---------------------------------------------------------------------
        // PATCH
        // ---------------------------------------------------------------------

        if (patch) {

            html += createSection(
                'Generated Repair Patch',

                createCodeBlock(
                    'AI PATCH',
                    patch
                )
            );
        }

        // ---------------------------------------------------------------------
        // NOTES
        // ---------------------------------------------------------------------

        if (notes) {

            html += createSection(
                'Implementation Notes',
                `
                <div class="architect-response-text">
                    ${nl2br(notes)}
                </div>
                `
            );
        }

        // ---------------------------------------------------------------------
        // ACTIONS
        // ---------------------------------------------------------------------

        if (patch) {

            html += `
                <div class="architect-runtime-actions">

                    <button
                        class="architect-apply-btn"
                        id="architectApplyPatchBtn"
                    >
                        Apply Patch
                    </button>

                    <button
                        class="architect-copy-btn"
                        id="architectCopyPatchBtn"
                    >
                        Copy Patch
                    </button>

                </div>
            `;
        }

        // ---------------------------------------------------------------------
        // END
        // ---------------------------------------------------------------------

        html += `
            </div>
        `;

        this.root.innerHTML =
            html;

        // ---------------------------------------------------------------------
        // EVENTS
        // ---------------------------------------------------------------------

        this.bindResponseEvents(
            patch
        );
    }

    // -------------------------------------------------------------------------
    // SCAN RESULT
    // -------------------------------------------------------------------------

    renderScanResult(
        scan = {}
    ) {

        architectState.setScan(
            scan
        );

        const html = `
            <div class="architect-report">

                <div class="architect-report-header">

                    <div>

                        <div class="architect-report-title">
                            Runtime Scan Complete
                        </div>

                        <div class="architect-report-subtitle">
                            Environment Diagnostics
                        </div>

                    </div>

                </div>

                ${createSection(
                    'Runtime',
                    `
                    <pre class="architect-pre">${escapeHtml(
                        JSON.stringify(
                            scan.runtime || {},
                            null,
                            2
                        )
                    )}</pre>
                    `
                )}

                ${createSection(
                    'Performance',
                    `
                    <pre class="architect-pre">${escapeHtml(
                        JSON.stringify(
                            scan.performance || {},
                            null,
                            2
                        )
                    )}</pre>
                    `
                )}

                ${createSection(
                    'Runtime Errors',
                    `
                    <pre class="architect-pre">${escapeHtml(
                        JSON.stringify(
                            scan.errors || [],
                            null,
                            2
                        )
                    )}</pre>
                    `
                )}

            </div>
        `;

        this.root.innerHTML =
            html;
    }

    // -------------------------------------------------------------------------
    // APPLY SUCCESS
    // -------------------------------------------------------------------------

    renderApplySuccess(
        result = {}
    ) {

        const files =
            Array.isArray(
                result.files
            )
                ? result.files
                : [];

        this.root.innerHTML = `
            <div class="architect-success">

                <div class="architect-success-icon">
                    ✅
                </div>

                <div class="architect-success-title">
                    Patch Applied Successfully
                </div>

                <div class="architect-success-text">
                    ${escapeHtml(
                        result.message ||

                        'Files updated successfully.'
                    )}
                </div>

                ${
                    files.length
                        ? createSection(
                            'Modified Files',
                            `
                            <pre class="architect-pre">${escapeHtml(
                                files.join('\n')
                            )}</pre>
                            `
                        )
                        : ''
                }

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------------------

    bindResponseEvents(
        patch = ''
    ) {

        // ---------------------------------------------------------------------
        // COPY
        // ---------------------------------------------------------------------

        const copyBtn =
            this.root.querySelector(
                '#architectCopyPatchBtn'
            );

        if (copyBtn) {

            copyBtn.addEventListener(
                'click',
                async () => {

                    try {

                        await navigator
                            .clipboard
                            .writeText(
                                patch
                            );

                        copyBtn.textContent =
                            'Copied';

                        setTimeout(
                            () => {

                                copyBtn.textContent =
                                    'Copy Patch';

                            },
                            1500
                        );

                    } catch (err) {

                        console.error(err);
                    }
                }
            );
        }

        // ---------------------------------------------------------------------
        // APPLY
        // ---------------------------------------------------------------------

        const applyBtn =
            this.root.querySelector(
                '#architectApplyPatchBtn'
            );

        if (applyBtn) {

            applyBtn.addEventListener(
                'click',
                () => {

                    window.dispatchEvent(

                        new CustomEvent(

                            'architect:apply-patch',

                            {
                                detail: {
                                    patch
                                }
                            }
                        )
                    );
                }
            );
        }
    }

    // -------------------------------------------------------------------------
    // DESTROY
    // -------------------------------------------------------------------------

    destroy() {

        if (
            this.unsubscribe
        ) {

            this.unsubscribe();

            this.unsubscribe =
                null;
        }
    }
}
