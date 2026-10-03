// Чистые хелперы для текстов ошибок API. Без зависимостей от Nuxt/Vue,
// поэтому покрываются обычными unit-тестами (vitest, node-окружение).
import type { OracleErrorCode } from '~/types/oracle'

export const errorMessages: Record<
  Exclude<OracleErrorCode, 'oracle_resting'>,
  string
> = {
  invalid_request: 'Вопрос не удалось принять. Проверь его и попробуй еще раз.',
  invalid_client:
    'Оракул не смог подтвердить клиента. Обнови страницу и попробуй еще раз.',
  oracle_unavailable:
    'Связь с хранилищем пророчеств прервалась. Попробуй еще раз.',
  internal_error: 'Оракул временно недоступен. Попробуй еще раз позже.',
}

export const knownCodes: OracleErrorCode[] = [
  'invalid_request',
  'invalid_client',
  'oracle_resting',
  'oracle_unavailable',
  'internal_error',
]

export function toErrorCode(value: unknown): OracleErrorCode {
  return typeof value === 'string' && (knownCodes as string[]).includes(value)
    ? (value as OracleErrorCode)
    : 'internal_error'
}

export function pluralize(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${pluralize(seconds, ['секунду', 'секунды', 'секунд'])}`
  }

  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes} ${pluralize(minutes, ['минуту', 'минуты', 'минут'])}`
}

export function restingMessage(retryAfter?: number): string {
  if (retryAfter === undefined) {
    return 'Оракул отдыхает. Дай ему немного тишины и попробуй позже.'
  }

  return `Оракул отдыхает. Дай ему немного тишины и попробуй через ${formatRetryAfter(retryAfter)}.`
}
