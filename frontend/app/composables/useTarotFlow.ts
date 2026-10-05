import { useOracle } from "~/composables/useOracle";
import type { TarotResponse } from "~/types/oracle";
import {
  INITIAL_FLOW_STATE,
  reduceFlow,
  type TarotFlowEvent,
} from "~/services/tarotFlow";

export function useTarotFlow() {
  const oracle = useOracle();
  const screen = ref(INITIAL_FLOW_STATE.screen);
  const cardIndex = ref(INITIAL_FLOW_STATE.cardIndex);
  const cardCount = ref(INITIAL_FLOW_STATE.cardCount);

  function send(event: TarotFlowEvent) {
    const next = reduceFlow(
      {
        screen: screen.value,
        cardIndex: cardIndex.value,
        cardCount: cardCount.value,
      },
      event,
    );
    screen.value = next.screen;
    cardIndex.value = next.cardIndex;
    cardCount.value = next.cardCount;
  }

  async function ask(question: string) {
    send({ type: "ask" });
    await oracle.ask(question);

    if (oracle.result.value) {
      send({ type: "resolved", cardCount: oracle.result.value.cards.length });
    } else {
      send({ type: "rejected" });
    }
  }

  function nextCard() {
    send({ type: "next" });
  }

  function reset() {
    oracle.result.value = null;
    oracle.error.value = null;
    send({ type: "reset" });
  }

  /** Дев-превью: подложить готовый расклад без бэкенда. */
  function preview(result: TarotResponse) {
    oracle.result.value = result;
    oracle.error.value = null;
    screen.value = "card";
    cardIndex.value = 0;
    cardCount.value = result.cards.length;
  }

  /** Дев-превью: прыгнуть сразу в финал текущего расклада. */
  function goFinale() {
    if (!oracle.result.value) return;
    cardCount.value = oracle.result.value.cards.length;
    cardIndex.value = cardCount.value - 1;
    screen.value = "finale";
  }

  const screenKey = computed(
    () => `${screen.value}-${cardIndex.value}-${cardCount.value}`,
  );

  return {
    ...oracle,
    screen: readonly(screen),
    cardIndex: readonly(cardIndex),
    cardCount: readonly(cardCount),
    screenKey,
    ask,
    nextCard,
    reset,
    preview,
    goFinale,
  };
}
