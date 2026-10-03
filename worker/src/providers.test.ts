import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROVIDER,
  PROVIDER_GEMINI,
  PROVIDER_OPENROUTER,
  createProvider,
  createProviderConfig,
} from "./providers";
import { GeminiProvider } from "./providers/gemini";
import { OpenRouterProvider } from "./providers/openrouter";
import { validConfig, VALID_RAW } from "./providers/fixtures";

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

  it("создаёт OpenRouterProvider", () => {
    const provider = createProvider(PROVIDER_OPENROUTER, validConfig());
    expect(provider).toBeInstanceOf(OpenRouterProvider);
    expect(provider.name).toBe("openrouter");
  });

  it("бросает на неизвестном провайдере", () => {
    expect(() => createProvider("unknown-provider", validConfig())).toThrow(
      /unknown_oracle_provider/,
    );
  });
});
