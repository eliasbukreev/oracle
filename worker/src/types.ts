import type {
  ChoiceVariants,
  SpreadId,
  TarotOrientation,
  TarotPosition,
  TarotResponse,
} from "@oracle/shared";
export type {
  ChoiceVariants,
  SpreadId,
  TarotCard,
  TarotOrientation,
  TarotPosition,
  TarotResponse,
} from "@oracle/shared";

/** Описание расклада из реестра (spreads.ts). Подписи — только
 *  для своих позиций, остальное промт не использует. */
export interface SpreadDef {
  id: SpreadId;
  cardCount: number;
  positions: string[];
  positionLabelsRu: Record<string, string>;
  /** Рамка расклада для промта: назначение + связь позиций + задача итога. */
  descriptionRu: string;
  /** Требует ли названия вариантов выбора (только choice). */
  requiresVariants: boolean;
}

/** Карта, вытянутая сервером до обращения к LLM. Имя каноническое. */
export interface DrawnCard {
  id: string;
  name: string;
  position: TarotPosition;
  orientation: TarotOrientation;
}

/** Вход провайдера: вопрос + расклад + уже вытянутые карты. */
export interface TarotAskInput {
  question: string;
  spread: SpreadDef;
  drawnCards: DrawnCard[];
  variants?: ChoiceVariants;
}

/** Нормализованный конфиг LLM-провайдера. Парсится из строк окружения
 *  один раз в composition root (см. createProviderConfig). */
export interface OracleProviderConfig {
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
  /** Base URL картинок (R2 за кастомным доменом). Пусто = без картинок. */
  imageBaseUrl: string;
}

export type FetchImpl = typeof fetch;

/** Результат классификации вопроса: расклад + извлечённые варианты. */
export interface Classification {
  spread: SpreadDef;
  variants?: ChoiceVariants;
}

/** DI-контракт LLM-провайдера. Хендлер зависит только от него,
 *  конкретная реализация (OpenRouter, Groq, ...) подставляется снаружи. */
export interface OracleProvider {
  readonly name: string;
  askTarot(input: TarotAskInput): Promise<ProviderAnswer>;
  /** Дешёвый выбор расклада. Null при любом сбое — workflow берёт classic. */
  classify(question: string): Promise<Classification | null>;
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
