import { afterEach, describe, expect, it, vi } from "vitest";
import type { FetchImpl } from "../types";
import { fakeFetch, validConfig, VALID_ORACLE_JSON } from "./fixtures";
import { OpenRouterProvider } from "./openrouter";

afterEach(() => {
  vi.restoreAllMocks();
});

function openRouterOk(content: string | null): Response {
  const payload = { choices: [{ message: { role: "assistant", content } }] };
  return new Response(JSON.stringify(payload), { status: 200 });
}

describe("OpenRouterProvider", () => {
  it("возвращает пророчество и шлёт корректный запрос", async () => {
    let seenUrl = "";
    let seenHeaders: Headers | undefined;
    let seenBody = "";
    const fetchImpl = fakeFetch((url, init) => {
      seenUrl = url;
      seenHeaders = new Headers(init?.headers);
      seenBody = String(init?.body);
      return openRouterOk(VALID_ORACLE_JSON);
    });

    const result = await new OpenRouterProvider(validConfig(), fetchImpl).ask(
      "Учить ли Rust?",
    );

    expect(result).toMatchObject({ verdict: "ДА", confidence: 87 });
    expect(seenUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(seenHeaders?.get("Authorization")).toBe("Bearer test-key");
    expect(JSON.parse(seenBody)).toMatchObject({
      model: "test-model",
      messages: [{ role: "user" }],
      temperature: 0.8,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });
    expect(JSON.parse(seenBody).messages[0].content).toContain(
      "Учить ли Rust?",
    );
  });

  it("возвращает null при HTTP-ошибке", async () => {
    const provider = new OpenRouterProvider(
      validConfig(),
      fakeFetch(
        () =>
          new Response(JSON.stringify({ error: { message: "nope" } }), {
            status: 401,
          }),
      ),
    );
    expect(await provider.ask("Учить ли Rust?")).toBeNull();
  });

  it("возвращает null при битом ответе модели", async () => {
    const provider = new OpenRouterProvider(
      validConfig(),
      fakeFetch(() => openRouterOk('{"verdict":"ДА"}')),
    );
    expect(await provider.ask("Учить ли Rust?")).toBeNull();
  });

  it("возвращает null при пустом content", async () => {
    const provider = new OpenRouterProvider(
      validConfig(),
      fakeFetch(() => openRouterOk(null)),
    );
    expect(await provider.ask("Учить ли Rust?")).toBeNull();
  });

  it("возвращает null при сетевой ошибке", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("network down");
    }) as unknown as FetchImpl;
    const provider = new OpenRouterProvider(validConfig(), fetchImpl);
    expect(await provider.ask("Учить ли Rust?")).toBeNull();
  });

  it("200 с нечитаемым телом логирует response_unreadable", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const provider = new OpenRouterProvider(
      validConfig(),
      fakeFetch(() => new Response("", { status: 200 })),
    );

    expect(await provider.ask("Учить ли Rust?")).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith("openrouter_response_unreadable");
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("openrouter_request_failed"),
    );
  });

  it("сетевая ошибка логирует тип и сообщение", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as FetchImpl;
    const provider = new OpenRouterProvider(validConfig(), fetchImpl);

    expect(await provider.ask("Учить ли Rust?")).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      "openrouter_request_failed type=TypeError message=fetch failed",
    );
  });
});
