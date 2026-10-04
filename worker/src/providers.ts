// Выбор LLM-провайдера (DI-фабрика) и парсинг общего конфига.
import { createGroqProvider, PROVIDER_GROQ } from "./providers/groq";
import {
  createOpenRouterProvider,
  PROVIDER_OPENROUTER,
} from "./providers/openrouter";
import type { FetchImpl, OracleProvider, OracleProviderConfig } from "./types";

export { PROVIDER_GROQ, PROVIDER_OPENROUTER };

const DEFAULT_TIMEOUT_MS = 20_000;

export const DEFAULT_PROVIDER = PROVIDER_OPENROUTER;

export function createProvider(
  kind: string,
  config: OracleProviderConfig,
  fetchImpl?: FetchImpl,
): OracleProvider {
  if (kind === PROVIDER_OPENROUTER) {
    return createOpenRouterProvider(config, fetchImpl);
  }

  if (kind === PROVIDER_GROQ) {
    return createGroqProvider(config, fetchImpl);
  }

  throw new Error(`unknown_oracle_provider kind=${kind}`);
}

export interface RawProviderConfig {
  apiKey: string;
  model: string;
  maxOutputTokens: string;
  temperature: string;
  /** Таймаут в секундах строкой, как в env. */
  timeoutSeconds: string;
  /** Base URL картинок (R2). Опционален: пусто = ответы без imageUrl. */
  imageBaseUrl: string;
}

export function createProviderConfig(
  raw: RawProviderConfig,
): OracleProviderConfig | null {
  const apiKey = raw.apiKey.trim();
  const model = raw.model.trim();
  const maxOutputTokens = Number.parseInt(raw.maxOutputTokens, 10);
  const temperature = Number.parseFloat(raw.temperature);
  const timeoutSeconds = Number.parseInt(raw.timeoutSeconds, 10);
  const imageBaseUrl = raw.imageBaseUrl.trim().replace(/\/+$/, "");

  // Логируем только имена битых полей, не значения: среди них секреты.
  const invalidFields: string[] = [];
  if (!model) invalidFields.push("model");
  if (!apiKey) invalidFields.push("api_key");
  if (!Number.isFinite(maxOutputTokens)) invalidFields.push("max_tokens");
  if (!Number.isFinite(temperature)) invalidFields.push("temperature");

  if (invalidFields.length > 0) {
    console.error(`provider_config_invalid fields=${invalidFields.join(",")}`);
    return null;
  }

  return {
    apiKey,
    model,
    maxOutputTokens,
    temperature,
    timeoutMs: Number.isFinite(timeoutSeconds)
      ? timeoutSeconds * 1000
      : DEFAULT_TIMEOUT_MS,
    imageBaseUrl,
  };
}
