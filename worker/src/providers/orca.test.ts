import { describe, expect, it, vi } from "vitest";
import type { FetchImpl } from "../types";
import {
  DRAWN_CARDS,
  VALID_TAROT_JSON,
  fakeFetch,
  strictFetch,
  validConfig,
  validTarotInput,
} from "./fixtures";
import { createOrcaProvider } from "./orca";

function orcaOk(content: string | null): Response {
  const payload = { choices: [{ message: { role: "assistant", content } }] };
  return new Response(JSON.stringify(payload), { status: 200 });
}

describe("OrcaProvider", () => {
  it("возвращает расклад и шлёт корректный запрос", async () => {
    let seenUrl = "";
    let seenHeaders: Headers | undefined;
    let seenBody = "";
    const fetchImpl = fakeFetch((url, init) => {
      seenUrl = url;
      seenHeaders = new Headers(init?.headers);
      seenBody = String(init?.body);
      return orcaOk(VALID_TAROT_JSON);
    });

    const result = await createOrcaProvider(validConfig(), fetchImpl).askTarot(
      validTarotInput(),
    );

    expect(result).toEqual({
      ok: true,
      response: {
        spread: "classic",
        cards: [
          {
            id: "the-fool",
            name: "Шут",
            position: "past",
            orientation: "upright",
            meaning: "Новое начало уже позади.",
            imageUrl: "https://assets.test/tarot/00-TheFool.webp",
          },
          {
            id: "the-magician",
            name: "Маг",
            position: "present",
            orientation: "reversed",
            meaning: "Сила растрачена впустую.",
            imageUrl: "https://assets.test/tarot/01-TheMagician.webp",
          },
          {
            id: "the-high-priestess",
            name: "Верховная Жрица",
            position: "future",
            orientation: "upright",
            meaning: "Тайна раскроется скоро.",
            imageUrl: "https://assets.test/tarot/02-TheHighPriestess.webp",
          },
        ],
        summary: "Прошлое отпустило, настоящее требует честности.",
        backImageUrl: "https://assets.test/tarot/CardBacks.webp",
      },
    });
    expect(seenUrl).toBe("https://api.orcarouter.ai/v1/chat/completions");
    expect(seenHeaders?.get("Authorization")).toBe("Bearer test-key");
    expect(JSON.parse(seenBody)).toMatchObject({
      model: "test-model",
      messages: [{ role: "user" }],
      temperature: 0.8,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });
    const content = JSON.parse(seenBody).messages[0].content as string;
    expect(content).toContain("Учить ли Rust?");
    for (const card of DRAWN_CARDS) {
      expect(content).toContain(card.id);
    }
  });

  it("возвращает null при HTTP-ошибке", async () => {
    const provider = createOrcaProvider(
      validConfig(),
      fakeFetch(
        () =>
          new Response(JSON.stringify({ error: { message: "nope" } }), {
            status: 401,
          }),
      ),
    );
    expect(await provider.askTarot(validTarotInput())).toEqual({
      ok: false,
      blocked: false,
    });
  });

  it("возвращает null при битом ответе модели", async () => {
    const provider = createOrcaProvider(
      validConfig(),
      fakeFetch(() => orcaOk('{"cards":[]}')),
    );
    expect(await provider.askTarot(validTarotInput())).toEqual({
      ok: false,
      blocked: false,
    });
  });

  it("возвращает null при пустом content", async () => {
    const provider = createOrcaProvider(
      validConfig(),
      fakeFetch(() => orcaOk(null)),
    );
    expect(await provider.askTarot(validTarotInput())).toEqual({
      ok: false,
      blocked: false,
    });
  });

  it("возвращает null при сетевой ошибке", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("network down");
    }) as unknown as FetchImpl;
    const provider = createOrcaProvider(validConfig(), fetchImpl);
    expect(await provider.askTarot(validTarotInput())).toEqual({
      ok: false,
      blocked: false,
    });
  });

  it("403 помечает ответ как запрет", async () => {
    const provider = createOrcaProvider(
      validConfig(),
      fakeFetch(() => new Response("forbidden", { status: 403 })),
    );
    expect(await provider.askTarot(validTarotInput())).toEqual({
      ok: false,
      blocked: true,
    });
  });

  it("вызывает fetch без receiver (строгость workerd)", async () => {
    const provider = createOrcaProvider(
      validConfig(),
      strictFetch(() => orcaOk(VALID_TAROT_JSON)),
    );
    expect(await provider.askTarot(validTarotInput())).toEqual({
      ok: true,
      response: expect.objectContaining({ summary: expect.any(String) }),
    });
  });
});

describe("OrcaProvider classify", () => {
  it("ходит в api.orcarouter.ai и возвращает классификацию", async () => {
    let seenUrl = "";
    let seenBody = "";
    const fetchImpl = fakeFetch((url, init) => {
      seenUrl = url;
      seenBody = String(init?.body);
      return orcaOk(JSON.stringify({ spread: "relations" }));
    });

    const result = await createOrcaProvider(
      validConfig(),
      fetchImpl,
    ).classify("Любит ли меня?");

    expect(result?.spread.id).toBe("relations");
    expect(seenUrl).toBe("https://api.orcarouter.ai/v1/chat/completions");
    const body = JSON.parse(seenBody);
    expect(body.temperature).toBe(0);
    expect(body.max_tokens).toBeLessThanOrEqual(150);
  });

  it("null при HTTP-ошибке", async () => {
    const provider = createOrcaProvider(
      validConfig(),
      fakeFetch(() => new Response("{}", { status: 500 })),
    );
    await expect(provider.classify("Учить ли Rust?")).resolves.toBeNull();
  });
});
