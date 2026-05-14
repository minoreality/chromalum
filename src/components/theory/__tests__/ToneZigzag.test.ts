import { describe, expect, it } from "vitest";
import { findToneIntersections } from "../ToneZigzag";

describe("ToneZigzag", () => {
  it("returns the expected intersections for exact 4:2:1 tone levels", () => {
    const expected = [
      { tone: 0 / 7, hits: [] },
      { tone: 1 / 7, hits: [240] },
      { tone: 2 / 7, hits: [0, 225, 270] },
      { tone: 3 / 7, hits: [15, 210, 300] },
      { tone: 4 / 7, hits: [30, 120, 195] },
      { tone: 5 / 7, hits: [45, 90, 180] },
      { tone: 6 / 7, hits: [60] },
      { tone: 7 / 7, hits: [] },
    ];

    for (const { tone, hits } of expected) {
      expect(findToneIntersections(tone).map((hit) => Math.round(hit.h))).toEqual(hits);
    }
  });

  it("marks N=4 only inside the two intermediate tone bands", () => {
    expect(findToneIntersections(1.5 / 7)).toHaveLength(2);
    expect(findToneIntersections(2.5 / 7)).toHaveLength(4);
    expect(findToneIntersections(3.5 / 7)).toHaveLength(2);
    expect(findToneIntersections(4.5 / 7)).toHaveLength(4);
    expect(findToneIntersections(5.5 / 7)).toHaveLength(2);
  });

  it("deduplicates the red candidate at the 0/360 degree seam", () => {
    const redVertexTone = 2 / 7;
    const hits = findToneIntersections(redVertexTone);

    expect(hits).toHaveLength(3);
    expect(hits.every((hit) => hit.h >= 0 && hit.h < 360)).toBe(true);
    expect(hits.filter((hit) => hit.h < 0.5 || hit.h > 359.5)).toHaveLength(1);
  });
});
