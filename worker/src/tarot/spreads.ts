// Реестр раскладов: сколько карт, какие позиции, нужны ли варианты выбора.
// Промт/валидация/фронт строятся от этого реестра, а не от захардкоженной тройки.
import type { ChoiceVariants, SpreadDef, SpreadId } from "../types";

export const MAX_VARIANT_LENGTH = 100;

export const SPREADS: Record<SpreadId, SpreadDef> = {
  classic: {
    id: "classic",
    cardCount: 3,
    positions: ["past", "present", "future"],
    positionLabelsRu: {
      past: "Прошлое",
      present: "Настоящее",
      future: "Будущее",
    },
    descriptionRu:
      "Классический расклад на три карты: прошлое — настоящее — будущее. " +
      "Покажи динамику развития ситуации от корней к исходу.",
    requiresVariants: false,
  },
  relations: {
    id: "relations",
    cardCount: 5,
    positions: ["self", "other", "attraction", "obstacle", "potential"],
    positionLabelsRu: {
      self: "Я в этих отношениях",
      other: "Другой человек",
      attraction: "Что нас притягивает",
      obstacle: "Что мешает",
      potential: "Потенциал отношений",
    },
    descriptionRu:
      "Расклад на отношения: первые две карты — двое людей, третья — " +
      "что их связывает, четвёртая — препятствие между ними, пятая — " +
      "итог и потенциал пары. В выводе оцени отношения в целом.",
    requiresVariants: false,
  },
  choice: {
    id: "choice",
    cardCount: 5,
    positions: ["core", "optionA", "outcomeA", "optionB", "outcomeB"],
    positionLabelsRu: {
      core: "Суть ситуации",
      optionA: "Если выбрать вариант А",
      outcomeA: "Что даст вариант А",
      optionB: "Если выбрать вариант Б",
      outcomeB: "Что даст вариант Б",
    },
    descriptionRu:
      "Расклад выбора между двумя путями: центральная карта — суть " +
      "ситуации, ветви А и Б — путь и его плоды. В выводе сравни ветви " +
      "и укажи, какая выглядит благоприятнее, но решение оставь человеку.",
    requiresVariants: true,
  },
  yesno: {
    id: "yesno",
    cardCount: 3,
    positions: ["pro", "con", "outcome"],
    positionLabelsRu: {
      pro: "Что говорит «за»",
      con: "Что говорит «против»",
      outcome: "Вероятный результат",
    },
    descriptionRu:
      "Расклад для конкретного решения. Первая карта — что работает " +
      "в пользу, вторая — препятствие и риск, третья — к чему движется " +
      "ситуация при нынешних обстоятельствах. Не назначай картам " +
      "механические «да» и «нет»: взвесь соотношение и содержание " +
      "третьей позиции и сведи итог к склонению, а не к вердикту.",
    requiresVariants: false,
  },
  diagnose: {
    id: "diagnose",
    cardCount: 5,
    positions: ["reality", "blindspot", "block", "resource", "trend"],
    positionLabelsRu: {
      reality: "Что происходит на самом деле",
      blindspot: "Чего я не вижу",
      block: "Что мешает",
      resource: "Что может помочь",
      trend: "К чему ведёт ситуация",
    },
    descriptionRu:
      "Диагностический расклад, а не предсказательный. Первая карта — " +
      "основная динамика, а не фасад. Пятая — не неизбежный финал, " +
      "а тренд при сохранении текущей динамики: формулируй как " +
      "«если ничего не менять». Ресурсом может быть и жёсткая карта.",
    requiresVariants: false,
  },
  period: {
    id: "period",
    cardCount: 5,
    positions: ["energy", "work", "love", "trial", "advice"],
    positionLabelsRu: {
      energy: "Общая энергия периода",
      work: "Работа и деньги",
      love: "Отношения",
      trial: "Главное испытание",
      advice: "Совет",
    },
    descriptionRu:
      "Периодический обзор. Определи период из вопроса: неделя, месяц " +
      "или год; если не указан — толкуй нейтрально ко всем трём. " +
      "Пятая позиция важнее остальных: это практический ориентир, " +
      "а не прогноз. Испытание — не обязательно беда.",
    requiresVariants: false,
  },
  daily: {
    id: "daily",
    cardCount: 1,
    positions: ["focus"],
    positionLabelsRu: {
      focus: "На что обратить внимание",
    },
    descriptionRu:
      "Одна карта-ориентир на день. Определи из вопроса: сегодня или " +
      "завтра. Не превращай карту в конкретное предсказание события: " +
      "дай настрой и фокус внимания на день.",
    requiresVariants: false,
  },
};

/** Неизвестный id → дефолтный classic (не ошибка, как с lang). */
export function resolveSpread(id: unknown): SpreadDef {
  if (typeof id === "string" && id in SPREADS) {
    return SPREADS[id as SpreadId];
  }
  return SPREADS.classic;
}

/** Достаёт названия вариантов из тела запроса. Null = нет/битые
 *  (для choice это invalid_request, решает workflow). */
export function parseVariants(payload: unknown): ChoiceVariants | null {
  if (!payload || typeof payload !== "object") return null;

  const raw = (payload as { variants?: unknown }).variants;
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const a = typeof record.a === "string" ? record.a.trim() : "";
  const b = typeof record.b === "string" ? record.b.trim() : "";

  if (!a || !b) return null;
  if (a.length > MAX_VARIANT_LENGTH || b.length > MAX_VARIANT_LENGTH) {
    return null;
  }

  return { a, b };
}
