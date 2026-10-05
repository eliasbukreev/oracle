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
  return { name, askTarot: async () => answer, classify: async () => null };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FallbackProvider", () => {
  it("бросает на цепочке короче двух", () => {
    expect(() => createFallbackProvider([])).toThrow(/too_short/);
    expect(() => createFallbackProvider([stubProvider(ANSWER)])).toThrow(
      /too_short/,
    );
  });

  it("возвращает ответ primary и не трогает остальных", async () => {
    const secondAsk = vi.fn(async () => ANSWER);
    const thirdAsk = vi.fn(async () => ANSWER);
    const provider = createFallbackProvider([
      stubProvider(ANSWER, "primary"),
      { name: "second", askTarot: secondAsk, classify: async () => null },
      { name: "third", askTarot: thirdAsk, classify: async () => null },
    ]);

    expect(provider.name).toBe("fallback(primary+second+third)");
    await expect(provider.askTarot(INPUT)).resolves.toEqual(ANSWER);
    expect(secondAsk).not.toHaveBeenCalled();
    expect(thirdAsk).not.toHaveBeenCalled();
  });

  it("идёт по цепочке до первого успеха тем же входом", async () => {
    const thirdAsk = vi.fn(async () => ANSWER);
    const provider = createFallbackProvider([
      stubProvider({ ok: false, blocked: false }, "primary"),
      stubProvider({ ok: false, blocked: true }, "second"),
      { name: "third", askTarot: thirdAsk, classify: async () => null },
    ]);

    await expect(provider.askTarot(INPUT)).resolves.toEqual(ANSWER);
    expect(thirdAsk).toHaveBeenCalledWith(INPUT);
  });

  it("blocked только когда упёрлись все", async () => {
    const allBlocked = createFallbackProvider([
      stubProvider({ ok: false, blocked: true }, "a"),
      stubProvider({ ok: false, blocked: true }, "b"),
    ]);
    await expect(allBlocked.askTarot(INPUT)).resolves.toEqual({
      ok: false,
      blocked: true,
    });
  });

  it("точечный запрет не маскируется под системный", async () => {
    const mixed = createFallbackProvider([
      stubProvider({ ok: false, blocked: true }, "a"),
      stubProvider({ ok: false, blocked: false }, "b"),
    ]);
    await expect(mixed.askTarot(INPUT)).resolves.toEqual({
      ok: false,
      blocked: false,
    });
  });

  it("classify: берёт ответ primary", async () => {
    const classified = { spread: SPREADS.relations };
    const provider = createFallbackProvider([
      {
        name: "primary",
        askTarot: async () => ANSWER,
        classify: async () => classified,
      },
      stubProvider(ANSWER, "secondary"),
    ]);
    await expect(provider.classify("Любит ли меня?")).resolves.toEqual(
      classified,
    );
  });

  it("classify: идёт по цепочке до первого ответа", async () => {
    const classified = { spread: SPREADS.choice };
    const thirdClassify = vi.fn(async () => classified);
    const provider = createFallbackProvider([
      stubProvider(ANSWER, "primary"),
      stubProvider(ANSWER, "second"),
      {
        name: "third",
        askTarot: async () => ANSWER,
        classify: thirdClassify,
      },
    ]);
    await expect(provider.classify("Что выбрать?")).resolves.toEqual(
      classified,
    );
    expect(thirdClassify).toHaveBeenCalledWith("Что выбрать?");
  });

  it("classify: null когда пусты все", async () => {
    const provider = createFallbackProvider([
      stubProvider(ANSWER, "primary"),
      stubProvider(ANSWER, "secondary"),
    ]);
    await expect(provider.classify("Учить ли Rust?")).resolves.toBeNull();
  });
});
