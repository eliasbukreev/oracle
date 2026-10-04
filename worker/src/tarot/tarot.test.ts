import { describe, expect, it } from "vitest";
import type { DrawnCard } from "../types";
import { FULL_DECK, MAJOR_ARCANA, deckCardById, isDeckId } from "./deck";
import {
  ORIENTATION_LABELS_RU,
  POSITION_LABELS_RU,
  SPREAD_POSITIONS,
  drawThreeCards,
} from "./draw";
import { tarotPrompt } from "./prompt";
import { isTarotResponse, parseSpreadResponse } from "./validate";
import { runTarotWorkflow } from "./workflow";

const DRAWN: DrawnCard[] = [
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
];

function llmJson(): string {
  return JSON.stringify({
    cards: [
      {
        id: "the-fool",
        position: "past",
        orientation: "upright",
        meaning: "Начало позади.",
      },
      {
        id: "the-magician",
        position: "present",
        orientation: "reversed",
        meaning: "Сила в руках, но не твоих.",
      },
      {
        id: "the-high-priestess",
        position: "future",
        orientation: "upright",
        meaning: "Тайна рядом.",
      },
    ],
    summary: "Итог расклада.",
  });
}

describe("deck", () => {
  it("содержит 78 карт: 22 старших и 56 младших", () => {
    expect(FULL_DECK).toHaveLength(78);
    expect(MAJOR_ARCANA).toHaveLength(22);
    expect(FULL_DECK.filter((c) => c.arcana === "minor")).toHaveLength(56);
    expect(new Set(FULL_DECK.map((c) => c.id)).size).toBe(78);
  });

  it("каждая карта имеет русские имя и значения плюс файл изображения", () => {
    for (const card of FULL_DECK) {
      expect(card.nameRu.trim().length).toBeGreaterThan(0);
      expect(card.meaningUp.trim().length).toBeGreaterThan(0);
      expect(card.meaningRev.trim().length).toBeGreaterThan(0);
      expect(card.image.endsWith(".png")).toBe(true);
    }
  });

  it("младшие арканы покрывают 4 масти по 14 карт", () => {
    const minors = FULL_DECK.filter((c) => c.arcana === "minor");
    for (const suit of ["wands", "cups", "pentacles", "swords"] as const) {
      expect(minors.filter((c) => c.suit === suit)).toHaveLength(14);
    }
  });

  it("находит карту по id", () => {
    expect(deckCardById("the-fool")?.nameRu).toBe("Шут");
    expect(deckCardById("ace-of-wands")?.nameRu).toBe("Туз Жезлов");
    expect(deckCardById("king-of-swords")?.nameRu).toBe("Король Мечей");
    expect(deckCardById("nope")).toBeUndefined();
    expect(isDeckId("the-sun")).toBe(true);
    expect(isDeckId("nope")).toBe(false);
  });
});

describe("draw", () => {
  it("тянет 3 уникальные карты с позициями past/present/future", () => {
    const drawn = drawThreeCards(() => 0);
    expect(drawn).toHaveLength(3);
    expect(drawn.map((c) => c.position)).toEqual(["past", "present", "future"]);
    expect(new Set(drawn.map((c) => c.id)).size).toBe(3);
  });

  it("монетка положения: rand<0.5 даёт прямые, иначе перевёрнутые", () => {
    // Первые 3 вызова rand — Фишер-Йетс, следующие 3 — монетка.
    const seq = [0, 0, 0, 0.1, 0.9, 0.1];
    let i = 0;
    const drawn = drawThreeCards(() => seq[i++] as number);
    expect(drawn.map((c) => c.orientation)).toEqual([
      "upright",
      "reversed",
      "upright",
    ]);
  });

  it("детерминирован с фиксированным rand", () => {
    expect(drawThreeCards(() => 0)).toEqual(drawThreeCards(() => 0));
  });

  it("позиции и положения покрыты подписями", () => {
    for (const p of SPREAD_POSITIONS) {
      expect(POSITION_LABELS_RU[p]).toBeTruthy();
    }
    expect(ORIENTATION_LABELS_RU.upright).toBe("ПРЯМАЯ");
    expect(ORIENTATION_LABELS_RU.reversed).toBe("ПЕРЕВЁРНУТАЯ");
  });
});

