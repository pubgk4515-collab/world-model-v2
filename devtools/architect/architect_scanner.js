// /devtools/architect/architect_scanner.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Runtime Scanner
// Premium Runtime Inspection Engine
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function now() {

    return Date.now();
}

function safeStringify(value) {

    try {

        return JSON.stringify(
            value,
            null,
            2
        );

    } catch {

        return '[Unserializable Value]';
    }
}

function truncate(
    value,
    max = 2000
) {

    const text =
        String(value || '');

    if (
        text.length <= max
    ) {

        return text;
    }

    return (
        text.slice(
            0,
            max
        ) + '\n...[truncated]'
    );
}

// -----------------------------------------------------------------------------
// MAIN FACTORY
// -----------------------------------------------------------------------------

export function createArchitectScanner() {

    return {

        scan
    };
}

// -----------------------------------------------------------------------------
// MAIN SCAN
// -----------------------------------------------------------------------------

export async function scanProject(
    options = {}
) {

    return await scan(
        options
    );
}

// -----------------------------------------------------------------------------
// CORE
// -----------------------------------------------------------------------------

export async function scan(
    options = {}
) {

    const startedAt =
        now();

    const config = {

        includeDOM:
            options.includeDOM ?? true,

        includeConsole:
            options.includeConsole ?? true,

        includeAudio:
            options.includeAudio ?? true
    };

    try {

        // ---------------------------------------------------------------------
        // RUNTIME
        // ---------------------------------------------------------------------

        const runtime =
            collectRuntimeInfo();

        // ---------------------------------------------------------------------
        // DOM
        // ---------------------------------------------------------------------

        const dom =
            config.includeDOM
                ? collectDOMInfo()
                : {};

        // ---------------------------------------------------------------------
        // CONSOLE
        // ---------------------------------------------------------------------

        const consoleLogs =
            config.includeConsole
                ? collectConsoleLogs()
                : [];

        // ---------------------------------------------------------------------
        // AUDIO
        // ---------------------------------------------------------------------

        const audio =
            config.includeAudio
                ? collectAudioInfo()
                : {};

        // ---------------------------------------------------------------------
        // PERFORMANCE
        // ---------------------------------------------------------------------

        const performanceInfo =
            collectPerformanceInfo();

        // ---------------------------------------------------------------------
        // FILES
        // ---------------------------------------------------------------------

        const files =
            collectLoadedScripts();

        // ---------------------------------------------------------------------
        // ERRORS
        // ---------------------------------------------------------------------

        const runtimeErrors =
            collectRuntimeErrors();

        // ---------------------------------------------------------------------
        // ACTIVE EXPERTS
        // ---------------------------------------------------------------------

        const experts =
            collectExperts();

        // ---------------------------------------------------------------------
        // FINAL
        // ---------------------------------------------------------------------

        const result = {

            success: true,

            scannedAt:
                new Date()
                    .toISOString(),

            duration:
                now() - startedAt,

            runtime,

            performance:
                performanceInfo,

            dom,

            console:
                consoleLogs,

            audio,

            experts,

            files,

            errors:
                runtimeErrors
        };

        console.log(
            '📡 Architect scan complete:',
            result
        );

        return result;

    } catch (err) {

        console.error(
            '[ArchitectScanner]',
            err
        );

        return {

            success: false,

            scannedAt:
                new Date()
                    .toISOString(),

            error:
                err.message ||

                'Runtime scan failed.',

            files: [],
            errors: [],
            console: [],
            dom: {}
        };
    }
}

// -----------------------------------------------------------------------------
// RUNTIME
// -----------------------------------------------------------------------------

function collectRuntimeInfo() {

    return {

        url:
            window.location.href,

        title:
            document.title,

        viewport: {

            width:
                window.innerWidth,

            height:
                window.innerHeight,

            pixelRatio:
                window.devicePixelRatio
        },

        userAgent:
            navigator.userAgent,

        language:
            navigator.language,

        online:
            navigator.onLine,

        platform:
            navigator.platform,

        memory:
            navigator.deviceMemory || null,

        hardwareConcurrency:
            navigator.hardwareConcurrency || null
    };
}

// -----------------------------------------------------------------------------
// DOM
// -----------------------------------------------------------------------------

