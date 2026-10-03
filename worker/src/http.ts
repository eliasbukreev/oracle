import type { RateLimiter } from "./types";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

export function parseAllowedOrigins(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function corsHeaders(request: Request, allowed: Set<string>): Headers {
  const headers = new Headers(JSON_HEADERS);
  const origin = request.headers.get("Origin");

  if (origin && (allowed.has("*") || allowed.has(origin))) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Vary", "Origin");
  return headers;
}

export function jsonResponse(
  request: Request,
  corsAllowedOrigins: string,
  status: number,
  payload: unknown,
  extraHeaders?: Record<string, string>,
): Response {
  const headers = corsHeaders(request, parseAllowedOrigins(corsAllowedOrigins));

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

export function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown";
}

export type RateLimitScope = "per_ip" | "global";

export interface RateLimitBindings {
  perIpLimiter?: RateLimiter;
  globalLimiter?: RateLimiter;
}

export async function isRateLimited(
  request: Request,
  bindings: RateLimitBindings,
): Promise<RateLimitScope | null> {
  if (bindings.perIpLimiter) {
    const { success } = await bindings.perIpLimiter.limit({
      key: clientIp(request),
    });

    if (!success) {
      return "per_ip";
    }
  }

  if (bindings.globalLimiter) {
    const { success } = await bindings.globalLimiter.limit({
      key: "global",
    });

    if (!success) {
      return "global";
    }
  }

  if (!bindings.perIpLimiter && !bindings.globalLimiter) {
    console.warn("rate_limit_skipped reason=no_binding");
  }

  return null;
}
