<script setup lang="ts">
import type { OracleError } from '~/types/oracle'

defineProps<{
  error: OracleError
  retryIn?: number
}>()
</script>

<template>
  <div
    class="mt-6.5 flex gap-3 border border-edge bg-raise/70 p-4 text-paper"
    role="alert"
  >
    <span
      class="grid size-6 shrink-0 place-items-center rounded-full bg-brass font-semibold text-ink"
    >
      <Icon :name="error.code === 'blocked' ? 'i-lucide-wifi-off' : 'i-lucide-triangle-alert'" class="size-3.5" />
    </span>
    <div>
      <strong class="mb-1 block text-note text-paper">
        {{ error.code === 'oracle_resting' ? 'Оракул отдыхает' : error.code === 'blocked' ? 'Сигнал не проходит' : 'Связь прервана' }}
      </strong>
      <p class="m-0 text-note leading-[1.45] text-soft">{{ error.message }}</p>
      <p v-if="error.code === 'oracle_resting' && (retryIn ?? 0) > 0" class="m-0 mt-2 text-note text-brass tabular-nums">
        До пробуждения: {{ retryIn }} сек.
      </p>
    </div>
  </div>
</template>