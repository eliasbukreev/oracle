<script setup lang="ts">
const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  ask: [question: string]
}>()

const question = ref('')
const maxLength = 500

function submit() {
  if (!question.value.trim() || props.isLoading) {
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
        :disabled="isLoading"
      />
      <span class="character-count">{{ question.length }} / {{ maxLength }}</span>
    </div>
    <button class="ask-button" type="submit" :disabled="!question.trim() || isLoading">
      <span v-if="isLoading" class="button-loader" aria-hidden="true" />
      <span>{{ isLoading ? 'Оракул думает...' : 'Спросить оракула' }}</span>
      <span v-if="!isLoading" class="button-arrow" aria-hidden="true">↗</span>
    </button>
  </form>
</template>
