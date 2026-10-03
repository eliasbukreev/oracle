import { isRateLimited, jsonResponse } from "./http";
import { parseQuestion } from "./oracle";
import type { OracleDeps } from "./types";

export const RATE_LIMIT_WINDOW_SECONDS = 60;

function respond(
  request: Request,
  deps: OracleDeps,
  status: number,
  payload: unknown,
  extraHeaders?: Record<string, string>,
): Response {
  return jsonResponse(
    request,
    deps.corsAllowedOrigins,
    status,
    payload,
    extraHeaders,
  );
}

export async function handleAsk(
  request: Request,
  deps: OracleDeps,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return respond(request, deps, 204, null);
  }

  if (request.method !== "POST") {
    return respond(request, deps, 405, { error: "invalid_request" });
  }

  let limitedScope;

  try {
    limitedScope = await isRateLimited(request, deps);
  } catch (error) {
    console.error(
      `rate_limit_error type=${error instanceof Error ? error.name : "unknown"}`,
    );
    return respond(request, deps, 502, { error: "oracle_unavailable" });
  }

  if (limitedScope) {
    console.warn(`rate_limited scope=${limitedScope}`);
    return respond(
      request,
      deps,
      429,
      { error: "oracle_resting", retry_after: RATE_LIMIT_WINDOW_SECONDS },
      { "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS) },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return respond(request, deps, 400, { error: "invalid_request" });
  }

  const question = parseQuestion(payload);

  if (!question) {
    return respond(request, deps, 400, { error: "invalid_request" });
  }

  const result = await deps.provider.ask(question);
  return result
    ? respond(request, deps, 200, result)
    : respond(request, deps, 502, { error: "oracle_unavailable" });
}
