// Лёгкий langgraph-like workflow расклада: узлы-шаги с общим состоянием.
// Без внешних зависимостей: validate → draw → askTarot (prompt+call+validate внутри провайдера).
import { parseQuestion } from "../oracle";
import type { OracleProvider, TarotResponse } from "../types";
import { drawThreeCards } from "./draw";

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

  // Узел 2: вытягивание карт сервером.
  const drawnCards = drawThreeCards(state.randomFn);

  // Узлы 3-5 (prompt → call → validate) живут внутри провайдера,
  // чтобы fallback мог повторить всю связку тем же входом.
  return state.provider.askTarot({ question, drawnCards });
}
