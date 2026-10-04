// Тексты и логика загрузочного экрана. Чистый модуль без Vue/Nuxt —
// покрывается обычными unit-тестами. Никаких фейковых процентов:
// только фазовые статусы по elapsed-времени и тихие фразы-шёпоты.

export interface LoadingPhase {
  /** Фаза активна, пока elapsedSec < untilSec. */
  untilSec: number;
  text: string;
}

export const LOADING_PHASES: readonly LoadingPhase[] = [
  { untilSec: 8, text: "Тасую колоду…" },
  { untilSec: 18, text: "Раскладываю карты…" },
  { untilSec: Number.POSITIVE_INFINITY, text: "Вглядываюсь в знаки…" },
];

export function phaseForElapsed(elapsedSec: number): string {
  const phase = LOADING_PHASES.find((p) => elapsedSec < p.untilSec);
  return (phase ?? LOADING_PHASES[LOADING_PHASES.length - 1] as LoadingPhase).text;
}

/** Курированные шёпоты. Короткие, в тоне гайда: латунь, звёзды, тишина. */
export const WHISPERS: readonly string[] = [
  "Звёзды уже легли — осталось их прочесть.",
  "Тишина тоже отвечает.",
  "Карты помнят то, что ты забыл.",
  "Вопрос задан — колесо тронулось.",
  "Тьма между звёзд тоже знак.",
  "Не торопи неизвестное.",
  "Латунь звенит, когда правда рядом.",
  "Прошлое держит одну нить.",
  "Будущее любит тех, кто ждёт.",
  "Слушай паузы между мыслями.",
  "То, что скрыто, уже выбрало тебя.",
  "Ночь — самая честная советчица.",
  "Каждый вопрос — это уже половина ответа.",
  "Знаки не спешат к нетерпеливым.",
  "Держи дыхание — карты ложатся.",
  "Тайна любит тихий голос.",
  "Смотри не на карту, а сквозь неё.",
  "Вселенная тасует медленно.",
  "Ответ ближе, чем кажется.",
  "Пыль звёзд оседает на стол.",
];

export interface WhisperSpot {
  top: string;
  left: string;
  rotate: string;
}

/** Периферийные зоны для шёпотов: середина (30–65% высоты) занята
 *  колодой и статусом, поэтому споты — только верхней и нижней полосой.
 *  Координаты — в процентах от контейнера. */
export const WHISPER_SPOTS: readonly WhisperSpot[] = [
  { top: "4%", left: "4%", rotate: "-4deg" },
  { top: "8%", left: "64%", rotate: "3deg" },
  { top: "14%", left: "30%", rotate: "-2deg" },
  { top: "18%", left: "80%", rotate: "-3deg" },
  { top: "22%", left: "8%", rotate: "4deg" },
  { top: "70%", left: "72%", rotate: "-4deg" },
  { top: "74%", left: "4%", rotate: "2deg" },
  { top: "80%", left: "40%", rotate: "3deg" },
  { top: "86%", left: "64%", rotate: "-2deg" },
  { top: "90%", left: "18%", rotate: "4deg" },
];

/** Случайная фраза, исключая уже показанные. Пустой exclude = любая. */
export function pickWhisper(
  exclude: readonly string[] = [],
  rand: () => number = Math.random,
): string {
  const pool = WHISPERS.filter((w) => !exclude.includes(w));
  const source = pool.length > 0 ? pool : [...WHISPERS];
  const index = Math.floor(rand() * source.length);
  return source[index] as string;
}

/** Случайный спот, исключая занятые индексы. */
export function pickSpot(
  taken: readonly number[] = [],
  rand: () => number = Math.random,
): number {
  const free = WHISPER_SPOTS.map((_, i) => i).filter((i) => !taken.includes(i));
  const source = free.length > 0 ? free : WHISPER_SPOTS.map((_, i) => i);
  const index = Math.floor(rand() * source.length);
  return source[index] as number;
}
