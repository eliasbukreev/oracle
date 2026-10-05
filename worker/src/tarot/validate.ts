import { MAX_RESPONSE_FIELD_LENGTH } from "../oracle";
import type {
  DrawnCard,
  SpreadDef,
  TarotCard,
  TarotOrientation,
  TarotResponse,
} from "../types";
import { buildTarotCard, tarotBackImageUrl } from "./images";

/** Позиция — непустая строка; принадлежность раскладу проверяет
 *  parseSpreadResponse сверкой с вытянутыми картами. */
function isPosition(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isOrientation(value: unknown): value is TarotOrientation {
  return value === "upright" || value === "reversed";
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

  if (typeof result.spread !== "string" || !result.spread) return false;

  if (
    !Array.isArray(result.cards) ||
    result.cards.length < 1 ||
    result.cards.length > 10
  ) {
    return false;
  }

  if (
    typeof result.summary !== "string" ||
    result.summary.trim().length === 0 ||
    result.summary.trim().length > MAX_RESPONSE_FIELD_LENGTH
  ) {
    return false;
  }

  // URL картинок — строки; пустые допустимы (R2 не настроен, фронт рисует текст).
  if (typeof result.backImageUrl !== "string") return false;

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
      !isOrientation(c.orientation) ||
      !isValidMeaning(c.meaning) ||
      typeof c.imageUrl !== "string"
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

/** Разобранный ответ модели без spread/variants: их добавляет вызывающий
 *  узел из входа workflow (эхо запроса, не ответ модели). */
export interface ParsedSpread {
  cards: TarotCard[];
  summary: string;
  backImageUrl: string;
}

/** Парсит сырой ответ модели и сверяет с вытянутыми картами.
 *  Имя и URL картинки берутся из канона (drawnCards + deck), а не из модели. */
export function parseSpreadResponse(
  content: string,
  expected: DrawnCard[],
  spread: SpreadDef,
  imageBaseUrl = "",
): ParsedSpread | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripFences(content));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;

  const raw = parsed as {
    cards?: Array<{
      id?: unknown;
      position?: unknown;
      orientation?: unknown;
      meaning?: unknown;
    }>;
    summary?: unknown;
  };

  if (!Array.isArray(raw.cards) || raw.cards.length !== spread.cardCount) {
    return null;
  }
  if (
    typeof raw.summary !== "string" ||
    !raw.summary.trim() ||
    raw.summary.trim().length > MAX_RESPONSE_FIELD_LENGTH
  ) {
    return null;
  }

  const cards: TarotCard[] = [];

  for (let i = 0; i < spread.cardCount; i++) {
    const got = raw.cards[i];
    const want = expected[i];
    if (!got || !want) return null;

    // Строгое соответствие вытянутому: те же id, позиция и положение, тот же порядок.
    if (
      got.id !== want.id ||
      got.position !== want.position ||
      got.orientation !== want.orientation
    ) {
      return null;
    }
    if (!isValidMeaning(got.meaning)) return null;

    cards.push(
      buildTarotCard(want, (got.meaning as string).trim(), imageBaseUrl),
    );
  }

  return {
    cards,
    summary: (raw.summary as string).trim(),
    backImageUrl: tarotBackImageUrl(imageBaseUrl),
  };
}
