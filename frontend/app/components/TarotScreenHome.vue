<script setup lang="ts">
import type { OracleError } from '~/types/oracle'

defineProps<{
  isLoading: boolean
  isResting?: boolean
  error: OracleError | null
  retryIn: number
  isBlocked: boolean
  blockedError: OracleError
}>()

const emit = defineEmits<{
  ask: [question: string]
}>()
</script>

<template>
  <div>
    <header class="text-center">
      <div class="mx-auto mb-4.5 grid size-12 place-items-center rounded-full border border-brass-line bg-edge-faint text-xl text-brass shadow-orb">
        <Icon name="i-game-icons-triquetra" />
      </div>
      <p class="m-0 text-caption font-semibold tracking-overline text-brass uppercase">Твое тайное предсказание</p>
      <h1 class="font-display my-2.5 text-[clamp(42px,8vw,58px)] leading-none font-medium tracking-display text-paper">Оракул</h1>
      <p class="font-display mt-0 mb-[35px] text-lead text-muted italic leading-[1.35]">
        Задай вопрос. Иногда ответ уже ждет,<br class="max-phone:hidden"> когда ты его услышишь.
      </p>
    </header>

    <OracleForm :is-loading="isLoading" :is-resting="isResting" @ask="emit('ask', $event)" />
    <OracleStatus v-if="error" :error="error" :retry-in="retryIn" />
    <OracleStatus v-else-if="isBlocked" :error="blockedError" />
  </div>
</template>
