import {
  OracleErrorCodeSchema,
  TarotResponseSchema,
} from "@oracle/shared";
import type { OracleErrorCode, TarotResponse } from "~/types/oracle";

const ASK_TIMEOUT_MS = 40000;

type ApiErrorResponse = {
  error?: unknown;
  retry_after?: unknown;
};

export class OracleRequestError extends Error {
  code: OracleErrorCode;
  retryAfter?: number;

  constructor(code: OracleErrorCode, retryAfter?: number) {
    super(code);
    this.name = "OracleRequestError";
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function parseRetryAfter(
  payload: unknown,
  response: Response,
): number | undefined {
  if (payload && typeof payload === "object") {
    const raw = (payload as ApiErrorResponse).retry_after;

    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
      return Math.floor(raw);
    }
  }

  const header = response.headers.get("Retry-After");

  if (header !== null) {
    const parsed = Number.parseInt(header, 10);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return undefined;
}

function isTarotResponse(value: unknown): value is TarotResponse {
  return TarotResponseSchema.safeParse(value).success;
}

function isOracleErrorCode(value: unknown): value is OracleErrorCode {
  return OracleErrorCodeSchema.safeParse(value).success;
}

function errorCodeFromStatus(status: number): OracleErrorCode {
  if (status === 400) return "invalid_request";
  if (status === 401) return "invalid_client";
  if (status === 403) return "blocked";
  if (status === 429) return "oracle_resting";
  if (status === 502) return "oracle_unavailable";
  return "internal_error";
}

export async function askOracle(
  question: string,
  apiUrl: string,
  timeoutMs: number = ASK_TIMEOUT_MS,
): Promise<TarotResponse> {
  if (!apiUrl) {
    throw new OracleRequestError("internal_error");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;

  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
  } catch {
    throw new OracleRequestError("blocked");
  } finally {
    clearTimeout(timeoutId);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new OracleRequestError("oracle_unavailable");
  }

  if (!response.ok) {
    const apiError =
      payload && typeof payload === "object"
        ? (payload as ApiErrorResponse)
        : {};
    const code = isOracleErrorCode(apiError.error)
      ? apiError.error
      : errorCodeFromStatus(response.status);
    const retryAfter =
      response.status === 429 ? parseRetryAfter(payload, response) : undefined;

    throw new OracleRequestError(code, retryAfter);
  }

  if (!isTarotResponse(payload)) {
    throw new OracleRequestError("oracle_unavailable");
  }

  return payload;
}
