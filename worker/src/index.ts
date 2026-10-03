// Composition root воркера: тонкая склейка Cloudflare Env
// с платформенно-независимым хендлером.
//
// Схема переменных:
//   общие параметры генерации — ORACLE_TEMPERATURE, ORACLE_MAX_TOKENS,
//   ORACLE_TIMEOUT (одинаковы для всех провайдеров);
//   своё у каждого провайдера — только ключ и модель:
//   GEMINI_API_KEY (secret) + GEMINI_MODEL,
//   OPENROUTER_API_KEY (secret) + OPENROUTER_MODEL.
// Выбор: ORACLE_PROVIDER — primary (дефолт "gemini"),
// ORACLE_FALLBACK_PROVIDER — secondary (пусто = без fallback).
//
// Бизнес-логика:   oracle.ts (домен), providers/* (LLM), handler.ts (оркестрация)
// Платформа:       http.ts (CORS/ответы/лимиты), этот файл (Env → deps)
import { handleAsk } from "./handler";
import { jsonResponse } from "./http";
import {
  DEFAULT_PROVIDER,
  PROVIDER_GEMINI,
  PROVIDER_OPENROUTER,
  createProvider,
  createProviderConfig,
} from "./providers";
import { FallbackProvider } from "./providers/fallback";
import type { OracleProvider } from "./types";

export interface Env {
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL: string;
  ORACLE_MAX_TOKENS: string;
  ORACLE_TEMPERATURE: string;
  ORACLE_TIMEOUT: string;
  CORS_ALLOWED_ORIGINS: string;
  /** Имя primary LLM-провайдера. Не задано — используется дефолт. */
  ORACLE_PROVIDER?: string;
  /** Имя fallback-провайдера. Не задано — fallback отключён. */
  ORACLE_FALLBACK_PROVIDER?: string;
  // Штатные Workers Rate Limiting биндинги. Опциональны, чтобы
  // `wrangler dev` без настроенных лимитов не падал: тогда проверка
  // пропускается с предупреждением в лог.
  ORACLE_PER_IP_LIMITER?: RateLimit;
  ORACLE_GLOBAL_LIMITER?: RateLimit;
}

function configErrorResponse(request: Request, env: Env): Response {
  return jsonResponse(request, env.CORS_ALLOWED_ORIGINS ?? "", 502, {
    error: "oracle_unavailable",
  });
}

function providerCredentials(
  kind: string,
  env: Env,
): { apiKey: string; model: string } | null {
  if (kind === PROVIDER_GEMINI) {
    return { apiKey: env.GEMINI_API_KEY ?? "", model: env.GEMINI_MODEL ?? "" };
  }

  if (kind === PROVIDER_OPENROUTER) {
    return {
      apiKey: env.OPENROUTER_API_KEY ?? "",
      model: env.OPENROUTER_MODEL ?? "",
    };
  }

  console.error(`unknown_oracle_provider kind=${kind}`);
  return null;
}

function buildProvider(kind: string, env: Env): OracleProvider | null {
  const credentials = providerCredentials(kind, env);

  if (!credentials) {
    return null;
  }

  const config = createProviderConfig({
    apiKey: credentials.apiKey,
    model: credentials.model,
    maxOutputTokens: env.ORACLE_MAX_TOKENS ?? "",
    temperature: env.ORACLE_TEMPERATURE ?? "",
    timeoutSeconds: env.ORACLE_TIMEOUT ?? "",
  });

  if (!config) {
    return null;
  }

  try {
    return createProvider(kind, config);
  } catch (error) {
    console.error(
      `provider_init_failed type=${error instanceof Error ? error.name : "unknown"}`,
    );
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsAllowedOrigins = env.CORS_ALLOWED_ORIGINS ?? "";

    if (request.method === "OPTIONS") {
      return jsonResponse(request, corsAllowedOrigins, 204, null);
    }

    if (request.method !== "POST") {
      return jsonResponse(request, corsAllowedOrigins, 405, {
        error: "invalid_request",
      });
    }

    const primaryKind = env.ORACLE_PROVIDER?.trim() || DEFAULT_PROVIDER;
    const primary = buildProvider(primaryKind, env);

    if (!primary) {
      return configErrorResponse(request, env);
    }

    let provider: OracleProvider = primary;

    const fallbackKind = env.ORACLE_FALLBACK_PROVIDER?.trim() || "";
    if (fallbackKind) {
      if (fallbackKind === primaryKind) {
        console.error(`fallback_same_as_primary kind=${fallbackKind}`);
      } else {
        const secondary = buildProvider(fallbackKind, env);

        if (!secondary) {
          console.error(`fallback_unavailable kind=${fallbackKind}`);
        } else {
          provider = new FallbackProvider(primary, secondary);
        }
      }
    }

    return handleAsk(request, {
      provider,
      perIpLimiter: env.ORACLE_PER_IP_LIMITER,
      globalLimiter: env.ORACLE_GLOBAL_LIMITER,
      corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS ?? "",
    });
  },
};
