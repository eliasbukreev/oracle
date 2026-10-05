import type { z } from "zod";
import type {
  AskRequestSchema,
  ChoiceVariantsSchema,
  OracleErrorCodeSchema,
  SpreadIdSchema,
  TarotCardSchema,
  TarotOrientationSchema,
  TarotPositionSchema,
  TarotResponseSchema,
} from "./schemas";

export type OracleErrorCode = z.infer<typeof OracleErrorCodeSchema>;

export type SpreadId = z.infer<typeof SpreadIdSchema>;
export type TarotPosition = z.infer<typeof TarotPositionSchema>;
export type TarotOrientation = z.infer<typeof TarotOrientationSchema>;
export type ChoiceVariants = z.infer<typeof ChoiceVariantsSchema>;
export type TarotCard = z.infer<typeof TarotCardSchema>;
export type TarotResponse = z.infer<typeof TarotResponseSchema>;
export type AskRequest = z.infer<typeof AskRequestSchema>;
