import type { OracleError, OracleResponse } from '~/types/oracle'
import { askOracle } from '~/services/oracleMock'

const errorMessages: Record<string, string> = {
  oracle_resting: 'Оракул отдыхает. Дай ему немного тишины и попробуй позже.',
  oracle_unavailable: 'Связь с хранилищем пророчеств прервалась. Попробуй еще раз.',
}

export function useOracle() {
  const result = ref<OracleResponse | null>(null)
  const error = ref<OracleError | null>(null)
  const isLoading = ref(false)

  async function ask(question: string) {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || isLoading.value) {
      return
    }

    isLoading.value = true
    result.value = null
    error.value = null

    try {
      result.value = await askOracle(trimmedQuestion)
    } catch (caughtError) {
      const code = caughtError instanceof Error ? caughtError.message : 'internal_error'

      error.value = {
        code: code as OracleError['code'],
        message: errorMessages[code] ?? 'Что-то помешало услышать ответ. Попробуй еще раз.',
      }
    } finally {
      isLoading.value = false
    }
  }

  return { result, error, isLoading, ask }
}
