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
import { createGroqProvider } from "./groq";

function groqOk(content: string | null): Response {
  const payload = { choices: [{ message: { role: "assistant", content } }] };
  return new Response(JSON.stringify(payload), { status: 200 });
}

describe("GroqProvider", () => {
  it("возвращает расклад и шлёт корректный запрос", async () => {
    let seenUrl = "";
    let seenHeaders: Headers | undefined;
    let seenBody = "";
    const fetchImpl = fakeFetch((url, init) => {
      seenUrl = url;
      seenHeaders = new Headers(init?.headers);
      seenBody = String(init?.body);
      return groqOk(VALID_TAROT_JSON);
    });

    const result = await createGroqProvider(validConfig(), fetchImpl).askTarot(
      validTarotInput(),
    );

    expect(result).toEqual({
      ok: true,
      response: {
        // TODO(шаг 3): фикстуры под реестры раскладов.
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
    expect(seenUrl).toBe("https://api.groq.com/openai/v1/chat/completions");
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
    const provider = createGroqProvider(
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
    const provider = createGroqProvider(
      validConfig(),
      fakeFetch(() => groqOk('{"cards":[]}')),
    );
    expect(await provider.askTarot(validTarotInput())).toEqual({
      ok: false,
      blocked: false,
    });
  });

  it("возвращает null при пустом content", async () => {
    const provider = createGroqProvider(
      validConfig(),
      fakeFetch(() => groqOk(null)),
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
    const provider = createGroqProvider(validConfig(), fetchImpl);
    expect(await provider.askTarot(validTarotInput())).toEqual({
      ok: false,
      blocked: false,
    });
  });

  it("403 помечает ответ как запрет", async () => {
    const provider = createGroqProvider(
      validConfig(),
      fakeFetch(() => new Response("forbidden", { status: 403 })),
    );
    expect(await provider.askTarot(validTarotInput())).toEqual({
      ok: false,
      blocked: true,
    });
  });

  it("вызывает fetch без receiver (строгость workerd)", async () => {
    const provider = createGroqProvider(
      validConfig(),
      strictFetch(() => groqOk(VALID_TAROT_JSON)),
    );
    expect(await provider.askTarot(validTarotInput())).toEqual({
      ok: true,
      response: expect.objectContaining({ summary: expect.any(String) }),
    });
  });
});
