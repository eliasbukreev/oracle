import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clientIp,
  corsHeaders,
  isRateLimited,
  parseAllowedOrigins,
} from "./http";
import type { RateLimiter } from "./types";

function fakeLimiter(success = true): RateLimiter {
  return { limit: vi.fn(async () => ({ success })) } as RateLimiter;
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseAllowedOrigins", () => {
  it("режет пробелы и пустые", () => {
    expect(parseAllowedOrigins(" https://a.example ,,https://b.example ")).toEqual(
      new Set(["https://a.example", "https://b.example"]),
    );
    expect(parseAllowedOrigins("")).toEqual(new Set());
  });
});

describe("corsHeaders", () => {
  const allowed = new Set(["http://localhost:3000"]);

  function requestWithOrigin(origin: string): Request {
    return new Request("https://oracle.test/", {
      headers: { Origin: origin },
    });
  }

  it("отражает разрешённый origin", () => {
    const headers = corsHeaders(requestWithOrigin("http://localhost:3000"), allowed);
    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000",
    );
    expect(headers.get("Vary")).toBe("Origin");
    expect(headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
  });

  it("не ставит Allow-Origin для чужого origin", () => {
    const headers = corsHeaders(
      requestWithOrigin("https://evil.example"),
      allowed,
    );
    expect(headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("поддерживает wildcard", () => {
    const headers = corsHeaders(
      requestWithOrigin("https://any.example"),
      new Set(["*"]),
    );
    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "https://any.example",
    );
  });
});

describe("clientIp", () => {
  it("читает CF-Connecting-IP", () => {
    const request = new Request("https://oracle.test/", {
      headers: { "CF-Connecting-IP": "1.2.3.4" },
    });
    expect(clientIp(request)).toBe("1.2.3.4");
  });

  it("возвращает unknown без заголовка", () => {
    expect(clientIp(new Request("https://oracle.test/"))).toBe("unknown");
  });
});

describe("isRateLimited", () => {
  it("возвращает per_ip и дёргает лимитер ключом IP", async () => {
    const perIp = fakeLimiter(false);
    const scope = await isRateLimited(
      new Request("https://oracle.test/", {
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      }),
      { perIpLimiter: perIp, globalLimiter: fakeLimiter(true) },
    );
    expect(scope).toBe("per_ip");
    expect(perIp.limit).toHaveBeenCalledWith({ key: "1.2.3.4" });
  });

  it("возвращает global фиксированным ключом", async () => {
    const global = fakeLimiter(false);
    const scope = await isRateLimited(new Request("https://oracle.test/"), {
      perIpLimiter: fakeLimiter(true),
      globalLimiter: global,
    });
    expect(scope).toBe("global");
    expect(global.limit).toHaveBeenCalledWith({ key: "global" });
  });

  it("возвращает null когда всё ок", async () => {
    await expect(
      isRateLimited(new Request("https://oracle.test/"), {
        perIpLimiter: fakeLimiter(true),
        globalLimiter: fakeLimiter(true),
      }),
    ).resolves.toBeNull();
  });

  it("без биндингов пропускает с варнингом", async () => {
    await expect(isRateLimited(new Request("https://oracle.test/"), {}))
      .resolves.toBeNull();
  });
});
