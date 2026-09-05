<script setup lang="ts">
import type { OracleResponse } from '~/types/oracle'

defineProps<{
  result: OracleResponse
}>()
</script>

<template>
  <section class="result-card" aria-live="polite" aria-label="Ответ оракула">
    <div class="result-heading">
      <span class="eyebrow">Ответ найден</span>
      <span class="confidence">{{ result.confidence }}% уверенности</span>
    </div>
    <div class="verdict">{{ result.verdict }}</div>
    <p class="prophecy">{{ result.prophecy }}</p>
    <div class="reason">
      <span class="reason-mark" aria-hidden="true">✦</span>
      <p>{{ result.reason }}</p>
    </div>
  </section>
</template>
