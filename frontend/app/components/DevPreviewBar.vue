<script setup lang="ts">
import type { PreviewKind } from "~/services/tarotPreview"

const emit = defineEmits<{
  preview: [PreviewKind]
  reset: []
}>()

const buttons = [
  { kind: "loading", label: "Загрузка" },
  { kind: "card-0", label: "Карта 1" },
  { kind: "card-1", label: "Карта 2" },
  { kind: "card-2", label: "Карта 3" },
  { kind: "finale", label: "Финал" },
] as const satisfies ReadonlyArray<{ kind: PreviewKind, label: string }>
</script>

<template>
  <div
    class="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 border border-brass-line bg-ink/95 px-2 py-1.5 shadow-panel"
    aria-label="Дев-панель превью экранов"
  >
    <span class="px-1 text-caption font-semibold tracking-overline text-brass uppercase">dev</span>
    <button
      v-for="button in buttons"
      :key="button.kind"
      type="button"
      class="cursor-pointer border border-transparent px-2 py-1 text-caption text-soft transition-colors hover:border-brass-line hover:text-brass"
      @click="emit('preview', button.kind)"
    >
      {{ button.label }}
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
