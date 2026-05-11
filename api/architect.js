// api/architect.js
// ------------------------------------------------------------
// Symbiote Studio — Architect API
// Stable Structured JSON Runtime Endpoint
// ------------------------------------------------------------

import OpenAI from 'openai';

// ------------------------------------------------------------
// OPENAI
// ------------------------------------------------------------

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------

const MODEL =
    process.env.ARCHITECT_MODEL ||
    'gpt-4.1-mini';

const MAX_INPUT_CHARS = 120000;

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function sanitize(value) {

    if (!value) {
        return '';
    }

    return String(value)
        .slice(0, MAX_INPUT_CHARS)
        .trim();
}

function safeArray(value) {

    return Array.isArray(value)
        ? value
        : [];
}

function safeObject(value) {

    return (
        value &&
        typeof value === 'object'
    )
        ? value
        : {};
}

function safeParseJSON(content) {

    try {

        return {
            ok: true,
            data: JSON.parse(content)
        };

    } catch (err) {

        console.error(
            '[Architect API] JSON Parse Failed:',
            err
        );

        return {
            ok: false,
            error: err.message
        };
    }
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------

export default async function handler(req, res) {

    // --------------------------------------------------------
    // METHOD
    // --------------------------------------------------------

    if (req.method !== 'POST') {

        return res.status(405).json({
            ok: false,
            error: 'Method not allowed'
        });
    }

    // --------------------------------------------------------
    // ENV
    // --------------------------------------------------------

    const apiKey =
        process.env.OPENAI_API_KEY;

    if (!apiKey) {

        return res.status(500).json({
            ok: false,
            error:
                'OPENAI_API_KEY missing'
        });
    }

    try {

        // ----------------------------------------------------
        // BODY
        // ----------------------------------------------------

        const body =
            req.body || {};

        const prompt =
            sanitize(body.prompt);

        const projectContext =
            safeObject(
                body.projectContext
            );

        const runtimeErrors =
            safeArray(
                body.runtimeErrors
            );

        const runtimeWarnings =
            safeArray(
                body.runtimeWarnings
            );

        const files =
            safeArray(
                body.files
            );

        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!prompt) {

            return res.status(400).json({
                ok: false,
                error:
                    'Prompt is required'
            });
        }

        // ----------------------------------------------------
        // SYSTEM PROMPT
        // ----------------------------------------------------

        const systemPrompt = `
You are Architect Runtime,
an autonomous software engineering AI.

Your responsibilities:
- analyze runtime failures
- inspect project structure
- generate SAFE structured patches
- preserve runtime stability
- avoid destructive rewrites

IMPORTANT RULES:

1. NEVER return markdown.
2. NEVER return prose outside JSON.
3. ONLY return valid JSON.
4. ALWAYS return machine-readable output.
5. Keep patches minimal and safe.
6. Prefer guards, null checks, existence checks.
7. Avoid rewriting huge files.

Required JSON format:

{
  "summary": "short summary",
  "risk": "low | medium | high",
  "analysis": "technical analysis",
  "files": [
    {
      "path": "relative/file.js",
      "operation": "replace | append | create | delete",
      "find": "old code",
      "replace": "new code"
    }
  ]
}
`;

        // ----------------------------------------------------
        // USER PAYLOAD
        // ----------------------------------------------------

        const userPayload = {

            issue:
                prompt,

            runtimeErrors,

            runtimeWarnings,

            projectContext,

            files
        };

        // ----------------------------------------------------
        // OPENAI REQUEST
        // ----------------------------------------------------

        const completion =
            await client.chat.completions.create({

                model:
                    MODEL,

                temperature:
                    0.15,

                max_tokens:
                    2400,

                messages: [

                    {
                        role:
                            'system',

                        content:
                            systemPrompt
                    },

                    {
                        role:
                            'user',

                        content:
                            JSON.stringify(
                                userPayload,
                                null,
                                2
                            )
                    }
                ]
            });

        // ----------------------------------------------------
        // CONTENT
        // ----------------------------------------------------

        const content =
            completion?.choices?.[0]
                ?.message?.content;

        if (!content) {

            return res.status(500).json({

                ok: false,

                error:
                    'Empty AI response'
            });
        }

        // ----------------------------------------------------
        // PARSE
        // ----------------------------------------------------

        const parsed =
            safeParseJSON(content);

        // ----------------------------------------------------
        // RAW FALLBACK
        // ----------------------------------------------------

        if (!parsed.ok) {

            console.warn(
                '[Architect API] Non-JSON fallback triggered'
            );

            return res.status(200).json({

                ok: true,

                summary:
                    'AI response generated',

                risk:
                    'medium',

                analysis:
                    content,

                files: [],

                raw:
                    content,

                usage:
                    completion.usage || null
            });
        }

        // ----------------------------------------------------
        // NORMALIZED
        // ----------------------------------------------------

        const normalized = {

            ok: true,

            summary:
                parsed.data.summary ||
                'Architect analysis complete',

            risk:
                parsed.data.risk ||
                'low',

            analysis:
                parsed.data.analysis ||
                '',

            files:
                Array.isArray(
                    parsed.data.files
                )
                    ? parsed.data.files
                    : [],

            usage:
                completion.usage || null
        };

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json(
            normalized
        );

    } catch (err) {

        // ----------------------------------------------------
        // LOG
        // ----------------------------------------------------

        console.error(
            '[Architect API] Fatal Error:',
            err
        );

        // ----------------------------------------------------
        // RATE LIMIT
        // ----------------------------------------------------

        if (
            err?.status === 429
        ) {

            return res.status(429).json({

                ok: false,

                error:
                    'OpenAI rate limit exceeded'
            });
        }

        // ----------------------------------------------------
        // AUTH
        // ----------------------------------------------------

        if (
            err?.status === 401
        ) {

            return res.status(401).json({

                ok: false,

                error:
                    'Invalid OpenAI API key'
            });
        }

        // ----------------------------------------------------
        // GENERIC
        // ----------------------------------------------------

        return res.status(500).json({

            ok: false,

            error:
                'Architect runtime failure',

            details:
                err?.message ||
                String(err)
        });
    }
}
