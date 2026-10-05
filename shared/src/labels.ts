import type { SpreadId } from "./tarot";

export const SPREAD_POSITION_LABELS_RU: Record<
  SpreadId,
  Record<string, string>
> = {
  classic: {
    past: "Прошлое",
    present: "Настоящее",
    future: "Будущее",
  },
  relations: {
    self: "Я в этих отношениях",
    other: "Другой человек",
    attraction: "Что нас притягивает",
    obstacle: "Что мешает",
    potential: "Потенциал отношений",
  },
  choice: {
    core: "Суть ситуации",
    optionA: "Если выбрать вариант А",
    outcomeA: "Что даст вариант А",
    optionB: "Если выбрать вариант Б",
    outcomeB: "Что даст вариант Б",
  },
  yesno: {
    pro: "Что говорит «за»",
    con: "Что говорит «против»",
    outcome: "Вероятный результат",
  },
  diagnose: {
    reality: "Что происходит на самом деле",
    blindspot: "Чего я не вижу",
    block: "Что мешает",
    resource: "Что может помочь",
    trend: "К чему ведёт ситуация",
  },
  period: {
    energy: "Общая энергия периода",
    work: "Работа и деньги",
    love: "Отношения",
    trial: "Главное испытание",
    advice: "Совет",
  },
  daily: {
    focus: "На что обратить внимание",
  },
};

export function positionLabel(spread: SpreadId, position: string): string {
  return SPREAD_POSITION_LABELS_RU[spread]?.[position] ?? position;
}
