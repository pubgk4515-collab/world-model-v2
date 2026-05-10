// /devtools/architect/architect_prompt_builder.js
// Symbiote Studio — Architect Prompt Builder
// Converts runtime scan into structured AI debugging prompt

export function createPromptBuilder() {

    function build({
        userPrompt = '',
        scan = {}
    } = {}) {

        // =================================================
        // SAFETY
        // =================================================

        const safePrompt =
            typeof userPrompt === 'string'
                ? userPrompt.trim()
                : '';

        const runtime =
            scan.runtime || {};

        const dom =
            scan.dom || {};

        const audio =
            scan.audio || {};

        const errors =
            Array.isArray(scan.errors)
                ? scan.errors
                : [];

        const warnings =
            Array.isArray(scan.warnings)
                ? scan.warnings
                : [];

        const experts =
            Array.isArray(scan.experts)
                ? scan.experts
                : [];

        // =================================================
        // ERROR FORMAT
        // =================================================

        const formattedErrors =
            errors.length
                ? errors.map((err, index) => {

                    return `
[ERROR ${index + 1}]
Message:
${err.message || 'Unknown error'}

Stack:
${err.stack || 'No stack'}

File:
${err.filename || 'Unknown'}

Line:
${err.lineno || 'Unknown'}
                    `.trim();

                }).join('\n\n')
                : 'No runtime errors captured.';

        // =================================================
        // WARNING FORMAT
        // =================================================

        const formattedWarnings =
            warnings.length
                ? warnings.map((warn, index) => {

                    return `
[WARNING ${index + 1}]
${typeof warn === 'string'
    ? warn
    : JSON.stringify(warn, null, 2)}
                    `.trim();

                }).join('\n\n')
                : 'No warnings captured.';

        // =================================================
        // EXPERT FORMAT
        // =================================================

        const formattedExperts =
            experts.length
                ? experts.map((expert, index) => {

                    return `
[EXPERT ${index + 1}]
Type: ${expert.type || 'Unknown'}
ID: ${expert.id || 'Unknown'}
State: ${expert.state || 'Unknown'}
                    `.trim();

                }).join('\n\n')
                : 'No experts mounted.';

        // =================================================
        // DOM SUMMARY
        // =================================================

        const domSummary = `
DOM SUMMARY
-----------
Expert Cards:
${dom.expertCards ?? 'Unknown'}

Range Sliders:
${dom.rangeSliders ?? 'Unknown'}

Buttons:
${dom.buttons ?? 'Unknown'}

Modals:
${dom.modals ?? 'Unknown'}

Body Scroll Height:
${dom.scrollHeight ?? 'Unknown'}

Viewport:
${dom.viewportWidth ?? '?'} x ${dom.viewportHeight ?? '?'}
        `.trim();

        // =================================================
        // AUDIO SUMMARY
        // =================================================

        const audioSummary = `
AUDIO SUMMARY
-------------
AudioContext Supported:
${audio.supported ?? false}

AudioContext State:
${audio.state || 'Unknown'}

Sample Rate:
${audio.sampleRate || 'Unknown'}

Destination Channels:
${audio.destinationChannels || 'Unknown'}

Active Nodes:
${audio.activeNodes || 'Unknown'}
        `.trim();

        // =================================================
        // RUNTIME SUMMARY
        // =================================================

        const runtimeSummary = `
RUNTIME SUMMARY
---------------
URL:
${runtime.url || 'Unknown'}

User Agent:
${runtime.userAgent || 'Unknown'}

Platform:
${runtime.platform || 'Unknown'}

Language:
${runtime.language || 'Unknown'}

Device Memory:
${runtime.deviceMemory || 'Unknown'}

Hardware Concurrency:
${runtime.hardwareConcurrency || 'Unknown'}
        `.trim();

        // =================================================
        // FINAL PROMPT
        // =================================================

        const finalPrompt = `
You are debugging Symbiote Studio.

PROJECT TYPE:
Modular procedural atmospheric audio engine
using Web Audio API.

USER ISSUE:
${safePrompt}

==================================================
RUNTIME SUMMARY
==================================================

${runtimeSummary}

==================================================
DOM SUMMARY
==================================================

${domSummary}

==================================================
AUDIO SUMMARY
==================================================

${audioSummary}

==================================================
ACTIVE EXPERTS
==================================================

${formattedExperts}

==================================================
WARNINGS
==================================================

${formattedWarnings}

==================================================
ERRORS
==================================================

${formattedErrors}

==================================================
INSTRUCTIONS
==================================================

1. Find the REAL root cause.
2. Mention exact broken files.
3. Mention exact broken methods if possible.
4. Explain WHY the issue is happening.
5. Return production-grade fixes.
6. Preserve architecture.
7. Prefer surgical fixes over rewrites.
8. Detect constructor mismatches.
9. Detect import/export mismatches.
10. Detect dead UI listeners.
11. Detect async timing issues.
12. Detect WebAudio lifecycle issues.
13. Detect slider-binding failures.
14. Return FULL corrected code blocks when needed.
15. Avoid generic advice.

END OF DEBUG PAYLOAD.
        `.trim();

        return finalPrompt;
    }

    // =====================================================
    // API
    // =====================================================

    return {
        build
    };
}