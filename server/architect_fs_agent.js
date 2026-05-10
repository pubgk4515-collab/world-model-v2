// server/architect_fs_agent.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Filesystem Agent
// Phase 2: Safe Local Repo Modification Runtime
// -----------------------------------------------------------------------------
//
// Responsibilities:
// - safe file reads
// - safe file writes
// - patch application
// - snapshot backups
// - rollback support
// - sandboxed project access
//
// IMPORTANT:
// This agent is intentionally conservative.
// Dangerous operations are blocked by design.
// -----------------------------------------------------------------------------

import fs from 'fs/promises';
import path from 'path';

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const PROJECT_ROOT =
    process.cwd();

const SNAPSHOT_DIR =
    path.join(
        PROJECT_ROOT,
        '.architect-snapshots'
    );

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function normalizeProjectPath(relativePath = '') {

    const normalized =
        path.normalize(relativePath);

    const absolute =
        path.resolve(
            PROJECT_ROOT,
            normalized
        );

    // ---------------------------------------------------------
    // SANDBOX PROTECTION
    // ---------------------------------------------------------

    if (!absolute.startsWith(PROJECT_ROOT)) {

        throw new Error(
            'Filesystem sandbox violation blocked.'
        );
    }

    for (const protectedPath of PROTECTED_PATHS) {

    if (
        absolute.includes(protectedPath)
    ) {

        throw new Error(
            `Protected path blocked: ${protectedPath}`
        );
    }
}

    return absolute;
}

function timestamp() {

    return new Date()
        .toISOString()
        .replaceAll(':', '-')
        .replaceAll('.', '-');
}

async function ensureSnapshotDir() {

    await fs.mkdir(
        SNAPSHOT_DIR,
        { recursive: true }
    );
}

const MAX_PATCH_FILES = 5;

const MAX_FILE_SIZE = 300000;

const PROTECTED_PATHS = [
    '.env',
    '.git',
    'node_modules',
    '.architect-snapshots'
];

const DANGEROUS_PATTERNS = [
    'rm -rf',
    'fs.rmSync',
    'child_process',
    'eval(',
    'new Function(',
    'while(true)',
    'while (true)'
];


// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

export default class ArchitectFSAgent {

    constructor() {

        console.log(
            '🧠 ArchitectFSAgent ready.'
        );
    }

    // -------------------------------------------------------------------------
    // FILE READ
    // -------------------------------------------------------------------------

    async readFile(relativePath) {

        const absolute =
            normalizeProjectPath(relativePath);

        const content =
            await fs.readFile(
                absolute,
                'utf8'
            );

        return {
            path: relativePath,
            absolute,
            content
        };
    }

    // -------------------------------------------------------------------------
    // FILE WRITE
    // -------------------------------------------------------------------------

    async writeFile(
        relativePath,
        content
    ) {

        const absolute =
            normalizeProjectPath(relativePath);

        // -----------------------------------------------------
        // SNAPSHOT FIRST
        // -----------------------------------------------------

        await this.createSnapshot(relativePath);

        // -----------------------------------------------------
        // WRITE
        // -----------------------------------------------------

        await fs.writeFile(
            absolute,
            content,
            'utf8'
        );

        return {
            ok: true,
            path: relativePath
        };
    }

    // -------------------------------------------------------------------------
    // CREATE SNAPSHOT
    // -------------------------------------------------------------------------

    async createSnapshot(relativePath) {

        await ensureSnapshotDir();

        const absolute =
            normalizeProjectPath(relativePath);

        const exists =
            await this.exists(relativePath);

        if (!exists) {
            return null;
        }

        const content =
            await fs.readFile(
                absolute,
                'utf8'
            );

        const safeName =
            relativePath
                .replaceAll('/', '__')
                .replaceAll('\\', '__');

        const snapshotName =
            `${timestamp()}__${safeName}.bak`;

        const snapshotPath =
            path.join(
                SNAPSHOT_DIR,
                snapshotName
            );

        await fs.writeFile(
            snapshotPath,
            content,
            'utf8'
        );

        console.log(
            '📦 Snapshot created:',
            snapshotName
        );

        return {
            snapshotPath,
            snapshotName
        };
    }

    // -------------------------------------------------------------------------
    // LIST SNAPSHOTS
    // -------------------------------------------------------------------------

    async listSnapshots() {

        await ensureSnapshotDir();

        const files =
            await fs.readdir(
                SNAPSHOT_DIR
            );

        return files.sort().reverse();
    }

    // -------------------------------------------------------------------------
    // RESTORE SNAPSHOT
    // -------------------------------------------------------------------------

    async restoreSnapshot(
        snapshotName,
        targetRelativePath
    ) {

        const snapshotPath =
            path.join(
                SNAPSHOT_DIR,
                snapshotName
            );

        const snapshotContent =
            await fs.readFile(
                snapshotPath,
                'utf8'
            );

        const targetAbsolute =
            normalizeProjectPath(
                targetRelativePath
            );

        await fs.writeFile(
            targetAbsolute,
            snapshotContent,
            'utf8'
        );

        console.log(
            '♻️ Snapshot restored:',
            snapshotName
        );

        return {
            ok: true
        };
    }

    // -------------------------------------------------------------------------
    // FILE EXISTS
    // -------------------------------------------------------------------------

    async exists(relativePath) {

        try {

            const absolute =
                normalizeProjectPath(
                    relativePath
                );

            await fs.access(absolute);

            return true;

        } catch (_) {

            return false;
        }
    }

