import { handleAsk } from "./handler";
import { jsonResponse } from "./http";
import {
  DEFAULT_PROVIDER,
  createProvider,
  createProviderConfig,
} from "./providers";

export interface Env {
  GOOGLE_AI_API_KEY: string;
  GOOGLE_AI_MODEL: string;
  GOOGLE_AI_MAX_TOKENS: string;
  GOOGLE_AI_TEMPERATURE: string;
  GOOGLE_AI_TIMEOUT: string;
  CORS_ALLOWED_ORIGINS: string;
  /** Имя LLM-провайдера. Не задано — используется дефолт. */
  ORACLE_PROVIDER?: string;
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const config = createProviderConfig({
      apiKey: env.GOOGLE_AI_API_KEY ?? "",
      model: env.GOOGLE_AI_MODEL ?? "",
      maxOutputTokens: env.GOOGLE_AI_MAX_TOKENS ?? "",
      temperature: env.GOOGLE_AI_TEMPERATURE ?? "",
      timeoutSeconds: env.GOOGLE_AI_TIMEOUT ?? "",
    });

    if (!config) {
      return configErrorResponse(request, env);
    }

    const providerKind = env.ORACLE_PROVIDER?.trim() || DEFAULT_PROVIDER;

    let provider;
    try {
      provider = createProvider(providerKind, config);
    } catch (error) {
      console.error(
        `provider_init_failed type=${error instanceof Error ? error.name : "unknown"}`,
      );
      return configErrorResponse(request, env);
    }

    return handleAsk(request, {
      provider,
      perIpLimiter: env.ORACLE_PER_IP_LIMITER,
      globalLimiter: env.ORACLE_GLOBAL_LIMITER,
      corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS ?? "",
    });
  },
};
