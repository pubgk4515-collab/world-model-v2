// /devtools/architect/architect_patch_engine.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Patch Engine
// Structured AI Patch Parser + Validator
// -----------------------------------------------------------------------------

export default class ArchitectPatchEngine {

    // -------------------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------------------

    constructor(config = {}) {

        this.maxPatchSize =
            config.maxPatchSize ||
            500000;

        this.allowedExtensions =
            config.allowedExtensions || [

                '.js',
                '.ts',
                '.jsx',
                '.tsx',
                '.css',
                '.scss',
                '.html',
                '.json',
                '.md'
            ];

        this.lastPatch =
            null;

        console.log(
            '🧠 ArchitectPatchEngine ready.'
        );
    }

    // -------------------------------------------------------------------------
    // PARSE
    // -------------------------------------------------------------------------

    parse(rawInput = '') {

        try {

            const raw =
                String(rawInput || '')
                    .trim();

            // -------------------------------------------------------------
            // EMPTY
            // -------------------------------------------------------------

            if (!raw) {

                return {

                    ok: false,

                    error:
                        'Patch payload is empty.'
                };
            }

            // -------------------------------------------------------------
            // SIZE LIMIT
            // -------------------------------------------------------------

            if (
                raw.length >
                this.maxPatchSize
            ) {

                return {

                    ok: false,

                    error:
                        'Patch exceeds safe size limit.'
                };
            }

            // -------------------------------------------------------------
            // BLOCKS
            // -------------------------------------------------------------

            const files =
                this.extractFileBlocks(
                    raw
                );

            // -------------------------------------------------------------
            // NONE
            // -------------------------------------------------------------

            if (!files.length) {

                return {

                    ok: false,

                    error:
                        'No valid patch blocks found.'
                };
            }

            // -------------------------------------------------------------
            // VALIDATE
            // -------------------------------------------------------------

            const validation =
                this.validateFiles(
                    files
                );

            if (!validation.ok) {

                return validation;
            }

            // -------------------------------------------------------------
            // NORMALIZED
            // -------------------------------------------------------------

            const normalized =
                this.buildNormalizedPatch(
                    files
                );

            // -------------------------------------------------------------
            // SAVE
            // -------------------------------------------------------------

            this.lastPatch =
                normalized.raw;

            // -------------------------------------------------------------
            // RESULT
            // -------------------------------------------------------------

            return {

                ok: true,

                summary:
                    `Parsed ${files.length} patch file(s).`,

                patch:
                    normalized.raw,

                files:
                    normalized.files,

                raw:
                    raw
            };

        } catch (err) {

            console.error(
                '[ArchitectPatchEngine] Parse failed:',
                err
            );

            return {

                ok: false,

                error:
                    err.message ||

                    'Patch parsing failed.'
            };
        }
    }

    // -------------------------------------------------------------------------
    // EXTRACT FILE BLOCKS
    // -------------------------------------------------------------------------

    extractFileBlocks(raw) {

        // ---------------------------------------------------------------------
        // FORMAT:
        //
        // <<<FILE:path/to/file.js
        // code...
        // >>>END_FILE
        // ---------------------------------------------------------------------

        const regex =
            /<<<FILE:(.*?)\n([\s\S]*?)>>>END_FILE/g;

        const matches =
            [
                ...raw.matchAll(
                    regex
                )
            ];

        return matches.map(
            (match) => {

                const filePath =
                    match[1]
                        ?.trim();

                const content =
                    match[2] || '';

                return {

                    path:
                        filePath,

                    content
                };
            }
        );
    }

    // -------------------------------------------------------------------------
    // VALIDATE FILES
    // -------------------------------------------------------------------------

    validateFiles(files = []) {

        for (
            const file
            of files
        ) {

            // -------------------------------------------------------------
            // PATH
            // -------------------------------------------------------------

            if (
                !file.path
            ) {

                return {

                    ok: false,

                    error:
                        'Patch file missing path.'
                };
            }

            // -------------------------------------------------------------
            // TRAVERSAL
            // -------------------------------------------------------------

            if (
                file.path.includes('..')
            ) {

                return {

                    ok: false,

                    error:
                        `Unsafe path blocked: ${file.path}`
                };
            }

            // -------------------------------------------------------------
            // EXTENSION
            // -------------------------------------------------------------

            const valid =
                this.allowedExtensions
                    .some((ext) =>
                        file.path.endsWith(
                            ext
                        )
                    );

            if (!valid) {

                return {

                    ok: false,

                    error:
                        `Unsupported file type: ${file.path}`
                };
            }

            // -------------------------------------------------------------
            // CONTENT
            // -------------------------------------------------------------

            if (
                typeof file.content !==
                'string'
            ) {

                return {

                    ok: false,

                    error:
                        `Invalid file content: ${file.path}`
                };
            }
        }

        return {

            ok: true
        };
    }

    // -------------------------------------------------------------------------
    // NORMALIZE
    // -------------------------------------------------------------------------

    buildNormalizedPatch(files = []) {

        const normalizedFiles =
            [];

        let combined =
            '';

        for (
            const file
            of files
        ) {

            const normalizedContent =
                String(
                    file.content || ''
                )
                    .replace(/\r/g, '');

            normalizedFiles.push({

                path:
                    file.path,

                content:
                    normalizedContent
            });

            combined +=
`<<<FILE:${file.path}
${normalizedContent}
>>>END_FILE

`;
        }

        return {

            raw:
                combined.trim(),

            files:
                normalizedFiles
        };
    }

    // -------------------------------------------------------------------------
    // EXTRACT PATCH ONLY
    // -------------------------------------------------------------------------

    extractPatchFromAIResponse(
        response
    ) {

        try {

            // -------------------------------------------------------------
            // STRING
            // -------------------------------------------------------------

            if (
                typeof response ===
                'string'
            ) {

                return this.parse(
                    response
                );
            }

            // -------------------------------------------------------------
            // PATCH FIELD
            // -------------------------------------------------------------

            if (
                response?.patch
            ) {

                return this.parse(
                    response.patch
                );
            }

            // -------------------------------------------------------------
            // RAW FIELD
            // -------------------------------------------------------------

            if (
                response?.raw
            ) {

                return this.parse(
                    response.raw
                );
            }

            return {

                ok: false,

                error:
                    'No patch field found in AI response.'
            };

        } catch (err) {

            console.error(
                '[ArchitectPatchEngine] extractPatchFromAIResponse failed:',
                err
            );

            return {

                ok: false,

                error:
                    err.message
            };
        }
    }

    // -------------------------------------------------------------------------
    // GETTERS
    // -------------------------------------------------------------------------

    getLastPatch() {

        return this.lastPatch;
    }

    // -------------------------------------------------------------------------
    // CLEAR
    // -------------------------------------------------------------------------

    clear() {

        this.lastPatch =
            null;
    }
}
