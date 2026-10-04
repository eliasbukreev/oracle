import { afterEach, describe, expect, it, vi } from "vitest";
import { OracleRequestError, askOracle } from "./oracleApi";

const API_URL = "https://oracle.test/";

const VALID_PAYLOAD = {
  cards: [
    { id: "the-fool", name: "Шут", position: "past", meaning: "Начало позади." },
    { id: "the-magician", name: "Маг", position: "present", meaning: "Сила в руках." },
    {
      id: "the-high-priestess",
      name: "Верховная Жрица",
      position: "future",
      meaning: "Тайна рядом.",
    },
  ],
  summary: "Итог расклада.",
};

function mockFetchOnce(
  payload: unknown,
  status = 200,
  headers: Record<string, string> = {},
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          typeof payload === "string" ? payload : JSON.stringify(payload),
          {
            status,
            headers: { "Content-Type": "application/json", ...headers },
          },
        ),
    ),
  );
}

async function captureError(
  question = "Учить ли Rust?",
  apiUrl = API_URL,
): Promise<unknown> {
  try {
    await askOracle(question, apiUrl);
  } catch (error) {
    return error;
  }

  throw new Error("expected askOracle to throw");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("askOracle", () => {
  it("возвращает пророчество при 200", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        new Response(JSON.stringify(VALID_PAYLOAD), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await askOracle("Учить ли Rust?", API_URL);

    expect(result).toEqual(VALID_PAYLOAD);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(API_URL);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ question: "Учить ли Rust?" }));
  });

  it("бросает oracle_unavailable при плохом теле 200", async () => {
    mockFetchOnce({ cards: [] });
    const error = (await captureError()) as OracleRequestError;
    expect(error).toBeInstanceOf(OracleRequestError);
    expect(error.code).toBe("oracle_unavailable");
  });

  it("бросает internal_error без apiUrl и не ходит в сеть", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const error = (await captureError(
      "Учить ли Rust?",
      "",
    )) as OracleRequestError;
    expect(error.code).toBe("internal_error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("бросает blocked при сетевой ошибке — сигнала нет", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    const error = (await captureError()) as OracleRequestError;
    expect(error.code).toBe("blocked");
  });

  it("бросает blocked при тишине дольше таймаута", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      ),
    );

    let thrown: unknown;
    try {
      await askOracle("Учить ли Rust?", API_URL, 30);
    } catch (error) {
      thrown = error;
    }

    expect((thrown as OracleRequestError).code).toBe("blocked");
  });

  it("бросает oracle_unavailable при не-JSON ответе", async () => {
    mockFetchOnce("not json");
    const error = (await captureError()) as OracleRequestError;
    expect(error.code).toBe("oracle_unavailable");
  });

  it("пробрасывает код ошибки бэкенда без retryAfter", async () => {
    mockFetchOnce({ error: "invalid_request" }, 400);
    const error = (await captureError()) as OracleRequestError;
    expect(error.code).toBe("invalid_request");
    expect(error.retryAfter).toBeUndefined();
  });

  it("забирает retry_after из тела 429", async () => {
    mockFetchOnce({ error: "oracle_resting", retry_after: 45 }, 429);
    const error = (await captureError()) as OracleRequestError;
    expect(error.code).toBe("oracle_resting");
    expect(error.retryAfter).toBe(45);
  });

  it("берёт retry_after из заголовка Retry-After", async () => {
    mockFetchOnce({ error: "oracle_resting" }, 429, { "Retry-After": "30" });
    const error = (await captureError()) as OracleRequestError;
    expect(error.code).toBe("oracle_resting");
    expect(error.retryAfter).toBe(30);
  });

  it("определяет код по статусу, если тело без error", async () => {
    mockFetchOnce({}, 429, { "Retry-After": "30" });
    const error = (await captureError()) as OracleRequestError;
    expect(error.code).toBe("oracle_resting");
    expect(error.retryAfter).toBe(30);
  });

  it("неизвестный статус маппит в internal_error", async () => {
    mockFetchOnce({}, 500);
    const error = (await captureError()) as OracleRequestError;
    expect(error.code).toBe("internal_error");
  });

  it("403 с кодом blocked показывает VPN-экран", async () => {
    mockFetchOnce({ error: "blocked" }, 403);
    const error = (await captureError()) as OracleRequestError;
    expect(error.code).toBe("blocked");
  });

  it("403 без тела маппится в blocked по статусу", async () => {
    mockFetchOnce({}, 403);
    const error = (await captureError()) as OracleRequestError;
    expect(error.code).toBe("blocked");
  });
});

describe("OracleRequestError", () => {
  it("несёт code в message и retryAfter", () => {
    const error = new OracleRequestError("oracle_resting", 60);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("OracleRequestError");
    expect(error.message).toBe("oracle_resting");
    expect(error.code).toBe("oracle_resting");
    expect(error.retryAfter).toBe(60);
  });
});
