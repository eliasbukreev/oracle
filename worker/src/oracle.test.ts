import { describe, expect, it } from "vitest";
import { MAX_QUESTION_LENGTH, parseQuestion } from "./oracle";

describe("parseQuestion", () => {
  it("достаёт и триммит вопрос", () => {
    expect(parseQuestion({ question: "  Учить ли Rust?  " })).toBe(
      "Учить ли Rust?",
    );
  });

  it.each([null, undefined, "строка", 42, {}, { question: 42 }])(
    "возвращает null для %s",
    (payload) => {
      expect(parseQuestion(payload)).toBeNull();
    },
  );

  it("отклоняет пустой и слишком длинный вопрос", () => {
    expect(parseQuestion({ question: "   " })).toBeNull();
    expect(
      parseQuestion({ question: "x".repeat(MAX_QUESTION_LENGTH + 1) }),
    ).toBeNull();
    expect(parseQuestion({ question: "x".repeat(MAX_QUESTION_LENGTH) })).toBe(
      "x".repeat(MAX_QUESTION_LENGTH),
    );
  });
});
