<script setup lang="ts">
import type { SpreadId } from "~/types/oracle";

const emit = defineEmits<{
  preview: [SpreadId];
  finale: [];
  reset: [];
}>();

const spreads = [
  { id: "classic", label: "Класс" },
  { id: "relations", label: "Отнош" },
  { id: "choice", label: "Крест" },
] as const satisfies ReadonlyArray<{ id: SpreadId; label: string }>;
</script>

<template>
  <div
    class="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 border border-brass-line bg-ink/95 px-2 py-1.5 shadow-panel"
    aria-label="Дев-панель превью экранов"
  >
    <span
      class="px-1 text-caption font-semibold tracking-overline text-brass uppercase"
      >dev</span
    >
    <button
      v-for="spread in spreads"
      :key="spread.id"
      type="button"
      class="cursor-pointer border border-transparent px-2 py-1 text-caption text-soft transition-colors hover:border-brass-line hover:text-brass"
      @click="emit('preview', spread.id)"
    >
      {{ spread.label }}
    </button>
    <button
      type="button"
      class="cursor-pointer border border-transparent px-2 py-1 text-caption text-soft transition-colors hover:border-brass-line hover:text-brass"
      @click="emit('finale')"
    >
      Финал
    </button>
    <button
      type="button"
      class="cursor-pointer border border-transparent px-2 py-1 text-caption text-soft transition-colors hover:border-brass-line hover:text-brass"
      @click="emit('reset')"
    >
      Сброс
    </button>
  </div>
</template>
