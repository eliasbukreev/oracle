import { AskRequestSchema } from "@oracle/shared";

// Реэкспорт для тестов, канон лимитов — в shared.
export { MAX_QUESTION_LENGTH } from "@oracle/shared";

export function parseQuestion(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const parsed = AskRequestSchema.safeParse(payload);
  return parsed.success ? parsed.data.question : null;
}
