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
    requiresVariants: true,
  },
};

/** Неизвестный id → дефолтный classic (не ошибка, как с lang). */
export function resolveSpread(id: unknown): SpreadDef {
  if (id === "relations" || id === "choice") return SPREADS[id];
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
