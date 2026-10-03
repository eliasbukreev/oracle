<script setup lang="ts">
import type { OracleError } from '~/types/oracle'

defineProps<{
  error: OracleError
  retryIn?: number
}>()
</script>

<template>
  <div class="status-card" role="alert">
    <span class="status-symbol" aria-hidden="true">!</span>
    <div>
      <strong>{{ error.code === 'oracle_resting' ? 'Оракул отдыхает' : 'Связь прервана' }}</strong>
      <p>{{ error.message }}</p>
      <p v-if="error.code === 'oracle_resting' && (retryIn ?? 0) > 0" class="retry-countdown">
        До пробуждения: {{ retryIn }} сек.
      </p>
    </div>
  </div>
</template>
