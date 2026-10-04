// Платформенно-независимые контракты: домен и DI.
// Модуль ничего не знает про Cloudflare, Request/Response и Env.

/** Позиция карты в раскладе из трёх карт. */
export type TarotPosition = "past" | "present" | "future";

/** Карта, вытянутая сервером до обращения к LLM. Имя каноническое. */
export interface DrawnCard {
  id: string;
  name: string;
  position: TarotPosition;
}

/** Вход провайдера: вопрос + уже вытянутые карты. */
export interface TarotAskInput {
  question: string;
  drawnCards: DrawnCard[];
}

/** Одна карта в ответе API: id для маппинга на изображения, name для текста. */
export interface TarotCard {
  id: string;
  name: string;
  position: TarotPosition;
  meaning: string;
}

/** Расклад из трёх карт — ответ API. */
export interface TarotResponse {
  cards: TarotCard[];
  summary: string;
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
  askTarot(input: TarotAskInput): Promise<ProviderAnswer>;
}

export type ProviderAnswer =
  { ok: true; response: TarotResponse } | { ok: false; blocked: boolean };

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
  /** Генератор случайных чисел для вытягивания карт. По умолчанию crypto-based. */
  randomFn?: () => number;
}
