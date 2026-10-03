import { oraclePrompt, parseModelResponse } from "./oracle";
import type {
  FetchImpl,
  OracleProvider,
  OracleProviderConfig,
  OracleResponse,
} from "./types";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_TIMEOUT_MS = 20_000;

export const PROVIDER_GEMINI = "gemini";
export const DEFAULT_PROVIDER = PROVIDER_GEMINI;

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

      const payload = (await geminiResponse.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
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
      console.error(
        `gemini_request_failed type=${error instanceof Error ? error.name : "unknown"}`,
      );
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export function createProvider(
  kind: string,
  config: OracleProviderConfig,
  fetchImpl?: FetchImpl,
): OracleProvider {
  if (kind === PROVIDER_GEMINI) {
    return new GeminiProvider(config, fetchImpl);
  }

  throw new Error(`unknown_oracle_provider kind=${kind}`);
}

export interface RawProviderConfig {
  apiKey: string;
  model: string;
  maxOutputTokens: string;
  temperature: string;
  /** Таймаут в секундах строкой, как в env. */
  timeoutSeconds: string;
}

export function createProviderConfig(
  raw: RawProviderConfig,
): OracleProviderConfig | null {
  const apiKey = raw.apiKey.trim();
  const model = raw.model.trim();
  const maxOutputTokens = Number.parseInt(raw.maxOutputTokens, 10);
  const temperature = Number.parseFloat(raw.temperature);
  const timeoutSeconds = Number.parseInt(raw.timeoutSeconds, 10);

  if (
    !model ||
    !apiKey ||
    !Number.isFinite(maxOutputTokens) ||
    !Number.isFinite(temperature)
  ) {
    console.error("provider_config_invalid");
    return null;
  }

  return {
    apiKey,
    model,
    maxOutputTokens,
    temperature,
    timeoutMs: Number.isFinite(timeoutSeconds)
      ? timeoutSeconds * 1000
      : DEFAULT_TIMEOUT_MS,
  };
}
