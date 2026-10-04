// Узел workflow "prompt": собирает промт с уже вытянутыми картами.
// Список карт подставляется в промт, чтобы LLM не выдумывала имена.
import type { DrawnCard } from "../types";
import { POSITION_LABELS_RU } from "./draw";

export function tarotPrompt(question: string, drawnCards: DrawnCard[]): string {
  const lines = drawnCards.map(
    (card, i) =>
      `${i + 1}. [${card.position}] ${card.name} (id: ${card.id}) — ${POSITION_LABELS_RU[card.position]}`,
  );

  return [
    "Ты — опытный таролог. Отвечай на русском языке в мистическом стиле.",
    "Не упоминай, что ты искусственный интеллект.",
    "Карты уже вытянуты сервером. Не меняй их порядок, не добавляй других карт, не переименовывай id.",
    "Истолкуй каждую карту в контексте её позиции и вопроса пользователя.",
    "Верни только валидный JSON без markdown и без ```.",
    "JSON должен содержать поля: cards (ровно 3 элемента: {id — ровно как в списке, position — ровно как в списке, meaning — толкование 1-3 предложения}), summary (общий вывод по раскладу 2-4 предложения).",
    "",
    "Вытянутые карты:",
    ...lines,
    "",
    `Вопрос пользователя: ${question}`,
  ].join("\n");
}
