const MAX_QUESTION_LENGTH = 500;
const MAX_RESPONSE_FIELD_LENGTH = 4000;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface Env {
  GOOGLE_AI_API_KEY: string;
  GOOGLE_AI_MODEL: string;
  GOOGLE_AI_MAX_TOKENS: string;
  GOOGLE_AI_TEMPERATURE: string;
  GOOGLE_AI_TIMEOUT: string;
  CORS_ALLOWED_ORIGINS: string;
  // Штатные Workers Rate Limiting биндинги. Опциональны, чтобы
  // `wrangler dev` без настроенных лимитов не падал: тогда проверка
  // пропускается с предупреждением в лог.
  ORACLE_PER_IP_LIMITER?: RateLimit;
  ORACLE_GLOBAL_LIMITER?: RateLimit;
}

interface OracleResponse {
  verdict: string;
  confidence: number;
  prophecy: string;
  reason: string;
}

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

function allowedOrigins(env: Env): Set<string> {
  return new Set(
    env.CORS_ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers(jsonHeaders);
  const origin = request.headers.get("Origin");
  const allowed = allowedOrigins(env);

  if (origin && (allowed.has("*") || allowed.has(origin))) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Vary", "Origin");
  return headers;
}

function response(
  request: Request,
  env: Env,
  status: number,
  payload: unknown,
  extraHeaders?: Record<string, string>,
): Response {
  const headers = corsHeaders(request, env);

  if (extraHeaders) {
    for (const [name, value] of Object.entries(extraHeaders)) {
      headers.set(name, value);
    }
  }

  return new Response(payload === null ? null : JSON.stringify(payload), {
    status,
    headers,
  });
}

const RATE_LIMIT_WINDOW_SECONDS = 60;

function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown";
}

async function isRateLimited(
  request: Request,
  env: Env,
): Promise<"per_ip" | "global" | null> {
  if (env.ORACLE_PER_IP_LIMITER) {
    const { success } = await env.ORACLE_PER_IP_LIMITER.limit({
      key: clientIp(request),
    });

    if (!success) {
      return "per_ip";
    }
  }

  if (env.ORACLE_GLOBAL_LIMITER) {
    const { success } = await env.ORACLE_GLOBAL_LIMITER.limit({
      key: "global",
    });

    if (!success) {
      return "global";
    }
  }

  if (!env.ORACLE_PER_IP_LIMITER && !env.ORACLE_GLOBAL_LIMITER) {
    console.warn("rate_limit_skipped reason=no_binding");
  }

  return null;
}

function isOracleResponse(value: unknown): value is OracleResponse {
  if (!value || typeof value !== "object") return false;

  const result = value as Record<string, unknown>;
  return (
    typeof result.verdict === "string" &&
    result.verdict.trim().length > 0 &&
    typeof result.confidence === "number" &&
    Number.isFinite(result.confidence) &&
    result.confidence >= 0 &&
    result.confidence <= 100 &&
    typeof result.prophecy === "string" &&
    result.prophecy.trim().length > 0 &&
    typeof result.reason === "string" &&
    result.reason.trim().length > 0 &&
    result.verdict.length <= MAX_RESPONSE_FIELD_LENGTH &&
    result.prophecy.length <= MAX_RESPONSE_FIELD_LENGTH &&
    result.reason.length <= MAX_RESPONSE_FIELD_LENGTH
  );
}

function parseModelResponse(content: string): OracleResponse | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!isOracleResponse(parsed)) return null;

    return {
      verdict: parsed.verdict.trim(),
      confidence: parsed.confidence,
      prophecy: parsed.prophecy.trim(),
      reason: parsed.reason.trim(),
    };
  } catch {
    return null;
  }
}

function oraclePrompt(question: string): string {
  return [
    "Ты — Оракул. Отвечай на русском языке в мистическом стиле.",
    "Не упоминай, что ты искусственный интеллект.",
    "Верни только валидный JSON без markdown и без ```.",
    "JSON должен содержать поля: verdict (ДА или НЕТ), confidence (число от 0 до 100), prophecy (короткое пророчество), reason (краткое объяснение).",
    "",
    `Вопрос пользователя: ${question}`,
  ].join("\n");
}

async function askGemini(
  question: string,
  env: Env,
): Promise<OracleResponse | null> {
  const model = env.GOOGLE_AI_MODEL.trim();
  const apiKey = env.GOOGLE_AI_API_KEY.trim();
  const maxOutputTokens = Number.parseInt(env.GOOGLE_AI_MAX_TOKENS, 10);
  const temperature = Number.parseFloat(env.GOOGLE_AI_TEMPERATURE);
  const timeout = Number.parseInt(env.GOOGLE_AI_TIMEOUT, 10);

  if (
    !model ||
    !apiKey ||
    !Number.isFinite(maxOutputTokens) ||
    !Number.isFinite(temperature)
  ) {
    console.error("gemini_config_invalid");
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    Number.isFinite(timeout) ? timeout * 1000 : 20000,
  );
  const url = `${GEMINI_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    console.log(
      `gemini_request_started model=${model} question_length=${question.length}`,
    );

    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: oraclePrompt(question) }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    if (!geminiResponse.ok) {
      const errorPayload = (await geminiResponse.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      console.error(
        `gemini_http_error status=${geminiResponse.status} message=${errorPayload?.error?.message?.slice(0, 300) ?? "unknown"}`,
      );
      return null;
    }

    const payload = (await geminiResponse.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    const result =
      typeof content === "string" ? parseModelResponse(content) : null;

    if (!result) {
      console.error("gemini_response_invalid");
      return null;
    }

    console.log("gemini_response_validated");
    return result;
  } catch (error) {
    console.error(
      `gemini_request_failed type=${error instanceof Error ? error.name : "unknown"}`,
    );
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Именованные экспорты для unit-тестов (vitest). Рантайм воркера
// использует только default-экспорт ниже.
export {
  MAX_QUESTION_LENGTH,
  MAX_RESPONSE_FIELD_LENGTH,
  GEMINI_URL,
  RATE_LIMIT_WINDOW_SECONDS,
  allowedOrigins,
  askGemini,
  clientIp,
  corsHeaders,
  isOracleResponse,
  isRateLimited,
  oraclePrompt,
  parseModelResponse,
  response,
  type Env,
  type OracleResponse,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return response(request, env, 204, null);
    }

    if (request.method !== "POST") {
      return response(request, env, 405, { error: "invalid_request" });
    }

    let limitedScope: "per_ip" | "global" | null;

    try {
      limitedScope = await isRateLimited(request, env);
    } catch (error) {
      console.error(
        `rate_limit_error type=${error instanceof Error ? error.name : "unknown"}`,
      );
      return response(request, env, 502, { error: "oracle_unavailable" });
    }

    if (limitedScope) {
      console.warn(`rate_limited scope=${limitedScope}`);
      return response(
        request,
        env,
        429,
        { error: "oracle_resting", retry_after: RATE_LIMIT_WINDOW_SECONDS },
        { "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS) },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return response(request, env, 400, { error: "invalid_request" });
    }

    const question =
      payload && typeof payload === "object" && "question" in payload
        ? (payload as { question?: unknown }).question
        : undefined;

    if (
      typeof question !== "string" ||
      !question.trim() ||
      question.trim().length > MAX_QUESTION_LENGTH
    ) {
      return response(request, env, 400, { error: "invalid_request" });
    }

    const result = await askGemini(question.trim(), env);
    return result
      ? response(request, env, 200, result)
      : response(request, env, 502, { error: "oracle_unavailable" });
  },
};
