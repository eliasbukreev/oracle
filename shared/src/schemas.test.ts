import { describe, expect, it } from "vitest";
import {
  AskRequestSchema,
  ChoiceVariantsSchema,
  OracleErrorCodeSchema,
  SpreadIdSchema,
  TarotCardSchema,
  TarotOrientationSchema,
  TarotResponseSchema,
} from "./schemas";

const CARD = {
  id: "the-fool",
  name: "Шут",
  position: "past",
  orientation: "upright",
  meaning: "Начало.",
  imageUrl: "",
};

const RESPONSE = {
  spread: "classic",
  cards: [CARD, { ...CARD, id: "the-magician" }, { ...CARD, id: "the-sun" }],
  summary: "Итог.",
  backImageUrl: "",
};

describe("SpreadIdSchema", () => {
  it.each([
    "classic",
    "relations",
    "choice",
    "yesno",
    "diagnose",
    "period",
    "daily",
  ])("принимает %s", (spread) => {
    expect(SpreadIdSchema.safeParse(spread).success).toBe(true);
  });

  it.each(["celtic", "", null, 42])("отклоняет %s", (spread) => {
    expect(SpreadIdSchema.safeParse(spread).success).toBe(false);
  });
});

describe("TarotOrientationSchema", () => {
  it("принимает upright/reversed, остальное нет", () => {
    expect(TarotOrientationSchema.safeParse("upright").success).toBe(true);
    expect(TarotOrientationSchema.safeParse("reversed").success).toBe(true);
    expect(TarotOrientationSchema.safeParse("sideways").success).toBe(false);
  });
});

describe("ChoiceVariantsSchema", () => {
  it("триммит и принимает непустые", () => {
    expect(
      ChoiceVariantsSchema.safeParse({ a: "  Уйти  ", b: "Остаться" }),
    ).toEqual({ success: true, data: { a: "Уйти", b: "Остаться" } });
  });

  it.each([
    { a: "", b: "x" },
    { a: "x" },
    { a: "x".repeat(101), b: "y" },
    null,
    "ab",
  ])("отклоняет %s", (variants) => {
    expect(ChoiceVariantsSchema.safeParse(variants).success).toBe(false);
  });
});

describe("TarotCardSchema", () => {
  it("принимает корректную карту, триммит meaning", () => {
    const parsed = TarotCardSchema.safeParse({ ...CARD, meaning: "  Начало. " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.meaning).toBe("Начало.");
  });

  it("отклоняет пустое meaning, плохой orientation, пустой id", () => {
    expect(
      TarotCardSchema.safeParse({ ...CARD, meaning: "   " }).success,
    ).toBe(false);
    expect(
      TarotCardSchema.safeParse({ ...CARD, orientation: "sideways" }).success,
    ).toBe(false);
    expect(TarotCardSchema.safeParse({ ...CARD, id: "" }).success).toBe(false);
  });
});

describe("TarotResponseSchema", () => {
  it("принимает корректный ответ и choice с вариантами", () => {
    expect(TarotResponseSchema.safeParse(RESPONSE).success).toBe(true);
    expect(
      TarotResponseSchema.safeParse({
        ...RESPONSE,
        spread: "choice",
        variants: { a: "Уйти", b: "Остаться" },
      }).success,
    ).toBe(true);
  });

  it("отклоняет пустые карты, мусорный spread, битые variants", () => {
    expect(
      TarotResponseSchema.safeParse({ ...RESPONSE, cards: [] }).success,
    ).toBe(false);
    expect(
      TarotResponseSchema.safeParse({ ...RESPONSE, spread: "celtic" }).success,
    ).toBe(false);
    expect(
      TarotResponseSchema.safeParse({
        ...RESPONSE,
        variants: { a: "", b: "x" },
      }).success,
    ).toBe(false);
  });
});

describe("OracleErrorCodeSchema", () => {
  it.each([
    "invalid_request",
    "invalid_client",
    "oracle_resting",
    "oracle_unavailable",
    "internal_error",
    "blocked",
  ])("принимает %s", (code) => {
    expect(OracleErrorCodeSchema.safeParse(code).success).toBe(true);
  });

  it.each(["nope", "", null, 42])("отклоняет %s", (code) => {
    expect(OracleErrorCodeSchema.safeParse(code).success).toBe(false);
  });
});

describe("AskRequestSchema", () => {
  it("триммит вопрос", () => {
    expect(
      AskRequestSchema.safeParse({ question: "  Учить ли Rust?  " }),
    ).toEqual({ success: true, data: { question: "Учить ли Rust?" } });
  });

  it.each([{ question: "   " }, { question: "x".repeat(501) }, {}, null])(
    "отклоняет %s",
    (payload) => {
      expect(AskRequestSchema.safeParse(payload).success).toBe(false);
    },
  );
});
