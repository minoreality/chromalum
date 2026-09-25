import { describe, expect, it } from "vitest";
import { getBrushMask } from "../brush-mask";
import { paintBrushLine } from "../paint";

describe("paintBrushLine", () => {
  it.each([15, 16, 24, 32])("preserves the same footprint when a size-%i stroke is split at its grid points", (size) => {
    const mask = getBrushMask(size);
    const whole = new Uint8Array(128 * 128);
    const split = new Uint8Array(128 * 128);
    // These are the hand-checked Bresenham centres for this segment.
    const points = [
      [48, 48],
      [49, 48],
      [50, 49],
      [51, 49],
    ] as const;
    paintBrushLine(whole, 48, 48, 51, 49, mask, 7, 128, 128);
    for (let i = 1; i < points.length; i++) {
      paintBrushLine(split, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], mask, 7, 128, 128);
    }
    if (size === 16) expect(whole[41 * 128 + 51]).toBe(7);
    expect(whole).toEqual(split);
  });

  it.each([7, 0])("keeps the clipped sweep when painting level %i in reverse", (level) => {
    const mask = getBrushMask(16);
    const whole = new Uint8Array(12 * 12).fill(3);
    const split = new Uint8Array(12 * 12).fill(3);
    const points = [
      [3, 1],
      [2, 1],
      [1, 0],
      [0, 0],
      [-1, -1],
      [-2, -1],
    ] as const;
    paintBrushLine(whole, 3, 1, -2, -1, mask, level, 12, 12);
    for (let i = 1; i < points.length; i++) {
      paintBrushLine(split, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], mask, level, 12, 12);
    }
    expect(whole).toEqual(split);
  });
});
