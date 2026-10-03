import type { OracleProvider, OracleResponse } from "../types";

// Композитный провайдер: при пустом ответе primary спрашивает secondary.
export class FallbackProvider implements OracleProvider {
  readonly name: string;

  private readonly primary: OracleProvider;
  private readonly secondary: OracleProvider;

  constructor(primary: OracleProvider, secondary: OracleProvider) {
    this.primary = primary;
    this.secondary = secondary;
    this.name = `fallback(${primary.name}+${secondary.name})`;
  }

  async ask(question: string): Promise<OracleResponse | null> {
    const first = await this.primary.ask(question);

    if (first) {
      return first;
    }

    console.warn(
      `provider_fallback from=${this.primary.name} to=${this.secondary.name}`,
    );
    return this.secondary.ask(question);
  }
}
