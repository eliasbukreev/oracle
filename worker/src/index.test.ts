import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, {
  MAX_QUESTION_LENGTH,
  RATE_LIMIT_WINDOW_SECONDS,
  corsHeaders,
  isOracleResponse,
  oraclePrompt,
  parseModelResponse,
  type Env,
} from "./index";

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

function makeRequest(
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Request {
  return new Request("https://oracle.test/", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function fakeLimiter(success = true): RateLimit {
  return { limit: vi.fn(async () => ({ success })) } as RateLimit;
}

function mockGeminiOk(text: string): void {
  const payload = { candidates: [{ content: { parts: [{ text }] } }] };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
  );
}

describe("isOracleResponse", () => {
  it("принимает корректный ответ", () => {
    expect(isOracleResponse(JSON.parse(VALID_ORACLE_JSON))).toBe(true);
  });

  it("отклоняет не-объекты", () => {
    expect(isOracleResponse(null)).toBe(false);
    expect(isOracleResponse("text")).toBe(false);
    expect(isOracleResponse([])).toBe(false);
  });

  it("отклоняет ответ без полей", () => {
    const parsed = JSON.parse(VALID_ORACLE_JSON) as Record<string, unknown>;
    delete parsed.prophecy;
    expect(isOracleResponse(parsed)).toBe(false);
  });

  it.each([101, -1, "87", true, Number.NaN])(
    "отклоняет некорректный confidence: %s",
    (confidence) => {
      expect(
        isOracleResponse({ ...JSON.parse(VALID_ORACLE_JSON), confidence }),
      ).toBe(false);
    },
  );

  it("отклоняет пустой verdict и слишком длинные поля", () => {
    const base = JSON.parse(VALID_ORACLE_JSON) as Record<string, unknown>;
    expect(isOracleResponse({ ...base, verdict: "   " })).toBe(false);
    expect(isOracleResponse({ ...base, prophecy: "x".repeat(4001) })).toBe(
      false,
    );
  });
});

describe("parseModelResponse", () => {
  it("парсит чистый JSON и триммит поля", () => {
    const result = parseModelResponse(`  ${VALID_ORACLE_JSON}  `);
    expect(result).toMatchObject({ verdict: "ДА", confidence: 87 });
  });

  it("снимает markdown-обёртку", () => {
    expect(parseModelResponse(`\`\`\`json\n${VALID_ORACLE_JSON}\n\`\`\``))
      .toMatchObject({ verdict: "ДА" });
    expect(parseModelResponse(`\`\`\`\n${VALID_ORACLE_JSON}\n\`\`\``))
      .toMatchObject({ verdict: "ДА" });
  });

  it("возвращает null для мусора и неверной схемы", () => {
    expect(parseModelResponse("не json")).toBeNull();
    expect(parseModelResponse('{"verdict":"ДА"}')).toBeNull();
  });
});

describe("oraclePrompt", () => {
  it("включает вопрос и требование JSON", () => {
    const prompt = oraclePrompt("Учить ли Rust?");
    expect(prompt).toContain("Учить ли Rust?");
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("confidence");
  });
});

describe("corsHeaders", () => {
  const env = makeEnv();

  it("отражает разрешённый origin", () => {
    const request = new Request("https://oracle.test/", {
      headers: { Origin: "http://localhost:3000" },
    });
    const headers = corsHeaders(request, env);
    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000",
    );
    expect(headers.get("Vary")).toBe("Origin");
  });

  it("не ставит Allow-Origin для чужого origin", () => {
    const request = new Request("https://oracle.test/", {
      headers: { Origin: "https://evil.example" },
    });
    expect(corsHeaders(request, env).get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("поддерживает wildcard", () => {
    const wildcardEnv = makeEnv({ CORS_ALLOWED_ORIGINS: "*" });
    const request = new Request("https://oracle.test/", {
      headers: { Origin: "https://any.example" },
    });
    expect(corsHeaders(request, wildcardEnv).get("Access-Control-Allow-Origin"))
      .toBe("https://any.example");
  });
});

describe("fetch handler", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("OPTIONS возвращает 204", async () => {
    const res = await worker.fetch(
      new Request("https://oracle.test/", { method: "OPTIONS" }),
      makeEnv(),
    );
    expect(res.status).toBe(204);
  });

  it("не-POST возвращает 405", async () => {
    const res = await worker.fetch(
      new Request("https://oracle.test/", { method: "GET" }),
      makeEnv(),
    );
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it.each(["{oops", {}, { question: "   " }, { question: "x".repeat(MAX_QUESTION_LENGTH + 1) }])(
    "невалидный вопрос возвращает 400: %s",
    async (body) => {
      const res = await worker.fetch(makeRequest(body), makeEnv());
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid_request" });
    },
  );

  it("превышение лимита возвращает 429 с retry_after", async () => {
    const perIp = fakeLimiter(false);
    const env = makeEnv({
      ORACLE_PER_IP_LIMITER: perIp,
      ORACLE_GLOBAL_LIMITER: fakeLimiter(true),
    });
    const res = await worker.fetch(
      makeRequest({ question: "Учить ли Rust?" }, { "CF-Connecting-IP": "1.2.3.4" }),
      env,
    );

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(
      String(RATE_LIMIT_WINDOW_SECONDS),
    );
    expect(await res.json()).toEqual({
      error: "oracle_resting",
      retry_after: RATE_LIMIT_WINDOW_SECONDS,
    });
    expect(perIp.limit).toHaveBeenCalledWith({ key: "1.2.3.4" });
  });

  it("ошибка биндинга лимита возвращает 502 без деталей", async () => {
    const broken = {
      limit: async () => {
        throw new Error("boom");
      },
    } as RateLimit;
    const res = await worker.fetch(
      makeRequest({ question: "Учить ли Rust?" }),
      makeEnv({ ORACLE_PER_IP_LIMITER: broken }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "oracle_unavailable" });
  });

  it("успешный путь возвращает пророчество", async () => {
    const perIp = fakeLimiter(true);
    const global = fakeLimiter(true);
    mockGeminiOk(VALID_ORACLE_JSON);

    const res = await worker.fetch(
      makeRequest({ question: "Учить ли Rust?" }, { "CF-Connecting-IP": "1.2.3.4" }),
      makeEnv({ ORACLE_PER_IP_LIMITER: perIp, ORACLE_GLOBAL_LIMITER: global }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      verdict: "ДА",
      confidence: 87,
    });
    expect(global.limit).toHaveBeenCalledWith({ key: "global" });
  });

  it("битый ответ модели возвращает 502", async () => {
    mockGeminiOk('{"verdict":"ДА"}');
    const res = await worker.fetch(
      makeRequest({ question: "Учить ли Rust?" }),
      makeEnv(),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "oracle_unavailable" });
  });
});
