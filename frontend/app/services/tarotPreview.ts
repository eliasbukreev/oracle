// Дев-фикстура расклада для превью экранов без бэкенда.
// Используется только в dev (см. useTarotFlow.preview): в прод-бандл
// попадает лишь через динамический import внутри `import.meta.dev`.
import type { TarotResponse } from "~/types/oracle";

/** Base URL картинок. Тот же, что TAROT_IMAGE_BASE_URL у воркера. */
export const PREVIEW_IMAGE_BASE_URL = "https://fivemanarmy.s3.cloud.ru";

const img = (file: string) => `${PREVIEW_IMAGE_BASE_URL}/tarot/${file}`;

/** Фиксированный выразительный расклад: есть и прямая, и перевёрнутая. */
export const PREVIEW_SPREAD: TarotResponse = {
  cards: [
    {
      id: "the-fool",
      name: "Шут",
      position: "past",
      orientation: "upright",
      meaning:
        "В прошлом ты шагнул в неизвестность налегке — и это было правильно.",
      imageUrl: img("00-TheFool.webp"),
    },
    {
      id: "the-magician",
      name: "Маг",
      position: "present",
      orientation: "reversed",
      meaning:
        "Сейчас сила есть, но растрачивается впустую: соберись на одном деле.",
      imageUrl: img("01-TheMagician.webp"),
    },
    {
      id: "death",
      name: "Смерть",
      position: "future",
      orientation: "upright",
      meaning:
        "Впереди конец старого этапа. Не держись за отжившее — дальше легче.",
      imageUrl: img("13-Death.webp"),
    },
  ],
  summary:
    "Прошлое отпустило, настоящее требует собранности, будущее — смелости отпустить.",
  backImageUrl: img("CardBacks.webp"),
};

export type PreviewKind = "loading" | "card-0" | "card-1" | "card-2" | "finale";
