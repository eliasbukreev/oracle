// Общие фикстуры для тестов провайдеров. Не *.test.ts,
// поэтому vitest не запускает файл как сьют.
import { createProviderConfig } from "../providers";
import type {
  DrawnCard,
  FetchImpl,
  OracleProviderConfig,
  TarotAskInput,
} from "../types";

export const DRAWN_CARDS: DrawnCard[] = [
  { id: "the-fool", name: "Шут", position: "past" },
  { id: "the-magician", name: "Маг", position: "present" },
  { id: "the-high-priestess", name: "Верховная Жрица", position: "future" },
];

export const VALID_TAROT_JSON = JSON.stringify({
  cards: [
    { id: "the-fool", position: "past", meaning: "Новое начало уже позади." },
    { id: "the-magician", position: "present", meaning: "Всё в твоих руках." },
    {
      id: "the-high-priestess",
      position: "future",
      meaning: "Тайна раскроется скоро.",
    },
  ],
  summary: "Прошлое отпустило, настоящее в твоей власти.",
});

export const VALID_RAW = {
  apiKey: "test-key",
  model: "test-model",
  maxOutputTokens: "800",
  temperature: "0.8",
  timeoutSeconds: "20",
};

export function validConfig(): OracleProviderConfig {
  const config = createProviderConfig(VALID_RAW);
  if (!config) throw new Error("valid config expected");
  return config;
}

export function validTarotInput(
  overrides: Partial<TarotAskInput> = {},
): TarotAskInput {
  return {
    question: "Учить ли Rust?",
    drawnCards: DRAWN_CARDS,
    ...overrides,
  };
}

export function fakeFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): FetchImpl {
  return ((input: string | URL | Request, init?: RequestInit) => {
    const result = handler(String(input), init);
    return Promise.resolve(result);
  }) as FetchImpl;
}

// fetch-дабл, эмулирующий строгость workerd: вызов с неверным `this`
export function strictFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): FetchImpl {
  return function (
    this: unknown,
    input: string | URL | Request,
    init?: RequestInit,
  ) {
    if (this !== undefined) {
      throw new TypeError(
        "Illegal invocation: function called with incorrect `this` reference.",
      );
    }
    return Promise.resolve(handler(String(input), init));
  } as unknown as FetchImpl;
}
