<script setup lang="ts">
import type { TarotCard } from '~/types/oracle'
import { TAROT_ORIENTATION_LABELS_RU, TAROT_POSITION_LABELS_RU } from '~/types/oracle'

const props = defineProps<{
  card: TarotCard
  backImageUrl: string
  /** 0..2 */
  index: number
}>()

const emit = defineEmits<{
  next: []
}>()

const isLast = computed(() => props.index >= 2)
</script>

<template>
  <div aria-live="polite" :aria-label="`Карта ${index + 1} из 3`">
    <div class="mb-4 flex items-center justify-between gap-3">
      <span class="text-caption font-semibold tracking-overline text-brass uppercase">Карта {{ index + 1 }} из 3</span>
      <span class="flex gap-1.5" aria-hidden="true">
        <span
          v-for="i in 3"
          :key="i"
          class="size-1.5"
          :class="i - 1 <= index ? 'bg-brass' : 'bg-brass/25'"
        />
      </span>
    </div>

    <div class="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-start">
      <TarotCardImage
        :src="card.imageUrl"
        :back-src="backImageUrl"
        :alt="card.name"
        :reversed="card.orientation === 'reversed'"
        class="mx-auto w-full max-w-[220px] sm:mx-0"
      />

      <div>
        <div class="text-caption font-semibold tracking-overline text-brass uppercase">
          {{ TAROT_POSITION_LABELS_RU[card.position] }}
        </div>
        <div class="font-display my-2 text-display leading-none text-paper">{{ card.name }}</div>
        <span
          class="mb-2 inline-block border border-edge px-2 py-0.5 text-caption tracking-overline uppercase"
          :class="card.orientation === 'reversed' ? 'text-brass' : 'text-soft'"
        >
          {{ TAROT_ORIENTATION_LABELS_RU[card.orientation] }}
        </span>
        <p class="font-display m-0 text-lead leading-[1.5] text-soft">{{ card.meaning }}</p>

        <button
          type="button"
          class="mt-5 flex min-h-13 w-full cursor-pointer items-center justify-center gap-2.25 border border-brass-line bg-edge-faint px-5 py-3.5 text-caption font-semibold tracking-overline text-brass uppercase transition-colors duration-200 hover:bg-brass hover:text-ink"
          @click="emit('next')"
        >
          <span>{{ isLast ? 'Смотреть итог' : 'Следующая карта' }}</span>
          <Icon :name="isLast ? 'i-game-icons-triquetra' : 'i-lucide-arrow-right'" class="text-[18px] leading-none" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
