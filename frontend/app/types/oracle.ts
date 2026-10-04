export type TarotPosition = 'past' | 'present' | 'future'

export type TarotOrientation = 'upright' | 'reversed'

export type TarotCard = {
  id: string
  name: string
  position: TarotPosition
  orientation: TarotOrientation
  meaning: string
  /** Абсолютный URL картинки в R2. Пусто = хранилище не настроено. */
  imageUrl: string
}

export type TarotResponse = {
  cards: TarotCard[]
  summary: string
  /** URL рубашки колоды. Пусто = хранилище не настроено. */
  backImageUrl: string
}

/** Исторический алиас: раньше ответом было одиночное пророчество. */
export type OracleResponse = TarotResponse

export const TAROT_POSITION_LABELS_RU: Record<TarotPosition, string> = {
  past: 'Прошлое',
  present: 'Настоящее',
  future: 'Будущее',
}

export const TAROT_ORIENTATION_LABELS_RU: Record<TarotOrientation, string> = {
  upright: 'Прямая',
  reversed: 'Перевёрнутая',
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
