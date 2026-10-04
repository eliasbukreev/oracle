import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROVIDER,
  PROVIDER_GROQ,
  PROVIDER_OPENROUTER,
  createProvider,
  createProviderConfig,
} from "./providers";
import type { OracleProviderConfig } from "./types";

const VALID_RAW = {
  apiKey: "test-key",
  model: "test-model",
  maxOutputTokens: "800",
  temperature: "0.8",
  timeoutSeconds: "20",
  imageBaseUrl: "https://assets.test",
};

function validConfig(): OracleProviderConfig {
  const config = createProviderConfig(VALID_RAW);
  if (!config) throw new Error("valid config expected");
  return config;
}

describe("createProviderConfig", () => {
  it("парсит корректные строки", () => {
    expect(createProviderConfig(VALID_RAW)).toEqual({
      apiKey: "test-key",
      model: "test-model",
      maxOutputTokens: 800,
      temperature: 0.8,
      timeoutMs: 20_000,
      imageBaseUrl: "https://assets.test",
    });
  });

  it("нормализует base URL картинок и допускает пустой", () => {
    expect(
      createProviderConfig({ ...VALID_RAW, imageBaseUrl: "https://a.test/// " })
        ?.imageBaseUrl,
    ).toBe("https://a.test");
    expect(
      createProviderConfig({ ...VALID_RAW, imageBaseUrl: "   " })
        ?.imageBaseUrl,
    ).toBe("");
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
  it("дефолтный провайдер — openrouter", () => {
    expect(DEFAULT_PROVIDER).toBe(PROVIDER_OPENROUTER);
  });

  it("создаёт OpenRouterProvider", () => {
    const provider = createProvider(PROVIDER_OPENROUTER, validConfig());
    expect(provider.name).toBe("openrouter");
    expect(typeof provider.askTarot).toBe("function");
  });

  it("создаёт GroqProvider", () => {
    const provider = createProvider(PROVIDER_GROQ, validConfig());
    expect(provider.name).toBe("groq");
    expect(typeof provider.askTarot).toBe("function");
  });

  it("бросает на неизвестном провайдере", () => {
    expect(() => createProvider("unknown-provider", validConfig())).toThrow(
      /unknown_oracle_provider/,
    );
  });
});
