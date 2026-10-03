<script setup lang="ts">
import type { OracleResponse } from '~/types/oracle'

defineProps<{
  result: OracleResponse
}>()
</script>

<template>
  <section class="mt-6.5 rounded-card border border-edge-lit/26 bg-linear-135 from-oracle-from/55 to-oracle-to/55 p-5.5" aria-live="polite" aria-label="Ответ оракула">
    <div class="flex items-center justify-between gap-3.75">
      <span class="text-caption font-semibold tracking-overline text-overline uppercase">Ответ найден</span>
      <span class="text-caption text-confidence">{{ result.confidence }}% уверенности</span>
    </div>
    <div class="font-display my-4.25 text-display tracking-verdict text-verdict">{{ result.verdict }}</div>
    <p class="font-display m-0 text-lead leading-[1.5] text-prophecy">{{ result.prophecy }}</p>
    <div class="mt-5.25 flex gap-2.5 border-t border-edge-soft/14 pt-4.25 text-note leading-[1.55] text-reason-ink">
      <Icon name="i-lucide-sparkles" class="shrink-0 text-reason-mark" aria-hidden="true" />
      <p class="m-0">{{ result.reason }}</p>
    </div>
  </section>
</template>