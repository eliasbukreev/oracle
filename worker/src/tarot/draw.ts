import type { DrawnCard, TarotOrientation, TarotPosition } from "../types";
import { FULL_DECK } from "./deck";

export const SPREAD_POSITIONS: readonly TarotPosition[] = [
  "past",
  "present",
  "future",
];

export const POSITION_LABELS_RU: Record<TarotPosition, string> = {
  past: "Прошлое",
  present: "Настоящее",
  future: "Будущее",
};

export const ORIENTATION_LABELS_RU: Record<TarotOrientation, string> = {
  upright: "ПРЯМАЯ",
  reversed: "ПЕРЕВЁРНУТАЯ",
};

/** crypto-based rand для продакшена (Worker: crypto.getRandomValues доступен). */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] as number) / 0xffffffff;
}

/** Тянет 3 уникальные карты из 78. rand инжектится для детерминированных тестов. */
export function drawThreeCards(rand: () => number = Math.random): DrawnCard[] {
  const indices = FULL_DECK.map((_, i) => i);

  // Частичный Фишер-Йетс на первые 3 позиции.
  for (let i = 0; i < SPREAD_POSITIONS.length; i++) {
    const j = i + Math.floor(rand() * (indices.length - i));
    const tmp = indices[i] as number;
    indices[i] = indices[j] as number;
    indices[j] = tmp;
  }

  return SPREAD_POSITIONS.map((position, slot) => {
    const card = FULL_DECK[indices[slot] as number];
    if (!card) throw new Error("draw_failed");

    // Монетка положения: <0.5 — прямая, иначе перевёрнутая.
    const orientation: TarotOrientation = rand() < 0.5 ? "upright" : "reversed";

    return { id: card.id, name: card.nameRu, position, orientation };
  });
}
