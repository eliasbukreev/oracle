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

export const PREVIEW_YESNO: TarotResponse = {
  spread: "yesno",
  cards: [
    card("ace-of-pentacles", "Туз Пентаклей", "pro", "Ресурсы за тебя."),
    card("five-of-cups", "Пятёрка Кубков", "con", "Что-то уже потеряно.", "reversed"),
    card("the-chariot", "Колесница", "outcome", "Движение вперёд."),
  ],
  summary: "Скорее да, но разберись с потерями.",
  backImageUrl: "",
};

export const PREVIEW_DIAGNOSE: TarotResponse = {
  spread: "diagnose",
  cards: [
    card("the-moon", "Луна", "reality", "Туман вместо ясности."),
    card("the-high-priestess", "Верховная Жрица", "blindspot", "Ты не слышишь интуицию."),
    card("the-devil", "Дьявол", "block", "Держит привычка.", "reversed"),
    card("strength", "Сила", "resource", "Спокойная настойчивость."),
    card("the-star", "Звезда", "trend", "Свет впереди."),
  ],
  summary: "Разберись с туманом — тренд хороший.",
  backImageUrl: "",
};

export const PREVIEW_PERIOD: TarotResponse = {
  spread: "period",
  cards: [
    card("wheel-of-fortune", "Колесо Фортуны", "energy", "Время перемен."),
    card("three-of-pentacles", "Тройка Пентаклей", "work", "Мастерство заметят."),
    card("two-of-cups", "Двойка Кубков", "love", "Тёплый контакт."),
    card("the-tower", "Башня", "trial", "Что-то посыпется.", "reversed"),
    card("temperance", "Умеренность", "advice", "Держи баланс."),
  ],
  summary: "Активный период: работай, но не рвись.",
  backImageUrl: "",
};

export const PREVIEW_DAILY: TarotResponse = {
  spread: "daily",
  cards: [
    card("the-hermit", "Отшельник", "focus", "Побудь в тишине."),
  ],
  summary: "День для тишины.",
  backImageUrl: "",
};

export const PREVIEWS: Record<SpreadId, TarotResponse> = {
  classic: PREVIEW_CLASSIC,
  relations: PREVIEW_RELATIONS,
  choice: PREVIEW_CHOICE,
  yesno: PREVIEW_YESNO,
  diagnose: PREVIEW_DIAGNOSE,
  period: PREVIEW_PERIOD,
  daily: PREVIEW_DAILY,
};
