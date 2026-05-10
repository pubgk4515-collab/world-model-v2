// api/apply-patch.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Apply Patch API
// Phase 2: Safe Patch Application Runtime
// -----------------------------------------------------------------------------
//
// Responsibilities:
// - receive structured patch JSON
// - validate patch payload
// - apply patch set safely
// - create snapshots automatically
// - return detailed results
//
// IMPORTANT:
// This route intentionally blocks:
// - destructive delete operations
// - arbitrary filesystem access
// - malformed patch payloads
// -----------------------------------------------------------------------------

import ArchitectFSAgent
from '../server/architect_fs_agent.js';

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

    if (req.method !== 'POST') {

        return res.status(405).json({

            ok: false,

            error:
                'Method not allowed.'
        });
    }

    try {

        // ---------------------------------------------------------------------
        // BODY
        // ---------------------------------------------------------------------

        const body =
            req.body || {};

        const patch =
            body.patch;

        // ---------------------------------------------------------------------
        // VALIDATION
        // ---------------------------------------------------------------------

        if (
            !patch ||
            typeof patch !== 'object'
        ) {

            return res.status(400).json({

                ok: false,

                error:
                    'Patch payload missing.'
            });
        }

        if (
            !Array.isArray(
                patch.files
            )
        ) {

            return res.status(400).json({

                ok: false,

                error:
                    'Patch files array missing.'
            });
        }

        if (
            patch.files.length === 0
        ) {

            return res.status(400).json({

                ok: false,

                error:
                    'Patch contains no operations.'
            });
        }

        // ---------------------------------------------------------------------
        // SAFE MODE
        // ---------------------------------------------------------------------

        for (const filePatch of patch.files) {

            if (
                filePatch.operation ===
                'delete'
            ) {

                return res.status(403).json({

                    ok: false,

                    error:
                        'Delete operations are blocked in safe mode.'
                });
            }
        }

        // ---------------------------------------------------------------------
        // FS AGENT
        // ---------------------------------------------------------------------

        const fsAgent =
            new ArchitectFSAgent();

        // ---------------------------------------------------------------------
        // APPLY PATCH SET
        // ---------------------------------------------------------------------

        const results =
            await fsAgent.applyPatchSet(
                patch.files
            );

        // ---------------------------------------------------------------------
        // SUCCESS STATS
        // ---------------------------------------------------------------------

        const successCount =
            results.filter(
                (r) => r.ok
            ).length;

        const failedCount =
            results.length -
            successCount;

        // ---------------------------------------------------------------------
        // SNAPSHOTS
        // ---------------------------------------------------------------------

        const snapshots =
            await fsAgent.listSnapshots();

        // ---------------------------------------------------------------------
        // RESPONSE
        // ---------------------------------------------------------------------

        return res.status(200).json({

            ok:
                failedCount === 0,

            summary:
                patch.summary ||
                'Patch applied.',

            risk:
                patch.risk ||
                'unknown',

            totalOperations:
                results.length,

            successCount,

            failedCount,

            results,

            snapshots:
                snapshots.slice(0, 10)
        });

    } catch (err) {

        console.error(
            '[ApplyPatchAPI] Fatal Error:',
            err
        );

        return res.status(500).json({

            ok: false,

            error:
                'Patch application failed.',

            details:
                err.message ||
                String(err)
        });
    }
}