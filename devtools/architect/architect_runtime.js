// /devtools/architect/architect_runtime.js
// Symbiote Studio — Architect Runtime
// Handles API communication + runtime intelligence

export function createArchitectRuntime() {

    // =====================================================
    // CONFIG
    // =====================================================

    const API_URL = '/api/architect';

    // =====================================================
    // REQUEST
    // =====================================================

    async function askArchitect(
        prompt,
        scanData = {}
    ) {

        if (!prompt) {
            throw new Error(
                'Architect prompt missing.'
            );
        }

        // =================================================
        // PAYLOAD
        // =================================================

        const payload = {

            mode: 'architect',

            prompt,

            consoleLogs:
                serializeConsoleLogs(),

            projectContext:
                buildProjectContext(scanData),

            selectedFiles:
                extractSelectedFiles(scanData)
        };

        // =================================================
        // FETCH
        // =================================================

        let response;

        try {

            response = await fetch(
                API_URL,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify(payload)
                }
            );

        } catch (err) {

            throw new Error(
                `Network request failed:\n${err.message}`
            );
        }

        // =================================================
        // RESPONSE PARSE
        // =================================================

        let data;

        try {

            data = await response.json();

        } catch {

            throw new Error(
                'Invalid API JSON response.'
            );
        }

        // =================================================
        // FAILURE
        // =================================================

        if (!response.ok || !data.ok) {

            const msg =
                data?.error
                || 'Architect request failed.';

            const details =
                data?.details
                ? `\n\n${data.details}`
                : '';

            throw new Error(
                `${msg}${details}`
            );
        }

        // =================================================
        // SUCCESS
        // =================================================

        return {
            ok: true,
            response:
                data.response || ''
        };
    }

    // =====================================================
    // PROJECT CONTEXT
    // =====================================================

    function buildProjectContext(
        scan = {}
    ) {

        const runtime =
            scan.runtime || {};

        const dom =
            scan.dom || {};

        const audio =
            scan.audio || {};

        const experts =
            scan.experts || [];

        return `
PROJECT CONTEXT
================

RUNTIME
--------
URL:
${runtime.url || 'Unknown'}

USER AGENT:
${runtime.userAgent || 'Unknown'}

PLATFORM:
${runtime.platform || 'Unknown'}

DOM
---
Expert Cards:
${dom.expertCards || 0}

Buttons:
${dom.buttons || 0}

Sliders:
${dom.rangeSliders || 0}

Viewport:
${dom.viewportWidth || '?'} x ${dom.viewportHeight || '?'}

AUDIO
-----
Supported:
${audio.supported || false}

State:
${audio.state || 'Unknown'}

Sample Rate:
${audio.sampleRate || 'Unknown'}

Experts:
${JSON.stringify(experts, null, 2)}
        `.trim();
    }

    // =====================================================
    // CONSOLE LOGS
    // =====================================================

    function serializeConsoleLogs() {

        const errors =
            Array.isArray(window.__runtimeErrors)
                ? window.__runtimeErrors
                : [];

        const warnings =
            Array.isArray(window.__runtimeWarnings)
                ? window.__runtimeWarnings
                : [];

        return JSON.stringify({

            errors,
            warnings

        }, null, 2);
    }

    // =====================================================
    // FILE LIST
    // =====================================================

    function extractSelectedFiles(
        scan = {}
    ) {

        const files = [];

        // ================================================
        // WIND
        // ================================================

        if (
            scan.experts?.some(
                e => e.type === 'wind'
            )
        ) {

            files.push(
                'app.js',
                'experts/wind/expert_wind.js',
                'experts/wind/stems/airflow_stem.js',
                'experts/wind/stems/gust_stem.js',
                'experts/wind/stems/resonance_stem.js',
                'experts/wind/stems/texture_stem.js',
                'experts/wind/stems/environment_stem.js'
            );
        }

        // ================================================
        // RAIN
        // ================================================

        if (
            scan.experts?.some(
                e => e.type === 'rain'
            )
        ) {

            files.push(
                'expert_rain.js'
            );
        }

        // ================================================
        // ARCHITECT
        // ================================================

        files.push(
            'devtools/architect/architect_panel.js',
            'devtools/architect/architect_runtime.js',
            'devtools/architect/architect_scanner.js',
            'devtools/architect/architect_renderer.js',
            'devtools/architect/architect_prompt_builder.js'
        );

        return [...new Set(files)];
    }

    // =====================================================
    // GLOBAL ERROR HOOKS
    // =====================================================

    function installGlobalHooks() {

        if (window.__architectHooksInstalled) {
            return;
        }

        window.__architectHooksInstalled = true;

        window.__runtimeErrors =
            window.__runtimeErrors || [];

        window.__runtimeWarnings =
            window.__runtimeWarnings || [];

        // =================================================
        // ERROR
        // =================================================

        window.addEventListener(
            'error',
            (e) => {

                window.__runtimeErrors.push({

                    type: 'runtime',

                    message:
                        e.message || 'Unknown error',

                    filename:
                        e.filename || '',

                    lineno:
                        e.lineno || 0,

                    colno:
                        e.colno || 0,

                    stack:
                        e.error?.stack || ''
                });
            }
        );

        // =================================================
        // PROMISE REJECTION
        // =================================================

        window.addEventListener(
            'unhandledrejection',
            (e) => {

                window.__runtimeErrors.push({

                    type: 'promise',

                    message:
                        e.reason?.message
                        || String(e.reason),

                    stack:
                        e.reason?.stack || ''
                });
            }
        );

        // =================================================
        // WARN PATCH
        // =================================================

        const originalWarn =
            console.warn;

        console.warn = function (...args) {

            try {

                window.__runtimeWarnings.push({

                    timestamp:
                        Date.now(),

                    message:
                        args.map(a => {

                            if (
                                typeof a === 'string'
                            ) {
                                return a;
                            }

                            try {
                                return JSON.stringify(a);
                            } catch {
                                return '[object]';
                            }

                        }).join(' ')
                });

            } catch {}

            originalWarn.apply(console, args);
        };

        console.log(
            '🧠 Architect runtime hooks installed.'
        );
    }

    // =====================================================
    // BOOT
    // =====================================================

    installGlobalHooks();

    // =====================================================
    // API
    // =====================================================

    return {

        askArchitect,

        installGlobalHooks
    };
}