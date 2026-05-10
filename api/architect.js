// /api/architect.js
// Symbiote Studio — Architect Console API
// Vercel Serverless Function

export const config = {
    runtime: 'edge'
};

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export default async function handler(req) {

    // =====================================================
    // CORS
    // =====================================================

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // =====================================================
    // PRE-FLIGHT
    // =====================================================

    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }

    // =====================================================
    // METHOD CHECK
    // =====================================================

    if (req.method !== 'POST') {

        return new Response(
            JSON.stringify({
                ok: false,
                error: 'Only POST allowed.'
            }),
            {
                status: 405,
                headers: corsHeaders
            }
        );
    }

    // =====================================================
    // ENV
    // =====================================================

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {

        return new Response(
            JSON.stringify({
                ok: false,
                error: 'OPENAI_API_KEY missing.'
            }),
            {
                status: 500,
                headers: corsHeaders
            }
        );
    }

    // =====================================================
    // BODY
    // =====================================================

    let body;

    try {

        body = await req.json();

    } catch (err) {

        return new Response(
            JSON.stringify({
                ok: false,
                error: 'Invalid JSON body.'
            }),
            {
                status: 400,
                headers: corsHeaders
            }
        );
    }

    const {
        prompt = '',
        projectContext = '',
        consoleLogs = '',
        selectedFiles = [],
        mode = 'architect'
    } = body;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!prompt || typeof prompt !== 'string') {

        return new Response(
            JSON.stringify({
                ok: false,
                error: 'Prompt required.'
            }),
            {
                status: 400,
                headers: corsHeaders
            }
        );
    }

    // =====================================================
    // SYSTEM PROMPT
    // =====================================================

    const SYSTEM_PROMPT = `
You are "Symbiote Architect".

You are a senior:
- AI Systems Engineer
- Full Stack Architect
- Audio DSP Engineer
- Mobile UX Engineer
- Runtime Debugger

Your job:
1. Scan project context
2. Find root causes
3. Explain EXACT broken files
4. Generate DIRECT production-ready fixes
5. NEVER give vague advice
6. NEVER simplify solutions
7. ALWAYS preserve existing architecture
8. ALWAYS return COMPLETE code patches

Rules:
- Think step-by-step internally
- Prefer surgical fixes
- Detect audio bugs
- Detect event listener bugs
- Detect mobile interaction issues
- Detect DOM lifecycle bugs
- Detect async timing bugs
- Detect WebAudio mistakes
- Detect import/export mismatches
- Detect constructor signature mismatches
- Detect UI dead states
- Detect memory leaks
- Detect scroll locking issues

When returning fixes:
- Mention file paths
- Mention exact broken lines if possible
- Return code blocks
- Keep formatting clean
- Never omit critical code

Project Type:
Procedural atmospheric audio engine
with modular experts and mobile-first runtime.
`;

    // =====================================================
    // USER PAYLOAD
    // =====================================================

    const USER_PROMPT = `
# MODE
${mode}

# USER REQUEST
${prompt}

# CONSOLE LOGS
${consoleLogs}

# PROJECT CONTEXT
${projectContext}

# SELECTED FILES
${Array.isArray(selectedFiles)
? selectedFiles.join('\n')
: ''
}
`;

    // =====================================================
    // OPENAI REQUEST
    // =====================================================

    try {

        const response = await fetch(
            OPENAI_URL,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },

                body: JSON.stringify({

                    model: 'gpt-4.1',

                    temperature: 0.2,

                    messages: [

                        {
                            role: 'system',
                            content: SYSTEM_PROMPT
                        },

                        {
                            role: 'user',
                            content: USER_PROMPT
                        }
                    ]
                })
            }
        );

        // =================================================
        // OPENAI FAILURE
        // =================================================

        if (!response.ok) {

            const errText = await response.text();

            return new Response(
                JSON.stringify({
                    ok: false,
                    error: 'OpenAI request failed.',
                    details: errText
                }),
                {
                    status: 500,
                    headers: corsHeaders
                }
            );
        }

        // =================================================
        // SUCCESS
        // =================================================

        const data = await response.json();

        const output =
            data?.choices?.[0]?.message?.content
            || 'No response generated.';

        return new Response(
            JSON.stringify({
                ok: true,
                response: output
            }),
            {
                status: 200,
                headers: corsHeaders
            }
        );

    } catch (err) {

        return new Response(
            JSON.stringify({
                ok: false,
                error: 'Architect runtime failed.',
                details: err.message
            }),
            {
                status: 500,
                headers: corsHeaders
            }
        );
    }
}