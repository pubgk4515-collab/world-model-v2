// /devtools/architect/architect_prompt_builder.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect Prompt Builder
// Structured AI Runtime Prompt System
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const MAX_SECTION_LENGTH =
    12000;

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function sanitize(value) {

    return String(
        value ?? ''
    )
        .replace(/\r/g, '')
        .trim();
}

function truncate(
    value,
    max = MAX_SECTION_LENGTH
) {

    const text =
        sanitize(value);

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

function safeJson(value) {

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

// -----------------------------------------------------------------------------
// SECTION
// -----------------------------------------------------------------------------

function createSection(
    title,
    content
) {

    return `
===============================================================================
${title.toUpperCase()}
===============================================================================

${content}
`;
}

// -----------------------------------------------------------------------------
// FORMATTERS
// -----------------------------------------------------------------------------

function formatRuntime(scan = {}) {

    return truncate(
        safeJson(
            scan.runtime || {}
        )
    );
}

function formatPerformance(scan = {}) {

    return truncate(
        safeJson(
            scan.performance || {}
        )
    );
}

function formatDOM(scan = {}) {

    return truncate(
        safeJson(
            scan.dom || {}
        )
    );
}

function formatAudio(scan = {}) {

    return truncate(
        safeJson(
            scan.audio || {}
        )
    );
}

function formatExperts(scan = {}) {

    const experts =
        Array.isArray(
            scan.experts
        )
            ? scan.experts
            : [];

    if (!experts.length) {

        return 'No active experts detected.';
    }

    return truncate(
        safeJson(
            experts
        )
    );
}

function formatFiles(scan = {}) {

    const files =
        Array.isArray(
            scan.files
        )
            ? scan.files
            : [];

    if (!files.length) {

        return 'No loaded scripts detected.';
    }

    return truncate(
        files.join('\n')
    );
}

function formatConsole(scan = {}) {

    const logs =
        Array.isArray(
            scan.console
        )
            ? scan.console
            : [];

    if (!logs.length) {

        return 'No console logs captured.';
    }

    return truncate(
        logs.join('\n\n')
    );
}

function formatErrors(scan = {}) {

    const errors =
        Array.isArray(
            scan.errors
        )
            ? scan.errors
            : [];

    if (!errors.length) {

        return 'No runtime errors detected.';
    }

    return truncate(
        errors.join('\n\n')
    );
}

// -----------------------------------------------------------------------------
// SYSTEM RULES
// -----------------------------------------------------------------------------

function createSystemInstructions() {

    return `
You are Architect AI.

You are a senior runtime systems engineer working on:

"Symbiote Studio · MoE World Model"

PRIMARY OBJECTIVE:
- analyze runtime failures
- identify root causes
- generate safe production-grade fixes
- preserve existing architecture
- preserve mobile-first design
- avoid destructive rewrites
- avoid fake placeholders
- avoid pseudo-code

IMPORTANT RULES:

1. Prefer minimal targeted fixes.
2. Never remove unrelated functionality.
3. Never generate incomplete code.
4. Preserve runtime stability.
5. Preserve glassmorphism design language.
6. Preserve existing imports unless broken.
7. Avoid speculative changes.
8. Keep patches compact and surgical.
9. Do not explain obvious JavaScript basics.
10. If uncertain, explain uncertainty safely.

PATCH FORMAT RULES:

If generating file patches,
you MUST return patches in EXACT format:

<<<FILE:path/to/file.js
FULL FILE CONTENT HERE
>>>END_FILE

MULTI FILE EXAMPLE:

<<<FILE:src/example.js
console.log('hello');
>>>END_FILE

<<<FILE:styles/app.css
body {
  background: black;
}
>>>END_FILE

IMPORTANT:
- Always include FULL file contents.
- Never return partial diffs.
- Never use markdown code fences.
- Never wrap patch in triple backticks.
- Never omit file paths.
- Never return prose inside patch blocks.

RESPONSE STRUCTURE:

1. Root cause analysis
2. Runtime diagnosis
3. Safe repair strategy
4. Production-ready patch blocks
5. Additional implementation notes if needed
`;
}

// -----------------------------------------------------------------------------
// MAIN BUILDER
// -----------------------------------------------------------------------------

export function buildArchitectPrompt(
    payload = {}
) {

    const userPrompt =
        sanitize(
            payload.userPrompt ||
            payload.issue ||
            ''
        );

    const scan =
        payload.scan || {};

    // -------------------------------------------------------------------------
    // PROMPT
    // -------------------------------------------------------------------------

    const prompt = `

${createSection(
    'SYSTEM INSTRUCTIONS',
    createSystemInstructions()
)}

${createSection(
    'USER ISSUE',
    userPrompt || 'No issue provided.'
)}

${createSection(
    'RUNTIME OVERVIEW',
    formatRuntime(scan)
)}

${createSection(
    'PERFORMANCE SNAPSHOT',
    formatPerformance(scan)
)}

${createSection(
    'DOM SNAPSHOT',
    formatDOM(scan)
)}

${createSection(
    'AUDIO STATE',
    formatAudio(scan)
)}

${createSection(
    'ACTIVE EXPERTS',
    formatExperts(scan)
)}

${createSection(
    'LOADED FILES',
    formatFiles(scan)
)}

${createSection(
    'CONSOLE LOGS',
    formatConsole(scan)
)}

${createSection(
    'RUNTIME ERRORS',
    formatErrors(scan)
)}

${createSection(
    'RESPONSE REQUIREMENTS',
`
Return:

1. Short runtime summary
2. Root cause analysis
3. Safe repair explanation
4. Structured patch blocks
5. Optional implementation notes

DO NOT:
- use markdown fences
- explain generic concepts
- generate placeholder code
- invent fake APIs
- remove unrelated logic

PATCH FORMAT MUST BE:

<<<FILE:path/to/file.js
FULL FILE CONTENT
>>>END_FILE
`
)}

`;

    return truncate(
        prompt,
        100000
    );
}

// -----------------------------------------------------------------------------
// GENERIC BUILD
// -----------------------------------------------------------------------------

export function build(
    payload = {}
) {

    return buildArchitectPrompt(
        payload
    );
}

// -----------------------------------------------------------------------------
// DEFAULT EXPORT
// -----------------------------------------------------------------------------

export function createPromptBuilder() {

    return {

        build,

        buildArchitectPrompt
    };
}

export default {

    build,

    buildArchitectPrompt
};
