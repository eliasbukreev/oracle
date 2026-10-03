import type { FetchImpl, OracleProvider, OracleProviderConfig } from "../types";
import { createOpenAIChatProvider } from "./openaiCompatible";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const PROVIDER_GROQ = "groq";

export function createGroqProvider(
  config: OracleProviderConfig,
  fetchImpl?: FetchImpl,
): OracleProvider {
  return createOpenAIChatProvider(PROVIDER_GROQ, GROQ_URL, config, fetchImpl);
}
