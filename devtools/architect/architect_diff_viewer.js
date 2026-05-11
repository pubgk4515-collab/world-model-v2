// /devtools/architect/architect_diff_viewer.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Diff Viewer
// Premium Runtime Patch Preview System
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function escapeHtml(value = '') {

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function splitLines(content = '') {

    return String(content)
        .replace(/\r/g, '')
        .split('\n');
}

function normalize(content = '') {

    return String(content || '')
        .replace(/\r/g, '');
}

// -----------------------------------------------------------------------------
// PARSE PATCH
// -----------------------------------------------------------------------------

export function parsePatchFiles(
    patch = ''
) {

    const regex =
        /<<<FILE:(.*?)\n([\s\S]*?)>>>END_FILE/g;

    const matches =
        [
            ...String(patch)
                .matchAll(regex)
        ];

    return matches.map(
        (match) => {

            const filePath =
                match[1]
                    ?.trim();

            const content =
                normalize(
                    match[2] || ''
                );

            return {

                path:
                    filePath,

                content
            };
        }
    );
}

// -----------------------------------------------------------------------------
// SIMPLE LINE DIFF
// -----------------------------------------------------------------------------

export function createLineDiff(
    oldContent = '',
    newContent = ''
) {

    const oldLines =
        splitLines(
            oldContent
        );

    const newLines =
        splitLines(
            newContent
        );

    const max =
        Math.max(
            oldLines.length,
            newLines.length
        );

    const output =
        [];

    for (
        let i = 0;
        i < max;
        i++
    ) {

        const before =
            oldLines[i] ?? '';

        const after =
            newLines[i] ?? '';

        // ---------------------------------------------------------------------
        // SAME
        // ---------------------------------------------------------------------

        if (before === after) {

            output.push({

                type:
                    'same',

                before,

                after,

                line:
                    i + 1
            });

            continue;
        }

        // ---------------------------------------------------------------------
        // REMOVED
        // ---------------------------------------------------------------------

        if (
            before &&
            !after
        ) {

            output.push({

                type:
                    'removed',

                before,

                after:
                    '',

                line:
                    i + 1
            });

            continue;
        }

        // ---------------------------------------------------------------------
        // ADDED
        // ---------------------------------------------------------------------

        if (
            !before &&
            after
        ) {

            output.push({

                type:
                    'added',

                before:
                    '',

                after,

                line:
                    i + 1
            });

            continue;
        }

        // ---------------------------------------------------------------------
        // CHANGED
        // ---------------------------------------------------------------------

        output.push({

            type:
                'changed',

            before,

            after,

            line:
                i + 1
        });
    }

    return output;
}

// -----------------------------------------------------------------------------
// DIFF HTML
// -----------------------------------------------------------------------------

export function renderDiffLines(
    lines = []
) {

    return lines.map(
        (entry) => {

            const type =
                entry.type;

            const line =
                entry.line;

            // -----------------------------------------------------------------
            // SAME
            // -----------------------------------------------------------------

            if (
                type === 'same'
            ) {

                return `
                    <div class="architect-diff-line architect-diff-same">

                        <div class="architect-diff-line-number">
                            ${line}
                        </div>

                        <pre class="architect-diff-code">${escapeHtml(entry.after)}</pre>

                    </div>
                `;
            }

            // -----------------------------------------------------------------
            // ADDED
            // -----------------------------------------------------------------

            if (
                type === 'added'
            ) {

                return `
                    <div class="architect-diff-line architect-diff-added">

                        <div class="architect-diff-line-number">
                            +
                        </div>

                        <pre class="architect-diff-code">${escapeHtml(entry.after)}</pre>

                    </div>
                `;
            }

            // -----------------------------------------------------------------
            // REMOVED
            // -----------------------------------------------------------------

            if (
                type === 'removed'
            ) {

                return `
                    <div class="architect-diff-line architect-diff-removed">

                        <div class="architect-diff-line-number">
                            −
                        </div>

                        <pre class="architect-diff-code">${escapeHtml(entry.before)}</pre>

                    </div>
                `;
            }

            // -----------------------------------------------------------------
            // CHANGED
            // -----------------------------------------------------------------

            return `
                <div class="architect-diff-line architect-diff-changed">

                    <div class="architect-diff-line-number">
                        ~
                    </div>

                    <div class="architect-diff-change-group">

                        <pre class="architect-diff-code architect-diff-before">${escapeHtml(entry.before)}</pre>

                        <pre class="architect-diff-code architect-diff-after">${escapeHtml(entry.after)}</pre>

                    </div>

                </div>
            `;
        }
    )
    .join('');
}

// -----------------------------------------------------------------------------
// MAIN VIEW
// -----------------------------------------------------------------------------

export function renderDiffViewer(
    options = {}
) {

    const fileName =
        options.fileName ||
        'unknown';

    const oldContent =
        normalize(
            options.oldContent || ''
        );

    const newContent =
        normalize(
            options.newContent || ''
        );

    const diff =
        createLineDiff(
            oldContent,
            newContent
        );

    const added =
        diff.filter(
            (x) =>
                x.type === 'added'
        ).length;

    const removed =
        diff.filter(
            (x) =>
                x.type === 'removed'
        ).length;

    const changed =
        diff.filter(
            (x) =>
                x.type === 'changed'
        ).length;

    return `
        <section class="architect-diff-card">

            <!-- HEADER -->

            <div class="architect-diff-header">

                <div class="architect-diff-file">
                    ${escapeHtml(fileName)}
                </div>

                <div class="architect-diff-stats">

                    <span class="architect-diff-stat architect-diff-stat-added">
                        +${added}
                    </span>

                    <span class="architect-diff-stat architect-diff-stat-removed">
                        -${removed}
                    </span>

                    <span class="architect-diff-stat architect-diff-stat-changed">
                        ~${changed}
                    </span>

                </div>

            </div>

            <!-- BODY -->

            <div class="architect-diff-body">

                ${renderDiffLines(diff)}

            </div>

        </section>
    `;
}

// -----------------------------------------------------------------------------
// MULTI FILE VIEW
// -----------------------------------------------------------------------------

export function renderMultiFileDiff(
    files = []
) {

    if (!files.length) {

        return `
            <div class="architect-empty-diff">
                No diff preview available.
            </div>
        `;
    }

    return files.map(
        (file) => {

            return renderDiffViewer({

                fileName:
                    file.path,

                oldContent:
                    file.oldContent || '',

                newContent:
                    file.newContent || ''
            });

        }
    )
    .join('');
}

// -----------------------------------------------------------------------------
// DEFAULT EXPORT
// -----------------------------------------------------------------------------

export default {

    parsePatchFiles,

    createLineDiff,

    renderDiffViewer,

    renderMultiFileDiff
};
