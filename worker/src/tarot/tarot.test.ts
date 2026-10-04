import { describe, expect, it } from "vitest";
import type { DrawnCard } from "../types";
import { MAJOR_ARCANA, deckCardById, isDeckId } from "./deck";
import { POSITION_LABELS_RU, SPREAD_POSITIONS, drawThreeCards } from "./draw";
import { tarotPrompt } from "./prompt";
import { isTarotResponse, parseSpreadResponse } from "./validate";
import { runTarotWorkflow } from "./workflow";

const DRAWN: DrawnCard[] = [
  { id: "the-fool", name: "Шут", position: "past" },
  { id: "the-magician", name: "Маг", position: "present" },
  { id: "the-high-priestess", name: "Верховная Жрица", position: "future" },
];

function llmJson(): string {
  return JSON.stringify({
    cards: [
      { id: "the-fool", position: "past", meaning: "Начало позади." },
      { id: "the-magician", position: "present", meaning: "Сила в руках." },
      { id: "the-high-priestess", position: "future", meaning: "Тайна рядом." },
    ],
    summary: "Итог расклада.",
  });
}

describe("deck", () => {
  it("содержит 22 уникальных Старших Аркана", () => {
    expect(MAJOR_ARCANA).toHaveLength(22);
    expect(new Set(MAJOR_ARCANA.map((c) => c.id)).size).toBe(22);
  });

  it("находит карту по id", () => {
    expect(deckCardById("the-fool")?.nameRu).toBe("Шут");
    expect(deckCardById("nope")).toBeUndefined();
    expect(isDeckId("the-sun")).toBe(true);
    expect(isDeckId("nope")).toBe(false);
  });
});

describe("draw", () => {
  it("тянет 3 уникальные карты с позициями past/present/future", () => {
    const drawn = drawThreeCards(() => 0);
    expect(drawn).toHaveLength(3);
    expect(drawn.map((c) => c.position)).toEqual([
      "past",
      "present",
      "future",
    ]);
    expect(new Set(drawn.map((c) => c.id)).size).toBe(3);
  });

  it("детерминирован с фиксированным rand", () => {
    expect(drawThreeCards(() => 0)).toEqual(drawThreeCards(() => 0));
  });

  it("разный rand даёт разный порядок", () => {
    const a = drawThreeCards(() => 0);
    const b = drawThreeCards(() => 0.9999);
    expect(a).not.toEqual(b);
  });

  it("позиции покрыты подписями", () => {
    for (const p of SPREAD_POSITIONS) {
      expect(POSITION_LABELS_RU[p]).toBeTruthy();
    }
  });
});

describe("tarotPrompt", () => {
  it("включает вопрос и все вытянутые id", () => {
    const prompt = tarotPrompt("Учить ли Rust?", DRAWN);
    expect(prompt).toContain("Учить ли Rust?");
    expect(prompt).toContain("the-fool");
    expect(prompt).toContain("the-magician");
    expect(prompt).toContain("the-high-priestess");
    expect(prompt).toContain("JSON");
  });
});

describe("parseSpreadResponse", () => {
  it("парсит корректный расклад и берёт имена из канона", () => {
    const result = parseSpreadResponse(llmJson(), DRAWN);
    expect(result).toMatchObject({
      cards: [
        { id: "the-fool", name: "Шут", position: "past", meaning: "Начало позади." },
        { id: "the-magician", name: "Маг", position: "present", meaning: "Сила в руках." },
        {
          id: "the-high-priestess",
          name: "Верховная Жрица",
          position: "future",
          meaning: "Тайна рядом.",
        },
      ],
      summary: "Итог расклада.",
    });
  });

  it("снимает markdown-обёртку", () => {
    expect(parseSpreadResponse(`\`\`\`json\n${llmJson()}\n\`\`\``, DRAWN))
      .not.toBeNull();
  });

  it("отклоняет подмену id", () => {
    const bad = JSON.stringify({
      cards: [
        { id: "death", position: "past", meaning: "x" },
        { id: "the-magician", position: "present", meaning: "y" },
        { id: "the-high-priestess", position: "future", meaning: "z" },
      ],
      summary: "s",
    });
    expect(parseSpreadResponse(bad, DRAWN)).toBeNull();
  });

  it("отклоняет перестановку позиций", () => {
    const bad = JSON.stringify({
      cards: [
        { id: "the-fool", position: "future", meaning: "x" },
        { id: "the-magician", position: "present", meaning: "y" },
        { id: "the-high-priestess", position: "past", meaning: "z" },
      ],
      summary: "s",
    });
    expect(parseSpreadResponse(bad, DRAWN)).toBeNull();
  });

  it("отклоняет неверное число карт и мусор", () => {
    expect(parseSpreadResponse("не json", DRAWN)).toBeNull();
    expect(
      parseSpreadResponse(JSON.stringify({ cards: [], summary: "s" }), DRAWN),
    ).toBeNull();
  });
});

describe("isTarotResponse", () => {
  it("принимает корректный ответ API", () => {
    expect(
      isTarotResponse({
        cards: [
          { id: "a", name: "А", position: "past", meaning: "x" },
          { id: "b", name: "Б", position: "present", meaning: "y" },
          { id: "c", name: "В", position: "future", meaning: "z" },
        ],
        summary: "s",
      }),
    ).toBe(true);
  });

  it("отклоняет неверную форму", () => {
    expect(isTarotResponse(null)).toBe(false);
    expect(isTarotResponse({ cards: [], summary: "s" })).toBe(false);
  });
});

describe("runTarotWorkflow", () => {
  it("возвращает invalid_request на плохом вопросе без вызова провайдера", async () => {
    let called = false;
    const result = await runTarotWorkflow(
      { question: "   " },
      {
        provider: {
          name: "stub",
          askTarot: async () => {
            called = true;
            return { ok: false, blocked: false };
          },
        },
      },
    );
    expect(result).toEqual({
      ok: false,
      blocked: false,
      error: "invalid_request",
    });
    expect(called).toBe(false);
  });

  it("прокидывает вопрос и вытянутые карты в провайдер", async () => {
    let seen: unknown;
    const provider = {
      name: "stub",
      askTarot: async (input: {
        question: string;
        drawnCards: DrawnCard[];
      }) => {
        seen = input;
        return {
          ok: true as const,
          response: { cards: [], summary: "ok" },
        };
      },
    };
    const result = await runTarotWorkflow(
      { question: "  Учить ли Rust?  " },
      { provider, randomFn: () => 0 },
    );
    expect(result.ok).toBe(true);
    expect(seen).toMatchObject({ question: "Учить ли Rust?" });
    expect((seen as { drawnCards: DrawnCard[] }).drawnCards).toHaveLength(3);
  });
});
