import { useOracle } from "~/composables/useOracle";
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
  };
}
