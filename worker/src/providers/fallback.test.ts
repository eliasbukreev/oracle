import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OracleProvider, ProviderAnswer, TarotAskInput } from "../types";
import { SPREADS } from "../tarot/spreads";
import { createFallbackProvider } from "./fallback";

const ANSWER: ProviderAnswer = {
  ok: true,
  response: {
    spread: "classic",
    cards: [
      {
        id: "the-fool",
        name: "Шут",
        position: "past",
        orientation: "upright",
        meaning: "Начало.",
        imageUrl: "",
      },
      {
        id: "the-magician",
        name: "Маг",
        position: "present",
        orientation: "reversed",
        meaning: "Сила.",
        imageUrl: "",
      },
      {
        id: "the-high-priestess",
        name: "Верховная Жрица",
        position: "future",
        orientation: "upright",
        meaning: "Тайна.",
        imageUrl: "",
      },
    ],
    summary: "Итог.",
    backImageUrl: "",
  },
};

const INPUT: TarotAskInput = {
  question: "Учить ли Rust?",
  spread: SPREADS.classic,
  drawnCards: [
    { id: "the-fool", name: "Шут", position: "past", orientation: "upright" },
    {
      id: "the-magician",
      name: "Маг",
      position: "present",
      orientation: "reversed",
    },
    {
      id: "the-high-priestess",
      name: "Верховная Жрица",
      position: "future",
      orientation: "upright",
    },
  ],
};

function stubProvider(answer: ProviderAnswer, name = "stub"): OracleProvider {
  return { name, askTarot: async () => answer };
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
      askTarot: secondaryAsk,
    });

    expect(provider.name).toBe("fallback(primary+secondary)");
    await expect(provider.askTarot(INPUT)).resolves.toEqual(ANSWER);
    expect(secondaryAsk).not.toHaveBeenCalled();
  });

  it("при пустом ответе primary спрашивает secondary тем же входом", async () => {
    const secondaryAsk = vi.fn(async () => ANSWER);
    const provider = createFallbackProvider(
      stubProvider({ ok: false, blocked: false }, "primary"),
      { name: "secondary", askTarot: secondaryAsk },
    );

    await expect(provider.askTarot(INPUT)).resolves.toEqual(ANSWER);
    expect(secondaryAsk).toHaveBeenCalledWith(INPUT);
  });

  it("при запрете primary пробует secondary", async () => {
    const secondaryAsk = vi.fn(async () => ANSWER);
    const provider = createFallbackProvider(
      stubProvider({ ok: false, blocked: true }, "primary"),
      { name: "secondary", askTarot: secondaryAsk },
    );

    await expect(provider.askTarot(INPUT)).resolves.toEqual(ANSWER);
    expect(secondaryAsk).toHaveBeenCalledWith(INPUT);
  });

  it("пробрасывает запрет когда пусты оба провайдера", async () => {
    const provider = createFallbackProvider(
      stubProvider({ ok: false, blocked: true }, "primary"),
      stubProvider({ ok: false, blocked: true }, "secondary"),
    );
    await expect(provider.askTarot(INPUT)).resolves.toEqual({
      ok: false,
      blocked: true,
    });
  });

  it("возвращает null-эквивалент когда оба недоступны", async () => {
    const provider = createFallbackProvider(
      stubProvider({ ok: false, blocked: false }, "primary"),
      stubProvider({ ok: false, blocked: false }, "secondary"),
    );
    await expect(provider.askTarot(INPUT)).resolves.toEqual({
      ok: false,
      blocked: false,
    });
  });
});
