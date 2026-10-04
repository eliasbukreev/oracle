import type { FetchImpl, OracleProvider, OracleProviderConfig } from "../types";
import { createOpenAIChatProvider } from "./openaiCompatible";

const ORCA_URL = "https://api.orcarouter.ai/v1/chat/completions";

export const PROVIDER_ORCA = "orca";

export function createOrcaProvider(
  config: OracleProviderConfig,
  fetchImpl?: FetchImpl,
): OracleProvider {
  return createOpenAIChatProvider(PROVIDER_ORCA, ORCA_URL, config, fetchImpl);
}
