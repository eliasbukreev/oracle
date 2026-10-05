import type {
  FetchImpl,
  OracleProvider,
  OracleProviderConfig,
  ProviderAnswer,
  TarotAskInput,
} from "../types";
import { tarotPrompt } from "../tarot/prompt";
import { parseSpreadResponse } from "../tarot/validate";

interface ChatCompletionsPayload {
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
        type?: unknown;
        metadata?: unknown;
      };
      const parts: string[] = [];

      if (typeof record.code !== "undefined") {
        parts.push(`code=${String(record.code).slice(0, 20)}`);
      }

      if (typeof record.message === "string" && record.message) {
        parts.push(record.message.slice(0, 300));
      }

      if (typeof record.type === "string" && record.type) {
        parts.push(`type=${record.type.slice(0, 60)}`);
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

export function createOpenAIChatProvider(
  kind: string,
  url: string,
  config: OracleProviderConfig,
  fetchImpl: FetchImpl = fetch,
): OracleProvider {
  const { apiKey, model, maxOutputTokens, temperature, timeoutMs, imageBaseUrl } =
    config;

  async function askTarot(input: TarotAskInput): Promise<ProviderAnswer> {
    const { question, spread, drawnCards, variants } = input;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log(
        `${kind}_request_started model=${model} question_length=${question.length} cards=${drawnCards.map((c) => c.id).join(",")}`,
      );

      const apiResponse = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: tarotPrompt(question, drawnCards, spread, variants),
            },
          ],
          temperature,
          max_tokens: maxOutputTokens,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!apiResponse.ok) {
        // Тело читаем как текст: при блокировках оно бывает не-JSON,
        // и .json() просто уронил бы разбор в "unknown".
        const rawBody = await apiResponse.text().catch(() => "");
        console.error(
          `${kind}_http_error status=${apiResponse.status} message=${describeErrorBody(rawBody)}`,
        );
        return { ok: false, blocked: apiResponse.status === 403 };
      }

      const payload = (await apiResponse
        .json()
        .catch(() => null)) as ChatCompletionsPayload | null;

      if (!payload) {
        console.error(`${kind}_response_unreadable`);
        return { ok: false, blocked: false };
      }

      const content = payload.choices?.[0]?.message?.content;
      const parsed =
        typeof content === "string"
          ? parseSpreadResponse(content, drawnCards, spread, imageBaseUrl)
          : null;

      if (!parsed) {
        console.error(`${kind}_response_invalid`);
        return { ok: false, blocked: false };
      }

      console.log(`${kind}_response_validated`);
      // spread/variants — эхо входа workflow, модель их не возвращает.
      return {
        ok: true,
        response: {
          spread: spread.id,
          cards: parsed.cards,
          summary: parsed.summary,
          backImageUrl: parsed.backImageUrl,
          ...(variants ? { variants } : {}),
        },
      };
    } catch (error) {
      console.error(`${kind}_request_failed ${errorDetail(error)}`);
      return { ok: false, blocked: false };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { name: kind, askTarot };
}
