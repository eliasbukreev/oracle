// Тесты composition root: Env → конфиг → провайдер → handleAsk.
// Дефолтный путь — Gemini; новый провайдер сюда не пробрасывается
// (подключение — отдельным шагом).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "./index";

const VALID_ORACLE_JSON = JSON.stringify({
  verdict: "ДА",
  confidence: 87,
  prophecy: "Путь тернист, но цель близка.",
  reason: "Звёзды благоволят смелым.",
});

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    GOOGLE_AI_API_KEY: "test-key",
    GOOGLE_AI_MODEL: "test-model",
    GOOGLE_AI_MAX_TOKENS: "800",
    GOOGLE_AI_TEMPERATURE: "0.8",
    GOOGLE_AI_TIMEOUT: "20",
    CORS_ALLOWED_ORIGINS: "http://localhost:3000",
    ...overrides,
  };
}

function postRequest(): Request {
  return new Request("https://oracle.test/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Учить ли Rust?" }),
  });
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("worker fetch", () => {
  it("по умолчанию отвечает через Gemini", async () => {
    let seenUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        seenUrl = String(input);
        const payload = {
          candidates: [{ content: { parts: [{ text: VALID_ORACLE_JSON }] } }],
        };
        return new Response(JSON.stringify(payload), { status: 200 });
      }),
    );

    const res = await worker.fetch(postRequest(), makeEnv());

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ verdict: "ДА" });
    expect(seenUrl).toContain("generativelanguage.googleapis.com");
  });

  it("невалидный конфиг отвечает 502 без выхода в сеть", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ GOOGLE_AI_API_KEY: "   " }),
    );

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "oracle_unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
