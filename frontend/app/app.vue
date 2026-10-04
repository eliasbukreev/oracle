<script setup lang="ts">
import { motion } from 'motion-v'
import { SCREEN_TRANSITION } from '~/services/screenMotion'

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
} = useTarotFlow()

const isWideScreen = computed(() => screen.value === 'card' || screen.value === 'finale')
const currentCard = computed(() => result.value?.cards[cardIndex.value])
</script>

<template>
  <MotionConfig reduced-motion="user">
    <main class="grid-mask relative grid min-h-screen place-items-center overflow-hidden bg-night px-5 py-12 max-phone:px-3.5 max-phone:py-5">
      <div class="pointer-events-none absolute -top-45 right-[12%] size-[360px] rounded-full bg-glow-top opacity-20 blur-[90px]" aria-hidden="true" />
      <div class="pointer-events-none absolute -bottom-57.5 left-[8%] size-[360px] rounded-full bg-glow-bottom opacity-20 blur-[90px]" aria-hidden="true" />

      <section
        class="relative w-full rounded-panel border border-edge/16 bg-panel/86 px-13 pt-12 pb-7.5 shadow-panel backdrop-blur-[14px] transition-[max-width] duration-300 max-phone:rounded-[22px] max-phone:px-5 max-phone:pt-8.5 max-phone:pb-6"
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
              v-else-if="screen === 'card' && currentCard"
              :card="currentCard"
              :back-image-url="result?.backImageUrl ?? ''"
              :index="cardIndex"
              @next="nextCard"
            />
            <TarotScreenFinale
              v-else-if="screen === 'finale' && result"
              :result="result"
              @reset="reset"
            />
          </motion.div>
        </AnimatePresence>

        <footer class="mt-7.5 text-center text-caption text-faint">Ответы приходят тем, кто готов их принять</footer>
      </section>
    </main>
  </MotionConfig>
</template>
