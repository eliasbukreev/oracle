import { describe, expect, it } from "vitest";
import type { DrawnCard } from "../types";
import { FULL_DECK, MAJOR_ARCANA, deckCardById, isDeckId } from "./deck";
import {
  ORIENTATION_LABELS_RU,
  POSITION_LABELS_RU,
  SPREAD_POSITIONS,
  drawSpread,
  drawThreeCards,
} from "./draw";
import { tarotPrompt } from "./prompt";
import { SPREADS } from "./spreads";
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

const DRAWN_RELATIONS: DrawnCard[] = [
  { id: "the-lovers", name: "Влюблённые", position: "self", orientation: "upright" },
  { id: "the-devil", name: "Дьявол", position: "other", orientation: "upright" },
  { id: "the-sun", name: "Солнце", position: "attraction", orientation: "upright" },
  { id: "the-tower", name: "Башня", position: "obstacle", orientation: "reversed" },
  { id: "the-star", name: "Звезда", position: "potential", orientation: "upright" },
];

const DRAWN_CHOICE: DrawnCard[] = [
  { id: "the-hanged-man", name: "Повешенный", position: "core", orientation: "upright" },
  { id: "the-chariot", name: "Колесница", position: "optionA", orientation: "upright" },
  { id: "the-sun", name: "Солнце", position: "outcomeA", orientation: "upright" },
  { id: "death", name: "Смерть", position: "optionB", orientation: "reversed" },
  { id: "the-moon", name: "Луна", position: "outcomeB", orientation: "upright" },
];

const VARIANTS = { a: "Сменить работу", b: "Остаться" };

function llmJsonFor(drawn: DrawnCard[]): string {
  return JSON.stringify({
    cards: drawn.map((card) => ({
      id: card.id,
      position: card.position,
      orientation: card.orientation,
      meaning: `Толкование ${card.id}.`,
    })),
    summary: "Итог расклада.",
  });
}

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
    const prompt = tarotPrompt("Учить ли Rust?", DRAWN, SPREADS.classic);
    expect(prompt).toContain("Учить ли Rust?");
    expect(prompt).toContain("the-fool");
    expect(prompt).toContain("the-magician");
    expect(prompt).toContain("the-high-priestess");
    expect(prompt).toContain("ПРЯМАЯ");
    expect(prompt).toContain("ПЕРЕВЁРНУТАЯ");
    expect(prompt).toContain("JSON");
  });

  it("даёт только эталонное значение выпавшего положения", () => {
    const prompt = tarotPrompt("Учить ли Rust?", DRAWN, SPREADS.classic);
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
    const result = parseSpreadResponse(llmJson(), DRAWN, SPREADS.classic);
    expect(result).toMatchObject({
      cards: [
        {
          id: "the-fool",
          name: "Шут",
          position: "past",
          orientation: "upright",
          meaning: "Начало позади.",
          imageUrl: "",
        },
        {
          id: "the-magician",
          name: "Маг",
          position: "present",
          orientation: "reversed",
          meaning: "Сила в руках, но не твоих.",
          imageUrl: "",
        },
        {
          id: "the-high-priestess",
          name: "Верховная Жрица",
          position: "future",
          orientation: "upright",
          meaning: "Тайна рядом.",
          imageUrl: "",
        },
      ],
      summary: "Итог расклада.",
      backImageUrl: "",
    });
  });

  it("подставляет URL картинок из R2 когда задан base", () => {
    const result = parseSpreadResponse(
      llmJson(),
      DRAWN,
      SPREADS.classic,
      "https://assets.test/",
    );
    expect(result?.cards.map((c) => c.imageUrl)).toEqual([
      "https://assets.test/tarot/00-TheFool.webp",
      "https://assets.test/tarot/01-TheMagician.webp",
      "https://assets.test/tarot/02-TheHighPriestess.webp",
    ]);
    expect(result?.backImageUrl).toBe(
      "https://assets.test/tarot/CardBacks.webp",
    );
  });

  it("снимает markdown-обёртку", () => {
    expect(
      parseSpreadResponse(`\`\`\`json\n${llmJson()}\n\`\`\``, DRAWN, SPREADS.classic),
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
    expect(parseSpreadResponse(bad, DRAWN, SPREADS.classic)).toBeNull();
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
    expect(parseSpreadResponse(bad, DRAWN, SPREADS.classic)).toBeNull();
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
    expect(parseSpreadResponse(bad, DRAWN, SPREADS.classic)).toBeNull();
  });

  it("отклоняет неверное число карт и мусор", () => {
    expect(parseSpreadResponse("не json", DRAWN, SPREADS.classic)).toBeNull();
    expect(
      parseSpreadResponse(
        JSON.stringify({ cards: [], summary: "s" }),
        DRAWN,
        SPREADS.classic,
      ),
    ).toBeNull();
  });
});

