import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PROVIDER,
  GeminiProvider,
  PROVIDER_GEMINI,
  createProvider,
  createProviderConfig,
} from "./providers";
import type { FetchImpl, OracleProviderConfig } from "./types";

const VALID_ORACLE_JSON = JSON.stringify({
  verdict: "ДА",
  confidence: 87,
  prophecy: "Путь тернист, но цель близка.",
  reason: "Звёзды благоволят смелым.",
});

const VALID_RAW = {
  apiKey: "test-key",
  model: "test-model",
  maxOutputTokens: "800",
  temperature: "0.8",
  timeoutSeconds: "20",
};

function validConfig(): OracleProviderConfig {
  const config = createProviderConfig(VALID_RAW);
  if (!config) throw new Error("valid config expected");
  return config;
}

function fakeFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): FetchImpl {
  return ((input: string | URL | Request, init?: RequestInit) => {
    const result = handler(String(input), init);
    return Promise.resolve(result);
  }) as FetchImpl;
}

function geminiOk(text: string): Response {
  const payload = { candidates: [{ content: { parts: [{ text }] } }] };
  return new Response(JSON.stringify(payload), { status: 200 });
}

describe("createProviderConfig", () => {
  it("парсит корректные строки", () => {
    expect(createProviderConfig(VALID_RAW)).toEqual({
      apiKey: "test-key",
      model: "test-model",
      maxOutputTokens: 800,
      temperature: 0.8,
      timeoutMs: 20_000,
    });
  });

  it.each([
    { ...VALID_RAW, model: "   " },
    { ...VALID_RAW, apiKey: "" },
    { ...VALID_RAW, maxOutputTokens: "lots" },
    { ...VALID_RAW, temperature: "hot" },
  ])("возвращает null для невалидного конфига: %s", (raw) => {
    expect(createProviderConfig(raw)).toBeNull();
  });

  it("невалидный таймаут даёт дефолт 20с", () => {
    expect(
      createProviderConfig({ ...VALID_RAW, timeoutSeconds: "soon" })
        ?.timeoutMs,
    ).toBe(20_000);
  });
});

describe("createProvider", () => {
  it("дефолтный провайдер — gemini", () => {
    expect(DEFAULT_PROVIDER).toBe(PROVIDER_GEMINI);
  });

  it("создаёт GeminiProvider", () => {
    const provider = createProvider("gemini", validConfig());
    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(provider.name).toBe("gemini");
  });

  it("бросает на неизвестном провайдере", () => {
    expect(() => createProvider("openrouter", validConfig())).toThrow(
      /unknown_oracle_provider/,
    );
  });
});

describe("GeminiProvider", () => {
  it("возвращает пророчество и шлёт корректный запрос", async () => {
    let seenUrl = "";
    let seenBody = "";
    const fetchImpl = fakeFetch((url, init) => {
      seenUrl = url;
      seenBody = String(init?.body);
      return geminiOk(VALID_ORACLE_JSON);
    });

    const result = await new GeminiProvider(validConfig(), fetchImpl).ask(
      "Учить ли Rust?",
    );

    expect(result).toMatchObject({ verdict: "ДА", confidence: 87 });
    expect(seenUrl).toContain("test-model");
    expect(seenUrl).toContain("test-key");
    expect(JSON.parse(seenBody)).toMatchObject({
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
      },
    });
  });

  it("возвращает null при HTTP-ошибке", async () => {
    const provider = new GeminiProvider(
      validConfig(),
      fakeFetch(() => new Response("{}", { status: 400 })),
    );
    expect(await provider.ask("Учить ли Rust?")).toBeNull();
  });

  it("возвращает null при битом ответе модели", async () => {
    const provider = new GeminiProvider(
      validConfig(),
      fakeFetch(() => geminiOk('{"verdict":"ДА"}')),
    );
    expect(await provider.ask("Учить ли Rust?")).toBeNull();
  });

  it("возвращает null при сетевой ошибке", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("network down");
    }) as unknown as FetchImpl;
    const provider = new GeminiProvider(validConfig(), fetchImpl);
    expect(await provider.ask("Учить ли Rust?")).toBeNull();
  });
});
