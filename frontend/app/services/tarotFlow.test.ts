import { describe, expect, it } from "vitest";
import {
  INITIAL_FLOW_STATE,
  reduceFlow,
  type TarotFlowState,
} from "./tarotFlow";

function send(
  state: TarotFlowState,
  ...types: Array<
    "ask" | "resolved" | "rejected" | "next" | "reset"
  >
): TarotFlowState {
  return types.reduce(
    (s, type) => reduceFlow(s, { type }),
    state,
  );
}

describe("reduceFlow", () => {
  it("стартует с home", () => {
    expect(INITIAL_FLOW_STATE).toEqual({ screen: "home", cardIndex: 0 });
  });

  it("полный счастливый путь: home → loading → card-0 → card-1 → card-2 → finale", () => {
    expect(send(INITIAL_FLOW_STATE, "ask")).toEqual({
      screen: "loading",
      cardIndex: 0,
    });
    expect(send(INITIAL_FLOW_STATE, "ask", "resolved")).toEqual({
      screen: "card",
      cardIndex: 0,
    });
    expect(send(INITIAL_FLOW_STATE, "ask", "resolved", "next")).toEqual({
      screen: "card",
      cardIndex: 1,
    });
    expect(
      send(INITIAL_FLOW_STATE, "ask", "resolved", "next", "next"),
    ).toEqual({ screen: "card", cardIndex: 2 });
    expect(
      send(INITIAL_FLOW_STATE, "ask", "resolved", "next", "next", "next"),
    ).toEqual({ screen: "finale", cardIndex: 2 });
  });

  it("ошибка возвращает на home", () => {
    expect(send(INITIAL_FLOW_STATE, "ask", "rejected")).toEqual({
      screen: "home",
      cardIndex: 0,
    });
  });

  it("reset возвращает на home из любого экрана", () => {
    expect(
      send(INITIAL_FLOW_STATE, "ask", "resolved", "next", "reset"),
    ).toEqual({ screen: "home", cardIndex: 0 });
    expect(
      send(
        INITIAL_FLOW_STATE,
        "ask",
        "resolved",
        "next",
        "next",
        "next",
        "reset",
      ),
    ).toEqual({ screen: "home", cardIndex: 0 });
  });

  it("игнорирует события не в том экране", () => {
    // next и resolved вне своих экранов ничего не меняют
    expect(send(INITIAL_FLOW_STATE, "next")).toEqual(INITIAL_FLOW_STATE);
    expect(send(INITIAL_FLOW_STATE, "resolved")).toEqual(INITIAL_FLOW_STATE);
    expect(send(INITIAL_FLOW_STATE, "rejected")).toEqual(INITIAL_FLOW_STATE);
    // повторный ask в loading — тоже
    expect(send(INITIAL_FLOW_STATE, "ask", "ask")).toEqual({
      screen: "loading",
      cardIndex: 0,
    });
    // next на финале никуда не ведёт
    const finale = send(
      INITIAL_FLOW_STATE,
      "ask",
      "resolved",
      "next",
      "next",
      "next",
    );
    expect(send(finale, "next")).toEqual(finale);
  });
});
