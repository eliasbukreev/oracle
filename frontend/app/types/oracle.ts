export type TarotPosition = 'past' | 'present' | 'future'

export type TarotCard = {
  id: string
  name: string
  position: TarotPosition
  meaning: string
}

export type TarotResponse = {
  cards: TarotCard[]
  summary: string
}

/** Исторический алиас: раньше ответом было одиночное пророчество. */
export type OracleResponse = TarotResponse

export const TAROT_POSITION_LABELS_RU: Record<TarotPosition, string> = {
  past: 'Прошлое',
  present: 'Настоящее',
  future: 'Будущее',
}

export type OracleErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'oracle_resting'
  | 'oracle_unavailable'
  | 'internal_error'
  | 'blocked'

export type OracleError = {
  code: OracleErrorCode
  message: string
  retryAfter?: number
}
