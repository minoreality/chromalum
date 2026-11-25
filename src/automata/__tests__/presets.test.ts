import { describe, expect, it } from "vitest";
import { createVisibleEvolution, PLANE_SIZE } from "../model";
import { AUTOMATA_PRESETS, makePlaneSeed } from "../presets";
import { GOLDEN_SEEDS, decodeRows } from "./fixtures/ca-golden";

describe("makePlaneSeed", () => {
  it.each(Object.keys(GOLDEN_SEEDS) as (keyof typeof GOLDEN_SEEDS)[])("matches the reference seed for %s", (preset) => {
    expect(makePlaneSeed(preset)).toEqual(decodeRows(GOLDEN_SEEDS[preset]));
  });
  it.each(AUTOMATA_PRESETS)("returns an independent seed for %s", (preset) => {
    const first = makePlaneSeed(preset);
    const original = first[0];
    first[0] ^= 7;
    expect(makePlaneSeed(preset)[0]).toBe(original);
  });
  it("fills every cell with the selected solid color", () => {
    expect(makePlaneSeed("black")).toEqual(new Uint8Array(2401));
    expect(makePlaneSeed("all-white")).toEqual(new Uint8Array(2401).fill(7));
  });
  it("overlaps three 7-by-7 squares at their GRB offsets", () => {
    const seed = makePlaneSeed("overlapping-squares");
    for (const [channel, x, y] of [
      [4, 22, 22],
      [2, 26, 23],
      [1, 24, 26],
    ]) {
      const cells = Array.from(seed.keys()).filter((i) => (seed[i] & channel) !== 0);
      expect(cells).toHaveLength(49);
      expect(cells.every((i) => Math.abs((i % PLANE_SIZE) - x) <= 3 && Math.abs(Math.floor(i / PLANE_SIZE) - y) <= 3)).toBe(true);
    }
    expect(new Set(seed)).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
  });
  it("moves the complete colored glider one cell diagonally every four Life generations", () => {
    const evolution = createVisibleEvolution(makePlaneSeed("glider"), "life");
    const rows = ["040", "207", "567", "031"];
    for (let time = 0; time <= 64; time += 4) {
      const start = 23 + time / 4;
      const expected = new Uint8Array(PLANE_SIZE * PLANE_SIZE);
      rows.forEach((row, dy) => expected.set(Array.from(row, Number), (start + dy) * PLANE_SIZE + start));
      expect(evolution.at(time)).toEqual(expected);
    }
  });
});
