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
    ORCA_API_KEY: "orca-key",
    ORCA_MODEL: "orca-model",
    ORACLE_MAX_TOKENS: "1200",
    ORACLE_TEMPERATURE: "0.8",
    ORACLE_TIMEOUT: "20",
    CORS_ALLOWED_ORIGINS: "http://localhost:3000",
    TAROT_IMAGE_BASE_URL: "https://assets.test",
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

// Динамический мок LLM: читает вытянутые карты (id, позицию, положение)
// из промта и эхом возвращает их. Нужно, т.к. карты тянет сервер случайно.
function echoSpreadResponse(content: string): Response {
  const triples = [
    ...String(content).matchAll(
      /\[([a-zA-Z]+)[^\]]*\] [^(]*\(id: ([a-z-]+)\), положение: (ПРЯМАЯ|ПЕРЕВЁРНУТАЯ)/g,
    ),
  ];
  const cards = triples.map((m) => ({
    id: m[2],
    position: m[1],
    orientation: m[3] === "ПРЯМАЯ" ? "upright" : "reversed",
    meaning: `Толкование ${m[2]}.`,
  }));
  const payload = {
    choices: [
      {
        message: {
          role: "assistant",
          content: JSON.stringify({ cards, summary: "Общий вывод." }),
        },
      },
    ],
  };
  return new Response(JSON.stringify(payload), { status: 200 });
}

function promptContent(init?: RequestInit): string {
  try {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    return String(body?.messages?.[0]?.content ?? "");
  } catch {
    return "";
  }
}

// Эхо классификатора: всегда classic. Нужно, т.к. теперь каждый флоу
// делает два вызова (classify + askTarot).
function echoClassifyResponse(): Response {
  const payload = {
    choices: [
      {
        message: {
          role: "assistant",
          content: JSON.stringify({ spread: "classic" }),
        },
      },
    ],
  };
  return new Response(JSON.stringify(payload), { status: 200 });
}

// Роутер эха:Classify-промт отличается маркером «классификатор вопросов».
function echoAnyResponse(content: string): Response {
  if (content.includes("классификатор вопросов")) {
    return echoClassifyResponse();
  }
  return echoSpreadResponse(content);
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
        return echoAnyResponse(promptContent(init));
      }),
    );

    const res = await worker.fetch(postRequest(), makeEnv());

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      cards: Array<{ id: string; imageUrl: string }>;
      summary: string;
      backImageUrl: string;
    };
    expect(json.cards).toHaveLength(3);
    expect(json.summary).toBeTruthy();
    for (const card of json.cards) {
      expect(card.imageUrl.startsWith("https://assets.test/tarot/")).toBe(
        true,
      );
      expect(card.imageUrl.endsWith(".webp")).toBe(true);
    }
    expect(json.backImageUrl).toBe(
      "https://assets.test/tarot/CardBacks.webp",
    );
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
          return echoAnyResponse(promptContent(init));
        }
        return new Response("{}", { status: 500 });
      }),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ ORACLE_PROVIDERS: "openrouter,groq" }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { cards: unknown[] };
    expect(json.cards).toHaveLength(3);
    // classify: primary падает → secondary; askTarot: primary падает → secondary.
    expect(seenUrls).toHaveLength(4);
    expect(seenUrls[0]).toContain("openrouter.ai");
    expect(seenUrls[1]).toContain("groq.com");
    expect(seenUrls[2]).toContain("openrouter.ai");
    expect(seenUrls[3]).toContain("groq.com");
  });

  it("fallback: при 403 от OpenRouter спрашивает Groq", async () => {
    // Первый вызов 403, второй — эхо.
    const seenUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        seenUrls.push(url);
        if (!url.includes("groq")) {
          return new Response("forbidden", { status: 403 });
        }
        return echoAnyResponse(promptContent(init));
      }),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ ORACLE_PROVIDERS: "openrouter,groq" }),
    );

    expect(res.status).toBe(200);
    expect(seenUrls).toHaveLength(4);
  });

  it("запрет обоих провайдеров возвращает 403 blocked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("forbidden", { status: 403 })),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ ORACLE_PROVIDERS: "openrouter,groq" }),
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
    // classify упал, затем askTarot упал — оба у primary.
    expect(seenUrls).toHaveLength(2);
  });

  it("битый fallback-конфиг не ломает primary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) =>
        echoAnyResponse(promptContent(init)),
      ),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({
        ORACLE_PROVIDERS: "openrouter,groq",
        GROQ_API_KEY: "   ",
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { cards: unknown[] };
    expect(json.cards).toHaveLength(3);
  });

  it("ORACLE_PROVIDERS=orca ходит в api.orcarouter.ai", async () => {
    const seenUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        seenUrls.push(String(input));
        return echoAnyResponse(promptContent(init));
      }),
    );

    const res = await worker.fetch(postRequest(), makeEnv({ ORACLE_PROVIDERS: "orca" }));

    expect(res.status).toBe(200);
    // classify + askTarot — оба у primary.
    expect(seenUrls).toHaveLength(2);
    expect(seenUrls[0]).toBe("https://api.orcarouter.ai/v1/chat/completions");
    expect(seenUrls[1]).toBe("https://api.orcarouter.ai/v1/chat/completions");
  });

  it("fallback: при 500 от Orca спрашивает OpenRouter", async () => {
    const seenUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        seenUrls.push(url);
        if (url.includes("orcarouter")) {
          return new Response("{}", { status: 500 });
        }
        return echoAnyResponse(promptContent(init));
      }),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ ORACLE_PROVIDERS: "orca,openrouter" }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { cards: unknown[] };
    expect(json.cards).toHaveLength(3);
    // classify: primary падает → secondary; askTarot: primary падает → secondary.
    expect(seenUrls).toHaveLength(4);
    expect(seenUrls[0]).toContain("orcarouter");
    expect(seenUrls[1]).toContain("openrouter.ai");
    expect(seenUrls[2]).toContain("orcarouter");
    expect(seenUrls[3]).toContain("openrouter.ai");
  });
});

