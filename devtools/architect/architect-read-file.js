// /api/architect-read-file.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Read File API
// Safe Repository Read Endpoint
// -----------------------------------------------------------------------------

import {
    readFile,
    validateFilePath
}
from '../devtools/architect/architect_file_system.js';

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const MAX_BATCH_FILES =
    20;

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

function normalizePaths(
    input
) {

    // -------------------------------------------------------------------------
    // SINGLE
    // -------------------------------------------------------------------------

    if (
        typeof input ===
        'string'
    ) {

        return [
            input
        ];
    }

    // -------------------------------------------------------------------------
    // ARRAY
    // -------------------------------------------------------------------------

    if (
        Array.isArray(
            input
        )
    ) {

        return input
            .map((x) =>
                String(x || '')
                    .trim()
            )
            .filter(Boolean);
    }

    return [];
}

// -----------------------------------------------------------------------------
// SINGLE READ
// -----------------------------------------------------------------------------

async function handleSingleRead(
    filePath
) {

    // -------------------------------------------------------------------------
    // VALIDATE
    // -------------------------------------------------------------------------

    const validation =
        validateFilePath(
            filePath
        );

    if (!validation.valid) {

        return {

            ok: false,

            path:
                filePath,

            error:
                validation.error
        };
    }

    try {

        const result =
            await readFile(
                filePath
            );

        return {

            ok: true,

            path:
                result.path,

            size:
                result.size,

            content:
                result.content
        };

    } catch (err) {

        return {

            ok: false,

            path:
                filePath,

            error:
                err.message ||

                'File read failed.'
        };
    }
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
        // BODY
        // ---------------------------------------------------------------------

        const body =
            req.body || {};

        const paths =
            normalizePaths(

                body.path ||

                body.paths
            );

        // ---------------------------------------------------------------------
        // EMPTY
        // ---------------------------------------------------------------------

        if (!paths.length) {

            return json(
                res,
                400,
                {

                    ok: false,

                    error:
                        'No file path provided.'
                }
            );
        }

        // ---------------------------------------------------------------------
        // LIMIT
        // ---------------------------------------------------------------------

        if (
            paths.length >
            MAX_BATCH_FILES
        ) {

            return json(
                res,
                400,
                {

                    ok: false,

                    error:
                        `Maximum ${MAX_BATCH_FILES} files allowed.`
                }
            );
        }

        // ---------------------------------------------------------------------
        // READ
        // ---------------------------------------------------------------------

        const results =
            [];

        for (
            const filePath
            of paths
        ) {

            const result =
                await handleSingleRead(
                    filePath
                );

            results.push(
                result
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

                files:
                    results
            }
        );

    } catch (err) {

        console.error(
            '[Architect Read File API]',
            err
        );

        return json(
            res,
            500,
            {

                ok: false,

                error:
                    err.message ||

                    'Read file API failed.'
            }
        );
    }
}
