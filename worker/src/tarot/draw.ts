// Узел workflow "draw": сервер случайно тянет 3 уникальные карты.
// LLM их только толкует — так нет подтасовок и маппинг на изображения детерминирован.
import type { DrawnCard, TarotPosition } from "../types";
import { MAJOR_ARCANA } from "./deck";

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

/** crypto-based rand для продакшена (Worker: crypto.getRandomValues доступен). */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] as number) / 0xffffffff;
}

/** Тянет 3 уникальные карты из 22. rand инжектится для детерминированных тестов. */
export function drawThreeCards(rand: () => number = Math.random): DrawnCard[] {
  const indices = MAJOR_ARCANA.map((_, i) => i);

  // Частичный Фишер-Йетс на первые 3 позиции.
  for (let i = 0; i < SPREAD_POSITIONS.length; i++) {
    const j = i + Math.floor(rand() * (indices.length - i));
    const tmp = indices[i] as number;
    indices[i] = indices[j] as number;
    indices[j] = tmp;
  }

  return SPREAD_POSITIONS.map((position, slot) => {
    const card = MAJOR_ARCANA[indices[slot] as number];
    if (!card) throw new Error("draw_failed");

    return { id: card.id, name: card.nameRu, position };
  });
}
