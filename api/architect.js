// /api/architect.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect AI API
// Production Runtime Endpoint
// -----------------------------------------------------------------------------

import OpenAI
from 'openai';

// -----------------------------------------------------------------------------
// CLIENT
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
    'gpt-5-5';

const MAX_INPUT_CHARS =
    120000;

// -----------------------------------------------------------------------------
// SYSTEM PROMPT
// -----------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are Architect AI.

You are an elite senior full-stack runtime engineer working on:

"Symbiote Studio · MoE World Model"

Your job:
- analyze runtime issues
- inspect scan data
- identify root causes
- generate production-safe fixes
- generate structured repair patches
- avoid placeholders
- avoid pseudo-code
- avoid vague explanations

IMPORTANT RULES:

1. Return STRICT JSON ONLY.
2. Do not wrap JSON in markdown.
3. Never return prose outside JSON.
4. Keep patches production-grade.
5. Avoid destructive edits.
6. Prefer minimal safe modifications.
7. Assume mobile-first runtime architecture.
8. Preserve existing design language.
9. Preserve runtime stability.
10. If unsure, explain uncertainty safely.

JSON FORMAT:

{
  "summary": "short summary",
  "analysis": "detailed analysis",
  "patch": "code patch",
  "notes": "optional implementation notes"
}
`;

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

function sanitizeInput(input) {

    if (!input) {

        return '';
    }

    return String(input)
        .slice(
            0,
            MAX_INPUT_CHARS
        )
        .trim();
}

function safeParse(content) {

    try {

        return {

            ok: true,

            data:
                JSON.parse(content)
        };

    } catch (err) {

        console.error(
            '[Architect API] JSON parse failed:',
            err
        );

        return {

            ok: false,

            error:
                err.message
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

    // -------------------------------------------------------------------------
    // API KEY
    // -------------------------------------------------------------------------

    if (
        !process.env.OPENAI_API_KEY
    ) {

        return json(
            res,
            500,
            {

                ok: false,

                error:
                    'OPENAI_API_KEY missing.'
            }
        );
    }

    try {

        // ---------------------------------------------------------------------
        // INPUT
        // ---------------------------------------------------------------------

        const body =
            req.body || {};

        const prompt =
            sanitizeInput(
                body.prompt
            );

        const scan =
            body.scan || {};

        if (!prompt) {

            return json(
                res,
                400,
                {

                    ok: false,

                    error:
                        'Prompt is required.'
                }
            );
        }

        // ---------------------------------------------------------------------
        // USER PAYLOAD
        // ---------------------------------------------------------------------

        const runtimePayload = `
USER ISSUE:

${prompt}

RUNTIME SCAN:

${JSON.stringify(
    scan,
    null,
    2
)}
        `;

        // ---------------------------------------------------------------------
        // OPENAI REQUEST
        // ---------------------------------------------------------------------

        const completion =
            await client.chat.completions.create({

                model:
                    MODEL,

                temperature:
                    0.2,

                max_tokens:
                    2400,

                messages: [

                    {
                        role:
                            'system',

                        content:
                            SYSTEM_PROMPT
                    },

                    {
                        role:
                            'user',

                        content:
                            runtimePayload
                    }
                ]
            });

        // ---------------------------------------------------------------------
        // CONTENT
        // ---------------------------------------------------------------------

        const content =
            completion
                ?.choices?.[0]
                ?.message
                ?.content;

        if (!content) {

            throw new Error(
                'OpenAI returned empty content.'
            );
        }

        // ---------------------------------------------------------------------
        // PARSE
        // ---------------------------------------------------------------------

        const parsed =
            safeParse(
                content
            );

        // ---------------------------------------------------------------------
        // FALLBACK
        // ---------------------------------------------------------------------

        if (!parsed.ok) {

            console.warn(
                '[Architect API] Falling back to raw mode.'
            );

            return json(
                res,
                200,
                {

                    ok: true,

                    raw:
                        content,

                    summary:
                        'AI response generated.',

                    analysis:
                        content,

                    patch:
                        '',

                    notes:
                        'Response was not strict JSON.'
                }
            );
        }

        // ---------------------------------------------------------------------
        // NORMALIZED
        // ---------------------------------------------------------------------

        const normalized = {

            ok: true,

            summary:
                parsed.data.summary ||

                'Architect analysis complete.',

            analysis:
                parsed.data.analysis ||

                '',

            patch:
                parsed.data.patch ||

                '',

            notes:
                parsed.data.notes ||

                ''
        };

        // ---------------------------------------------------------------------
        // RESPONSE
        // ---------------------------------------------------------------------

        return json(
            res,
            200,
            normalized
        );

    } catch (err) {

        console.error(
            '[Architect API]',
            err
        );

        // ---------------------------------------------------------------------
        // OPENAI RATE LIMIT
        // ---------------------------------------------------------------------

        if (
            err?.status === 429
        ) {

            return json(
                res,
                429,
                {

                    ok: false,

                    error:
                        'OpenAI rate limit exceeded.'
                }
            );
        }

        // ---------------------------------------------------------------------
        // GENERIC
        // ---------------------------------------------------------------------

        return json(
            res,
            500,
            {

                ok: false,

                error:
                    err.message ||

                    'Architect API failure.'
            }
        );
    }
}
