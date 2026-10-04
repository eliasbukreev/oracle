import { describe, expect, it } from "vitest";
import { PREVIEW_IMAGE_BASE_URL, PREVIEW_SPREAD } from "./tarotPreview";

describe("PREVIEW_SPREAD", () => {
  it("валидный расклад из 3 карт", () => {
    expect(PREVIEW_SPREAD.cards).toHaveLength(3);
    expect(PREVIEW_SPREAD.summary.trim().length).toBeGreaterThan(0);

    for (const card of PREVIEW_SPREAD.cards) {
      expect(card.id.trim().length).toBeGreaterThan(0);
      expect(card.name.trim().length).toBeGreaterThan(0);
      expect(card.meaning.trim().length).toBeGreaterThan(0);
      expect(["past", "present", "future"]).toContain(card.position);
      expect(["upright", "reversed"]).toContain(card.orientation);
      expect(card.imageUrl.startsWith(PREVIEW_IMAGE_BASE_URL)).toBe(true);
    }
  });

  it("позиции идут по порядку, есть и прямая, и перевёрнутая", () => {
    expect(PREVIEW_SPREAD.cards.map((c) => c.position)).toEqual([
      "past",
      "present",
      "future",
    ]);
    const orientations = new Set(
      PREVIEW_SPREAD.cards.map((c) => c.orientation),
    );
    expect(orientations.has("upright")).toBe(true);
    expect(orientations.has("reversed")).toBe(true);
  });

  it("рубашка с того же хоста", () => {
    expect(PREVIEW_SPREAD.backImageUrl.startsWith(PREVIEW_IMAGE_BASE_URL)).toBe(
      true,
    );
  });
});
