// devtools/architect/architect_renderer.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Renderer
// Phase 2: Patch Preview + Apply Feedback UI
// -----------------------------------------------------------------------------

export default class ArchitectRenderer {

    constructor(root) {

        if (!root) {

            throw new Error(
                'ArchitectRenderer requires root element.'
            );
        }

        this.root = root;
    }

    // -------------------------------------------------------------------------
    // PATCH RESULT
    // -------------------------------------------------------------------------

    renderPatchResult(result) {

        if (!result) {

            return this.renderError(
                this.root,
                'Empty patch result.'
            );
        }

        if (!result.ok) {

            return this.renderError(
                this.root,
                result.error ||
                'Unknown patch error.'
            );
        }

        const patch =
            result.patch;

        const summary =
            patch.summary ||
            'Unnamed Patch';

        const risk =
            patch.risk ||
            'unknown';

        const files =
            Array.isArray(
                patch.files
            )
                ? patch.files
                : [];

        this.root.innerHTML = `
            <div class="architect-result">

                ${this.renderHeader(
                    summary,
                    risk,
                    files.length
                )}

                <div class="architect-files">

                    ${files.map(
                        (file, index) =>
                            this.renderFilePatch(
                                file,
                                index
                            )
                    ).join('')}

                </div>

                <div class="
                    architect-warning-box
                ">
                    <div class="
                        architect-warning-title
                    ">
                        Safe Apply Mode
                    </div>

                    <div class="
                        architect-warning-text
                    ">
                        Snapshots will be created
                        automatically before any
                        file modifications.
                    </div>
                </div>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // HEADER
    // -------------------------------------------------------------------------

    renderHeader(
        summary,
        risk,
        operations
    ) {

        return `
            <div class="
                architect-header
            ">

                <div class="
                    architect-summary
                ">
                    ${this.escape(summary)}
                </div>

                <div class="
                    architect-risk
                    architect-risk-${risk}
                ">
                    ${this.escape(risk)}
                </div>

            </div>

            <div class="
                architect-meta
            ">

                <div class="
                    architect-meta-item
                ">
                    Operations:
                    <strong>
                        ${operations}
                    </strong>
                </div>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // FILE PATCH
    // -------------------------------------------------------------------------

    renderFilePatch(
        file,
        index
    ) {

        const path =
            file.path ||
            'unknown';

        const operation =
            file.operation ||
            'unknown';

        const find =
            file.find || '';

        const replace =
            file.replace || '';

        const content =
            file.content || '';

        return `
            <div class="
                architect-file-card
            ">

                <div class="
                    architect-file-top
                ">

                    <div class="
                        architect-file-path
                    ">
                        ${this.escape(path)}
                    </div>

                    <div class="
                        architect-operation
                        architect-operation-${operation}
                    ">
                        ${this.escape(operation)}
                    </div>

                </div>

                ${find
                    ? this.renderDiffBlock(
                        'Find',
                        find,
                        'find'
                    )
                    : ''
                }

                ${replace
                    ? this.renderDiffBlock(
                        'Replace',
                        replace,
                        'replace'
                    )
                    : ''
                }

                ${content
                    ? this.renderDiffBlock(
                        'Content',
                        content,
                        'content'
                    )
                    : ''
                }

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // DIFF BLOCK
    // -------------------------------------------------------------------------

    renderDiffBlock(
        label,
        code,
        type
    ) {

        return `
            <div class="
                architect-diff
                architect-diff-${type}
            ">

                <div class="
                    architect-diff-label
                ">
                    ${this.escape(label)}
                </div>

                <pre class="
                    architect-code
                "><code>${this.escape(code)}</code></pre>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // APPLY SUCCESS
    // -------------------------------------------------------------------------

    renderApplySuccess(result) {

        const operations =
            result.totalOperations || 0;

        const successCount =
            result.successCount || 0;

        const failedCount =
            result.failedCount || 0;

        const snapshots =
            Array.isArray(
                result.snapshots
            )
                ? result.snapshots
                : [];

        const patchResults =
            Array.isArray(
                result.results
            )
                ? result.results
                : [];

        this.root.innerHTML = `
            <div class="
                architect-apply-success
            ">

                <div class="
                    architect-success-title
                ">
                    ✅ Patch Applied
                </div>

                <div class="
                    architect-success-summary
                ">
                    ${this.escape(
                        result.summary ||
                        'Patch applied successfully.'
                    )}
                </div>

                <div class="
                    architect-apply-stats
                ">

                    <div class="
                        architect-stat-card
                    ">
                        <div class="
                            architect-stat-label
                        ">
                            Operations
                        </div>

                        <div class="
                            architect-stat-value
                        ">
                            ${operations}
                        </div>
                    </div>

                    <div class="
                        architect-stat-card
                    ">
                        <div class="
                            architect-stat-label
                        ">
                            Success
                        </div>

                        <div class="
                            architect-stat-value
                        ">
                            ${successCount}
                        </div>
                    </div>

                    <div class="
                        architect-stat-card
                    ">
                        <div class="
                            architect-stat-label
                        ">
                            Failed
                        </div>

                        <div class="
                            architect-stat-value
                        ">
                            ${failedCount}
                        </div>
                    </div>

                </div>

                <div class="
                    architect-results-list
                ">

                    ${patchResults.map(
                        (entry) => `
                            <div class="
                                architect-result-item
                            ">

                                <div class="
                                    architect-result-path
                                ">
                                    ${this.escape(
                                        entry.path ||
                                        'unknown'
                                    )}
                                </div>

                                <div class="
                                    architect-result-status
                                    ${entry.ok
                                        ? 'success'
                                        : 'failed'
                                    }
                                ">
                                    ${entry.ok
                                        ? 'Applied'
                                        : 'Failed'
                                    }
                                </div>

                            </div>
                        `
                    ).join('')}

                </div>

                ${snapshots.length > 0
                    ? `
                        <div class="
                            architect-snapshot-box
                        ">

                            <div class="
                                architect-snapshot-title
                            ">
                                Snapshots Created
                            </div>

                            <div class="
                                architect-snapshot-list
                            ">

                                ${snapshots.map(
                                    (snapshot) => `
                                        <div class="
                                            architect-snapshot-item
                                        ">
                                            ${this.escape(snapshot)}
                                        </div>
                                    `
                                ).join('')}

                            </div>

                        </div>
                    `
                    : ''
                }

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // SCAN RESULT
    // -------------------------------------------------------------------------

    renderScanResult(element, scan) {

        if (!scan) {

            return this.renderError(
                element,
                'Empty scan result.'
            );
        }

        const runtime =
            scan.runtime || {};

        const dom =
            scan.dom || {};

        const audio =
            scan.audio || {};

        const errors =
            Array.isArray(scan.errors)
                ? scan.errors
                : [];

        const warnings =
            Array.isArray(scan.warnings)
                ? scan.warnings
                : [];

        const experts =
            Array.isArray(scan.experts)
                ? scan.experts
                : [];

        this.root.innerHTML = `
            <div class="
                architect-scan-result
            ">

                <div class="
                    architect-result-title
                ">
                    🔍 Runtime Scan Complete
                </div>

                <div class="
                    architect-result-section
                ">

                    <div class="
                        architect-result-label
                    ">
                        Runtime Environment
                    </div>

                    <div class="
                        architect-result-detail
                    ">
                        URL: ${this.escape(
                            runtime.url || 'Unknown'
                        )}<br/>
                        Platform: ${this.escape(
                            runtime.platform || 'Unknown'
                        )}<br/>
                        Viewport: ${runtime.viewportWidth}×${runtime.viewportHeight}
                    </div>
                </div>

                <div class="
                    architect-result-section
                ">

                    <div class="
                        architect-result-label
                    ">
                        DOM State
                    </div>

                    <div class="
                        architect-result-detail
                    ">
                        Expert Cards: ${dom.expertCards || 0}<br/>
                        Buttons: ${dom.buttons || 0}<br/>
                        Sliders: ${dom.rangeSliders || 0}
                    </div>
                </div>

                <div class="
                    architect-result-section
                ">

                    <div class="
                        architect-result-label
                    ">
                        Audio State
                    </div>

                    <div class="
                        architect-result-detail
                    ">
                        Supported: ${audio.supported ? 'Yes' : 'No'}<br/>
                        State: ${this.escape(
                            audio.state || 'Unknown'
                        )}<br/>
                        Sample Rate: ${audio.sampleRate || 'N/A'} Hz
                    </div>
                </div>

                <div class="
                    architect-result-section
                ">

                    <div class="
                        architect-result-label
                    ">
                        Active Experts
                    </div>

                    <div class="
                        architect-result-detail
                    ">
                        ${experts.length > 0
                            ? experts.map((e) => `
                                ${this.escape(e.type || 'Unknown')}
                                (${this.escape(e.id || 'N/A')})<br/>
                            `).join('')
                            : 'No experts mounted'
                        }
                    </div>
                </div>

                ${warnings.length > 0 ? `
                    <div class="
                        architect-result-section
                        architect-warning
                    ">
                        <div class="
                            architect-result-label
                        ">
                            ⚠️ Warnings (${warnings.length})
                        </div>
                        <div class="
                            architect-result-detail
                        ">
                            ${warnings.map((w) => `
                                ${this.escape(
                                    w.message || JSON.stringify(w)
                                )}<br/>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${errors.length > 0 ? `
                    <div class="
                        architect-result-section
                        architect-error-section
                    ">
                        <div class="
                            architect-result-label
                        ">
                            ❌ Errors (${errors.length})
                        </div>
                        <div class="
                            architect-result-detail
                        ">
                            ${errors.map((e) => `
                                ${this.escape(
                                    e.message || JSON.stringify(e)
                                )}<br/>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------------------------

    renderResponse(element, response) {

        if (!response) {

            return this.renderError(
                element,
                'Empty AI response.'
            );
        }

        const raw =
            response.raw || '';

        const usage =
            response.usage || {};

        this.root.innerHTML = `
            <div class="
                architect-response
            ">

                <div class="
                    architect-result-title
                ">
                    🤖 Architect Analysis
                </div>

                <div class="
                    architect-result-section
                ">

                    <div class="
                        architect-result-label
                    ">
                        AI Response
                    </div>

                    <div class="
                        architect-result-detail
                        architect-response-text
                    ">
                        ${this.escape(raw)}
                    </div>
                </div>

                ${usage.prompt_tokens ? `
                    <div class="
                        architect-result-section
                    ">

                        <div class="
                            architect-result-label
                        ">
                            Token Usage
                        </div>

                        <div class="
                            architect-result-detail
                        ">
                            Prompt: ${usage.prompt_tokens}<br/>
                            Completion: ${usage.completion_tokens || 0}<br/>
                            Total: ${usage.total_tokens || 0}
                        </div>
                    </div>
                ` : ''}

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // LOADING
    // -------------------------------------------------------------------------

    renderLoading(
        element,
        message = 'Scanning runtime...'
    ) {

        this.root.innerHTML = `
            <div class="
                architect-loading
            ">

                <div class="
                    architect-spinner
                "></div>

                <div class="
                    architect-loading-text
                ">
                    ${this.escape(message)}
                </div>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // ERROR
    // -------------------------------------------------------------------------

    renderError(element, message) {

        this.root.innerHTML = `
            <div class="
                architect-error
            ">

                <div class="
                    architect-error-title
                ">
                    Architect Runtime Error
                </div>

                <div class="
                    architect-error-message
                ">
                    ${this.escape(message)}
                </div>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // EMPTY
    // -------------------------------------------------------------------------

    renderEmpty() {

        this.root.innerHTML = `
            <div class="
                architect-empty
            ">

                <div class="
                    architect-empty-title
                ">
                    Architect Runtime Ready
                </div>

                <div class="
                    architect-empty-subtitle
                ">
                    Describe a project issue
                    to generate structured
                    AI repair patches.
                </div>

            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // ESCAPE
    // -------------------------------------------------------------------------

    escape(value) {

        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
}