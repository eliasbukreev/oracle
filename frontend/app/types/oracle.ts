import type { TarotOrientation } from "@oracle/shared";

export type {
  ChoiceVariants,
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

export type OracleErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "oracle_resting"
  | "oracle_unavailable"
  | "internal_error"
  | "blocked";

export type OracleError = {
  code: OracleErrorCode;
  message: string;
  retryAfter?: number;
};
