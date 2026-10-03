import type { OracleErrorCode, OracleResponse } from "~/types/oracle";

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

function isOracleResponse(value: unknown): value is OracleResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Record<string, unknown>;

  return (
    typeof response.verdict === "string" &&
    response.verdict.length > 0 &&
    typeof response.confidence === "number" &&
    response.confidence >= 0 &&
    response.confidence <= 100 &&
    typeof response.prophecy === "string" &&
    response.prophecy.length > 0 &&
    typeof response.reason === "string" &&
    response.reason.length > 0
  );
}

function isOracleErrorCode(value: unknown): value is OracleErrorCode {
  return (
    value === "invalid_request" ||
    value === "invalid_client" ||
    value === "oracle_resting" ||
    value === "oracle_unavailable" ||
    value === "internal_error"
  );
}

function errorCodeFromStatus(status: number): OracleErrorCode {
  if (status === 400) return "invalid_request";
  if (status === 401) return "invalid_client";
  if (status === 429) return "oracle_resting";
  if (status === 502) return "oracle_unavailable";
  return "internal_error";
}

export async function askOracle(
  question: string,
  apiUrl: string,
): Promise<OracleResponse> {
  if (!apiUrl) {
    throw new OracleRequestError("internal_error");
  }

  let response: Response;

  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });
  } catch {
    throw new OracleRequestError("oracle_unavailable");
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

  if (!isOracleResponse(payload)) {
    throw new OracleRequestError("oracle_unavailable");
  }

  return payload;
}
