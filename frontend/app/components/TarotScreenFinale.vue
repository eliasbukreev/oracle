<script setup lang="ts">
import type { TarotResponse } from '~/types/oracle'

defineProps<{
  result: TarotResponse
}>()

const emit = defineEmits<{
  reset: []
}>()
</script>

<template>
  <div aria-live="polite" aria-label="Итог расклада">
    <div class="mb-4 text-center">
      <span class="text-caption font-semibold tracking-overline text-brass uppercase">Расклад завершён</span>
    </div>

    <ol class="m-0 mb-5 grid list-none grid-cols-3 gap-2.5 p-0">
      <li v-for="card in result.cards" :key="card.id">
        <TarotCardImage
          :src="card.imageUrl"
          :back-src="result.backImageUrl"
          :alt="card.name"
          :reversed="card.orientation === 'reversed'"
        />
      </li>
    </ol>

    <div class="flex gap-2.5 border border-edge bg-black/20 p-4 text-note leading-[1.55] text-soft">
      <Icon name="i-lucide-sparkles" class="shrink-0 text-brass" aria-hidden="true" />
      <p class="font-display m-0 text-lead leading-[1.5]">{{ result.summary }}</p>
    </div>

    <button
      type="button"
      class="mt-5 flex min-h-13 w-full cursor-pointer items-center justify-center gap-2.25 border border-brass-line bg-edge-faint px-5 py-3.5 text-caption font-semibold tracking-overline text-brass uppercase transition-colors duration-200 hover:bg-brass hover:text-ink"
      @click="emit('reset')"
    >
      <span>Новый вопрос</span>
      <Icon name="i-lucide-rotate-ccw" class="text-[18px] leading-none" aria-hidden="true" />
    </button>
  </div>
</template>
