export type TarotPosition = string

export type TarotOrientation = 'upright' | 'reversed'

export type SpreadId = 'classic' | 'relations' | 'choice'

export type ChoiceVariants = {
  a: string
  b: string
}

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
  spread: SpreadId
  cards: TarotCard[]
  summary: string
  /** URL рубашки колоды. Пусто = хранилище не настроено. */
  backImageUrl: string
  /** Эхо запроса для choice: названия вариантов. */
  variants?: ChoiceVariants
}

/** Исторический алиас: раньше ответом было одиночное пророчество. */
export type OracleResponse = TarotResponse

export const SPREAD_POSITION_LABELS_RU: Record<SpreadId, Record<string, string>> = {
  classic: {
    past: 'Прошлое',
    present: 'Настоящее',
    future: 'Будущее',
  },
  relations: {
    self: 'Я в этих отношениях',
    other: 'Другой человек',
    attraction: 'Что нас притягивает',
    obstacle: 'Что мешает',
    potential: 'Потенциал отношений',
  },
  choice: {
    core: 'Суть ситуации',
    optionA: 'Если выбрать вариант А',
    outcomeA: 'Что даст вариант А',
    optionB: 'Если выбрать вариант Б',
    outcomeB: 'Что даст вариант Б',
  },
}

export function positionLabel(spread: SpreadId, position: string): string {
  return SPREAD_POSITION_LABELS_RU[spread]?.[position] ?? position
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
