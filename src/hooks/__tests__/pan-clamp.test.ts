import { describe, it, expect } from "vitest";
import { clampPan } from "../usePanZoom";

/**
 * Bounds on the pan offset, taken from usePanZoom rather than restated here:
 * a copy passes while the app skips the clamp entirely, which is how the
 * arrow-key handlers walked the canvas off-screen with these tests green.
 */
describe("clampPan", () => {
  const cv = { width: 320, height: 240 };

  it("does not change values within bounds", () => {
    expect(clampPan({ x: 100, y: -50 }, cv)).toEqual({ x: 100, y: -50 });
  });

  it("clamps positive overflow", () => {
    expect(clampPan({ x: 500, y: 400 }, cv)).toEqual({ x: 320, y: 240 });
  });

  it("clamps negative overflow", () => {
    expect(clampPan({ x: -500, y: -400 }, cv)).toEqual({ x: -320, y: -240 });
  });

  it("allows exact boundary values", () => {
    expect(clampPan({ x: 320, y: -240 }, cv)).toEqual({ x: 320, y: -240 });
  });

  it("handles zero pan", () => {
    expect(clampPan({ x: 0, y: 0 }, cv)).toEqual({ x: 0, y: 0 });
  });

  it("handles 1x1 canvas", () => {
    expect(clampPan({ x: 5, y: -5 }, { width: 1, height: 1 })).toEqual({ x: 1, y: -1 });
  });
});
