// /devtools/architect/architect_renderer.js
// Symbiote Studio — Architect Renderer
// Handles all Architect Console rendering

export function createArchitectRenderer() {

    // =====================================================
    // HELPERS
    // =====================================================

    function escapeHTML(str = '') {

        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatJSON(data) {

        try {

            return JSON.stringify(
                data,
                null,
                2
            );

        } catch {

            return String(data);
        }
    }

    function createSection(title, content) {

        return `
            <div class="architect-section">

                <div class="architect-section-title">
                    ${escapeHTML(title)}
                </div>

                <pre class="architect-pre">
${escapeHTML(content)}
                </pre>

            </div>
        `;
    }

    // =====================================================
    // LOADING
    // =====================================================

    function renderLoading(
        container,
        message = 'Loading...'
    ) {

        if (!container) return;

        container.innerHTML = `
            <div class="architect-loading">

                <div class="architect-spinner"></div>

                <div class="architect-loading-text">
                    ${escapeHTML(message)}
                </div>

            </div>
        `;
    }

    // =====================================================
    // ERROR
    // =====================================================

    function renderError(
        container,
        error = 'Unknown error.'
    ) {

        if (!container) return;

        container.innerHTML = `
            <div class="architect-error">

                <div class="architect-error-title">
                    Runtime Error
                </div>

                <pre class="architect-error-body">
${escapeHTML(error)}
                </pre>

            </div>
        `;
    }

    // =====================================================
    // SCAN RESULT
    // =====================================================

    function renderScanResult(
        container,
        scan = {}
    ) {

        if (!container) return;

        const runtime =
            scan.runtime || {};

        const dom =
            scan.dom || {};

        const audio =
            scan.audio || {};

        const experts =
            Array.isArray(scan.experts)
                ? scan.experts
                : [];

        const warnings =
            Array.isArray(scan.warnings)
                ? scan.warnings
                : [];

        const errors =
            Array.isArray(scan.errors)
                ? scan.errors
                : [];

        const html = `

            <div class="architect-report">

                <div class="architect-report-header">

                    <div class="architect-report-title">
                        Runtime Scan Complete
                    </div>

                    <div class="architect-report-subtitle">
                        ${new Date().toLocaleTimeString()}
                    </div>

                </div>

                ${createSection(
                    'Runtime',
                    formatJSON(runtime)
                )}

                ${createSection(
                    'DOM',
                    formatJSON(dom)
                )}

                ${createSection(
                    'Audio',
                    formatJSON(audio)
                )}

                ${createSection(
                    'Experts',
                    formatJSON(experts)
                )}

                ${createSection(
                    'Warnings',
                    warnings.length
                        ? formatJSON(warnings)
                        : 'No warnings.'
                )}

                ${createSection(
                    'Errors',
                    errors.length
                        ? formatJSON(errors)
                        : 'No runtime errors.'
                )}

            </div>
        `;

        container.innerHTML = html;
    }

    // =====================================================
    // AI RESPONSE
    // =====================================================

    function renderResponse(
        container,
        response
    ) {

        if (!container) return;

        const text =
            typeof response === 'string'
                ? response
                : (
                    response?.response
                    || response?.message
                    || formatJSON(response)
                );

        // ================================================
        // CODE BLOCK PARSER
        // ================================================

        const parsed =
            parseCodeBlocks(text);

        container.innerHTML = parsed;
    }

    // =====================================================
    // CODE PARSER
    // =====================================================

    function parseCodeBlocks(text = '') {

        const escaped =
            escapeHTML(text);

        const blocks =
            escaped.split(/```/g);

        let html = '';

        blocks.forEach((block, index) => {

            const isCode =
                index % 2 === 1;

            if (!isCode) {

                html += `
                    <div class="architect-response-text">
                        ${block
                            .replace(/\n/g, '<br>')}
                    </div>
                `;

                return;
            }

            // ---------------------------------------------
            // language strip
            // ---------------------------------------------

            const cleaned =
                block.replace(
                    /^[a-zA-Z0-9]+\n/,
                    ''
                );

            html += `
                <div class="architect-code-wrap">

                    <div class="architect-code-header">
                        CODE PATCH
                    </div>

                    <pre class="architect-code-block"><code>${cleaned}</code></pre>

                </div>
            `;
        });

        return html;
    }

    // =====================================================
    // APPEND LOG
    // =====================================================

    function appendLog(
        container,
        message
    ) {

        if (!container) return;

        const node =
            document.createElement('div');

        node.className =
            'architect-log-line';

        node.textContent =
            `[${new Date().toLocaleTimeString()}] ${message}`;

        container.appendChild(node);

        container.scrollTop =
            container.scrollHeight;
    }

    // =====================================================
    // CLEAR
    // =====================================================

    function clear(container) {

        if (!container) return;

        container.innerHTML = '';
    }

    // =====================================================
    // API
    // =====================================================

    return {

        renderLoading,

        renderError,

        renderScanResult,

        renderResponse,

        appendLog,

        clear
    };
}