describe("isTarotResponse", () => {
  it("принимает корректный ответ API", () => {
    expect(
      isTarotResponse({
        spread: "classic",
        cards: [
          {
            id: "a",
            name: "А",
            position: "past",
            orientation: "upright",
            meaning: "x",
            imageUrl: "https://img.test/a.webp",
          },
          {
            id: "b",
            name: "Б",
            position: "present",
            orientation: "reversed",
            meaning: "y",
            imageUrl: "",
          },
          {
            id: "c",
            name: "В",
            position: "future",
            orientation: "upright",
            meaning: "z",
            imageUrl: "",
          },
        ],
        summary: "s",
        backImageUrl: "",
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

describe("images", () => {
  it("маппит PNG-набор в WebP-ключи R2", async () => {
    const { toImageKey, tarotImageUrl, tarotBackImageUrl } = await import(
      "./images"
    );
    expect(toImageKey("00-TheFool.png")).toBe("00-TheFool.webp");
    expect(toImageKey("Wands01.png")).toBe("Wands01.webp");
    expect(tarotImageUrl("https://assets.test/", "00-TheFool.png")).toBe(
      "https://assets.test/tarot/00-TheFool.webp",
    );
    expect(tarotImageUrl("", "00-TheFool.png")).toBe("");
    expect(tarotBackImageUrl("https://assets.test")).toBe(
      "https://assets.test/tarot/CardBacks.webp",
    );
    expect(tarotBackImageUrl("")).toBe("");
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
          response: { spread: "classic" as const, cards: [], summary: "ok", backImageUrl: "" },
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

  it("relations: тянет 5 карт и отдаёт spread", async () => {
    let seen: unknown;
    const provider = {
      name: "stub",
      askTarot: async (input: {
        question: string;
        spread: { id: string };
        drawnCards: DrawnCard[];
      }) => {
        seen = input;
        return {
          ok: true as const,
          response: {
            spread: "relations" as const,
            cards: [],
            summary: "ok",
            backImageUrl: "",
          },
        };
      },
    };
    const result = await runTarotWorkflow(
      { question: "Любит ли меня?", spread: "relations" },
      { provider, randomFn: () => 0 },
    );
    expect(result.ok).toBe(true);
    expect(seen).toMatchObject({ spread: { id: "relations" } });
    expect((seen as { drawnCards: DrawnCard[] }).drawnCards).toHaveLength(5);
    expect(
      (seen as { drawnCards: DrawnCard[] }).drawnCards.map((c) => c.position),
    ).toEqual(["self", "other", "attraction", "obstacle", "potential"]);
  });

  it("неизвестный spread даёт classic", async () => {
    let seen: unknown;
    const provider = {
      name: "stub",
      askTarot: async (input: { spread: { id: string } }) => {
        seen = input;
        return {
          ok: true as const,
          response: {
            spread: "classic" as const,
            cards: [],
            summary: "ok",
            backImageUrl: "",
          },
        };
      },
    };
    await runTarotWorkflow(
      { question: "Учить ли Rust?", spread: "celtic" },
      { provider, randomFn: () => 0 },
    );
    expect(seen).toMatchObject({ spread: { id: "classic" } });
  });

  it("choice без вариантов возвращает invalid_request без вызова провайдера", async () => {
    let called = false;
    const result = await runTarotWorkflow(
      { question: "Что выбрать?", spread: "choice" },
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

  it("choice с вариантами прокидывает их в провайдер", async () => {
    let seen: unknown;
    const provider = {
      name: "stub",
      askTarot: async (input: {
        variants?: { a: string; b: string };
        drawnCards: DrawnCard[];
      }) => {
        seen = input;
        return {
          ok: true as const,
          response: {
            spread: "choice" as const,
            cards: [],
            summary: "ok",
            backImageUrl: "",
            variants: { a: "Сменить работу", b: "Остаться" },
          },
        };
      },
    };
    const result = await runTarotWorkflow(
      {
        question: "Что выбрать?",
        spread: "choice",
        variants: { a: "  Сменить работу ", b: "Остаться" },
      },
      { provider, randomFn: () => 0 },
    );
    expect(result.ok).toBe(true);
    expect(seen).toMatchObject({
      variants: { a: "Сменить работу", b: "Остаться" },
    });
    expect((seen as { drawnCards: DrawnCard[] }).drawnCards).toHaveLength(5);
  });
});

describe("drawSpread", () => {
  it("тянет карты под позиции расклада: уникальные, по порядку", () => {
    const drawn = drawSpread(SPREADS.relations, () => 0);
    expect(drawn).toHaveLength(5);
    expect(drawn.map((c) => c.position)).toEqual([
      "self",
      "other",
      "attraction",
      "obstacle",
      "potential",
    ]);
    expect(new Set(drawn.map((c) => c.id)).size).toBe(5);
  });

  it("classic через drawSpread совпадает с drawThreeCards", () => {
    expect(drawSpread(SPREADS.classic, () => 0)).toEqual(
      drawThreeCards(() => 0),
    );
  });
});

describe("tarotPrompt spreads", () => {
  it("relations: 5 карт и описание расклада", () => {
    const prompt = tarotPrompt("Любит ли меня?", DRAWN_RELATIONS, SPREADS.relations);
    expect(prompt).toContain("ровно 5 элемента");
    expect(prompt).toContain(SPREADS.relations.descriptionRu);
    for (const card of DRAWN_RELATIONS) {
      expect(prompt).toContain(card.id);
    }
  });

  it("choice: названия вариантов и рамка ветвей", () => {
    const prompt = tarotPrompt(
      "Что выбрать?",
      DRAWN_CHOICE,
      SPREADS.choice,
      VARIANTS,
    );
    expect(prompt).toContain("Вариант А: «Сменить работу»");
    expect(prompt).toContain("Вариант Б: «Остаться»");
    expect(prompt).toContain(SPREADS.choice.descriptionRu);
    expect(prompt).toContain("Вариант: «Сменить работу»");
  });
});

describe("parseSpreadResponse spreads", () => {
  it("парсит 5 карт relations", () => {
    const result = parseSpreadResponse(
      llmJsonFor(DRAWN_RELATIONS),
      DRAWN_RELATIONS,
      SPREADS.relations,
    );
    expect(result?.cards).toHaveLength(5);
    expect(result?.cards.map((c) => c.position)).toEqual([
      "self",
      "other",
      "attraction",
      "obstacle",
      "potential",
    ]);
    expect(result?.cards[0]).toMatchObject({
      id: "the-lovers",
      name: "Влюблённые",
    });
  });

  it("отклоняет неверное число карт для расклада", () => {
    expect(
      parseSpreadResponse(llmJson(), DRAWN_RELATIONS, SPREADS.relations),
    ).toBeNull();
  });

  it("отклоняет чужую позицию", () => {
    const bad = JSON.stringify({
      cards: DRAWN_RELATIONS.map((card, i) => ({
        id: card.id,
        position: i === 0 ? "past" : card.position,
        orientation: card.orientation,
        meaning: "x",
      })),
      summary: "s",
    });
    expect(
      parseSpreadResponse(bad, DRAWN_RELATIONS, SPREADS.relations),
    ).toBeNull();
  });

  it("choice парсится, variants добавит провайдер", () => {
    const result = parseSpreadResponse(
      llmJsonFor(DRAWN_CHOICE),
      DRAWN_CHOICE,
      SPREADS.choice,
    );
    expect(result?.cards).toHaveLength(5);
  });
});
