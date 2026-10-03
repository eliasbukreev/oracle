import { describe, expect, it, vi } from "vitest";
import { fakeFetch, validConfig, VALID_ORACLE_JSON } from "./fixtures";
import { GeminiProvider } from "./gemini";
import type { FetchImpl } from "../types";

function geminiOk(text: string): Response {
  const payload = { candidates: [{ content: { parts: [{ text }] } }] };
  return new Response(JSON.stringify(payload), { status: 200 });
}

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
