<script setup lang="ts">
import type { OracleError } from '~/types/oracle'

defineProps<{
  error: OracleError
}>()
</script>

<template>
  <div class="status-card" role="alert">
    <span class="status-symbol" aria-hidden="true">!</span>
    <div>
      <strong>{{ error.code === 'oracle_resting' ? 'Оракул отдыхает' : 'Связь прервана' }}</strong>
      <p>{{ error.message }}</p>
    </div>
  </div>
</template>
