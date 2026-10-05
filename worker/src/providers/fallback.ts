import type {
  Classification,
  OracleProvider,
  ProviderAnswer,
  TarotAskInput,
} from "../types";

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

  async function classify(question: string): Promise<Classification | null> {
    // Классификация дешёвая: при сбое primary пробуем secondary,
    // итоговая неудача — null, workflow возьмёт classic.
    const first = await primary.classify(question);
    if (first) return first;

    console.warn(
      `provider_classify_fallback from=${primary.name} to=${secondary.name}`,
    );
    return secondary.classify(question);
  }

  return {
    name: `fallback(${primary.name}+${secondary.name})`,
    askTarot,
    classify,
  };
}
