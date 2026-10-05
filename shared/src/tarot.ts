/** Идентификатор расклада. */
export type SpreadId =
  | "classic"
  | "relations"
  | "choice"
  | "yesno"
  | "diagnose"
  | "period"
  | "daily";

/** Позиция карты — просто строка, хозяин позиций — реестр раскладов. */
export type TarotPosition = string;

/** Положение карты: прямая или перевёрнутая. */
export type TarotOrientation = "upright" | "reversed";

/** Названия вариантов для расклада «Крест выбора». */
export interface ChoiceVariants {
  a: string;
  b: string;
}

/** Одна карта в ответе API. */
export interface TarotCard {
  id: string;
  name: string;
  position: TarotPosition;
  orientation: TarotOrientation;
  meaning: string;
  /** Абсолютный URL картинки. Пусто = хранилище не настроено. */
  imageUrl: string;
}

/** Расклад — ответ API. Поле spread подсказывает раскладку финала;
 *  variants — эхо запроса, не ответ модели. */
export interface TarotResponse {
  spread: SpreadId;
  cards: TarotCard[];
  summary: string;
  /** URL рубашки колоды. Пусто = хранилище не настроено. */
  backImageUrl: string;
  variants?: ChoiceVariants;
}
