import type { OracleResponse } from "./types";

export const MAX_QUESTION_LENGTH = 500;
export const MAX_RESPONSE_FIELD_LENGTH = 4000;

export function parseQuestion(payload: unknown): string | null {
  const question =
    payload && typeof payload === "object" && "question" in payload
      ? (payload as { question?: unknown }).question
      : undefined;

  if (typeof question !== "string") {
    return null;
  }

  const trimmed = question.trim();

  if (!trimmed || trimmed.length > MAX_QUESTION_LENGTH) {
    return null;
  }

  return trimmed;
}

export function isOracleResponse(value: unknown): value is OracleResponse {
  if (!value || typeof value !== "object") return false;

  const result = value as Record<string, unknown>;
  return (
    typeof result.verdict === "string" &&
    result.verdict.trim().length > 0 &&
    typeof result.confidence === "number" &&
    Number.isFinite(result.confidence) &&
    result.confidence >= 0 &&
    result.confidence <= 100 &&
    typeof result.prophecy === "string" &&
    result.prophecy.trim().length > 0 &&
    typeof result.reason === "string" &&
    result.reason.trim().length > 0 &&
    result.verdict.length <= MAX_RESPONSE_FIELD_LENGTH &&
    result.prophecy.length <= MAX_RESPONSE_FIELD_LENGTH &&
    result.reason.length <= MAX_RESPONSE_FIELD_LENGTH
  );
}

export function parseModelResponse(content: string): OracleResponse | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!isOracleResponse(parsed)) return null;

    return {
      verdict: parsed.verdict.trim(),
      confidence: parsed.confidence,
      prophecy: parsed.prophecy.trim(),
      reason: parsed.reason.trim(),
    };
  } catch {
    return null;
  }
}

export function oraclePrompt(question: string): string {
  return [
    "Ты — Оракул. Отвечай на русском языке в мистическом стиле.",
    "Не упоминай, что ты искусственный интеллект.",
    "Верни только валидный JSON без markdown и без ```.",
    "JSON должен содержать поля: verdict (ДА или НЕТ), confidence (число от 0 до 100), prophecy (короткое пророчество), reason (краткое объяснение).",
    "",
    `Вопрос пользователя: ${question}`,
  ].join("\n");
}
