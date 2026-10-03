import { oraclePrompt, parseModelResponse } from "../oracle";
import type {
  FetchImpl,
  OracleProvider,
  OracleProviderConfig,
  OracleResponse,
} from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const PROVIDER_OPENROUTER = "openrouter";

interface OpenRouterCompletionsPayload {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

function describeErrorBody(rawBody: string): string {
  let payload: unknown = null;

  try {
    payload = rawBody ? (JSON.parse(rawBody) as unknown) : null;
  } catch {
    payload = null;
  }

  if (payload && typeof payload === "object") {
    const err = (payload as { error?: unknown }).error;

    if (typeof err === "string" && err) {
      return err.slice(0, 300);
    }

    if (err && typeof err === "object") {
      const record = err as {
        code?: unknown;
        message?: unknown;
        metadata?: unknown;
      };
      const parts: string[] = [];

      if (typeof record.code !== "undefined") {
        parts.push(`code=${String(record.code).slice(0, 20)}`);
      }

      if (typeof record.message === "string" && record.message) {
        parts.push(record.message.slice(0, 300));
      }

      const errorType =
        record.metadata && typeof record.metadata === "object"
          ? (record.metadata as { error_type?: unknown }).error_type
          : undefined;

      if (typeof errorType === "string" && errorType) {
        parts.push(`type=${errorType.slice(0, 60)}`);
      }

      if (parts.length > 0) {
        return parts.join(" ");
      }
    }
  }

  if (rawBody) {
    return rawBody.slice(0, 200);
  }

  return "unknown";
}

function errorDetail(error: unknown): string {
  const type = error instanceof Error ? error.name : "unknown";
  const message =
    error instanceof Error ? error.message.slice(0, 300) : "unknown";
  return `type=${type} message=${message}`;
}

export function createOpenRouterProvider(
  config: OracleProviderConfig,
  fetchImpl: FetchImpl = fetch,
): OracleProvider {
  const { apiKey, model, maxOutputTokens, temperature, timeoutMs } = config;

  async function ask(question: string): Promise<OracleResponse | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log(
        `openrouter_request_started model=${model} question_length=${question.length}`,
      );

      const openRouterResponse = await fetchImpl(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: oraclePrompt(question) }],
          temperature,
          max_tokens: maxOutputTokens,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!openRouterResponse.ok) {
        const rawBody = await openRouterResponse.text().catch(() => "");
        console.error(
          `openrouter_http_error status=${openRouterResponse.status} message=${describeErrorBody(rawBody)}`,
        );
        return null;
      }

      const payload = (await openRouterResponse
        .json()
        .catch(() => null)) as OpenRouterCompletionsPayload | null;

      if (!payload) {
        console.error("openrouter_response_unreadable");
        return null;
      }

      const content = payload.choices?.[0]?.message?.content;
      const result =
        typeof content === "string" ? parseModelResponse(content) : null;

      if (!result) {
        console.error("openrouter_response_invalid");
        return null;
      }

      console.log("openrouter_response_validated");
      return result;
    } catch (error) {
      console.error(`openrouter_request_failed ${errorDetail(error)}`);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { name: PROVIDER_OPENROUTER, ask };
}