function collectDOMInfo() {

    const body =
        document.body;

    const root =
        document.documentElement;

    return {

        bodyChildren:
            body?.children?.length || 0,

        totalNodes:
            root
                ?.querySelectorAll('*')
                ?.length || 0,

        modals:
            document
                .querySelectorAll(
                    '[role="dialog"], .modal, .sheet'
                )
                ?.length || 0,

        buttons:
            document
                .querySelectorAll(
                    'button'
                )
                ?.length || 0,

        inputs:
            document
                .querySelectorAll(
                    'input, textarea, select'
                )
                ?.length || 0
    };
}

// -----------------------------------------------------------------------------
// CONSOLE
// -----------------------------------------------------------------------------

function collectConsoleLogs() {

    const logs =
        [];

    // -------------------------------------------------------------------------
    // RUNTIME ERRORS
    // -------------------------------------------------------------------------

    if (
        Array.isArray(
            window.__runtimeErrors
        )
    ) {

        logs.push(
            ...window.__runtimeErrors
        );
    }

    // -------------------------------------------------------------------------
    // WARNINGS
    // -------------------------------------------------------------------------

    if (
        Array.isArray(
            window.__runtimeWarnings
        )
    ) {

        logs.push(
            ...window.__runtimeWarnings
        );
    }

    return logs.map(
        (entry) => {

            if (
                typeof entry ===
                'string'
            ) {

                return truncate(
                    entry
                );
            }

            return truncate(
                safeStringify(
                    entry
                )
            );
        }
    );
}

// -----------------------------------------------------------------------------
// AUDIO
// -----------------------------------------------------------------------------

function collectAudioInfo() {

    const context =
        window.audioCtx ||
        null;

    return {

        available:
            !!(
                window.AudioContext ||
                window.webkitAudioContext
            ),

        active:
            !!context,

        state:
            context?.state || null,

        sampleRate:
            context?.sampleRate || null
    };
}

// -----------------------------------------------------------------------------
// PERFORMANCE
// -----------------------------------------------------------------------------

function collectPerformanceInfo() {

    const memory =
        performance.memory || {};

    return {

        timeOrigin:
            performance.timeOrigin,

        heapLimit:
            memory.jsHeapSizeLimit || null,

        totalHeap:
            memory.totalJSHeapSize || null,

        usedHeap:
            memory.usedJSHeapSize || null
    };
}

// -----------------------------------------------------------------------------
// FILES
// -----------------------------------------------------------------------------

function collectLoadedScripts() {

    return [
        ...document.querySelectorAll(
            'script[src]'
        )
    ]
        .map((script) =>
            script.src
        )
        .filter(Boolean);
}

// -----------------------------------------------------------------------------
// ERRORS
// -----------------------------------------------------------------------------

function collectRuntimeErrors() {

    const errors =
        [];

    // -------------------------------------------------------------------------
    // GLOBAL
    // -------------------------------------------------------------------------

    if (
        Array.isArray(
            window.__runtimeErrors
        )
    ) {

        errors.push(
            ...window.__runtimeErrors
        );
    }

    // -------------------------------------------------------------------------
    // RESOURCE ERRORS
    // -------------------------------------------------------------------------

    const brokenImages =
        [
            ...document.images
        ]
            .filter(
                (img) =>
                    !img.complete
            )
            .map(
                (img) =>
                    `Image failed: ${img.src}`
            );

    errors.push(
        ...brokenImages
    );

    return errors.map(
        (error) => {

            if (
                typeof error ===
                'string'
            ) {

                return truncate(
                    error
                );
            }

            return truncate(
                safeStringify(
                    error
                )
            );
        }
    );
}

// -----------------------------------------------------------------------------
// EXPERTS
// -----------------------------------------------------------------------------

function collectExperts() {

    const experts =
        window.__activeExperts;

    if (
        !experts ||
        typeof experts.forEach !==
        'function'
    ) {

        return [];
    }

    const output =
        [];

    experts.forEach(
        (expert, id) => {

            output.push({

                id,

                type:
                    expert?.type ||
                    'unknown',

                constructor:
                    expert?.constructor
                        ?.name ||

                    'UnknownExpert'
            });
        }
    );

    return output;
}

// -----------------------------------------------------------------------------
// DEFAULT EXPORT
// -----------------------------------------------------------------------------

export default scan;
