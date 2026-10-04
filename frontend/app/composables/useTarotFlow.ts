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

  function send(event: TarotFlowEvent) {
    const next = reduceFlow(
      { screen: screen.value, cardIndex: cardIndex.value },
      event,
    );
    screen.value = next.screen;
    cardIndex.value = next.cardIndex;
  }

  async function ask(question: string) {
    send({ type: "ask" });
    await oracle.ask(question);

    if (oracle.result.value) {
      send({ type: "resolved" });
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

  /** Дев-превью экранов без бэкенда. В проде — no-op.
   *  Фикстура грузится динамически, чтобы не попадать в прод-бандл. */
  async function preview(kind: import("~/services/tarotPreview").PreviewKind) {
    if (!import.meta.dev) {
      console.warn("preview доступен только в dev-режиме");
      return;
    }

    if (kind === "loading") {
      screen.value = "loading";
      cardIndex.value = 0;
      return;
    }

    const { PREVIEW_SPREAD } = await import("~/services/tarotPreview");
    oracle.result.value = PREVIEW_SPREAD;
    oracle.error.value = null;

    if (kind === "finale") {
      screen.value = "finale";
      cardIndex.value = 2;
    } else {
      screen.value = "card";
      cardIndex.value = Number(kind.slice(-1));
    }
  }

  const screenKey = computed(() => `${screen.value}-${cardIndex.value}`);

  return {
    ...oracle,
    screen: readonly(screen),
    cardIndex: readonly(cardIndex),
    screenKey,
    ask,
    nextCard,
    reset,
    preview,
  };
}
