// Общие фикстуры для тестов провайдеров. Не *.test.ts,
// поэтому vitest не запускает файл как сьют.
import { createProviderConfig } from "../providers";
import type { FetchImpl, OracleProviderConfig } from "../types";

export const VALID_ORACLE_JSON = JSON.stringify({
  verdict: "ДА",
  confidence: 87,
  prophecy: "Путь тернист, но цель близка.",
  reason: "Звёзды благоволят смелым.",
});

export const VALID_RAW = {
  apiKey: "test-key",
  model: "test-model",
  maxOutputTokens: "800",
  temperature: "0.8",
  timeoutSeconds: "20",
};

export function validConfig(): OracleProviderConfig {
  const config = createProviderConfig(VALID_RAW);
  if (!config) throw new Error("valid config expected");
  return config;
}

export function fakeFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): FetchImpl {
  return ((input: string | URL | Request, init?: RequestInit) => {
    const result = handler(String(input), init);
    return Promise.resolve(result);
  }) as FetchImpl;
}
