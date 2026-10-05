import type {
  DrawnCard,
  SpreadDef,
  TarotOrientation,
  TarotPosition,
} from "../types";
import { FULL_DECK } from "./deck";
import { SPREADS } from "./spreads";

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
/** Тянет N уникальных карт из 78 на заданные позиции.
 *  rand инжектится для детерминированных тестов. */
export function drawCards(
  positions: readonly TarotPosition[],
  rand: () => number = Math.random,
): DrawnCard[] {
  const indices = FULL_DECK.map((_, i) => i);

  // Частичный Фишер-Йетс на первые N позиций.
  for (let i = 0; i < positions.length; i++) {
    const j = i + Math.floor(rand() * (indices.length - i));
    const tmp = indices[i] as number;
    indices[i] = indices[j] as number;
    indices[j] = tmp;
  }

  return positions.map((position, slot) => {
    const card = FULL_DECK[indices[slot] as number];
    if (!card) throw new Error("draw_failed");

    // Монетка положения: <0.5 — прямая, иначе перевёрнутая.
    const orientation: TarotOrientation = rand() < 0.5 ? "upright" : "reversed";

    return { id: card.id, name: card.nameRu, position, orientation };
  });
}

/** Тянет 3 уникальные карты из 78. rand инжектится для детерминированных тестов. */
export function drawThreeCards(rand: () => number = Math.random): DrawnCard[] {
  return drawSpread(SPREADS.classic, rand);
}

/** Тянет карты под расклад из реестра. */
export function drawSpread(
  spread: SpreadDef,
  rand: () => number = Math.random,
): DrawnCard[] {
  return drawCards(spread.positions, rand);
}