describe("parseProviderChain", () => {
  it("парсит список по порядку", async () => {
    const { parseProviderChain } = await import("./index");
    expect(
      parseProviderChain({ ...makeEnv(), ORACLE_PROVIDERS: "groq, orca" }),
    ).toEqual(["groq", "orca"]);
  });

  it("чистит мусор и дубли", async () => {
    const { parseProviderChain } = await import("./index");
    expect(
      parseProviderChain({
        ...makeEnv(),
        ORACLE_PROVIDERS: " groq,,groq, ",
      }),
    ).toEqual(["groq"]);
  });

  it("пустой список даёт дефолт", async () => {
    const { parseProviderChain } = await import("./index");
    expect(
      parseProviderChain({ ...makeEnv(), ORACLE_PROVIDERS: "   " }),
    ).toEqual(["openrouter"]);
    expect(parseProviderChain(makeEnv())).toEqual(["openrouter"]);
  });
});

describe("worker fetch chain", () => {
  it("ORACLE_PROVIDERS из трёх: падают два первых, отвечает третий", async () => {
    const seenUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        seenUrls.push(url);
        if (url.includes("orcarouter")) {
          return echoAnyResponse(promptContent(init));
        }
        return new Response("{}", { status: 500 });
      }),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ ORACLE_PROVIDERS: "openrouter,groq,orca" }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { cards: unknown[] };
    expect(json.cards).toHaveLength(3);
    // classify: openrouter→groq→orca(ок); askTarot: openrouter→groq→orca(ок).
    expect(seenUrls).toHaveLength(6);
    expect(seenUrls[5]).toContain("orcarouter");
  });

  it("все недоступны и все в запрете → 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("forbidden", { status: 403 })),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ ORACLE_PROVIDERS: "openrouter,groq,orca" }),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "blocked" });
  });

  it("смешанные сбои → 502, а не blocked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        // Первый в запрете, остальные просто лежат.
        if (url.includes("openrouter.ai")) {
          return new Response("forbidden", { status: 403 });
        }
        return new Response("{}", { status: 500 });
      }),
    );

    const res = await worker.fetch(
      postRequest(),
      makeEnv({ ORACLE_PROVIDERS: "openrouter,groq,orca" }),
    );

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "oracle_unavailable" });
  });
});
