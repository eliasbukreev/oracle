// Узел workflow "validate": строгая проверка расклада от LLM.
// Сверяет id/позиции с вытянутыми сервером — защита от галлюцинаций имён.
import { MAX_RESPONSE_FIELD_LENGTH } from "../oracle";
import type { DrawnCard, TarotPosition, TarotResponse } from "../types";

export const TAROT_POSITIONS: readonly TarotPosition[] = [
  "past",
  "present",
  "future",
];

function isPosition(value: unknown): value is TarotPosition {
  return value === "past" || value === "present" || value === "future";
}

function isValidMeaning(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= MAX_RESPONSE_FIELD_LENGTH
  );
}

export function isTarotResponse(value: unknown): value is TarotResponse {
  if (!value || typeof value !== "object") return false;

  const result = value as Record<string, unknown>;

  if (!Array.isArray(result.cards) || result.cards.length !== 3) return false;

  if (
    typeof result.summary !== "string" ||
    result.summary.trim().length === 0 ||
    result.summary.trim().length > MAX_RESPONSE_FIELD_LENGTH
  ) {
    return false;
  }

  for (const card of result.cards) {
    if (!card || typeof card !== "object") return false;
    const c = card as Record<string, unknown>;

    if (
      typeof c.id !== "string" ||
      !c.id ||
      typeof c.name !== "string" ||
      !c.name.trim() ||
      c.name.length > 120 ||
      !isPosition(c.position) ||
      !isValidMeaning(c.meaning)
    ) {
      return false;
    }
  }

  return true;
}

function stripFences(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

/** Парсит сырой ответ модели и сверяет с вытянутыми картами.
 *  Имя берётся из канона (drawnCards), а не из ответа модели. */
export function parseSpreadResponse(
  content: string,
  expected: DrawnCard[],
): TarotResponse | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripFences(content));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;

  const raw = parsed as {
    cards?: Array<{ id?: unknown; position?: unknown; meaning?: unknown }>;
    summary?: unknown;
  };

  if (!Array.isArray(raw.cards) || raw.cards.length !== 3) return null;
  if (
    typeof raw.summary !== "string" ||
    !raw.summary.trim() ||
    raw.summary.trim().length > MAX_RESPONSE_FIELD_LENGTH
  ) {
    return null;
  }

  const cards: TarotResponse["cards"] = [];

  for (let i = 0; i < 3; i++) {
    const got = raw.cards[i];
    const want = expected[i];
    if (!got || !want) return null;

    // Строгое соответствие вытянутому: тот же id и та же позиция, тот же порядок.
    if (got.id !== want.id || got.position !== want.position) return null;
    if (!isValidMeaning(got.meaning)) return null;

    cards.push({
      id: want.id,
      name: want.name,
      position: want.position,
      meaning: (got.meaning as string).trim(),
    });
  }

  return { cards, summary: (raw.summary as string).trim() };
}
