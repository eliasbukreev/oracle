import { describe, expect, it } from "vitest";
import {
  LOADING_PHASES,
  WHISPER_SPOTS,
  WHISPERS,
  phaseForElapsed,
  pickSpot,
  pickWhisper,
} from "./loadingWhispers";

describe("phaseForElapsed", () => {
  it("возвращает фазы по границам времени", () => {
    expect(phaseForElapsed(0)).toBe("Тасую колоду…");
    expect(phaseForElapsed(7)).toBe("Тасую колоду…");
    expect(phaseForElapsed(8)).toBe("Раскладываю карты…");
    expect(phaseForElapsed(17)).toBe("Раскладываю карты…");
    expect(phaseForElapsed(18)).toBe("Вглядываюсь в знаки…");
    expect(phaseForElapsed(300)).toBe("Вглядываюсь в знаки…");
  });

  it("фазы покрывают всю шкалу без дыр", () => {
    expect(LOADING_PHASES.length).toBeGreaterThan(0);
    expect(
      LOADING_PHASES[LOADING_PHASES.length - 1]?.untilSec,
    ).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("WHISPERS", () => {
  it("достаточно фраз для 30 секунд без частых повторов", () => {
    expect(WHISPERS.length).toBeGreaterThanOrEqual(15);
    for (const whisper of WHISPERS) {
      expect(whisper.trim().length).toBeGreaterThan(0);
      expect(whisper.length).toBeLessThanOrEqual(120);
    }
    expect(new Set(WHISPERS).size).toBe(WHISPERS.length);
  });
});

describe("pickWhisper", () => {
  it("не возвращает исключённые", () => {
    for (let i = 0; i < 50; i++) {
      expect(pickWhisper([WHISPERS[0] as string], () => 0)).not.toBe(
        WHISPERS[0],
      );
    }
  });

  it("возвращает что-то, даже если исключено всё", () => {
    expect(pickWhisper([...WHISPERS], () => 0)).toBe(WHISPERS[0]);
  });
});

describe("pickSpot", () => {
  it("не занимает занятые споты", () => {
    expect(pickSpot([0, 1, 2], () => 0)).toBe(3);
  });

  it("все споты в процентах", () => {
    expect(WHISPER_SPOTS.length).toBeGreaterThanOrEqual(8);
    for (const spot of WHISPER_SPOTS) {
      expect(spot.top.endsWith("%")).toBe(true);
      expect(spot.left.endsWith("%")).toBe(true);
    }
  });
});
