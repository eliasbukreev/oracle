<script setup lang="ts">
import type { TarotResponse } from '~/types/oracle'
import { TAROT_ORIENTATION_LABELS_RU, TAROT_POSITION_LABELS_RU } from '~/types/oracle'

defineProps<{
  result: TarotResponse
}>()
</script>

<template>
  <section class="mt-6.5 rounded-card border border-edge-lit/26 bg-linear-135 from-oracle-from/55 to-oracle-to/55 p-5.5" aria-live="polite" aria-label="Расклад таро">
    <div class="flex items-center justify-between gap-3.75">
      <span class="text-caption font-semibold tracking-overline text-overline uppercase">Расклад найден</span>
      <span class="text-caption text-confidence">3 карты</span>
    </div>

    <ol class="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
      <li
        v-for="card in result.cards"
        :key="card.id"
        class="mt-4 rounded-card border border-edge-soft/14 bg-black/20 p-4"
      >
        <TarotCardImage
          :src="card.imageUrl"
          :back-src="result.backImageUrl"
          :alt="card.name"
          :reversed="card.orientation === 'reversed'"
        />
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
      </li>
    </ol>

    <div class="mt-5.25 flex gap-2.5 border-t border-edge-soft/14 pt-4.25 text-note leading-[1.55] text-reason-ink">
      <Icon name="i-lucide-sparkles" class="shrink-0 text-reason-mark" aria-hidden="true" />
      <p class="m-0">{{ result.summary }}</p>
    </div>
  </section>
</template>