    // -------------------------------------------------------------------------
    // PROJECT FILE SCAN
    // -------------------------------------------------------------------------

    async listProjectFiles(
        directory = '.',
        recursive = true
    ) {

        const absolute =
            normalizeProjectPath(directory);

        const entries =
            await fs.readdir(
                absolute,
                {
                    withFileTypes: true
                }
            );

        const results = [];

        for (const entry of entries) {

            const relative =
                path.join(
                    directory,
                    entry.name
                );

            // -------------------------------------------------
            // IGNORE
            // -------------------------------------------------

            if (
                entry.name === 'node_modules' ||
                entry.name === '.git' ||
                entry.name === '.architect-snapshots'
            ) {
                continue;
            }

            // -------------------------------------------------
            // DIRECTORY
            // -------------------------------------------------

            if (entry.isDirectory()) {

                if (recursive) {

                    const nested =
                        await this.listProjectFiles(
                            relative,
                            true
                        );

                    results.push(...nested);
                }

                continue;
            }

            // -------------------------------------------------
            // FILE
            // -------------------------------------------------

            results.push(
                relative.replaceAll('\\', '/')
            );
        }

        return results;
    }

    // -------------------------------------------------------------------------
    // PATCH APPLY
    // -------------------------------------------------------------------------

    async applyPatch(filePatch) {

        if (!filePatch) {

            throw new Error(
                'Patch missing.'
            );
        }

        const {
            path: relativePath,
            operation,
            find,
            replace,
            content
        } = filePatch;

        if (!relativePath) {

            throw new Error(
                'Patch path missing.'
            );
        }

        // -----------------------------------------------------
        // CREATE
        // -----------------------------------------------------

        if (operation === 'create') {

            const absolute =
                normalizeProjectPath(
                    relativePath
                );

            const exists =
                await this.exists(
                    relativePath
                );

            if (exists) {

                throw new Error(
                    `File already exists: ${relativePath}`
                );
            }

            await fs.writeFile(
                absolute,
                content || '',
                'utf8'
            );

            return {
                ok: true,
                operation,
                path: relativePath
            };
        }

        // -----------------------------------------------------
        // DELETE BLOCKED
        // -----------------------------------------------------

        if (operation === 'delete') {

            throw new Error(
                'Delete operation blocked in safe mode.'
            );
        }

        // -----------------------------------------------------
        // READ EXISTING
        // -----------------------------------------------------

        const existing =
            await this.readFile(
                relativePath
            );

        let updated =
            existing.content;

        // -----------------------------------------------------
        // REPLACE
        // -----------------------------------------------------

        if (operation === 'replace') {

            if (
                typeof find !== 'string'
            ) {

                throw new Error(
                    'Replace patch missing find.'
                );
            }

            if (
                !updated.includes(find)
            ) {

                throw new Error(
                    `Find target not found in ${relativePath}`
                );
            }

            updated =
                updated.replace(
                    find,
                    replace || ''
                );
        }

        // -----------------------------------------------------
        // APPEND
        // -----------------------------------------------------

        else if (operation === 'append') {

            updated +=
                '\n' +
                (replace || '');
        }

        else {

            throw new Error(
                `Unsupported operation: ${operation}`
            );
        }

        // -----------------------------------------------------
        // VALIDATE BASIC JS SYNTAX
        // -----------------------------------------------------

        this.basicSyntaxValidation(
            relativePath,
            updated
        );

        // -----------------------------------------------------
        // WRITE
        // -----------------------------------------------------

        await this.writeFile(
            relativePath,
            updated
        );

        console.log(
            '🛠️ Patch applied:',
            relativePath
        );

        return {
            ok: true,
            operation,
            path: relativePath
        };
    }

    // -------------------------------------------------------------------------
    // MULTI PATCH APPLY
    // -------------------------------------------------------------------------

    async applyPatchSet(files = []) {

        if (files.length > MAX_PATCH_FILES) {

    throw new Error(
        `Patch exceeds max file limit (${MAX_PATCH_FILES}).`
    );
}

        const results = [];

        for (const filePatch of files) {

            try {

                const result =
                    await this.applyPatch(
                        filePatch
                    );

                results.push(result);

            } catch (err) {

                results.push({
                    ok: false,
                    path:
                        filePatch?.path,
                    error:
                        err.message
                });
            }
        }

        return results;
    }

    // -------------------------------------------------------------------------
    // BASIC VALIDATION
    // -------------------------------------------------------------------------

    basicSyntaxValidation(
        relativePath,
        content
    ) {

        // -----------------------------------------------------
        // VERY BASIC SAFETY CHECKS
        // -----------------------------------------------------

        const extension =
            path.extname(relativePath);

        // only JS for now
        if (
            extension !== '.js' &&
            extension !== '.mjs'
        ) {
            for (const pattern of DANGEROUS_PATTERNS) {

    if (content.includes(pattern)) {

        throw new Error(
            `Dangerous pattern detected: ${pattern}`
        );
    }
}

if (content.length > MAX_FILE_SIZE) {

    throw new Error(
        'Validation failed: file exceeds safe size limit.'
    );
}
            return true;
        }

        // dangerous accidental nukes
        if (
            content.length < 4
        ) {

            throw new Error(
                'Validation failed: suspiciously small file.'
            );
        }

        // accidental merge conflict
        if (
            content.includes('<<<<<<<') ||
            content.includes('=======') ||
            content.includes('>>>>>>>')
        ) {

            throw new Error(
                'Validation failed: merge conflict markers detected.'
            );
        }

        return true;
    }
}