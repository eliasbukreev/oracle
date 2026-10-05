export type TarotScreen = "home" | "loading" | "card" | "finale";

export interface TarotFlowState {
  screen: TarotScreen;
  /** Индекс текущей карты на экране 'card' (0..cardCount-1). */
  cardIndex: number;
  /** Число карт в текущем раскладе. */
  cardCount: number;
}

export type TarotFlowEvent =
  | { type: "ask" }
  | { type: "resolved"; cardCount: number }
  | { type: "rejected" }
  | { type: "next" }
  | { type: "reset" };

export const INITIAL_FLOW_STATE: TarotFlowState = {
  screen: "home",
  cardIndex: 0,
  cardCount: 0,
};

export function reduceFlow(
  state: TarotFlowState,
  event: TarotFlowEvent,
): TarotFlowState {
  switch (event.type) {
    case "ask":
      return state.screen === "home"
        ? { screen: "loading", cardIndex: 0, cardCount: 0 }
        : state;

    case "resolved":
      return state.screen === "loading"
        ? { screen: "card", cardIndex: 0, cardCount: event.cardCount }
        : state;

    case "rejected":
      return state.screen === "loading"
        ? { screen: "home", cardIndex: 0, cardCount: 0 }
        : state;

    case "next": {
      if (state.screen !== "card") return state;
      return state.cardIndex < state.cardCount - 1
        ? { ...state, cardIndex: state.cardIndex + 1 }
        : { screen: "finale", cardIndex: state.cardCount - 1, cardCount: state.cardCount };
    }

    case "reset":
      return { screen: "home", cardIndex: 0, cardCount: 0 };
  }
}
