import type { ChoiceVariants, DrawnCard, SpreadDef } from "../types";
import { deckCardById } from "./deck";
import { ORIENTATION_LABELS_RU } from "./draw";

/** Позиция относится к варианту А (optionA/outcomeA) или Б (optionB/outcomeB). */
function variantForPosition(
  position: string,
): "a" | "b" | null {
  if (position === "optionA" || position === "outcomeA") return "a";
  if (position === "optionB" || position === "outcomeB") return "b";
  return null;
}

export function tarotPrompt(
  question: string,
  drawnCards: DrawnCard[],
  spread: SpreadDef,
  variants?: ChoiceVariants,
): string {
  const lines = drawnCards.map((card, i) => {
    const deck = deckCardById(card.id);
    const reference =
      card.orientation === "reversed" ? deck?.meaningRev : deck?.meaningUp;
    const label = spread.positionLabelsRu[card.position] ?? card.position;
    const variantKey = variantForPosition(card.position);
    const variantName =
      variantKey && variants ? variants[variantKey] : null;
    const variantSuffix = variantName ? ` Вариант: «${variantName}».` : "";

    return [
      `${i + 1}. [${card.position} — ${label}] ${card.name} (id: ${card.id}), положение: ${ORIENTATION_LABELS_RU[card.orientation]}.${variantSuffix}`,
      `   Эталонное значение: «${reference ?? "толкуй по классической традиции Райдера-Уэйта"}».`,
    ].join("\n");
  });

  const variantsIntro =
    spread.requiresVariants && variants
      ? [
          `Вариант А: «${variants.a}». Вариант Б: «${variants.b}».`,
          "Карты позиций optionA/outcomeA относятся к варианту А, optionB/outcomeB — к варианту Б.",
          "",
        ]
      : [];

  return [
    "Ты — опытный таролог. Отвечай на русском языке в мистическом стиле.",
    "Не упоминай, что ты искусственный интеллект.",
    "Карты уже вытянуты сервером. Не меняй их порядок, положение и id, не добавляй других карт.",
    "Каждую карту толкуй строго в выпавшем положении (ПРЯМАЯ или ПЕРЕВЁРНУТАЯ) и в контексте её позиции и вопроса пользователя.",
    "Толкование должно опираться на эталонное значение и не противоречить ему.",
    `Расклад: ${spread.descriptionRu}`,
    "Верни только валидный JSON без markdown и без ```.",
    `JSON должен содержать поля: cards (ровно ${spread.cardCount} элемента: {id — ровно как в списке, position — ровно как в списке, orientation — ровно как в списке (upright/reversed), meaning — толкование 1-3 предложения}), summary (общий вывод по раскладу 2-4 предложения).`,
    "",
    "Вытянутые карты:",
    ...lines,
    "",
    ...variantsIntro,
    `Вопрос пользователя: ${question}`,
  ].join("\n");
}
