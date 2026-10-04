import type { DrawnCard } from "../types";
import { deckCardById } from "./deck";
import { ORIENTATION_LABELS_RU, POSITION_LABELS_RU } from "./draw";

export function tarotPrompt(question: string, drawnCards: DrawnCard[]): string {
  const lines = drawnCards.map((card, i) => {
    const deck = deckCardById(card.id);
    const reference =
      card.orientation === "reversed" ? deck?.meaningRev : deck?.meaningUp;

    return [
      `${i + 1}. [${card.position} — ${POSITION_LABELS_RU[card.position]}] ${card.name} (id: ${card.id}), положение: ${ORIENTATION_LABELS_RU[card.orientation]}.`,
      `   Эталонное значение: «${reference ?? "толкуй по классической традиции Райдера-Уэйта"}».`,
    ].join("\n");
  });

  return [
    "Ты — опытный таролог. Отвечай на русском языке в мистическом стиле.",
    "Не упоминай, что ты искусственный интеллект.",
    "Карты уже вытянуты сервером. Не меняй их порядок, положение и id, не добавляй других карт.",
    "Каждую карту толкуй строго в выпавшем положении (ПРЯМАЯ или ПЕРЕВЁРНУТАЯ) и в контексте её позиции и вопроса пользователя.",
    "Толкование должно опираться на эталонное значение и не противоречить ему.",
    "Верни только валидный JSON без markdown и без ```.",
    "JSON должен содержать поля: cards (ровно 3 элемента: {id — ровно как в списке, position — ровно как в списке, orientation — ровно как в списке (upright/reversed), meaning — толкование 1-3 предложения}), summary (общий вывод по раскладу 2-4 предложения).",
    "",
    "Вытянутые карты:",
    ...lines,
    "",
    `Вопрос пользователя: ${question}`,
  ].join("\n");
}
