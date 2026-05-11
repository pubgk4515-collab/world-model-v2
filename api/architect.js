// /api/architect.js
// -----------------------------------------------------------------------------
// Symbiote Studio — Architect AI API
// Stable Runtime Endpoint (Vercel Safe)
// -----------------------------------------------------------------------------

import OpenAI from 'openai';

// -----------------------------------------------------------------------------
// OPENAI CLIENT
// -----------------------------------------------------------------------------

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const MODEL =
    process.env.ARCHITECT_MODEL ||
    'gpt-4.1-mini';

const MAX_INPUT_CHARS = 120000;

// -----------------------------------------------------------------------------
// SYSTEM PROMPT
// -----------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are Architect AI.

You are an elite senior full-stack runtime engineer working on:

"Symbiote Studio · MoE World Model"

Your responsibilities:
- inspect runtime failures
- analyze browser/runtime scan data
- identify root causes
- generate production-safe code fixes
- preserve runtime stability
- preserve mobile-first architecture
- preserve UI structure and design language

IMPORTANT RULES:

1. Return STRICT JSON ONLY.
2. Never wrap JSON in markdown.
3. Never return explanations outside JSON.
4. Keep patches production-safe.
5. Avoid destructive rewrites.
6. Prefer minimal safe modifications.
7. Never output pseudo-code.

JSON FORMAT:

{
  "summary": "short summary",
  "analysis": "detailed analysis",
  "patch": "code patch",
  "notes": "optional notes"
}
`;

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function sendJSON(res, status, payload) {

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
        .slice(0, MAX_INPUT_CHARS)
        .trim();
}

function safeParseJSON(content) {

    try {

        return {
            ok: true,
            data: JSON.parse(content)
        };

    } catch (err) {

        console.error(
            '[Architect API] JSON parse failed:',
            err
        );

        return {
            ok: false,
            error: err.message
        };
    }
}

// -----------------------------------------------------------------------------
// MAIN HANDLER
// -----------------------------------------------------------------------------

export default async function handler(req, res) {

    // -------------------------------------------------------------------------
    // METHOD CHECK
    // -------------------------------------------------------------------------

    if (req.method !== 'POST') {

        return sendJSON(
            res,
            405,
            {
                ok: false,
                error: 'Method not allowed.'
            }
        );
    }

    // -------------------------------------------------------------------------
    // ENV CHECK
    // -------------------------------------------------------------------------

    if (!process.env.OPENAI_API_KEY) {

        return sendJSON(
            res,
            500,
            {
                ok: false,
                error: 'OPENAI_API_KEY missing.'
            }
        );
    }

    try {

        // ---------------------------------------------------------------------
        // BODY
        // ---------------------------------------------------------------------

        const body = req.body || {};

        const prompt =
            sanitizeInput(body.prompt);

        const scan =
            body.scan || {};

        if (!prompt) {

            return sendJSON(
                res,
                400,
                {
                    ok: false,
                    error: 'Prompt is required.'
                }
            );
        }

        // ---------------------------------------------------------------------
        // PAYLOAD
        // ---------------------------------------------------------------------

        const runtimePayload = `
USER ISSUE:

${prompt}

RUNTIME SCAN:

${JSON.stringify(scan, null, 2)}
`;

        // ---------------------------------------------------------------------
        // OPENAI REQUEST
        // ---------------------------------------------------------------------

        const completion =
            await client.chat.completions.create({

                model: MODEL,

                temperature: 0.2,

                max_tokens: 2400,

                messages: [

                    {
                        role: 'system',
                        content: SYSTEM_PROMPT
                    },

                    {
                        role: 'user',
                        content: runtimePayload
                    }
                ]
            });

        // ---------------------------------------------------------------------
        // RESPONSE CONTENT
        // ---------------------------------------------------------------------

        const content =
            completion?.choices?.[0]
                ?.message?.content;

        if (!content) {

            throw new Error(
                'OpenAI returned empty content.'
            );
        }

        // ---------------------------------------------------------------------
        // JSON PARSE
        // ---------------------------------------------------------------------

        const parsed =
            safeParseJSON(content);

        // ---------------------------------------------------------------------
        // RAW FALLBACK
        // ---------------------------------------------------------------------

        if (!parsed.ok) {

            console.warn(
                '[Architect API] Non-JSON response fallback.'
            );

            return sendJSON(
                res,
                200,
                {
                    ok: true,

                    summary:
                        'AI response generated.',

                    analysis:
                        content,

                    patch: '',

                    notes:
                        'Response was not strict JSON.',

                    raw:
                        content
                }
            );
        }

        // ---------------------------------------------------------------------
        // NORMALIZED RESPONSE
        // ---------------------------------------------------------------------

        const normalized = {

            ok: true,

            summary:
                parsed.data.summary ||
                'Architect analysis complete.',

            analysis:
                parsed.data.analysis || '',

            patch:
                parsed.data.patch || '',

            notes:
                parsed.data.notes || ''
        };

        // ---------------------------------------------------------------------
        // SUCCESS
        // ---------------------------------------------------------------------

        return sendJSON(
            res,
            200,
            normalized
        );

    } catch (err) {

        console.error(
            '[Architect API ERROR]',
            err
        );

        // ---------------------------------------------------------------------
        // RATE LIMIT
        // ---------------------------------------------------------------------

        if (err?.status === 429) {

            return sendJSON(
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
        // AUTH ERROR
        // ---------------------------------------------------------------------

        if (
            err?.status === 401
        ) {

            return sendJSON(
                res,
                401,
                {
                    ok: false,
                    error:
                        'Invalid OpenAI API key.'
                }
            );
        }

        // ---------------------------------------------------------------------
        // GENERIC FAILURE
        // ---------------------------------------------------------------------

        return sendJSON(
            res,
            500,
            {
                ok: false,

                error:
                    err?.message ||
                    'Architect API failure.'
            }
        );
    }
}
