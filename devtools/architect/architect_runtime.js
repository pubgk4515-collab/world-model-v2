// /api/architect.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect API
// Premium AI Runtime Endpoint
// Vercel / Next.js Serverless Function
// -----------------------------------------------------------------------------

import OpenAI
from 'openai';

// -----------------------------------------------------------------------------
// OPENAI
// -----------------------------------------------------------------------------

const client =
    new OpenAI({

        apiKey:
            process.env.OPENAI_API_KEY
    });

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const MODEL =
    process.env.ARCHITECT_MODEL ||
    'gpt-5.5';

const MAX_INPUT_LENGTH =
    120000;

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function json(
    response,
    status,
    payload
) {

    response
        .status(status)
        .json(payload);
}

function clampInput(value) {

    if (!value) {
        return '';
    }

    return String(value)
        .slice(
            0,
            MAX_INPUT_LENGTH
        );
}

function safeStringify(value) {

    try {

        return JSON.stringify(
            value,
            null,
            2
        );

    } catch (_) {

        return '{}';
    }
}

function buildSystemPrompt() {

    return `
You are Architect AI.

You are the runtime repair system for a project called:
"Symbiote Studio · MoE World Model"

Your job:
- analyze runtime issues
- inspect scan data
- identify root causes
- generate production-grade fixes
- generate safe patch output
- avoid hallucinations
- never generate incomplete code
- preserve existing architecture
- preserve mobile-first UI philosophy
- preserve glassmorphism design system

Return STRICT JSON ONLY.

Required JSON format:

{
  "summary": "short summary",
  "analysis": "detailed analysis",
  "patch": "full code patch or fix",
  "notes": "extra notes"
}

Rules:
- never wrap JSON in markdown
- never use triple backticks
- patch must contain real code
- do not truncate code
- do not omit imports
- do not explain outside JSON
`;
}

function buildUserPrompt({
    prompt,
    scan
}) {

    return `
ARCHITECT RUNTIME REQUEST

USER ISSUE:
${clampInput(prompt)}

RUNTIME SCAN:
${safeStringify(scan)}

TASK:
1. Analyze the issue
2. Explain root cause
3. Generate repair patch
4. Keep fixes production-safe
5. Preserve architecture
`;
}

function extractContent(response) {

    // RESPONSES API FORMAT

    if (
        typeof response.output_text ===
        'string'
    ) {

        return response.output_text;
    }

    // FALLBACK

    if (
        Array.isArray(
            response.output
        )
    ) {

        const chunks = [];

        for (
            const item
            of response.output
        ) {

            if (
                !item ||
                !Array.isArray(
                    item.content
                )
            ) {

                continue;
            }

            for (
                const part
                of item.content
            ) {

                if (
                    part?.text
                ) {

                    chunks.push(
                        part.text
                    );
                }
            }
        }

        return chunks.join(
            '\n'
        );
    }

    return '';
}

function parseAIResponse(text) {

    if (!text) {

        return {

            summary:
                'Empty AI response.',

            analysis:
                '',

            patch:
                '',

            notes:
                ''
        };
    }

    // CLEANUP

    const cleaned =
        text
            .replaceAll(
                '```json',
                ''
            )
            .replaceAll(
                '```',
                ''
            )
            .trim();

    // TRY JSON

    try {

        return JSON.parse(
            cleaned
        );

    } catch (_) {

        // FALLBACK

        return {

            summary:
                'AI response generated.',

            analysis:
                cleaned,

            patch:
                '',

            notes:
                'Response was not valid JSON.'
        };
    }
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

export default async function handler(
    request,
    response
) {

    // -------------------------------------------------------------------------
    // METHOD
    // -------------------------------------------------------------------------

    if (
        request.method !==
        'POST'
    ) {

        return json(
            response,
            405,
            {

                ok: false,

                error:
                    'Method not allowed.'
            }
        );
    }

    // -------------------------------------------------------------------------
    // API KEY
    // -------------------------------------------------------------------------

    if (
        !process.env.OPENAI_API_KEY
    ) {

        return json(
            response,
            500,
            {

                ok: false,

                error:
                    'Missing OPENAI_API_KEY.'
            }
        );
    }

    try {

        // ---------------------------------------------------------------------
        // BODY
        // ---------------------------------------------------------------------

        const body =
            request.body || {};

        const prompt =
            clampInput(
                body.prompt
            );

        const scan =
            body.scan || {};

        // ---------------------------------------------------------------------
        // VALIDATION
        // ---------------------------------------------------------------------

        if (!prompt) {

            return json(
                response,
                400,
                {

                    ok: false,

                    error:
                        'Prompt is required.'
                }
            );
        }

        // ---------------------------------------------------------------------
        // OPENAI REQUEST
        // ---------------------------------------------------------------------

        const aiResponse =
            await client.responses.create({

                model:
                    MODEL,

                temperature:
                    0.2,

                max_output_tokens:
                    4000,

                input: [

                    {
                        role: 'system',

                        content:
                            buildSystemPrompt()
                    },

                    {
                        role: 'user',

                        content:
                            buildUserPrompt({

                                prompt,
                                scan
                            })
                    }
                ]
            });

        // ---------------------------------------------------------------------
        // CONTENT
        // ---------------------------------------------------------------------

        const rawText =
            extractContent(
                aiResponse
            );

        // ---------------------------------------------------------------------
        // PARSE
        // ---------------------------------------------------------------------

        const parsed =
            parseAIResponse(
                rawText
            );

        // ---------------------------------------------------------------------
        // SUCCESS
        // ---------------------------------------------------------------------

        return json(
            response,
            200,
            {

                ok: true,

                model:
                    MODEL,

                summary:
                    parsed.summary ||

                    'Architect analysis complete.',

                analysis:
                    parsed.analysis ||

                    '',

                patch:
                    parsed.patch ||

                    '',

                notes:
                    parsed.notes ||

                    '',

                raw:
                    rawText
            }
        );

    } catch (err) {

        console.error(
            '[Architect API]',
            err
        );

        return json(
            response,
            500,
            {

                ok: false,

                error:
                    err?.message ||

                    'Architect runtime failure.'
            }
        );
    }
}
