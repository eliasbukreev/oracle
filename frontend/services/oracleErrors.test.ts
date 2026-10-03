import { describe, expect, it } from "vitest";
import {
  formatRetryAfter,
  pluralize,
  restingMessage,
  toErrorCode,
} from "./oracleErrors";

describe("pluralize", () => {
  const forms: [string, string, string] = ["секунду", "секунды", "секунд"];

  it.each([
    [1, "секунду"],
    [21, "секунду"],
    [2, "секунды"],
    [4, "секунды"],
    [22, "секунды"],
    [0, "секунд"],
    [5, "секунд"],
    [11, "секунд"],
    [111, "секунд"],
  ])("%i → %s", (count, expected) => {
    expect(pluralize(count, forms)).toBe(expected);
  });
});

describe("toErrorCode", () => {
  it("пропускает известные коды", () => {
    expect(toErrorCode("oracle_resting")).toBe("oracle_resting");
    expect(toErrorCode("invalid_request")).toBe("invalid_request");
  });

  it.each(["weird", null, undefined, 42, {}])(
    "неизвестное %s маппит в internal_error",
    (value) => {
      expect(toErrorCode(value)).toBe("internal_error");
    },
  );
});

describe("formatRetryAfter", () => {
  it.each([
    [1, "1 секунду"],
    [2, "2 секунды"],
    [5, "5 секунд"],
    [21, "21 секунду"],
    [59, "59 секунд"],
    [60, "1 минуту"],
    [120, "2 минуты"],
    [300, "5 минут"],
  ])("%i сек → %s", (seconds, expected) => {
    expect(formatRetryAfter(seconds)).toBe(expected);
  });
});

describe("restingMessage", () => {
  it("без retryAfter возвращает дефолтный текст", () => {
    expect(restingMessage()).toBe(
      "Оракул отдыхает. Дай ему немного тишины и попробуй позже.",
    );
  });

  it("с retryAfter подставляет длительность", () => {
    expect(restingMessage(60)).toContain("через 1 минуту");
    expect(restingMessage(30)).toContain("через 30 секунд");
  });
});
