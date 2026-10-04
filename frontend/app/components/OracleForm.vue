<script setup lang="ts">
const props = defineProps<{
  isLoading: boolean;
  isResting?: boolean;
}>();

const emit = defineEmits<{
  ask: [question: string];
}>();

const question = ref("");
const maxLength = 500;
const isDisabled = computed(() => props.isLoading || props.isResting);

function submit() {
  if (!question.value.trim() || isDisabled.value) {
    return;
  }

  emit("ask", question.value);
}
</script>

<template>
  <form class="grid gap-2.75" @submit.prevent="submit">
    <label
      class="text-caption font-medium tracking-overline text-muted uppercase"
      for="question"
      >Что ты хочешь узнать?</label
    >
    <div class="relative">
      <textarea
        id="question"
        v-model="question"
        name="question"
        maxlength="500"
        placeholder="Спроси о том, что не дает тебе покоя..."
        rows="4"
        :disabled="isDisabled"
        class="font-display block min-h-[122px] w-full resize-y border border-edge-strong bg-raise px-4.5 pt-4.25 pb-8.5 text-lead text-paper outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-placeholder hover:border-edge-strong focus:border-brass focus:shadow-focus disabled:cursor-wait disabled:opacity-70"
      />
      <span class="absolute right-3.75 bottom-3 text-caption text-dim"
        >{{ question.length }} / {{ maxLength }}</span
      >
    </div>
    <button
      type="submit"
      :disabled="!question.trim() || isDisabled"
      class="mt-1.25 flex min-h-13 cursor-pointer items-center justify-center gap-2.25 border border-brass-line bg-edge-faint px-5 py-3.5 text-caption font-semibold tracking-overline text-brass uppercase transition-colors duration-200 hover:bg-brass hover:text-ink disabled:cursor-not-allowed disabled:opacity-48 disabled:hover:bg-edge-faint disabled:hover:text-brass"
    >
      <Icon
        v-if="isLoading"
        name="i-lucide-loader-circle"
        class="size-3.5 animate-spin-fast"
        aria-hidden="true"
      />
      <span>{{
        isLoading
          ? "Оракул думает..."
          : isResting
            ? "Оракул отдыхает..."
            : "Спросить оракула"
      }}</span>
    </button>
  </form>
</template>
