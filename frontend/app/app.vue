<script setup lang="ts">
const { result, error, isLoading, isResting, retryIn, isBlocked, blockedError, ask } = useOracle()
</script>

<template>
  <main class="grid-mask relative grid min-h-screen place-items-center overflow-hidden bg-night px-5 py-12 max-phone:px-3.5 max-phone:py-5">
    <div class="pointer-events-none absolute -top-45 right-[12%] size-[360px] rounded-full bg-glow-top opacity-20 blur-[90px]" aria-hidden="true" />
    <div class="pointer-events-none absolute -bottom-57.5 left-[8%] size-[360px] rounded-full bg-glow-bottom opacity-20 blur-[90px]" aria-hidden="true" />

    <section class="relative w-full max-w-[580px] rounded-panel border border-edge/16 bg-panel/86 px-13 pt-12 pb-7.5 shadow-panel backdrop-blur-[14px] max-phone:rounded-[22px] max-phone:px-5 max-phone:pt-8.5 max-phone:pb-6">
      <header class="text-center">
        <div class="mx-auto mb-4.5 grid size-12 place-items-center rounded-full border border-orb-line bg-orb-fill text-xl text-orb-ink shadow-orb">
          <Icon name="i-lucide-sparkles" />
        </div>
        <p class="m-0 text-caption font-semibold tracking-overline text-overline uppercase">Твое тайное предсказание</p>
        <h1 class="font-display my-2.5 text-[clamp(42px,8vw,58px)] leading-none font-medium tracking-display text-ink-bright">Оракул</h1>
        <p class="mt-0 mb-[35px] text-body text-muted leading-[1.65]">
          Задай вопрос. Иногда ответ уже ждет,<br class="max-phone:hidden"> когда ты его услышишь.
        </p>
      </header>

      <OracleForm :is-loading="isLoading" :is-resting="isResting" @ask="ask" />
      <OracleResult v-if="result" :result="result" />
      <OracleStatus v-if="error" :error="error" :retry-in="retryIn" />
      <OracleStatus v-else-if="isBlocked" :error="blockedError" />

      <footer class="mt-7.5 text-center text-caption text-faint">Ответы приходят тем, кто готов их принять</footer>
    </section>
  </main>
</template>