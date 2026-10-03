import type { FetchImpl, OracleProvider, OracleProviderConfig } from "../types";
import { createOpenAIChatProvider } from "./openaiCompatible";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const PROVIDER_OPENROUTER = "openrouter";

export function createOpenRouterProvider(
  config: OracleProviderConfig,
  fetchImpl?: FetchImpl,
): OracleProvider {
  return createOpenAIChatProvider(
    PROVIDER_OPENROUTER,
    OPENROUTER_URL,
    config,
    fetchImpl,
  );
}
