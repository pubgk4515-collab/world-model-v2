// api/architect.js
// ------------------------------------------------------------
// Symbiote Studio — Architect API
// Phase 1: Structured JSON Patch Responses
// ------------------------------------------------------------

export default async function handler(req, res) {

    // --------------------------------------------------------
    // METHOD
    // --------------------------------------------------------

    if (req.method !== 'POST') {

        return res.status(405).json({
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
            error:
                'OPENAI_API_KEY missing'
        });
    }

    try {

        // ----------------------------------------------------
        // BODY
        // ----------------------------------------------------

        const {
            prompt = '',
            projectContext = {},
            runtimeErrors = [],
            runtimeWarnings = [],
            files = []
        } = req.body || {};

        // ----------------------------------------------------
        // SYSTEM PROMPT
        // ----------------------------------------------------

        const systemPrompt = `
You are Architect Runtime,
an autonomous software engineering AI.

Your job:
- analyze runtime problems
- inspect project structure
- generate SAFE structured patches

IMPORTANT RULES:

1. NEVER return markdown.
2. NEVER return explanations outside JSON.
3. NEVER return prose outside JSON.
4. ONLY return valid JSON.
5. Response must always be machine-readable.

Patch format:

{
  "summary": "short summary",
  "risk": "low | medium | high",
  "files": [
    {
      "path": "relative/file.js",
      "operation": "replace | append | create | delete",
      "find": "old code",
      "replace": "new code"
    }
  ]
}

Rules:
- keep fixes minimal
- avoid rewriting huge files
- preserve existing architecture
- prioritize runtime stability
- avoid destructive edits
- avoid deleting logic unless necessary

If uncertain:
- return low-risk guards
- null checks
- method existence checks
- syntax-safe patches
`;

        // ----------------------------------------------------
        // USER PAYLOAD
        // ----------------------------------------------------

        const userPayload = {
            issue: prompt,
            runtimeErrors,
            runtimeWarnings,
            projectContext,
            files
        };

        // ----------------------------------------------------
        // OPENAI REQUEST
        // ----------------------------------------------------

        const response = await fetch(
            'https://api.openai.com/v1/chat/completions',
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json',

                    Authorization:
                        `Bearer ${apiKey}`
                },

                body: JSON.stringify({

                    model:
                        'gpt-5.5',

                    temperature:
                        0.15,

                    messages: [

                        {
                            role: 'system',
                            content: systemPrompt
                        },

                        {
                            role: 'user',
                            content:
                                JSON.stringify(
                                    userPayload,
                                    null,
                                    2
                                )
                        }
                    ]
                })
            }
        );

        // ----------------------------------------------------
        // OPENAI FAILURE
        // ----------------------------------------------------

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                '[Architect API] OpenAI Error:',
                errorText
            );

            return res.status(500).json({
                error:
                    'OpenAI request failed',
                details:
                    errorText
            });
        }

        // ----------------------------------------------------
        // OPENAI DATA
        // ----------------------------------------------------

        const data =
            await response.json();

        const content =
            data?.choices?.[0]
                ?.message?.content;

        if (!content) {

            return res.status(500).json({
                error:
                    'Empty AI response'
            });
        }

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json({

            ok: true,

            raw:
                content,

            usage:
                data.usage || null
        });

    } catch (err) {

        console.error(
            '[Architect API] Fatal Error:',
            err
        );

        return res.status(500).json({

            error:
                'Architect runtime failure',

            details:
                err.message || String(err)
        });
    }
}