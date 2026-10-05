import { handleAsk } from "./handler";
import { jsonResponse } from "./http";
import {
  DEFAULT_PROVIDER,
  PROVIDER_GROQ,
  PROVIDER_OPENROUTER,
  PROVIDER_ORCA,
  createProvider,
  createProviderConfig,
} from "./providers";
import { createFallbackProvider } from "./providers/fallback";
import type { OracleProvider } from "./types";

export interface Env {
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL: string;
  GROQ_API_KEY: string;
  GROQ_MODEL: string;
  ORCA_API_KEY: string;
  ORCA_MODEL: string;
  ORACLE_MAX_TOKENS: string;
  ORACLE_TEMPERATURE: string;
  ORACLE_TIMEOUT: string;
  CORS_ALLOWED_ORIGINS: string;
  TAROT_IMAGE_BASE_URL?: string;
  ORACLE_PROVIDERS?: string;
  ORACLE_PER_IP_LIMITER?: RateLimit;
  ORACLE_GLOBAL_LIMITER?: RateLimit;
}

function configErrorResponse(request: Request, env: Env): Response {
  return jsonResponse(request, env.CORS_ALLOWED_ORIGINS ?? "", 502, {
    error: "oracle_unavailable",
  });
}

export function parseProviderChain(env: Env): string[] {
  const kinds = (env.ORACLE_PROVIDERS ?? "")
    .split(",")
    .map((kind) => kind.trim())
    .filter((kind) => kind.length > 0);
  const unique = [...new Set(kinds)];

  if (unique.length !== kinds.length) {
    console.error("provider_chain_duplicates_dropped");
  }

  return unique.length > 0 ? unique : [DEFAULT_PROVIDER];
}

function providerCredentials(
  kind: string,
  env: Env,
): { apiKey: string; model: string } | null {
  if (kind === PROVIDER_OPENROUTER) {
    return {
      apiKey: env.OPENROUTER_API_KEY ?? "",
      model: env.OPENROUTER_MODEL ?? "",
    };
  }

  if (kind === PROVIDER_GROQ) {
    return { apiKey: env.GROQ_API_KEY ?? "", model: env.GROQ_MODEL ?? "" };
  }

  if (kind === PROVIDER_ORCA) {
    return { apiKey: env.ORCA_API_KEY ?? "", model: env.ORCA_MODEL ?? "" };
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
    imageBaseUrl: env.TAROT_IMAGE_BASE_URL ?? "",
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

    const chainKinds = parseProviderChain(env);
    const chain: OracleProvider[] = [];

    for (const kind of chainKinds) {
      const provider = buildProvider(kind, env);

      if (!provider) {
        console.error(`provider_unavailable kind=${kind}`);
      } else {
        chain.push(provider);
      }
    }

    if (chain.length === 0) {
      return configErrorResponse(request, env);
    }

    const first = chain[0] as OracleProvider;
    const provider: OracleProvider =
      chain.length === 1 ? first : createFallbackProvider(chain);

    return handleAsk(request, {
      provider,
      perIpLimiter: env.ORACLE_PER_IP_LIMITER,
      globalLimiter: env.ORACLE_GLOBAL_LIMITER,
      corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS ?? "",
    });
  },
};
