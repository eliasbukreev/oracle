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
  <form class="oracle-form" @submit.prevent="submit">
    <label class="field-label" for="question">Что ты хочешь узнать?</label>
    <div class="textarea-wrap">
      <textarea
        id="question"
        v-model="question"
        name="question"
        maxlength="500"
        placeholder="Спроси о том, что не дает тебе покоя..."
        rows="4"
        :disabled="isDisabled"
      />
      <span class="character-count">{{ question.length }} / {{ maxLength }}</span>
    </div>
    <button class="ask-button" type="submit" :disabled="!question.trim() || isDisabled">
      <span v-if="isLoading" class="button-loader" aria-hidden="true" />
      <span>{{ isLoading ? 'Оракул думает...' : isResting ? 'Оракул отдыхает...' : 'Спросить оракула' }}</span>
      <span v-if="!isLoading && !isResting" class="button-arrow" aria-hidden="true">↗</span>
    </button>
  </form>
</template>
