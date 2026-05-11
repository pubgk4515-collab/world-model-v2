// /devtools/architect/architect_file_system.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect File System
// Safe Runtime Repository Interface
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

const BACKUP_EXTENSION =
    '.architect.bak';

const MAX_FILE_SIZE =
    2 * 1024 * 1024;

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function normalizePath(
    filePath = ''
) {

    return String(filePath)
        .replace(/\\/g, '/')
        .trim();
}

function ensureSafePath(
    filePath = ''
) {

    const normalized =
        normalizePath(
            filePath
        );

    const absolute =
        path.resolve(
            PROJECT_ROOT,
            normalized
        );

    if (
        !absolute.startsWith(
            PROJECT_ROOT
        )
    ) {

        throw new Error(
            `Unsafe file path blocked: ${filePath}`
        );
    }

    return absolute;
}

async function exists(
    filePath
) {

    try {

        await fs.access(
            filePath
        );

        return true;

    } catch {

        return false;
    }
}

async function ensureDirectory(
    filePath
) {

    const dir =
        path.dirname(
            filePath
        );

    await fs.mkdir(
        dir,
        {
            recursive: true
        }
    );
}

// -----------------------------------------------------------------------------
// READ
// -----------------------------------------------------------------------------

export async function readFile(
    relativePath
) {

    const absolute =
        ensureSafePath(
            relativePath
        );

    const stat =
        await fs.stat(
            absolute
        );

    // -------------------------------------------------------------------------
    // SIZE LIMIT
    // -------------------------------------------------------------------------

    if (
        stat.size >
        MAX_FILE_SIZE
    ) {

        throw new Error(
            `File too large: ${relativePath}`
        );
    }

    const content =
        await fs.readFile(
            absolute,
            'utf8'
        );

    return {

        path:
            normalizePath(
                relativePath
            ),

        absolutePath:
            absolute,

        size:
            stat.size,

        content
    };
}

// -----------------------------------------------------------------------------
// WRITE
// -----------------------------------------------------------------------------

export async function writeFile(
    relativePath,
    content
) {

    const absolute =
        ensureSafePath(
            relativePath
        );

    await ensureDirectory(
        absolute
    );

    await fs.writeFile(
        absolute,
        String(content),
        'utf8'
    );

    return {

        success: true,

        path:
            normalizePath(
                relativePath
            ),

        absolutePath:
            absolute
    };
}

// -----------------------------------------------------------------------------
// BACKUP
// -----------------------------------------------------------------------------

export async function backupFile(
    relativePath
) {

    const absolute =
        ensureSafePath(
            relativePath
        );

    const found =
        await exists(
            absolute
        );

    if (!found) {

        return {

            success: false,

            reason:
                'File does not exist.'
        };
    }

    const backupPath =
        `${absolute}${BACKUP_EXTENSION}`;

    const content =
        await fs.readFile(
            absolute,
            'utf8'
        );

    await fs.writeFile(
        backupPath,
        content,
        'utf8'
    );

    return {

        success: true,

        original:
            absolute,

        backup:
            backupPath
    };
}

// -----------------------------------------------------------------------------
// RESTORE
// -----------------------------------------------------------------------------

export async function restoreBackup(
    relativePath
) {

    const absolute =
        ensureSafePath(
            relativePath
        );

    const backupPath =
        `${absolute}${BACKUP_EXTENSION}`;

    const found =
        await exists(
            backupPath
        );

    if (!found) {

        throw new Error(
            `Backup missing for: ${relativePath}`
        );
    }

    const backupContent =
        await fs.readFile(
            backupPath,
            'utf8'
        );

    await fs.writeFile(
        absolute,
        backupContent,
        'utf8'
    );

    return {

        success: true,

        restored:
            normalizePath(
                relativePath
            )
    };
}

// -----------------------------------------------------------------------------
// DELETE BACKUP
// -----------------------------------------------------------------------------

export async function deleteBackup(
    relativePath
) {

    const absolute =
        ensureSafePath(
            relativePath
        );

    const backupPath =
        `${absolute}${BACKUP_EXTENSION}`;

    const found =
        await exists(
            backupPath
        );

    if (!found) {

        return {

            success: false,

            reason:
                'Backup file missing.'
        };
    }

    await fs.unlink(
        backupPath
    );

    return {

        success: true,

        backup:
            backupPath
    };
}

// -----------------------------------------------------------------------------
// BATCH WRITE
// -----------------------------------------------------------------------------

export async function batchWriteFiles(
    files = []
) {

    const written =
        [];

    for (
        const file
        of files
    ) {

        if (
            !file?.path
        ) {

            throw new Error(
                'Batch write file missing path.'
            );
        }

        // ---------------------------------------------------------------------
        // BACKUP
        // ---------------------------------------------------------------------

        await backupFile(
            file.path
        );

        // ---------------------------------------------------------------------
        // WRITE
        // ---------------------------------------------------------------------

        const result =
            await writeFile(

                file.path,

                file.content || ''
            );

        written.push(
            result
        );
    }

    return written;
}

// -----------------------------------------------------------------------------
// VALIDATE
// -----------------------------------------------------------------------------

export function validateFilePath(
    relativePath
) {

    try {

        ensureSafePath(
            relativePath
        );

        return {

            valid: true
        };

    } catch (err) {

        return {

            valid: false,

            error:
                err.message
        };
    }
}

// -----------------------------------------------------------------------------
// FILE INFO
// -----------------------------------------------------------------------------

export async function getFileInfo(
    relativePath
) {

    const absolute =
        ensureSafePath(
            relativePath
        );

    const stat =
        await fs.stat(
            absolute
        );

    return {

        path:
            normalizePath(
                relativePath
            ),

        absolutePath:
            absolute,

        size:
            stat.size,

        createdAt:
            stat.birthtime,

        updatedAt:
            stat.mtime
    };
}

// -----------------------------------------------------------------------------
// DEFAULT EXPORT
// -----------------------------------------------------------------------------

export default {

    readFile,

    writeFile,

    backupFile,

    restoreBackup,

    deleteBackup,

    batchWriteFiles,

    validateFilePath,

    getFileInfo
};
