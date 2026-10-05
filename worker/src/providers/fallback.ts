import type {
  Classification,
  OracleProvider,
  ProviderAnswer,
  TarotAskInput,
} from "../types";

export function createFallbackProvider(
  providers: OracleProvider[],
): OracleProvider {
  if (providers.length < 2) {
    throw new Error(`fallback_chain_too_short length=${providers.length}`);
  }

  const names = providers.map((p) => p.name).join("+");

  async function askTarot(input: TarotAskInput): Promise<ProviderAnswer> {
    let blocked = true;

    for (const provider of providers) {
      const answer = await provider.askTarot(input);

      if (answer.ok) {
        return answer;
      }

      blocked = blocked && answer.blocked;
      console.warn(
        `provider_fallback from=${provider.name} chain=${names} blocked=${answer.blocked}`,
      );
    }

    return { ok: false, blocked };
  }

  async function classify(question: string): Promise<Classification | null> {
    for (const provider of providers) {
      const result = await provider.classify(question);
      if (result) return result;

      console.warn(
        `provider_classify_fallback from=${provider.name} chain=${names}`,
      );
    }

    return null;
  }

  return { name: `fallback(${names})`, askTarot, classify };
}
