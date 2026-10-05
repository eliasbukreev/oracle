import {
  MAX_RESPONSE_FIELD_LENGTH,
  TarotOrientationSchema,
  TarotResponseSchema,
} from "@oracle/shared";
import { z } from "zod";
import type { DrawnCard, SpreadDef, TarotCard, TarotResponse } from "../types";
import { buildTarotCard, tarotBackImageUrl } from "./images";

export function isTarotResponse(value: unknown): value is TarotResponse {
  return TarotResponseSchema.safeParse(value).success;
}

function stripFences(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

/** Карта из ответа модели: id/позиция — непустые строки, положение —
 *  строго из enum, толкование — триммированное 1..MAX. Имя и URL
 *  берутся из канона, а не из модели. */
const ModelCardSchema = z.object({
  id: z.string().min(1),
  position: z.string().min(1),
  orientation: TarotOrientationSchema,
  meaning: z.string().trim().min(1).max(MAX_RESPONSE_FIELD_LENGTH),
});

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
    cards?: unknown;
    summary?: unknown;
  };

  if (!Array.isArray(raw.cards) || raw.cards.length !== spread.cardCount) {
    return null;
  }
  const summary = z
    .string()
    .trim()
    .min(1)
    .max(MAX_RESPONSE_FIELD_LENGTH)
    .safeParse(raw.summary);
  if (!summary.success) return null;

  const cards: TarotCard[] = [];

  for (let i = 0; i < spread.cardCount; i++) {
    const card = ModelCardSchema.safeParse(raw.cards[i]);
    const want = expected[i];
    if (!card.success || !want) return null;
    const got = card.data;

    // Строгое соответствие вытянутому: те же id, позиция и положение, тот же порядок.
    if (
      got.id !== want.id ||
      got.position !== want.position ||
      got.orientation !== want.orientation
    ) {
      return null;
    }

    cards.push(buildTarotCard(want, got.meaning, imageBaseUrl));
  }

  return {
    cards,
    summary: summary.data,
    backImageUrl: tarotBackImageUrl(imageBaseUrl),
  };
}
