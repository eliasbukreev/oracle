import { describe, expect, it } from "vitest";
import {
  MAX_QUESTION_LENGTH,
  isOracleResponse,
  oraclePrompt,
  parseModelResponse,
  parseQuestion,
} from "./oracle";

const VALID_ORACLE_JSON = JSON.stringify({
  verdict: "ДА",
  confidence: 87,
  prophecy: "Путь тернист, но цель близка.",
  reason: "Звёзды благоволят смелым.",
});

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

describe("isOracleResponse", () => {
  it("принимает корректный ответ", () => {
    expect(isOracleResponse(JSON.parse(VALID_ORACLE_JSON))).toBe(true);
  });

  it("отклоняет не-объекты", () => {
    expect(isOracleResponse(null)).toBe(false);
    expect(isOracleResponse("text")).toBe(false);
    expect(isOracleResponse([])).toBe(false);
  });

  it("отклоняет ответ без полей", () => {
    const parsed = JSON.parse(VALID_ORACLE_JSON) as Record<string, unknown>;
    delete parsed.prophecy;
    expect(isOracleResponse(parsed)).toBe(false);
  });

  it.each([101, -1, "87", true, Number.NaN])(
    "отклоняет некорректный confidence: %s",
    (confidence) => {
      expect(
        isOracleResponse({ ...JSON.parse(VALID_ORACLE_JSON), confidence }),
      ).toBe(false);
    },
  );

  it("отклоняет пустой verdict и слишком длинные поля", () => {
    const base = JSON.parse(VALID_ORACLE_JSON) as Record<string, unknown>;
    expect(isOracleResponse({ ...base, verdict: "   " })).toBe(false);
    expect(isOracleResponse({ ...base, prophecy: "x".repeat(4001) })).toBe(
      false,
    );
  });
});

describe("parseModelResponse", () => {
  it("парсит чистый JSON и триммит поля", () => {
    const result = parseModelResponse(`  ${VALID_ORACLE_JSON}  `);
    expect(result).toMatchObject({ verdict: "ДА", confidence: 87 });
  });

  it("снимает markdown-обёртку", () => {
    expect(parseModelResponse(`\`\`\`json\n${VALID_ORACLE_JSON}\n\`\`\``))
      .toMatchObject({ verdict: "ДА" });
    expect(parseModelResponse(`\`\`\`\n${VALID_ORACLE_JSON}\n\`\`\``))
      .toMatchObject({ verdict: "ДА" });
  });

  it("возвращает null для мусора и неверной схемы", () => {
    expect(parseModelResponse("не json")).toBeNull();
    expect(parseModelResponse('{"verdict":"ДА"}')).toBeNull();
  });
});

describe("oraclePrompt", () => {
  it("включает вопрос и требование JSON", () => {
    const prompt = oraclePrompt("Учить ли Rust?");
    expect(prompt).toContain("Учить ли Rust?");
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("confidence");
  });
});
