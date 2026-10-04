// Тесты оркестрации: провайдер подменяется стабом через DI,
// сеть и Cloudflare не нужны.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_BODY_BYTES, RATE_LIMIT_WINDOW_SECONDS, handleAsk } from "./handler";
import { MAX_QUESTION_LENGTH } from "./oracle";
import type {
  OracleDeps,
  OracleProvider,
  ProviderAnswer,
  TarotResponse,
} from "./types";

const SPREAD: TarotResponse = {
  // TODO(шаг 3): фикстуры под реестры раскладов.
  spread: "classic",
  cards: [
    {
      id: "the-fool",
      name: "Шут",
      position: "past",
      orientation: "upright",
      meaning: "Начало позади.",
      imageUrl: "https://assets.test/tarot/00-TheFool.webp",
    },
    {
      id: "the-magician",
      name: "Маг",
      position: "present",
      orientation: "reversed",
      meaning: "Сила в руках.",
      imageUrl: "https://assets.test/tarot/01-TheMagician.webp",
    },
    {
      id: "the-high-priestess",
      name: "Верховная Жрица",
      position: "future",
      orientation: "upright",
      meaning: "Тайна рядом.",
      imageUrl: "https://assets.test/tarot/02-TheHighPriestess.webp",
    },
  ],
  summary: "Итог расклада.",
  backImageUrl: "https://assets.test/tarot/CardBacks.webp",
};

function stubProvider(answer: ProviderAnswer): OracleProvider {
  return { name: "stub", askTarot: async () => answer };
}

function makeDeps(overrides: Partial<OracleDeps> = {}): OracleDeps {
  return {
    provider: stubProvider({ ok: true, response: SPREAD }),
    corsAllowedOrigins: "http://localhost:3000",
    randomFn: () => 0,
    ...overrides,
  };
}

function postRequest(
  body: unknown,
  init: { url?: string; contentLength?: number } = {},
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (init.contentLength !== undefined) {
    headers["Content-Length"] = String(init.contentLength);
  }

  return new Request(init.url ?? "https://oracle.test/", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleAsk", () => {
  it("OPTIONS возвращает 204", async () => {
    const res = await handleAsk(
      new Request("https://oracle.test/", { method: "OPTIONS" }),
      makeDeps(),
    );
    expect(res.status).toBe(204);
  });

  it("не-POST возвращает 405", async () => {
    const res = await handleAsk(
      new Request("https://oracle.test/", { method: "GET" }),
      makeDeps(),
    );
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("чужой путь возвращает 400", async () => {
    const res = await handleAsk(
      postRequest(
        { question: "Учить ли Rust?" },
        { url: "https://oracle.test/api/ask" },
      ),
      makeDeps(),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("гигантское тело отбрасывается до парсинга", async () => {
    const res = await handleAsk(
      postRequest(
        { question: "Учить ли Rust?" },
        { contentLength: MAX_BODY_BYTES + 1 },
      ),
      makeDeps(),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("тело на границе лимита проходит дальше", async () => {
    const res = await handleAsk(
      postRequest(
        { question: "Учить ли Rust?" },
        { contentLength: MAX_BODY_BYTES },
      ),
      makeDeps(),
    );
    expect(res.status).toBe(200);
  });

  it("без Content-Length пропускает к валидации", async () => {
    const res = await handleAsk(
      postRequest({ question: "Учить ли Rust?" }),
      makeDeps(),
    );
    expect(res.status).toBe(200);
  });

  it.each([
    "{oops",
    {},
    { question: "   " },
    { question: "x".repeat(MAX_QUESTION_LENGTH + 1) },
  ])("невалидный вопрос возвращает 400: %s", async (body) => {
    const res = await handleAsk(postRequest(body), makeDeps());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("превышение лимита возвращает 429 с retry_after", async () => {
    const perIp = { limit: vi.fn(async () => ({ success: false })) };
    const res = await handleAsk(
      postRequest({ question: "Учить ли Rust?" }),
      makeDeps({ perIpLimiter: perIp }),
    );

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(
      String(RATE_LIMIT_WINDOW_SECONDS),
    );
    expect(await res.json()).toEqual({
      error: "oracle_resting",
      retry_after: RATE_LIMIT_WINDOW_SECONDS,
    });
  });

  it("ошибка лимитера возвращает 502 без деталей", async () => {
    const broken = {
      limit: async () => {
        throw new Error("boom");
      },
    };
    const res = await handleAsk(
      postRequest({ question: "Учить ли Rust?" }),
      makeDeps({ perIpLimiter: broken }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "oracle_unavailable" });
  });

  it("успех: спрашивает провайдера триммированным вопросом и картами", async () => {
    const askTarot = vi.fn<
      (input: import("./types").TarotAskInput) => Promise<ProviderAnswer>
    >(async () => ({ ok: true, response: SPREAD }));
    const res = await handleAsk(
      postRequest({ question: "  Учить ли Rust?  " }),
      makeDeps({ provider: { name: "stub", askTarot } }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(SPREAD);
    expect(askTarot).toHaveBeenCalledOnce();
    const seenInput = askTarot.mock.calls[0]?.[0];
    expect(seenInput).toMatchObject({ question: "Учить ли Rust?" });
    expect(seenInput?.drawnCards).toHaveLength(3);
  });

  it("пустой ответ провайдера возвращает 502", async () => {
    const res = await handleAsk(
      postRequest({ question: "Учить ли Rust?" }),
      makeDeps({ provider: stubProvider({ ok: false, blocked: false }) }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "oracle_unavailable" });
  });

  it("запрет провайдера возвращает 403 blocked", async () => {
    const res = await handleAsk(
      postRequest({ question: "Учить ли Rust?" }),
      makeDeps({ provider: stubProvider({ ok: false, blocked: true }) }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "blocked" });
  });
});
