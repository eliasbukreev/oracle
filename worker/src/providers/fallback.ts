import type { OracleProvider, ProviderAnswer } from "../types";

export function createFallbackProvider(
  primary: OracleProvider,
  secondary: OracleProvider,
): OracleProvider {
  async function ask(question: string): Promise<ProviderAnswer> {
    const first = await primary.ask(question);

    if (first.ok) {
      return first;
    }

    console.warn(`provider_fallback from=${primary.name} to=${secondary.name}`);
    return secondary.ask(question);
  }

  return { name: `fallback(${primary.name}+${secondary.name})`, ask };
}
