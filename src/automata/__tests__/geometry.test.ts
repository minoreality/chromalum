import { describe, expect, it } from "vitest";
import { cellsOnLine, getPlaneGeometry, hitTestCell } from "../geometry";

describe("Automata geometry", () => {
  const rect = { left: 10, top: 20, width: 245, height: 245 };
  it("uses half-open CSS bounds without clamping outside points", () => {
    expect(hitTestCell(10, 20, rect)).toEqual({ x: 0, y: 0 });
    expect(hitTestCell(254.99, 264.99, rect)).toEqual({ x: 48, y: 48 });
    for (const [x, y] of [
      [9, 20],
      [255, 30],
      [30, 265],
      [30, 19],
    ])
      expect(hitTestCell(x, y, rect)).toBeNull();
    expect(hitTestCell(30, 30, { ...rect, width: 0 })).toBeNull();
    expect(hitTestCell(NaN, 30, rect)).toBeNull();
  });
  it.each([1, 1.25, 2])("keeps CSS hit testing independent of DPR %s", (dpr) => {
    expect(getPlaneGeometry(245, dpr)).toEqual({ cssSize: 245, cellSize: 5, dpr });
    expect(hitTestCell(42.5, 57.5, rect)).toEqual({ x: 6, y: 7 });
  });
  it.each([
    [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
      ],
    ],
    [
      { x: 1, y: 4 },
      { x: 1, y: 0 },
      [
        { x: 1, y: 4 },
        { x: 1, y: 3 },
        { x: 1, y: 2 },
        { x: 1, y: 1 },
        { x: 1, y: 0 },
      ],
    ],
    [
      { x: 0, y: 0 },
      { x: 4, y: 4 },
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
        { x: 4, y: 4 },
      ],
    ],
    [
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
      ],
    ],
    [{ x: 4, y: 4 }, { x: 4, y: 4 }, [{ x: 4, y: 4 }]],
  ])("fills every cell from %j to %j", (from, to, want) => expect(cellsOnLine(from, to)).toEqual(want));
});
