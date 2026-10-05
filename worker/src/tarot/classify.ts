// Узел workflow "classify": дешёвый вызов к LLM выбирает расклад
// под вопрос пользователя. Любой сбой → classic, это не ошибка.
import type { Classification } from "../types";
import { parseVariants, resolveSpread, SPREADS } from "./spreads";

export const CLASSIFY_MAX_TOKENS = 150;
export const CLASSIFY_TIMEOUT_MS = 10_000;

export function classifyPrompt(question: string): string {
  const lines = Object.values(SPREADS).map(
    (spread) => `- ${spread.id}: ${spread.descriptionRu}`,
  );

  return [
    "Ты — классификатор вопросов для таро-раскладов. Отвечай только JSON.",
    "Выбери расклад, который лучше всего подходит под вопрос пользователя.",
    "Если вопрос про выбор между двумя различимыми вариантами — choice,",
    "и извлеки названия вариантов дословно из вопроса.",
    "Если два варианта неразличимы — не выбирай choice.",
    "Если вопрос требует решения да или нет — yesno.",
    "Если вопрос широкий, про понимание ситуации («Помоги мне разобраться») — diagnose.",
    "Если вопрос про неделю, месяц или год — period.",
    "Если вопрос про сегодня или завтра — daily.",
    "Если вопрос про динамику пары и отношения двоих — relations.",
    "Во всех остальных случаях — classic.",
    "Верни только валидный JSON без markdown и без ```.",
    "Формат: {spread: classic|relations|choice|yesno|diagnose|period|daily, variants?: {a, b}}.",
    "Поле variants — только для choice, обе строки непустые.",
    "",
    "Расклады:",
    ...lines,
    "",
    `Вопрос пользователя: ${question}`,
  ].join("\n");
}

/** Разбирает ответ классификатора. Мусор, choice без вариантов
 *  и всё сомнительное → classic. Никогда не бросает. */
export function parseClassification(content: string): Classification {
  try {
    const parsed: unknown = JSON.parse(
      content
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, ""),
    );
    if (!parsed || typeof parsed !== "object")
      return { spread: SPREADS.classic };

    const raw = parsed as { spread?: unknown; variants?: unknown };
    const spread = resolveSpread(raw.spread);

    if (!spread.requiresVariants) return { spread };

    const variants = parseVariants({ variants: raw.variants });
    if (!variants) return { spread: SPREADS.classic };
    return { spread, variants };
  } catch {
    return { spread: SPREADS.classic };
  }
}
