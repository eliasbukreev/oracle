// Лёгкий langgraph-like workflow расклада: узлы-шаги с общим состоянием.
// Без внешних зависимостей: validate → draw → askTarot (prompt+call+validate внутри провайдера).
import { parseQuestion } from "../oracle";
import type { ChoiceVariants, OracleProvider, TarotResponse } from "../types";
import { drawSpread } from "./draw";
import { parseVariants, resolveSpread } from "./spreads";

export interface TarotState {
  question: string;
  provider: OracleProvider;
  randomFn?: () => number;
}

export type TarotRunResult =
  | { ok: true; response: TarotResponse }
  | { ok: false; blocked: boolean }
  | { ok: false; blocked: false; error: "invalid_request" };

function spreadFromPayload(payload: unknown): ReturnType<typeof resolveSpread> {
  const id =
    payload && typeof payload === "object"
      ? (payload as { spread?: unknown }).spread
      : undefined;
  return resolveSpread(id);
}

export async function runTarotWorkflow(
  payload: unknown,
  state: Omit<TarotState, "question">,
): Promise<TarotRunResult> {
  // Узел 1: валидация входа.
  const question = parseQuestion(payload);
  if (!question) {
    return { ok: false, blocked: false, error: "invalid_request" };
  }

  const spread = spreadFromPayload(payload);

  // Крест выбора без названий вариантов — invalid_request.
  let variants: ChoiceVariants | undefined;
  if (spread.requiresVariants) {
    const parsed = parseVariants(payload);
    if (!parsed) {
      return { ok: false, blocked: false, error: "invalid_request" };
    }
    variants = parsed;
  }

  // Узел 2: вытягивание карт сервером.
  const drawnCards = drawSpread(spread, state.randomFn);

  // Узлы 3-5 (prompt → call → validate) живут внутри провайдера,
  // чтобы fallback мог повторить всю связку тем же входом.
  return state.provider.askTarot({ question, spread, drawnCards, variants });
}
