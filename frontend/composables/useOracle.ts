import type { OracleError, OracleResponse } from '~/types/oracle'
import { askOracle } from '~/services/oracleApi'

const errorMessages: Record<string, string> = {
  invalid_request: 'Вопрос не удалось принять. Проверь его и попробуй еще раз.',
  invalid_client: 'Оракул не смог подтвердить клиента. Обнови страницу и попробуй еще раз.',
  oracle_resting: 'Оракул отдыхает. Дай ему немного тишины и попробуй позже.',
  oracle_unavailable: 'Связь с хранилищем пророчеств прервалась. Попробуй еще раз.',
  internal_error: 'Оракул временно недоступен. Попробуй еще раз позже.',
}

export function useOracle() {
  const config = useRuntimeConfig()
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
      result.value = await askOracle(trimmedQuestion, config.public.oracleApiUrl)
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
