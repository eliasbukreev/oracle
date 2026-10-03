import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OracleProvider, OracleResponse } from "../types";
import { createFallbackProvider } from "./fallback";

const PROPHECY: OracleResponse = {
  verdict: "ДА",
  confidence: 87,
  prophecy: "Путь тернист, но цель близка.",
  reason: "Звёзды благоволят смелым.",
};

function stubProvider(
  result: OracleResponse | null,
  name = "stub",
): OracleProvider {
  return { name, ask: async () => result };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FallbackProvider", () => {
  it("возвращает ответ primary и не трогает secondary", async () => {
    const secondaryAsk = vi.fn(async () => PROPHECY);
    const provider = createFallbackProvider(stubProvider(PROPHECY, "primary"), {
      name: "secondary",
      ask: secondaryAsk,
    });

    expect(provider.name).toBe("fallback(primary+secondary)");
    await expect(provider.ask("Учить ли Rust?")).resolves.toEqual(PROPHECY);
    expect(secondaryAsk).not.toHaveBeenCalled();
  });

  it("при пустом ответе primary спрашивает secondary тем же вопросом", async () => {
    const secondaryAsk = vi.fn(async () => PROPHECY);
    const provider = createFallbackProvider(stubProvider(null, "primary"), {
      name: "secondary",
      ask: secondaryAsk,
    });

    await expect(provider.ask("Учить ли Rust?")).resolves.toEqual(PROPHECY);
    expect(secondaryAsk).toHaveBeenCalledWith("Учить ли Rust?");
  });

  it("возвращает null когда оба провайдера пусты", async () => {
    const provider = createFallbackProvider(
      stubProvider(null, "primary"),
      stubProvider(null, "secondary"),
    );
    await expect(provider.ask("Учить ли Rust?")).resolves.toBeNull();
  });
});
