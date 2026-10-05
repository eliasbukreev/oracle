import type { OracleErrorCode, TarotOrientation } from "@oracle/shared";

export type {
  ChoiceVariants,
  OracleErrorCode,
  SpreadId,
  TarotCard,
  TarotOrientation,
  TarotPosition,
  TarotResponse,
} from "@oracle/shared";
export { SPREAD_POSITION_LABELS_RU, positionLabel } from "@oracle/shared";

export const TAROT_ORIENTATION_LABELS_RU: Record<TarotOrientation, string> = {
  upright: "Прямая",
  reversed: "Перевёрнутая",
};

export type OracleError = {
  code: OracleErrorCode;
  message: string;
  retryAfter?: number;
};
