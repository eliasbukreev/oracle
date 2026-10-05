import { z } from "zod";
import {
  MAX_NAME_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_RESPONSE_FIELD_LENGTH,
  MAX_VARIANT_LENGTH,
} from "./limits";

/** Идентификатор расклада. */
export const SpreadIdSchema = z.enum([
  "classic",
  "relations",
  "choice",
  "yesno",
  "diagnose",
  "period",
  "daily",
]);

/** Положение карты: прямая или перевёрнутая. */
export const TarotOrientationSchema = z.enum(["upright", "reversed"]);

/** Позиция карты — просто строка, хозяин позиций — реестр раскладов. */
export const TarotPositionSchema = z.string().min(1);

/** Названия вариантов для расклада «Крест выбора». */
export const ChoiceVariantsSchema = z.object({
  a: z.string().trim().min(1).max(MAX_VARIANT_LENGTH),
  b: z.string().trim().min(1).max(MAX_VARIANT_LENGTH),
});

/** Одна карта в ответе API. Имя проверяется, но канон берётся из колоды. */
export const TarotCardSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .refine((s) => s.trim().length > 0 && s.length <= MAX_NAME_LENGTH),
  position: TarotPositionSchema,
  orientation: TarotOrientationSchema,
  meaning: z.string().trim().min(1).max(MAX_RESPONSE_FIELD_LENGTH),
  /** Абсолютный URL картинки. Пусто = хранилище не настроено. */
  imageUrl: z.string(),
});

/** Расклад — ответ API. Поле spread подсказывает раскладку финала;
 *  variants — эхо запроса, не ответ модели. */
export const TarotResponseSchema = z.object({
  spread: SpreadIdSchema,
  cards: z.array(TarotCardSchema).min(1).max(10),
  summary: z.string().trim().min(1).max(MAX_RESPONSE_FIELD_LENGTH),
  /** URL рубашки колоды. Пусто = хранилище не настроено. */
  backImageUrl: z.string(),
  variants: ChoiceVariantsSchema.optional(),
});

/** Тело ask-запроса: только вопрос. */
export const AskRequestSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
});

/** Код ошибки API. */
export const OracleErrorCodeSchema = z.enum([
  "invalid_request",
  "invalid_client",
  "oracle_resting",
  "oracle_unavailable",
  "internal_error",
  "blocked",
]);
