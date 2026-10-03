<script setup lang="ts">
const { result, error, isLoading, isResting, retryIn, isBlocked, blockedError, ask } = useOracle()
</script>

<template>
  <main class="page-shell">
    <div class="ambient-glow ambient-glow-top" aria-hidden="true" />
    <div class="ambient-glow ambient-glow-bottom" aria-hidden="true" />

    <section class="oracle-panel">
      <header class="oracle-header">
        <div class="orb" aria-hidden="true"><span>✦</span></div>
        <p class="overline">Твое тайное предсказание</p>
        <h1>Оракул</h1>
        <p class="intro">Задай вопрос. Иногда ответ уже ждет,<br class="desktop-break"> когда ты его услышишь.</p>
      </header>

      <OracleForm :is-loading="isLoading" :is-resting="isResting" @ask="ask" />
      <OracleResult v-if="result" :result="result" />
      <OracleStatus v-if="error" :error="error" :retry-in="retryIn" />
      <OracleStatus v-else-if="isBlocked" :error="blockedError" />

      <footer class="panel-footer">Ответы приходят тем, кто готов их принять</footer>
    </section>
  </main>
</template>
