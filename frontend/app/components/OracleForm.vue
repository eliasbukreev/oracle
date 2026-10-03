<script setup lang="ts">
const props = defineProps<{
  isLoading: boolean
  isResting?: boolean
}>()

const emit = defineEmits<{
  ask: [question: string]
}>()

const question = ref('')
const maxLength = 500
const isDisabled = computed(() => props.isLoading || props.isResting)

function submit() {
  if (!question.value.trim() || isDisabled.value) {
    return
  }

  emit('ask', question.value)
}
</script>

<template>
  <form class="grid gap-2.75" @submit.prevent="submit">
    <label class="text-note font-medium text-label" for="question">Что ты хочешь узнать?</label>
    <div class="relative">
      <textarea
        id="question"
        v-model="question"
        name="question"
        maxlength="500"
        placeholder="Спроси о том, что не дает тебе покоя..."
        rows="4"
        :disabled="isDisabled"
        class="block min-h-[122px] w-full resize-y rounded-field border border-field-line bg-raise px-4.5 pt-4.25 pb-8.5 text-body text-input outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-placeholder hover:border-field-line focus:border-field-focus focus:shadow-focus disabled:cursor-wait disabled:opacity-70"
      />
      <span class="absolute right-3.75 bottom-3 text-caption text-count">{{ question.length }} / {{ maxLength }}</span>
    </div>
    <button
      type="submit"
      :disabled="!question.trim() || isDisabled"
      class="mt-1.25 flex min-h-13 cursor-pointer items-center justify-center gap-2.25 rounded-button bg-accent px-5 py-3.5 font-semibold text-accent-ink transition-[background,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-accent-soft hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-48 disabled:hover:translate-y-0 disabled:hover:bg-accent disabled:hover:shadow-none"
    >
      <Icon v-if="isLoading" name="i-lucide-loader-circle" class="size-3.5 animate-spin-fast" aria-hidden="true" />
      <span>{{ isLoading ? 'Оракул думает...' : isResting ? 'Оракул отдыхает...' : 'Спросить оракула' }}</span>
      <Icon v-if="!isLoading && !isResting" name="i-lucide-arrow-up-right" class="text-[18px] leading-none" aria-hidden="true" />
    </button>
  </form>
</template>