import { describe, it, expect } from "vitest";
import { unionBBox, restoreRect } from "../dirty-rect";

describe("unionBBox", () => {
  it("returns b when a is null", () => {
    const b = { x: 1, y: 2, w: 3, h: 4 };
    expect(unionBBox(null, b)).toEqual(b);
  });

  it("returns a when b is null", () => {
    const a = { x: 1, y: 2, w: 3, h: 4 };
    expect(unionBBox(a, null)).toEqual(a);
  });

  it("returns null when both are null", () => {
    expect(unionBBox(null, null)).toBeNull();
  });

  it("computes union of two rects", () => {
    const a = { x: 0, y: 0, w: 5, h: 5 };
    const b = { x: 3, y: 3, w: 5, h: 5 };
    const u = unionBBox(a, b)!;
    expect(u.x).toBe(0);
    expect(u.y).toBe(0);
    expect(u.w).toBe(8); // max(0+5, 3+5) - 0 = 8
    expect(u.h).toBe(8);
  });
});

describe("restoreRect", () => {
  it("restores only the rect region", () => {
    const w = 5;
    const pre = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const buf = new Uint8Array(25).fill(9);
    restoreRect(buf, pre, w, { x: 1, y: 1, w: 3, h: 3 });
    // Inside rect should be restored to 1
    expect(buf[1 * 5 + 1]).toBe(1);
    expect(buf[1 * 5 + 3]).toBe(1);
    expect(buf[3 * 5 + 3]).toBe(1);
    // Outside rect should remain 9
    expect(buf[0]).toBe(9);
    expect(buf[4]).toBe(9);
    expect(buf[4 * 5 + 4]).toBe(9);
  });
});
