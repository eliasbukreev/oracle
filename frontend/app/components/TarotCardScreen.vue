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
      <span class="text-caption font-semibold tracking-overline text-overline uppercase">Карта {{ index + 1 }} из 3</span>
      <span class="flex gap-1.5" aria-hidden="true">
        <span
          v-for="i in 3"
          :key="i"
          class="size-1.5 rounded-full"
          :class="i - 1 <= index ? 'bg-confidence' : 'bg-edge-soft/40'"
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
        <div class="text-caption font-semibold tracking-overline text-overline uppercase">
          {{ TAROT_POSITION_LABELS_RU[card.position] }}
        </div>
        <div class="font-display my-2 text-lead tracking-verdict text-verdict">{{ card.name }}</div>
        <span
          class="mb-2 inline-block rounded-full border border-edge-soft/14 px-2 py-0.5 text-caption"
          :class="card.orientation === 'reversed' ? 'text-confidence' : 'text-reason-ink'"
        >
          {{ TAROT_ORIENTATION_LABELS_RU[card.orientation] }}
        </span>
        <p class="m-0 text-note leading-[1.55] text-prophecy">{{ card.meaning }}</p>

        <button
          type="button"
          class="mt-5 flex min-h-13 w-full cursor-pointer items-center justify-center gap-2.25 rounded-button bg-accent px-5 py-3.5 font-semibold text-accent-ink transition-[background,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-accent-soft hover:shadow-lift"
          @click="emit('next')"
        >
          <span>{{ isLast ? 'Смотреть итог' : 'Следующая карта' }}</span>
          <Icon :name="isLast ? 'i-lucide-sparkles' : 'i-lucide-arrow-right'" class="text-[18px] leading-none" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
