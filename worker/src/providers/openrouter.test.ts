import { afterEach, describe, expect, it, vi } from "vitest";
import type { FetchImpl } from "../types";
import { fakeFetch, strictFetch, validConfig, VALID_ORACLE_JSON } from "./fixtures";
import { createOpenRouterProvider } from "./openrouter";

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

    const result = await createOpenRouterProvider(validConfig(), fetchImpl).ask(
      "Учить ли Rust?",
    );

    expect(result).toEqual({
      ok: true,
      response: JSON.parse(VALID_ORACLE_JSON),
    });
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
    const provider = createOpenRouterProvider(
      validConfig(),
      fakeFetch(
        () =>
          new Response(JSON.stringify({ error: { message: "nope" } }), {
            status: 401,
          }),
      ),
    );
    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: false,
      blocked: false,
    });
  });

  it("логирует код, message и error_type из тела ошибки", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const provider = createOpenRouterProvider(
      validConfig(),
      fakeFetch(
        () =>
          new Response(
            JSON.stringify({
              error: {
                code: 403,
                message: "Request blocked",
                metadata: { error_type: "permission_denied" },
              },
            }),
            { status: 403 },
          ),
      ),
    );

    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: false,
      blocked: true,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "openrouter_http_error status=403 message=code=403 Request blocked type=permission_denied",
    );
  });

  it("логирует строковую ошибку как есть", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const provider = createOpenRouterProvider(
      validConfig(),
      fakeFetch(
        () =>
          new Response(JSON.stringify({ error: "flat failure" }), {
            status: 403,
          }),
      ),
    );

    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: false,
      blocked: true,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "openrouter_http_error status=403 message=flat failure",
    );
  });

  it("логирует фрагмент не-JSON тела ошибки", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const provider = createOpenRouterProvider(
      validConfig(),
      fakeFetch(
        () => new Response("<html>blocked</html>", { status: 403 }),
      ),
    );

    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: false,
      blocked: true,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "openrouter_http_error status=403 message=<html>blocked</html>",
    );
  });

  it("пустое тело ошибки даёт unknown", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const provider = createOpenRouterProvider(
      validConfig(),
      fakeFetch(() => new Response("", { status: 403 })),
    );

    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: false,
      blocked: true,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "openrouter_http_error status=403 message=unknown",
    );
  });

  it("возвращает null при битом ответе модели", async () => {
    const provider = createOpenRouterProvider(
      validConfig(),
      fakeFetch(() => openRouterOk('{"verdict":"ДА"}')),
    );
    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: false,
      blocked: false,
    });
  });

  it("возвращает null при пустом content", async () => {
    const provider = createOpenRouterProvider(
      validConfig(),
      fakeFetch(() => openRouterOk(null)),
    );
    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: false,
      blocked: false,
    });
  });

  it("возвращает null при сетевой ошибке", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("network down");
    }) as unknown as FetchImpl;
    const provider = createOpenRouterProvider(validConfig(), fetchImpl);
    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: false,
      blocked: false,
    });
  });

  it("200 с нечитаемым телом логирует response_unreadable", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const provider = createOpenRouterProvider(
      validConfig(),
      fakeFetch(() => new Response("", { status: 200 })),
    );

    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: false,
      blocked: false,
    });
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
    const provider = createOpenRouterProvider(validConfig(), fetchImpl);

    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: false,
      blocked: false,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "openrouter_request_failed type=TypeError message=fetch failed",
    );
  });

  it("403 помечает ответ как запрет", async () => {
    const provider = createOpenRouterProvider(
      validConfig(),
      fakeFetch(() => new Response("forbidden", { status: 403 })),
    );
    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: false,
      blocked: true,
    });
  });

  it("вызывает fetch без receiver (строгость workerd)", async () => {
    const provider = createOpenRouterProvider(
      validConfig(),
      strictFetch(() => openRouterOk(VALID_ORACLE_JSON)),
    );
    expect(await provider.ask("Учить ли Rust?")).toEqual({
      ok: true,
      response: JSON.parse(VALID_ORACLE_JSON),
    });
  });
});
