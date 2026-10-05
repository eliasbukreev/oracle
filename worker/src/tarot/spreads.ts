import {
  ChoiceVariantsSchema,
  SPREAD_POSITION_LABELS_RU,
} from "@oracle/shared";
import type { ChoiceVariants, SpreadDef, SpreadId } from "../types";

// Реэкспорт для тестов, канон лимитов — в shared.
export { MAX_VARIANT_LENGTH } from "@oracle/shared";

export const SPREADS: Record<SpreadId, SpreadDef> = {
  classic: {
    id: "classic",
    cardCount: 3,
    positions: ["past", "present", "future"],
    positionLabelsRu: SPREAD_POSITION_LABELS_RU.classic,
    descriptionRu:
      "Классический расклад на три карты: прошлое — настоящее — будущее. " +
      "Покажи динамику развития ситуации от корней к исходу.",
    requiresVariants: false,
  },
  relations: {
    id: "relations",
    cardCount: 5,
    positions: ["self", "other", "attraction", "obstacle", "potential"],
    positionLabelsRu: SPREAD_POSITION_LABELS_RU.relations,
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
    positionLabelsRu: SPREAD_POSITION_LABELS_RU.choice,
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
    positionLabelsRu: SPREAD_POSITION_LABELS_RU.yesno,
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
    positionLabelsRu: SPREAD_POSITION_LABELS_RU.diagnose,
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
    positionLabelsRu: SPREAD_POSITION_LABELS_RU.period,
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
    positionLabelsRu: SPREAD_POSITION_LABELS_RU.daily,
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
  const parsed = ChoiceVariantsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
