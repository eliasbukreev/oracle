import { oraclePrompt, parseModelResponse } from "../oracle";
import type {
  FetchImpl,
  OracleProvider,
  OracleProviderConfig,
  OracleResponse,
} from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const PROVIDER_OPENROUTER = "openrouter";

interface OpenRouterErrorPayload {
  error?: {
    code?: unknown;
    message?: unknown;
  };
}

interface OpenRouterCompletionsPayload {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

function errorMessage(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const message = (payload as OpenRouterErrorPayload).error?.message;
    if (typeof message === "string" && message) {
      return message.slice(0, 300);
    }
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
        const errorPayload: unknown = await openRouterResponse
          .json()
          .catch(() => null);
        console.error(
          `openrouter_http_error status=${openRouterResponse.status} message=${errorMessage(errorPayload)}`,
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
