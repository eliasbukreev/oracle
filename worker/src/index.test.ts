// Тесты composition root: Env → конфиг → провайдер(+fallback) → handleAsk.
// Цепочка по умолчанию: OpenRouter primary + Groq fallback.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "./index";

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    OPENROUTER_API_KEY: "openrouter-key",
    OPENROUTER_MODEL: "openrouter-model",
    GROQ_API_KEY: "groq-key",
    GROQ_MODEL: "groq-model",
    ORACLE_MAX_TOKENS: "1200",
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

// Динамический мок LLM: читает вытянутые id из промта и эхом возвращает их.
// Нужно, т.к. карты тянет сервер случайно через cryptoRandom.
function tarotEcho(): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            role: "assistant",
            content: "__ECHO_TAROT__",
          },
        },
      ],
    }),
    { status: 200 },
  );
}

function stubChatFetch(
  respond: (url: string, body: unknown) => Response = () => tarotEcho(),
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      let body: unknown = null;
      try {
        body = init?.body ? JSON.parse(String(init.body)) : null;
      } catch {
        body = null;
      }

      const content =
        (body as { messages?: Array<{ content?: string }> } | null)
          ?.messages?.[0]?.content ?? "";

      // Если провайдер прислал промт с id — отвечаем валидным раскладом по тем же id.
      const ids = [...content.matchAll(/\(id: ([a-z-]+)\)/g)].map((m) => m[1]);
      if (ids.length === 3) {
        const positions = ["past", "present", "future"];
        const payload = {
          choices: [
            {
              message: {
                role: "assistant",
                content: JSON.stringify({
                  cards: ids.map((id, i) => ({
                    id,
                    position: positions[i],
                    meaning: `Толкование ${id}.`,
                  })),
                  summary: "Общий вывод.",
                }),
              },
            },
          ],
        };
        return new Response(JSON.stringify(payload), { status: 200 });
      }

      return respond(url, body);
    }),
  );
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
      makeEnv({ OPENROUTER_API_KEY: "   ", OPENROUTER_MODEL: "" }),
    );
    expect(res.status).toBe(204);
  });

  it("не-POST отвечает 405 даже с битым конфигом", async () => {
    const res = await worker.fetch(
      new Request("https://oracle.test/", { method: "GET" }),
      makeEnv({ OPENROUTER_API_KEY: "   ", OPENROUTER_MODEL: "" }),
    );
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("по умолчанию отвечает раскладом через OpenRouter", async () => {
    let seenUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        seenUrl = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        const content = body?.messages?.[0]?.content ?? "";
        const ids = [...String(content).matchAll(/\(id: ([a-z-]+)\)/g)].map(
          (m) => m[1],
        );
        const payload = {
          choices: [
            {
              message: {
                role: "assistant",
                content: JSON.stringify({
                  cards: ids.map((id, i) => ({
                    id,
                    position: ["past", "present", "future"][i],
                    meaning: `Толкование ${id}.`,
                  })),
                  summary: "Общий вывод.",
                }),
              },
            },
          ],
        };
        return new Response(JSON.stringify(payload), { status: 200 });
      }),
    );

    const res = await worker.fetch(postRequest(), makeEnv());

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      cards: Array<{ id: string }>;
      summary: string;
    };
    expect(json.cards).toHaveLength(3);
    expect(json.summary).toBeTruthy();
    expect(seenUrl).toContain("openrouter.ai");
  });

  it("невалидный конфиг отвечает 502 без выхода в сеть", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ OPENROUTER_API_KEY: "   " }),
    );

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "oracle_unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fallback: при 500 от OpenRouter спрашивает Groq", async () => {
    const seenUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        seenUrls.push(url);
        if (url.includes("groq")) {
          const body = init?.body ? JSON.parse(String(init.body)) : null;
          const content = String(body?.messages?.[0]?.content ?? "");
          const ids = [...content.matchAll(/\(id: ([a-z-]+)\)/g)].map(
            (m) => m[1],
          );
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: JSON.stringify({
                      cards: ids.map((id, i) => ({
                        id,
                        position: ["past", "present", "future"][i],
                        meaning: `Толкование ${id}.`,
                      })),
                      summary: "Общий вывод.",
                    }),
                  },
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response("{}", { status: 500 });
      }),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ ORACLE_FALLBACK_PROVIDER: "groq" }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { cards: unknown[] };
    expect(json.cards).toHaveLength(3);
    expect(seenUrls).toHaveLength(2);
    expect(seenUrls[0]).toContain("openrouter.ai");
    expect(seenUrls[1]).toContain("groq.com");
  });

  it("fallback: при 403 от OpenRouter спрашивает Groq", async () => {
    stubChatFetch((url) =>
      url.includes("groq")
        ? new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: JSON.stringify({
                      cards: [
                        { id: "a", position: "past", meaning: "x" },
                        { id: "b", position: "present", meaning: "y" },
                        { id: "c", position: "future", meaning: "z" },
                      ],
                      summary: "s",
                    }),
                  },
                },
              ],
            }),
            { status: 200 },
          )
        : new Response("forbidden", { status: 403 }),
    );
    // Простой счётчик для этого кейса: первый вызов 403, второй — эхо.
    const seenUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        seenUrls.push(url);
        if (!url.includes("groq")) {
          return new Response("forbidden", { status: 403 });
        }
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        const content = String(body?.messages?.[0]?.content ?? "");
        const ids = [...content.matchAll(/\(id: ([a-z-]+)\)/g)].map(
          (m) => m[1],
        );
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    cards: ids.map((id, i) => ({
                      id,
                      position: ["past", "present", "future"][i],
                      meaning: `Толкование ${id}.`,
                    })),
                    summary: "Общий вывод.",
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        );
      }),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ ORACLE_FALLBACK_PROVIDER: "groq" }),
    );

    expect(res.status).toBe(200);
    expect(seenUrls).toHaveLength(2);
  });

  it("запрет обоих провайдеров возвращает 403 blocked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("forbidden", { status: 403 })),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ ORACLE_FALLBACK_PROVIDER: "groq" }),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "blocked" });
  });

  it("без fallback падает в 502 когда OpenRouter недоступен", async () => {
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
    stubChatFetch();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        const content = String(body?.messages?.[0]?.content ?? "");
        const ids = [...content.matchAll(/\(id: ([a-z-]+)\)/g)].map(
          (m) => m[1],
        );
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    cards: ids.map((id, i) => ({
                      id,
                      position: ["past", "present", "future"][i],
                      meaning: `Толкование ${id}.`,
                    })),
                    summary: "Общий вывод.",
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        );
      }),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({
        ORACLE_FALLBACK_PROVIDER: "groq",
        GROQ_API_KEY: "   ",
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { cards: unknown[] };
    expect(json.cards).toHaveLength(3);
  });
});
