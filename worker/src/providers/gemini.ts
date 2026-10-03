import { oraclePrompt, parseModelResponse } from "../oracle";
import type {
  FetchImpl,
  OracleProvider,
  OracleProviderConfig,
  OracleResponse,
} from "../types";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export const PROVIDER_GEMINI = "gemini";

/** Вытаскивает из исключения безопасную для логов строку.
 *  Ключ у Gemini живёт в query (`?key=`), поэтому на всякий случай
 *  затираем его значение: тексты сетевых ошибок его содержать не должны,
 *  но секрет дороже паранойи. */
function errorDetail(error: unknown): string {
  const type = error instanceof Error ? error.name : "unknown";
  const message =
    error instanceof Error ? error.message.slice(0, 300) : "unknown";
  return `type=${type} message=${message.replace(/key=[^&\s]*/g, "key=***")}`;
}

export class GeminiProvider implements OracleProvider {
  readonly name = PROVIDER_GEMINI;

  private readonly config: OracleProviderConfig;
  private readonly fetchImpl: FetchImpl;

  constructor(config: OracleProviderConfig, fetchImpl: FetchImpl = fetch) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async ask(question: string): Promise<OracleResponse | null> {
    const { apiKey, model, maxOutputTokens, temperature, timeoutMs } =
      this.config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const url = `${GEMINI_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      console.log(
        `gemini_request_started model=${model} question_length=${question.length}`,
      );

      const geminiResponse = await this.fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: oraclePrompt(question) }],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });

      if (!geminiResponse.ok) {
        const errorPayload = (await geminiResponse
          .json()
          .catch(() => null)) as {
          error?: { message?: string };
        } | null;
        console.error(
          `gemini_http_error status=${geminiResponse.status} message=${errorPayload?.error?.message?.slice(0, 300) ?? "unknown"}`,
        );
        return null;
      }

      const payload = await geminiResponse
        .json()
        .catch(() => null) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      } | null;

      if (!payload) {
        console.error("gemini_response_unreadable");
        return null;
      }

      const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      const result =
        typeof content === "string" ? parseModelResponse(content) : null;

      if (!result) {
        console.error("gemini_response_invalid");
        return null;
      }

      console.log("gemini_response_validated");
      return result;
    } catch (error) {
      console.error(`gemini_request_failed ${errorDetail(error)}`);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
