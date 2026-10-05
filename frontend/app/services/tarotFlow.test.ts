import { describe, expect, it } from "vitest";
import {
  INITIAL_FLOW_STATE,
  reduceFlow,
  type TarotFlowEvent,
  type TarotFlowState,
} from "./tarotFlow";

const RESOLVED_3: TarotFlowEvent = { type: "resolved", cardCount: 3 };
const RESOLVED_5: TarotFlowEvent = { type: "resolved", cardCount: 5 };

function send(state: TarotFlowState, ...events: TarotFlowEvent[]): TarotFlowState {
  return events.reduce((s, event) => reduceFlow(s, event), state);
}

const ask = { type: "ask" } as const;
const next = { type: "next" } as const;
const reset = { type: "reset" } as const;
const rejected = { type: "rejected" } as const;

describe("reduceFlow", () => {
  it("стартует с home", () => {
    expect(INITIAL_FLOW_STATE).toEqual({
      screen: "home",
      cardIndex: 0,
      cardCount: 0,
    });
  });

  it("полный счастливый путь: home → loading → card-0 → card-1 → card-2 → finale", () => {
    expect(send(INITIAL_FLOW_STATE, ask)).toEqual({
      screen: "loading",
      cardIndex: 0,
      cardCount: 0,
    });
    expect(send(INITIAL_FLOW_STATE, ask, RESOLVED_3)).toEqual({
      screen: "card",
      cardIndex: 0,
      cardCount: 3,
    });
    expect(send(INITIAL_FLOW_STATE, ask, RESOLVED_3, next)).toEqual({
      screen: "card",
      cardIndex: 1,
      cardCount: 3,
    });
    expect(send(INITIAL_FLOW_STATE, ask, RESOLVED_3, next, next)).toEqual({
      screen: "card",
      cardIndex: 2,
      cardCount: 3,
    });
    expect(
      send(INITIAL_FLOW_STATE, ask, RESOLVED_3, next, next, next),
    ).toEqual({ screen: "finale", cardIndex: 2, cardCount: 3 });
  });

  it("расклад на 5 карт: финал после пятой", () => {
    const s4 = send(
      INITIAL_FLOW_STATE,
      ask,
      RESOLVED_5,
      next,
      next,
      next,
      next,
    );
    expect(s4).toEqual({ screen: "card", cardIndex: 4, cardCount: 5 });
    expect(send(s4, next)).toEqual({
      screen: "finale",
      cardIndex: 4,
      cardCount: 5,
    });
  });

  it("ошибка возвращает на home", () => {
    expect(send(INITIAL_FLOW_STATE, ask, rejected)).toEqual({
      screen: "home",
      cardIndex: 0,
      cardCount: 0,
    });
  });

  it("reset возвращает на home из любого экрана", () => {
    expect(send(INITIAL_FLOW_STATE, ask, RESOLVED_3, next, reset)).toEqual({
      screen: "home",
      cardIndex: 0,
      cardCount: 0,
    });
    expect(
      send(INITIAL_FLOW_STATE, ask, RESOLVED_3, next, next, next, reset),
    ).toEqual({ screen: "home", cardIndex: 0, cardCount: 0 });
  });

  it("игнорирует события не в том экране", () => {
    // next и resolved вне своих экранов ничего не меняют
    expect(send(INITIAL_FLOW_STATE, next)).toEqual(INITIAL_FLOW_STATE);
    expect(send(INITIAL_FLOW_STATE, RESOLVED_3)).toEqual(INITIAL_FLOW_STATE);
    expect(send(INITIAL_FLOW_STATE, rejected)).toEqual(INITIAL_FLOW_STATE);
    // повторный ask в loading — тоже
    expect(send(INITIAL_FLOW_STATE, ask, ask)).toEqual({
      screen: "loading",
      cardIndex: 0,
      cardCount: 0,
    });
    // next на финале никуда не ведёт
    const finale = send(
      INITIAL_FLOW_STATE,
      ask,
      RESOLVED_3,
      next,
      next,
      next,
    );
    expect(send(finale, next)).toEqual(finale);
  });
});
