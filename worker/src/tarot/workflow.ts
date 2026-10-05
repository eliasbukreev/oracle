import { parseQuestion } from "../oracle";
import type { OracleProvider, TarotResponse } from "../types";
import { drawSpread } from "./draw";
import { SPREADS } from "./spreads";

export interface TarotState {
  question: string;
  provider: OracleProvider;
  randomFn?: () => number;
}

export type TarotRunResult =
  | { ok: true; response: TarotResponse }
  | { ok: false; blocked: boolean }
  | { ok: false; blocked: false; error: "invalid_request" };

export async function runTarotWorkflow(
  payload: unknown,
  state: Omit<TarotState, "question">,
): Promise<TarotRunResult> {
  // Узел 1: валидация входа.
  const question = parseQuestion(payload);
  if (!question) {
    return { ok: false, blocked: false, error: "invalid_request" };
  }

  // Узел 2: классификация. Любой сбой → classic, это не ошибка.
  const classification = await state.provider
    .classify(question)
    .catch(() => null);
  const spread = classification?.spread ?? SPREADS.classic;
  const variants = classification?.variants;

  // Узел 3: вытягивание карт сервером.
  const drawnCards = drawSpread(spread, state.randomFn);

  // Узлы 4-6 (prompt → call → validate) живут внутри провайдера,
  // чтобы fallback мог повторить всю связку тем же входом.
  return state.provider.askTarot({ question, spread, drawnCards, variants });
}
