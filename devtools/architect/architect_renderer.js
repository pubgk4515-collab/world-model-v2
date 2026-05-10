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
                'Empty patch result.'
            );
        }

        if (!result.ok) {

            return this.renderError(
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
    // LOADING
    // -------------------------------------------------------------------------

    renderLoading(
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

    renderError(message) {

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