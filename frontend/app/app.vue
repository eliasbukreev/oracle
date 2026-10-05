<script setup lang="ts">
import { motion } from "motion-v";
import backUrl from "~/assets/img/CardBacks.webp?url";
import { PREVIEWS } from "~/services/tarotPreview";
import type { SpreadId } from "~/types/oracle";
import { SCREEN_TRANSITION } from "~/services/screenMotion";

// Рубашка предзагружается со стартом: к экрану карты уже в кэше, мигания нет.
useHead({
  link: [{ rel: "preload", as: "image", href: backUrl }],
});

const {
  result,
  error,
  isLoading,
  isResting,
  retryIn,
  isBlocked,
  blockedError,
  screen,
  cardIndex,
  screenKey,
  ask,
  nextCard,
  reset,
  preview,
  goFinale,
} = useTarotFlow()

const isDev = import.meta.dev;
const isWideScreen = computed(() => screen.value === 'card' || screen.value === 'finale')
const currentCard = computed(() => result.value?.cards[cardIndex.value])
const cardTotal = computed(() => result.value?.cards.length ?? 0)

function previewSpread(spread: SpreadId) {
  preview(PREVIEWS[spread]);
}
</script>

<template>
  <MotionConfig reduced-motion="user">
    <main
      class="starfield relative grid min-h-screen place-items-center overflow-hidden bg-ink px-5 py-12 max-phone:px-3.5 max-phone:py-5"
    >
      <div
        class="pointer-events-none absolute top-[12%] left-1/2 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-glow opacity-20 blur-[110px]"
        aria-hidden="true"
      />

      <section
        class="relative z-[1] w-full border border-edge bg-panel/90 px-13 pt-12 pb-7.5 shadow-panel backdrop-blur-[14px] transition-[max-width] duration-300 max-phone:px-5 max-phone:pt-8.5 max-phone:pb-6"
        :class="isWideScreen ? 'max-w-[720px]' : 'max-w-[580px]'"
      >
        <AnimatePresence mode="wait">
          <motion.div
            :key="screenKey"
            :initial="SCREEN_TRANSITION.initial"
            :animate="SCREEN_TRANSITION.animate"
            :exit="SCREEN_TRANSITION.exit"
            :transition="SCREEN_TRANSITION.transition"
          >
            <TarotScreenHome
              v-if="screen === 'home'"
              :is-loading="isLoading"
              :is-resting="isResting"
              :error="error"
              :retry-in="retryIn"
              :is-blocked="isBlocked"
              :blocked-error="blockedError"
              @ask="ask"
            />
            <TarotScreenLoading v-else-if="screen === 'loading'" />
            <TarotCardScreen
              v-else-if="screen === 'card' && currentCard && result"
              :card="currentCard"
              :back-image-url="result.backImageUrl"
              :spread="result.spread"
              :index="cardIndex"
              :total="cardTotal"
              @next="nextCard"
            />
            <TarotCrossFinale
              v-else-if="screen === 'finale' && result && result.spread === 'choice'"
              :result="result"
              @reset="reset"
            />
            <TarotScreenFinale
              v-else-if="screen === 'finale' && result"
              :result="result"
              @reset="reset"
            />
          </motion.div>
        </AnimatePresence>

        <footer class="mt-7.5 text-center text-caption text-faint">
          Ответы приходят тем, кто готов их принять
        </footer>
      </section>

      <DevPreviewBar
        v-if="isDev"
        @preview="previewSpread"
        @finale="goFinale"
        @reset="reset"
      />
    </main>
  </MotionConfig>
</template>
