// /devtools/architect/architect_scanner.js
// Symbiote Studio — Architect Runtime Scanner
// Scans DOM, audio state, experts, runtime health

export function createArchitectScanner() {

    // =====================================================
    // MAIN
    // =====================================================

    async function scan(options = {}) {

        const {
            includeDOM = true,
            includeConsole = true,
            includeAudio = true
        } = options;

        const result = {

            timestamp: Date.now(),

            runtime: {},

            dom: {},

            audio: {},

            experts: [],

            warnings: [],

            errors: []
        };

        // =================================================
        // RUNTIME
        // =================================================

        result.runtime =
            scanRuntime();

        // =================================================
        // DOM
        // =================================================

        if (includeDOM) {
            result.dom =
                scanDOM();
        }

        // =================================================
        // AUDIO
        // =================================================

        if (includeAudio) {
            result.audio =
                scanAudio();
        }

        // =================================================
        // EXPERTS
        // =================================================

        result.experts =
            scanExperts();

        // =================================================
        // CONSOLE
        // =================================================

        if (includeConsole) {

            result.errors =
                scanErrors();

            result.warnings =
                scanWarnings();
        }

        // =================================================
        // HEALTH CHECKS
        // =================================================

        runHealthChecks(result);

        return result;
    }

    // =====================================================
    // RUNTIME
    // =====================================================

    function scanRuntime() {

        return {

            url:
                location.href,

            origin:
                location.origin,

            title:
                document.title,

            userAgent:
                navigator.userAgent,

            platform:
                navigator.platform,

            language:
                navigator.language,

            viewportWidth:
                window.innerWidth,

            viewportHeight:
                window.innerHeight,

            devicePixelRatio:
                window.devicePixelRatio,

            online:
                navigator.onLine,

            hardwareConcurrency:
                navigator.hardwareConcurrency || 'Unknown',

            deviceMemory:
                navigator.deviceMemory || 'Unknown'
        };
    }

    // =====================================================
    // DOM
    // =====================================================

    function scanDOM() {

        const expertCards =
            document.querySelectorAll('[data-id]');

        const buttons =
            document.querySelectorAll('button');

        const sliders =
            document.querySelectorAll('input[type="range"]');

        const modals =
            document.querySelectorAll(
                '.modal, .sheet, [role="dialog"]'
            );

        const visibleCards =
            [...expertCards].filter(el => {

                const rect =
                    el.getBoundingClientRect();

                return (
                    rect.width > 0 &&
                    rect.height > 0
                );
            });

        return {

            bodyScrollHeight:
                document.body.scrollHeight,

            bodyClientHeight:
                document.body.clientHeight,

            viewportWidth:
                window.innerWidth,

            viewportHeight:
                window.innerHeight,

            expertCards:
                expertCards.length,

            visibleExpertCards:
                visibleCards.length,

            buttons:
                buttons.length,

            rangeSliders:
                sliders.length,

            modals:
                modals.length,

            activeModal:
                !!document.querySelector(
                    '.open'
                ),

            addLayerButton:
                !!document.getElementById(
                    'addLayerBtn'
                ),

            expertRack:
                !!document.getElementById(
                    'expertRack'
                ),

            routerConsole:
                !!document.getElementById(
                    'routerConsole'
                )
        };
    }

    // =====================================================
    // AUDIO
    // =====================================================

    function scanAudio() {

        const ctx =
            window.__symbioteStudio?.ctx;

        if (!ctx) {

            return {

                supported:
                    !!window.AudioContext,

                active:
                    false,

                state:
                    'missing'
            };
        }

        return {

            supported:
                !!window.AudioContext,

            active:
                true,

            state:
                ctx.state,

            sampleRate:
                ctx.sampleRate,

            currentTime:
                ctx.currentTime,

            baseLatency:
                ctx.baseLatency,

            outputLatency:
                ctx.outputLatency,

            destinationChannels:
                ctx.destination?.maxChannelCount || 2
        };
    }

    // =====================================================
    // EXPERTS
    // =====================================================

    function scanExperts() {

        const studio =
            window.__symbioteStudio;

        if (!studio?.experts) {
            return [];
        }

        const experts = [];

        studio.experts.forEach((expert, key) => {

            const item = {

                key,

                id:
                    expert?.id || null,

                type:
                    expert?.type || key,

                hasStart:
                    typeof expert?.start === 'function',

                hasDestroy:
                    typeof expert?.destroy === 'function',

                hasWorldState:
                    typeof expert?.onWorldStateUpdate === 'function',

                connected:
                    !!expert?.output,

                state:
                    'unknown'
            };

            // =============================================
            // WIND INFO
            // =============================================

            if (expert?.intensity !== undefined) {

                item.intensity =
                    expert.intensity;
            }

            if (expert?.texture !== undefined) {

                item.texture =
                    expert.texture;
            }

            if (expert?.movement !== undefined) {

                item.movement =
                    expert.movement;
            }

            // =============================================
            // OUTPUT NODE
            // =============================================

            try {

                if (
                    expert?.output?.gain
                ) {

                    item.outputGain =
                        expert.output.gain.value;
                }

            } catch {}

            experts.push(item);
        });

        return experts;
    }

    // =====================================================
    // ERRORS
    // =====================================================

    function scanErrors() {

        if (
            !Array.isArray(
                window.__runtimeErrors
            )
        ) {

            return [];
        }

        return window.__runtimeErrors
            .slice(-20);
    }

    // =====================================================
    // WARNINGS
    // =====================================================

    function scanWarnings() {

        if (
            !Array.isArray(
                window.__runtimeWarnings
            )
        ) {

            return [];
        }

        return window.__runtimeWarnings
            .slice(-20);
    }

    // =====================================================
    // HEALTH CHECKS
    // =====================================================

    function runHealthChecks(result) {

        // =============================================
        // AUDIO
        // =============================================

        if (
            result.audio?.active &&
            result.audio?.state !== 'running'
        ) {

            result.warnings.push({

                type: 'audio',

                message:
                    `AudioContext state is "${result.audio.state}".`
            });
        }

        // =============================================
        // MISSING RACK
        // =============================================

        if (!result.dom?.expertRack) {

            result.errors.push({

                type: 'dom',

                message:
                    '#expertRack missing from DOM.'
            });
        }

        // =============================================
        // MISSING BUTTON
        // =============================================

        if (!result.dom?.addLayerButton) {

            result.errors.push({

                type: 'dom',

                message:
                    '#addLayerBtn missing from DOM.'
            });
        }

        // =============================================
        // NO EXPERTS
        // =============================================

        if (
            result.experts.length === 0
        ) {

            result.warnings.push({

                type: 'experts',

                message:
                    'No experts mounted.'
            });
        }

        // =============================================
        // INVISIBLE CARDS
        // =============================================

        if (
            result.dom.expertCards > 0 &&
            result.dom.visibleExpertCards === 0
        ) {

            result.warnings.push({

                type: 'layout',

                message:
                    'Expert cards exist but are not visible.'
            });
        }

        // =============================================
        // OVERFLOW
        // =============================================

        if (
            document.body.style.overflow === 'hidden'
        ) {

            result.warnings.push({

                type: 'scroll',

                message:
                    'Body overflow currently locked.'
            });
        }
    }

    // =====================================================
    // API
    // =====================================================

    return {

        scan
    };
}