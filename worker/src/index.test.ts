// Тесты composition root: Env → конфиг → провайдер(+fallback) → handleAsk.
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
    GEMINI_API_KEY: "gemini-key",
    GEMINI_MODEL: "gemini-model",
    OPENROUTER_API_KEY: "openrouter-key",
    OPENROUTER_MODEL: "openrouter-model",
    ORACLE_MAX_TOKENS: "800",
    ORACLE_TEMPERATURE: "0.8",
    ORACLE_TIMEOUT: "20",
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

function geminiOk(): Response {
  const payload = {
    candidates: [{ content: { parts: [{ text: VALID_ORACLE_JSON }] } }],
  };
  return new Response(JSON.stringify(payload), { status: 200 });
}

function openRouterOk(): Response {
  const payload = {
    choices: [{ message: { role: "assistant", content: VALID_ORACLE_JSON } }],
  };
  return new Response(JSON.stringify(payload), { status: 200 });
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
  it("OPTIONS отвечает 204 даже с битым конфигом", async () => {
    const res = await worker.fetch(
      new Request("https://oracle.test/", { method: "OPTIONS" }),
      makeEnv({ GEMINI_API_KEY: "   ", GEMINI_MODEL: "" }),
    );
    expect(res.status).toBe(204);
  });

  it("не-POST отвечает 405 даже с битым конфигом", async () => {
    const res = await worker.fetch(
      new Request("https://oracle.test/", { method: "GET" }),
      makeEnv({ GEMINI_API_KEY: "   ", GEMINI_MODEL: "" }),
    );
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("по умолчанию отвечает через Gemini", async () => {
    let seenUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        seenUrl = String(input);
        return geminiOk();
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
      makeEnv({ GEMINI_API_KEY: "   " }),
    );

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "oracle_unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fallback: при 500 от Gemini спрашивает OpenRouter", async () => {
    const seenUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        seenUrls.push(url);
        return url.includes("openrouter")
          ? openRouterOk()
          : new Response("{}", { status: 500 });
      }),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ ORACLE_FALLBACK_PROVIDER: "openrouter" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ verdict: "ДА" });
    expect(seenUrls).toHaveLength(2);
    expect(seenUrls[0]).toContain("generativelanguage.googleapis.com");
    expect(seenUrls[1]).toContain("openrouter.ai");
  });

  it("без fallback падает в 502 когда Gemini недоступен", async () => {
    const seenUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        seenUrls.push(String(input));
        return new Response("{}", { status: 500 });
      }),
    );

    const res = await worker.fetch(postRequest(), makeEnv());

    expect(res.status).toBe(502);
    expect(seenUrls).toHaveLength(1);
  });

  it("битый fallback-конфиг не ломает primary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => geminiOk()),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({
        ORACLE_FALLBACK_PROVIDER: "openrouter",
        OPENROUTER_API_KEY: "   ",
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ verdict: "ДА" });
  });
});
