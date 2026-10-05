// Дев-фикстуры раскладов для превью экранов без бэкенда.
// Только текст (imageUrl пустые): для вёрстки достаточно, картинки
// проверяются живым раскладом. Используется только в dev.
import type { SpreadId, TarotResponse } from "~/types/oracle";

function card(
  id: string,
  name: string,
  position: string,
  meaning: string,
  orientation: "upright" | "reversed" = "upright",
) {
  return { id, name, position, orientation, meaning, imageUrl: "" };
}

export const PREVIEW_CLASSIC: TarotResponse = {
  spread: "classic",
  cards: [
    card("the-fool", "Шут", "past", "Начало позади."),
    card("the-magician", "Маг", "present", "Сила в руках.", "reversed"),
    card("the-high-priestess", "Верховная Жрица", "future", "Тайна рядом."),
  ],
  summary: "Итог расклада.",
  backImageUrl: "",
};

export const PREVIEW_RELATIONS: TarotResponse = {
  spread: "relations",
  cards: [
    card("the-lovers", "Влюблённые", "self", "Ты открыт навстречу."),
    card("the-devil", "Дьявол", "other", "Другой держится за контроль."),
    card("the-sun", "Солнце", "attraction", "Тянет тепло и радость."),
    card("the-tower", "Башня", "obstacle", "Мешает страх перемен.", "reversed"),
    card("the-star", "Звезда", "potential", "Надежда есть."),
  ],
  summary: "Пара держится на тепле, мешает страх.",
  backImageUrl: "",
};

export const PREVIEW_CHOICE: TarotResponse = {
  spread: "choice",
  cards: [
    card("the-hanged-man", "Повешенный", "core", "Пауза перед решением."),
    card("the-chariot", "Колесница", "optionA", "Рывок вперёд."),
    card("the-sun", "Солнце", "outcomeA", "Ясный успех."),
    card("death", "Смерть", "optionB", "Конец старого.", "reversed"),
    card("the-moon", "Луна", "outcomeB", "Туман и сомнения."),
  ],
  summary: "Ветвь А выглядит благоприятнее.",
  backImageUrl: "",
  variants: { a: "Сменить работу", b: "Остаться" },
};

export const PREVIEWS: Record<SpreadId, TarotResponse> = {
  classic: PREVIEW_CLASSIC,
  relations: PREVIEW_RELATIONS,
  choice: PREVIEW_CHOICE,
};
