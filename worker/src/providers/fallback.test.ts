import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OracleProvider, ProviderAnswer } from "../types";
import { createFallbackProvider } from "./fallback";

const ANSWER: ProviderAnswer = {
  ok: true,
  response: {
    verdict: "ДА",
    confidence: 87,
    prophecy: "Путь тернист, но цель близка.",
    reason: "Звёзды благоволят смелым.",
  },
};

function stubProvider(answer: ProviderAnswer, name = "stub"): OracleProvider {
  return { name, ask: async () => answer };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FallbackProvider", () => {
  it("возвращает ответ primary и не трогает secondary", async () => {
    const secondaryAsk = vi.fn(async () => ANSWER);
    const provider = createFallbackProvider(stubProvider(ANSWER, "primary"), {
      name: "secondary",
      ask: secondaryAsk,
    });

    expect(provider.name).toBe("fallback(primary+secondary)");
    await expect(provider.ask("Учить ли Rust?")).resolves.toEqual(ANSWER);
    expect(secondaryAsk).not.toHaveBeenCalled();
  });

  it("при пустом ответе primary спрашивает secondary тем же вопросом", async () => {
    const secondaryAsk = vi.fn(async () => ANSWER);
    const provider = createFallbackProvider(
      stubProvider({ ok: false, blocked: false }, "primary"),
      { name: "secondary", ask: secondaryAsk },
    );

    await expect(provider.ask("Учить ли Rust?")).resolves.toEqual(ANSWER);
    expect(secondaryAsk).toHaveBeenCalledWith("Учить ли Rust?");
  });

  it("при запрете primary пробует secondary", async () => {
    const secondaryAsk = vi.fn(async () => ANSWER);
    const provider = createFallbackProvider(
      stubProvider({ ok: false, blocked: true }, "primary"),
      { name: "secondary", ask: secondaryAsk },
    );

    await expect(provider.ask("Учить ли Rust?")).resolves.toEqual(ANSWER);
    expect(secondaryAsk).toHaveBeenCalledWith("Учить ли Rust?");
  });

  it("пробрасывает запрет когда пусты оба провайдера", async () => {
    const provider = createFallbackProvider(
      stubProvider({ ok: false, blocked: true }, "primary"),
      stubProvider({ ok: false, blocked: true }, "secondary"),
    );
    await expect(provider.ask("Учить ли Rust?")).resolves.toEqual({
      ok: false,
      blocked: true,
    });
  });

  it("возвращает null-эквивалент когда оба недоступны", async () => {
    const provider = createFallbackProvider(
      stubProvider({ ok: false, blocked: false }, "primary"),
      stubProvider({ ok: false, blocked: false }, "secondary"),
    );
    await expect(provider.ask("Учить ли Rust?")).resolves.toEqual({
      ok: false,
      blocked: false,
    });
  });
});
