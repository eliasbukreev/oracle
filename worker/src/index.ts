const MAX_QUESTION_LENGTH = 500
const MAX_RESPONSE_FIELD_LENGTH = 4000
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

interface Env {
  GOOGLE_AI_API_KEY: string
  GOOGLE_AI_MODEL: string
  GOOGLE_AI_MAX_TOKENS: string
  GOOGLE_AI_TEMPERATURE: string
  GOOGLE_AI_TIMEOUT: string
  CORS_ALLOWED_ORIGINS: string
}

interface OracleResponse {
  verdict: string
  confidence: number
  prophecy: string
  reason: string
}

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
}

function allowedOrigins(env: Env): Set<string> {
  return new Set(
    env.CORS_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers(jsonHeaders)
  const origin = request.headers.get('Origin')
  const allowed = allowedOrigins(env)

  if (origin && (allowed.has('*') || allowed.has(origin))) {
    headers.set('Access-Control-Allow-Origin', origin)
  }

  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  headers.set('Vary', 'Origin')
  return headers
}

function response(request: Request, env: Env, status: number, payload: unknown): Response {
  return new Response(payload === null ? null : JSON.stringify(payload), {
    status,
    headers: corsHeaders(request, env),
  })
}

function isOracleResponse(value: unknown): value is OracleResponse {
  if (!value || typeof value !== 'object') return false

  const result = value as Record<string, unknown>
  return (
    typeof result.verdict === 'string' && result.verdict.trim().length > 0 &&
    typeof result.confidence === 'number' && Number.isFinite(result.confidence) &&
    result.confidence >= 0 && result.confidence <= 100 &&
    typeof result.prophecy === 'string' && result.prophecy.trim().length > 0 &&
    typeof result.reason === 'string' && result.reason.trim().length > 0 &&
    result.verdict.length <= MAX_RESPONSE_FIELD_LENGTH &&
    result.prophecy.length <= MAX_RESPONSE_FIELD_LENGTH &&
    result.reason.length <= MAX_RESPONSE_FIELD_LENGTH
  )
}

function parseModelResponse(content: string): OracleResponse | null {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

  try {
    const parsed: unknown = JSON.parse(cleaned)
    if (!isOracleResponse(parsed)) return null

    return {
      verdict: parsed.verdict.trim(),
      confidence: parsed.confidence,
      prophecy: parsed.prophecy.trim(),
      reason: parsed.reason.trim(),
    }
  } catch {
    return null
  }
}

function oraclePrompt(question: string): string {
  return [
    'Ты — Оракул. Отвечай на русском языке в мистическом стиле.',
    'Не упоминай, что ты искусственный интеллект.',
    'Верни только валидный JSON без markdown и без ```.',
    'JSON должен содержать поля: verdict (ДА или НЕТ), confidence (число от 0 до 100), prophecy (короткое пророчество), reason (краткое объяснение).',
    '',
    `Вопрос пользователя: ${question}`,
  ].join('\n')
}

async function askGemini(question: string, env: Env): Promise<OracleResponse | null> {
  const model = env.GOOGLE_AI_MODEL.trim()
  const apiKey = env.GOOGLE_AI_API_KEY.trim()
  const maxOutputTokens = Number.parseInt(env.GOOGLE_AI_MAX_TOKENS, 10)
  const temperature = Number.parseFloat(env.GOOGLE_AI_TEMPERATURE)
  const timeout = Number.parseInt(env.GOOGLE_AI_TIMEOUT, 10)

  if (!model || !apiKey || !Number.isFinite(maxOutputTokens) || !Number.isFinite(temperature)) {
    console.error('gemini_config_invalid')
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), Number.isFinite(timeout) ? timeout * 1000 : 20000)
  const url = `${GEMINI_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  try {
    console.log(`gemini_request_started model=${model} question_length=${question.length}`)

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: oraclePrompt(question) }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    })

    if (!geminiResponse.ok) {
      const errorPayload = await geminiResponse.json().catch(() => null) as { error?: { message?: string } } | null
      console.error(`gemini_http_error status=${geminiResponse.status} message=${errorPayload?.error?.message?.slice(0, 300) ?? 'unknown'}`)
      return null
    }

    const payload = await geminiResponse.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const content = payload.candidates?.[0]?.content?.parts?.[0]?.text
    const result = typeof content === 'string' ? parseModelResponse(content) : null

    if (!result) {
      console.error('gemini_response_invalid')
      return null
    }

    console.log('gemini_response_validated')
    return result
  } catch (error) {
    console.error(`gemini_request_failed type=${error instanceof Error ? error.name : 'unknown'}`)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return response(request, env, 204, null)
    }

    if (request.method !== 'POST') {
      return response(request, env, 405, { error: 'invalid_request' })
    }

    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      return response(request, env, 400, { error: 'invalid_request' })
    }

    const question = payload && typeof payload === 'object' && 'question' in payload
      ? (payload as { question?: unknown }).question
      : undefined

    if (typeof question !== 'string' || !question.trim() || question.trim().length > MAX_QUESTION_LENGTH) {
      return response(request, env, 400, { error: 'invalid_request' })
    }

    const result = await askGemini(question.trim(), env)
    return result
      ? response(request, env, 200, result)
      : response(request, env, 502, { error: 'oracle_unavailable' })
  },
}
