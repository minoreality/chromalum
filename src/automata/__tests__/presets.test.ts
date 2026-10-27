import { describe, expect, it } from "vitest";
import { AUTOMATA_PRESETS, makePlaneSeed } from "../presets";
import { evolvePlane } from "../model";
import { GOLDEN_SEEDS, decodeRows } from "./fixtures/ca-golden";

describe("makePlaneSeed", () => {
  it.each(Object.keys(GOLDEN_SEEDS) as (keyof typeof GOLDEN_SEEDS)[])("matches the reference seed for %s", (preset) => {
    expect(makePlaneSeed(preset)).toEqual(decodeRows(GOLDEN_SEEDS[preset]));
  });
  it.each(AUTOMATA_PRESETS)("returns a fresh centered seed for %s", (preset) => {
    const first = makePlaneSeed(preset);
    first[0] = 7;
    expect(makePlaneSeed(preset)[0]).toBe(0);
  });
  const cell = (x: number, y: number) => (24 + y) * 49 + 24 + x;
  it("shows OR spreading and the three primaries joining as white", () => {
    const seed = makePlaneSeed("or-spread");
    expect(seed[cell(-10, -6)]).toBe(4);
    expect(seed[cell(10, -6)]).toBe(2);
    expect(seed[cell(0, 10)]).toBe(1);
    const first = evolvePlane(seed, 49, 1, "or");
    expect(first.every((color, i) => (color & seed[i]) === seed[i])).toBe(true);
    expect(first.filter(Boolean).length).toBeGreaterThan(seed.filter(Boolean).length);
    expect(evolvePlane(seed, 49, 12, "or")[cell(0, 0)]).toBe(7);
  });
  it("reveals the shared primary in each AND panel before erosion removes it", () => {
    const seed = makePlaneSeed("and-core");
    const first = evolvePlane(seed, 49, 1, "and");
    for (const [x, y, color] of [
      [-11, -9, 2],
      [11, -9, 4],
      [0, 11, 1],
    ]) {
      expect(seed[cell(x, y)]).toBe(7);
      expect(first[cell(x, y)]).toBe(color);
    }
    expect(first.every((color, i) => (color & seed[i]) === color)).toBe(true);
    expect(evolvePlane(seed, 49, 7, "and").some(Boolean)).toBe(false);
  });
  it("uses majority to repair holes and remove isolated points in one generation", () => {
    const seed = makePlaneSeed("majority-cleanup");
    const first = evolvePlane(seed, 49, 1, "majority");
    const expected = new Uint8Array(seed.length);
    for (const [x, y, color] of [
      [-11, -8, 4],
      [11, -8, 2],
      [0, 11, 1],
    ]) {
      expect(seed[cell(x, y)]).toBe(0);
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) expected[cell(x + dx, y + dy)] = color;
    }
    expect(first).toEqual(expected);
    expect(evolvePlane(first, 49, 1, "majority")).toEqual(first);
  });
  it("contrasts a one-bit boundary with an inactive complementary boundary", () => {
    const seed = makePlaneSeed("hamming-boundary");
    const first = evolvePlane(seed, 49, 1, "hamming");
    expect([seed[cell(-1, -9)], seed[cell(0, -9)]]).toEqual([2, 6]);
    expect([first[cell(-1, -9)], first[cell(0, -9)]]).toEqual([6, 2]);
    expect([seed[cell(-1, 9)], seed[cell(0, 9)]]).toEqual([2, 5]);
    expect([first[cell(-1, 9)], first[cell(0, 9)]]).toEqual([2, 5]);
  });
  it("starts black and centers the white seed", () => {
    expect(makePlaneSeed("black")).toEqual(new Uint8Array(2401));
    const white = makePlaneSeed("white");
    expect(white[24 * 49 + 24]).toBe(7);
    expect([...white].filter(Boolean)).toEqual([7]);
  });
});
