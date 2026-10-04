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
