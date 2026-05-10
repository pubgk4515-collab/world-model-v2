// devtools/architect/architect_patch_engine.js
// ------------------------------------------------------------
// Symbiote Studio — Architect Patch Engine v1
// Phase 1: Structured Patch Intelligence
// ------------------------------------------------------------

export default class ArchitectPatchEngine {
    constructor() {
        this.lastPatch = null;
    }

    // --------------------------------------------------------
    // PUBLIC
    // --------------------------------------------------------

    parse(rawResponse) {
        try {
            if (!rawResponse || typeof rawResponse !== 'string') {
                throw new Error('Patch response is empty.');
            }

            const cleaned = this.extractJSON(rawResponse);

            const parsed = JSON.parse(cleaned);

            this.validate(parsed);

            this.lastPatch = parsed;

            return {
                ok: true,
                patch: parsed,
                error: null
            };

        } catch (err) {
            console.error('[PatchEngine] Parse failed:', err);

            return {
                ok: false,
                patch: null,
                error: err.message || 'Unknown patch parse error.'
            };
        }
    }

    getLastPatch() {
        return this.lastPatch;
    }

    clear() {
        this.lastPatch = null;
    }

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    validate(patch) {
        if (!patch || typeof patch !== 'object') {
            throw new Error('Patch must be an object.');
        }

        if (!patch.summary || typeof patch.summary !== 'string') {
            throw new Error('Patch missing summary.');
        }

        if (!Array.isArray(patch.files)) {
            throw new Error('Patch files array missing.');
        }

        if (patch.files.length === 0) {
            throw new Error('Patch contains no file operations.');
        }

        patch.files.forEach((file, index) => {
            this.validateFilePatch(file, index);
        });

        return true;
    }

    validateFilePatch(file, index) {
        if (!file.path || typeof file.path !== 'string') {
            throw new Error(`files[${index}] missing path.`);
        }

        if (!file.operation || typeof file.operation !== 'string') {
            throw new Error(`files[${index}] missing operation.`);
        }

        const allowedOperations = [
            'replace',
            'create',
            'delete',
            'append'
        ];

        if (!allowedOperations.includes(file.operation)) {
            throw new Error(
                `files[${index}] invalid operation "${file.operation}".`
            );
        }

        if (
            file.operation === 'replace' ||
            file.operation === 'append'
        ) {
            if (typeof file.replace !== 'string') {
                throw new Error(
                    `files[${index}] missing replace content.`
                );
            }
        }

        if (file.operation === 'replace') {
            if (typeof file.find !== 'string') {
                throw new Error(
                    `files[${index}] missing find content.`
                );
            }
        }
    }

    // --------------------------------------------------------
    // JSON EXTRACTION
    // --------------------------------------------------------

    extractJSON(raw) {
        const trimmed = raw.trim();

        // plain JSON
        if (
            trimmed.startsWith('{') &&
            trimmed.endsWith('}')
        ) {
            return trimmed;
        }

        // markdown fenced json
        const fencedMatch = trimmed.match(
            /```(?:json)?\s*([\s\S]*?)```/
        );

        if (fencedMatch && fencedMatch[1]) {
            return fencedMatch[1].trim();
        }

        // fallback object extraction
        const firstBrace = trimmed.indexOf('{');
        const lastBrace = trimmed.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error('No JSON object found in response.');
        }

        return trimmed.slice(firstBrace, lastBrace + 1);
    }

    // --------------------------------------------------------
    // PATCH SUMMARY
    // --------------------------------------------------------

    summarize(patch) {
        if (!patch) return null;

        return {
            summary: patch.summary || 'Unknown Patch',
            risk: patch.risk || 'unknown',
            operations: patch.files.length,
            files: patch.files.map((f) => ({
                path: f.path,
                operation: f.operation
            }))
        };
    }

    // --------------------------------------------------------
    // DIFF PREVIEW MODEL
    // --------------------------------------------------------

    createPreviewModel(patch) {
        if (!patch) return [];

        return patch.files.map((file, index) => ({
            id: `${Date.now()}-${index}`,
            path: file.path,
            operation: file.operation,
            find: file.find || '',
            replace: file.replace || '',
            content: file.content || '',
            risk: patch.risk || 'unknown'
        }));
    }

    // --------------------------------------------------------
    // FUTURE PATCH APPLY PLACEHOLDER
    // --------------------------------------------------------

    async apply() {
        console.warn(
            '[PatchEngine] apply() not implemented yet.'
        );

        return {
            ok: false,
            error: 'Patch apply not implemented.'
        };
    }
}