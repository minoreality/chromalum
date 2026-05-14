import { describe, expect, it } from "vitest";
import { findToneIntersections } from "../ToneZigzag";

describe("ToneZigzag", () => {
  it("deduplicates the red candidate at the 0/360 degree seam", () => {
    const redVertexTone8 = (255 * 2) / 7;
    const hits = findToneIntersections(redVertexTone8);

    expect(hits).toHaveLength(3);
    expect(hits.every((hit) => hit.h >= 0 && hit.h < 360)).toBe(true);
    expect(hits.filter((hit) => hit.h < 0.5 || hit.h > 359.5)).toHaveLength(1);
  });
});
