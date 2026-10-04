import type { DrawnCard, TarotCard } from "../types";
import { deckCardById } from "./deck";

export const TAROT_CARD_BACK_IMAGE = "CardBacks.webp";

/** Нормализация base URL из env: трим + без хвостовых слэшей. */
export function normalizeImageBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/** Имя PNG-набора -> ключ в R2 (тот же basename, WebP). */
export function toImageKey(pngName: string): string {
  return pngName.toLowerCase().endsWith(".png")
    ? pngName.slice(0, -".png".length) + ".webp"
    : pngName;
}

/** Абсолютный URL изображения карты. Пустая строка = R2 не настроен. */
export function tarotImageUrl(baseUrl: string, pngName: string): string {
  const base = normalizeImageBaseUrl(baseUrl);
  if (!base) return "";
  return `${base}/tarot/${toImageKey(pngName)}`;
}

/** Абсолютный URL рубашки. Пустая строка = R2 не настроен. */
export function tarotBackImageUrl(baseUrl: string): string {
  const base = normalizeImageBaseUrl(baseUrl);
  if (!base) return "";
  return `${base}/tarot/${TAROT_CARD_BACK_IMAGE}`;
}

/** Собирает карточку ответа API: канон из колоды + толкование модели + URL. */
export function buildTarotCard(
  want: DrawnCard,
  meaning: string,
  baseUrl: string,
): TarotCard {
  const image = deckCardById(want.id)?.image ?? "";
  return {
    id: want.id,
    name: want.name,
    position: want.position,
    orientation: want.orientation,
    meaning,
    imageUrl: image ? tarotImageUrl(baseUrl, image) : "",
  };
}
