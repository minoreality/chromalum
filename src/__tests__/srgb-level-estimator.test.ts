import { describe, expect, it } from "vitest";

import { estimateLevelFromSrgbBytes, srgbCodeGrbScore8, srgbCodeGrbScoreNorm } from "../srgb-level-estimator";

describe("sRGB code-value level estimator", () => {
  it("applies the model-specific 4:2:1 score to code values", () => {
    expect(srgbCodeGrbScoreNorm(0, 0, 0)).toBe(0);
    expect(srgbCodeGrbScoreNorm(255, 255, 255)).toBe(1);
    expect(srgbCodeGrbScore8(255, 0, 0)).toBe(73);
    expect(srgbCodeGrbScore8(0, 255, 0)).toBe(146);
    expect(srgbCodeGrbScore8(0, 0, 255)).toBe(36);
  });

  it("quantizes the score to an L0..L7 label", () => {
    expect(estimateLevelFromSrgbBytes(0, 0, 0)).toBe(0);
    expect(estimateLevelFromSrgbBytes(255, 255, 255)).toBe(7);
    expect(estimateLevelFromSrgbBytes(255, 0, 0)).toBe(2);
    expect(estimateLevelFromSrgbBytes(0, 255, 0)).toBe(4);
    expect(estimateLevelFromSrgbBytes(0, 0, 255)).toBe(1);
  });

  it.each([
    { boundary: "L0/L1", below: [0, 0, 127], above: [0, 0, 128], lowerLevel: 0 },
    { boundary: "L1/L2", below: [64, 0, 254], above: [64, 0, 255], lowerLevel: 1 },
    { boundary: "L2/L3", below: [191, 0, 255], above: [192, 0, 254], lowerLevel: 2 },
    { boundary: "L3/L4", below: [255, 32, 254], above: [255, 32, 255], lowerLevel: 3 },
    { boundary: "L4/L5", below: [254, 96, 255], above: [255, 96, 254], lowerLevel: 4 },
    { boundary: "L5/L6", below: [254, 160, 254], above: [254, 160, 255], lowerLevel: 5 },
    { boundary: "L6/L7", below: [255, 223, 255], above: [254, 224, 254], lowerLevel: 6 },
  ])("places adjacent integer code scores on the correct side of the $boundary boundary", ({ below, above, lowerLevel }) => {
    expect(estimateLevelFromSrgbBytes(...(below as [number, number, number]))).toBe(lowerLevel);
    expect(estimateLevelFromSrgbBytes(...(above as [number, number, number]))).toBe(lowerLevel + 1);
  });

  it("always returns a valid model label", () => {
    let previousLevel = 0;
    for (let value = 0; value <= 255; value++) {
      const level = estimateLevelFromSrgbBytes(value, value, value);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(7);
      expect(level).toBeGreaterThanOrEqual(previousLevel);
      previousLevel = level;
    }
  });
});
