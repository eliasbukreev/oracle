<script setup lang="ts">
const { result, error, isLoading, ask } = useOracle()
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

      <OracleForm :is-loading="isLoading" @ask="ask" />
      <OracleResult v-if="result" :result="result" />
      <OracleStatus v-if="error" :error="error" />

      <footer class="panel-footer">Ответы приходят тем, кто готов их принять</footer>
    </section>
  </main>
</template>
