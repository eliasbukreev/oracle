// Выбор LLM-провайдера (DI-фабрика) и парсинг общего конфига.
// Сами реализации лежат рядом: providers/gemini.ts, providers/openrouter.ts.
// Новый провайдер = новый файл + одна ветка в createProvider.
import { GeminiProvider, PROVIDER_GEMINI } from "./providers/gemini";
import {
  OpenRouterProvider,
  PROVIDER_OPENROUTER,
} from "./providers/openrouter";
import type { FetchImpl, OracleProvider, OracleProviderConfig } from "./types";

export { PROVIDER_GEMINI, PROVIDER_OPENROUTER };

const DEFAULT_TIMEOUT_MS = 20_000;

export const DEFAULT_PROVIDER = PROVIDER_GEMINI;

export function createProvider(
  kind: string,
  config: OracleProviderConfig,
  fetchImpl?: FetchImpl,
): OracleProvider {
  if (kind === PROVIDER_GEMINI) {
    return new GeminiProvider(config, fetchImpl);
  }

  if (kind === PROVIDER_OPENROUTER) {
    return new OpenRouterProvider(config, fetchImpl);
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
}

export function createProviderConfig(
  raw: RawProviderConfig,
): OracleProviderConfig | null {
  const apiKey = raw.apiKey.trim();
  const model = raw.model.trim();
  const maxOutputTokens = Number.parseInt(raw.maxOutputTokens, 10);
  const temperature = Number.parseFloat(raw.temperature);
  const timeoutSeconds = Number.parseInt(raw.timeoutSeconds, 10);

  if (
    !model ||
    !apiKey ||
    !Number.isFinite(maxOutputTokens) ||
    !Number.isFinite(temperature)
  ) {
    console.error("provider_config_invalid");
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
  };
}
