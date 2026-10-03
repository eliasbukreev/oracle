// Платформенно-независимые контракты: домен и DI.
// Модуль ничего не знает про Cloudflare, Request/Response и Env.

export interface OracleResponse {
  verdict: string;
  confidence: number;
  prophecy: string;
  reason: string;
}

/** Нормализованный конфиг LLM-провайдера. Парсится из строк окружения
 *  один раз в composition root (см. createProviderConfig). */
export interface OracleProviderConfig {
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
}

export type FetchImpl = typeof fetch;

/** DI-контракт LLM-провайдера. Хендлер зависит только от него,
 *  конкретная реализация (OpenRouter, Groq, ...) подставляется снаружи. */
export interface OracleProvider {
  readonly name: string;
  ask(question: string): Promise<ProviderAnswer>;
}

export type ProviderAnswer =
  { ok: true; response: OracleResponse } | { ok: false; blocked: boolean };

/** Минимальный контракт rate-лимитера. Реальный Cloudflare RateLimit
 *  биндинг удовлетворяет ему структурно, в тестах подсовывается фейк. */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Всё, что нужно хендлеру для обработки вопроса. Собирается
 *  в index.ts из Env, в тестах — вручную. */
export interface OracleDeps {
  provider: OracleProvider;
  perIpLimiter?: RateLimiter;
  globalLimiter?: RateLimiter;
  corsAllowedOrigins: string;
}
