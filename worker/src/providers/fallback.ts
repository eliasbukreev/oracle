import type { OracleProvider, ProviderAnswer, TarotAskInput } from "../types";

export function createFallbackProvider(
  primary: OracleProvider,
  secondary: OracleProvider,
): OracleProvider {
  async function askTarot(input: TarotAskInput): Promise<ProviderAnswer> {
    const first = await primary.askTarot(input);

    if (first.ok) {
      return first;
    }

    console.warn(`provider_fallback from=${primary.name} to=${secondary.name}`);
    return secondary.askTarot(input);
  }

  return { name: `fallback(${primary.name}+${secondary.name})`, askTarot };
}
