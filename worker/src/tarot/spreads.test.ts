import { describe, expect, it } from "vitest";
import {
  MAX_VARIANT_LENGTH,
  SPREADS,
  parseVariants,
  resolveSpread,
} from "./spreads";

describe("SPREADS", () => {
  it("реестр содержит три расклада", () => {
    expect(Object.keys(SPREADS).sort()).toEqual([
      "choice",
      "classic",
      "relations",
    ]);
  });

  it("cardCount совпадает с числом позиций, подписи покрывают позиции", () => {
    for (const spread of Object.values(SPREADS)) {
      expect(spread.cardCount).toBe(spread.positions.length);
      expect(new Set(spread.positions).size).toBe(spread.positions.length);
      for (const position of spread.positions) {
        expect(spread.positionLabelsRu[position]?.trim().length).toBeGreaterThan(
          0,
        );
      }
      expect(spread.descriptionRu.trim().length).toBeGreaterThan(0);
    }
  });

  it("только choice требует варианты", () => {
    expect(SPREADS.classic.requiresVariants).toBe(false);
    expect(SPREADS.relations.requiresVariants).toBe(false);
    expect(SPREADS.choice.requiresVariants).toBe(true);
  });
});

describe("resolveSpread", () => {
  it("возвращает расклад по известному id", () => {
    expect(resolveSpread("relations")).toBe(SPREADS.relations);
    expect(resolveSpread("choice")).toBe(SPREADS.choice);
    expect(resolveSpread("classic")).toBe(SPREADS.classic);
  });

  it("неизвестное и пустое даёт classic, а не ошибку", () => {
    expect(resolveSpread("celtic")).toBe(SPREADS.classic);
    expect(resolveSpread(undefined)).toBe(SPREADS.classic);
    expect(resolveSpread(null)).toBe(SPREADS.classic);
    expect(resolveSpread(42)).toBe(SPREADS.classic);
  });
});

describe("parseVariants", () => {
  it("достаёт и триммит названия", () => {
    expect(
      parseVariants({
        variants: { a: "  Сменить работу  ", b: "Остаться" },
      }),
    ).toEqual({ a: "Сменить работу", b: "Остаться" });
  });

  it.each([null, undefined, {}, { variants: null }, { variants: "ab" }])(
    "возвращает null без вариантов: %s",
    (payload) => {
      expect(parseVariants(payload)).toBeNull();
    },
  );

  it("отклоняет пустой или односторонний вариант", () => {
    expect(parseVariants({ variants: { a: "   ", b: "Остаться" } })).toBeNull();
    expect(parseVariants({ variants: { a: "Уйти" } })).toBeNull();
    expect(parseVariants({ variants: { a: 42, b: "Остаться" } })).toBeNull();
  });

  it("отклоняет слишком длинные названия", () => {
    const long = "x".repeat(MAX_VARIANT_LENGTH + 1);
    expect(parseVariants({ variants: { a: long, b: "Остаться" } })).toBeNull();
    expect(
      parseVariants({
        variants: { a: "x".repeat(MAX_VARIANT_LENGTH), b: "Остаться" },
      }),
    ).not.toBeNull();
  });
});