describe("tarotPrompt", () => {
  it("включает вопрос, все вытянутые id и положения", () => {
    const prompt = tarotPrompt("Учить ли Rust?", DRAWN);
    expect(prompt).toContain("Учить ли Rust?");
    expect(prompt).toContain("the-fool");
    expect(prompt).toContain("the-magician");
    expect(prompt).toContain("the-high-priestess");
    expect(prompt).toContain("ПРЯМАЯ");
    expect(prompt).toContain("ПЕРЕВЁРНУТАЯ");
    expect(prompt).toContain("JSON");
  });

  it("даёт только эталонное значение выпавшего положения", () => {
    const prompt = tarotPrompt("Учить ли Rust?", DRAWN);
    const fool = deckCardById("the-fool");
    const magician = deckCardById("the-magician");
    // Шут прямой — его прямое значение есть, перевёрнутого нет.
    expect(prompt).toContain(fool?.meaningUp as string);
    expect(prompt).not.toContain(fool?.meaningRev as string);
    // Маг перевёрнут — наоборот.
    expect(prompt).toContain(magician?.meaningRev as string);
    expect(prompt).not.toContain(magician?.meaningUp as string);
  });
});

describe("parseSpreadResponse", () => {
  it("парсит корректный расклад и берёт имена из канона", () => {
    const result = parseSpreadResponse(llmJson(), DRAWN);
    expect(result).toMatchObject({
      cards: [
        {
          id: "the-fool",
          name: "Шут",
          position: "past",
          orientation: "upright",
          meaning: "Начало позади.",
        },
        {
          id: "the-magician",
          name: "Маг",
          position: "present",
          orientation: "reversed",
          meaning: "Сила в руках, но не твоих.",
        },
        {
          id: "the-high-priestess",
          name: "Верховная Жрица",
          position: "future",
          orientation: "upright",
          meaning: "Тайна рядом.",
        },
      ],
      summary: "Итог расклада.",
    });
  });

  it("снимает markdown-обёртку", () => {
    expect(
      parseSpreadResponse(`\`\`\`json\n${llmJson()}\n\`\`\``, DRAWN),
    ).not.toBeNull();
  });

  it("отклоняет подмену id", () => {
    const bad = JSON.stringify({
      cards: [
        { id: "death", position: "past", orientation: "upright", meaning: "x" },
        {
          id: "the-magician",
          position: "present",
          orientation: "reversed",
          meaning: "y",
        },
        {
          id: "the-high-priestess",
          position: "future",
          orientation: "upright",
          meaning: "z",
        },
      ],
      summary: "s",
    });
    expect(parseSpreadResponse(bad, DRAWN)).toBeNull();
  });

  it("отклоняет подмену положения", () => {
    const bad = JSON.stringify({
      cards: [
        {
          id: "the-fool",
          position: "past",
          orientation: "reversed",
          meaning: "x",
        },
        {
          id: "the-magician",
          position: "present",
          orientation: "reversed",
          meaning: "y",
        },
        {
          id: "the-high-priestess",
          position: "future",
          orientation: "upright",
          meaning: "z",
        },
      ],
      summary: "s",
    });
    expect(parseSpreadResponse(bad, DRAWN)).toBeNull();
  });

  it("отклоняет перестановку позиций", () => {
    const bad = JSON.stringify({
      cards: [
        {
          id: "the-fool",
          position: "future",
          orientation: "upright",
          meaning: "x",
        },
        {
          id: "the-magician",
          position: "present",
          orientation: "reversed",
          meaning: "y",
        },
        {
          id: "the-high-priestess",
          position: "past",
          orientation: "upright",
          meaning: "z",
        },
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
          {
            id: "a",
            name: "А",
            position: "past",
            orientation: "upright",
            meaning: "x",
          },
          {
            id: "b",
            name: "Б",
            position: "present",
            orientation: "reversed",
            meaning: "y",
          },
          {
            id: "c",
            name: "В",
            position: "future",
            orientation: "upright",
            meaning: "z",
          },
        ],
        summary: "s",
      }),
    ).toBe(true);
  });

  it("отклоняет неверную форму", () => {
    expect(isTarotResponse(null)).toBe(false);
    expect(isTarotResponse({ cards: [], summary: "s" })).toBe(false);
    expect(
      isTarotResponse({
        cards: [
          { id: "a", name: "А", position: "past", meaning: "x" },
          { id: "b", name: "Б", position: "present", meaning: "y" },
          { id: "c", name: "В", position: "future", meaning: "z" },
        ],
        summary: "s",
      }),
    ).toBe(false);
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
