// /api/apply-patch.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Patch Apply API
// Safe Runtime Patch Engine
// -----------------------------------------------------------------------------

import fs
from 'fs/promises';

import path
from 'path';

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const PROJECT_ROOT =
    process.cwd();

const MAX_PATCH_SIZE =
    500000;

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function json(
    res,
    status,
    payload
) {

    res.status(status);

    res.setHeader(
        'Content-Type',
        'application/json'
    );

    return res.send(
        JSON.stringify(payload)
    );
}

function sanitizePatch(patch) {

    return String(
        patch || ''
    )
        .replace(/\r/g, '')
        .trim();
}

function ensureSafePath(filePath) {

    const resolved =
        path.resolve(
            PROJECT_ROOT,
            filePath
        );

    if (
        !resolved.startsWith(
            PROJECT_ROOT
        )
    ) {

        throw new Error(
            `Unsafe file path blocked: ${filePath}`
        );
    }

    return resolved;
}

async function fileExists(filePath) {

    try {

        await fs.access(
            filePath
        );

        return true;

    } catch {

        return false;
    }
}

// -----------------------------------------------------------------------------
// PATCH PARSER
// -----------------------------------------------------------------------------

function parsePatchBlocks(rawPatch) {

    // -------------------------------------------------------------------------
    // FORMAT:
    //
    // <<<FILE:path/to/file.js
    // file content
    // >>>END_FILE
    //
    // -------------------------------------------------------------------------

    const regex =
        /<<<FILE:(.*?)\n([\s\S]*?)>>>END_FILE/g;

    const matches =
        [
            ...rawPatch.matchAll(
                regex
            )
        ];

    if (!matches.length) {

        throw new Error(
            'No valid patch blocks found.'
        );
    }

    return matches.map(
        (match) => {

            const relativePath =
                match[1]?.trim();

            const content =
                match[2] ?? '';

            if (!relativePath) {

                throw new Error(
                    'Patch block missing file path.'
                );
            }

            return {

                path:
                    relativePath,

                content
            };
        }
    );
}

// -----------------------------------------------------------------------------
// WRITE FILE
// -----------------------------------------------------------------------------

async function writePatchedFile(
    relativePath,
    content
) {

    const absolutePath =
        ensureSafePath(
            relativePath
        );

    const directory =
        path.dirname(
            absolutePath
        );

    // -------------------------------------------------------------------------
    // CREATE DIRECTORY
    // -------------------------------------------------------------------------

    await fs.mkdir(
        directory,
        {
            recursive: true
        }
    );

    // -------------------------------------------------------------------------
    // BACKUP
    // -------------------------------------------------------------------------

    const exists =
        await fileExists(
            absolutePath
        );

    if (exists) {

        const previous =
            await fs.readFile(
                absolutePath,
                'utf8'
            );

        await fs.writeFile(

            `${absolutePath}.bak`,

            previous,

            'utf8'
        );
    }

    // -------------------------------------------------------------------------
    // WRITE
    // -------------------------------------------------------------------------

    await fs.writeFile(
        absolutePath,
        content,
        'utf8'
    );

    return absolutePath;
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

export default async function handler(
    req,
    res
) {

    // -------------------------------------------------------------------------
    // METHOD
    // -------------------------------------------------------------------------

    if (
        req.method !==
        'POST'
    ) {

        return json(
            res,
            405,
            {

                ok: false,

                error:
                    'Method not allowed.'
            }
        );
    }

    try {

        // ---------------------------------------------------------------------
        // INPUT
        // ---------------------------------------------------------------------

        const body =
            req.body || {};

        const patch =
            sanitizePatch(
                body.patch
            );

        if (!patch) {

            return json(
                res,
                400,
                {

                    ok: false,

                    error:
                        'Patch payload missing.'
                }
            );
        }

        // ---------------------------------------------------------------------
        // SIZE LIMIT
        // ---------------------------------------------------------------------

        if (
            patch.length >
            MAX_PATCH_SIZE
        ) {

            return json(
                res,
                413,
                {

                    ok: false,

                    error:
                        'Patch exceeds safe size limit.'
                }
            );
        }

        // ---------------------------------------------------------------------
        // PARSE
        // ---------------------------------------------------------------------

        const patchFiles =
            parsePatchBlocks(
                patch
            );

        // ---------------------------------------------------------------------
        // APPLY
        // ---------------------------------------------------------------------

        const modifiedFiles =
            [];

        for (
            const file
            of patchFiles
        ) {

            await writePatchedFile(

                file.path,

                file.content
            );

            modifiedFiles.push(
                file.path
            );
        }

        // ---------------------------------------------------------------------
        // RESPONSE
        // ---------------------------------------------------------------------

        return json(
            res,
            200,
            {

                ok: true,

                message:
                    'Patch applied successfully.',

                files:
                    modifiedFiles
            }
        );

    } catch (err) {

        console.error(
            '[Apply Patch API]',
            err
        );

        return json(
            res,
            500,
            {

                ok: false,

                error:
                    err.message ||

                    'Patch apply failed.'
            }
        );
    }
}
