// Тесты оркестрации: провайдер подменяется стабом через DI,
// сеть и Cloudflare не нужны.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RATE_LIMIT_WINDOW_SECONDS, handleAsk } from "./handler";
import { MAX_QUESTION_LENGTH } from "./oracle";
import type { OracleDeps, OracleProvider, OracleResponse } from "./types";

const PROPHECY: OracleResponse = {
  verdict: "ДА",
  confidence: 87,
  prophecy: "Путь тернист, но цель близка.",
  reason: "Звёзды благоволят смелым.",
};

function stubProvider(result: OracleResponse | null): OracleProvider {
  return { name: "stub", ask: async () => result };
}

function makeDeps(overrides: Partial<OracleDeps> = {}): OracleDeps {
  return {
    provider: stubProvider(PROPHECY),
    corsAllowedOrigins: "http://localhost:3000",
    ...overrides,
  };
}

function postRequest(body: unknown): Request {
  return new Request("https://oracle.test/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  it.each(["{oops", {}, { question: "   " }, { question: "x".repeat(MAX_QUESTION_LENGTH + 1) }])(
    "невалидный вопрос возвращает 400: %s",
    async (body) => {
      const res = await handleAsk(postRequest(body), makeDeps());
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid_request" });
    },
  );

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

  it("успех: спрашивает провайдера триммированным вопросом", async () => {
    const ask = vi.fn(async () => PROPHECY);
    const res = await handleAsk(
      postRequest({ question: "  Учить ли Rust?  " }),
      makeDeps({ provider: { name: "stub", ask } }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(PROPHECY);
    expect(ask).toHaveBeenCalledWith("Учить ли Rust?");
  });

  it("пустой ответ провайдера возвращает 502", async () => {
    const res = await handleAsk(
      postRequest({ question: "Учить ли Rust?" }),
      makeDeps({ provider: stubProvider(null) }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "oracle_unavailable" });
  });
});
