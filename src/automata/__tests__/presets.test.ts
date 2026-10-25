import { describe, expect, it } from "vitest";
import { AUTOMATA_PRESETS, makePlaneSeed } from "../presets";
import { GOLDEN_SEEDS, decodeRows } from "./fixtures/ca-golden";

describe("makePlaneSeed", () => {
  it("centers presets in the image dimensions without stretching cells", () => {
    const seed = makePlaneSeed("white", 80, 30);
    expect(seed.length).toBe(2400);
    expect(seed[15 * 80 + 40]).toBe(7);
    expect([...seed].filter(Boolean)).toEqual([7]);
    expect(makePlaneSeed("white", 1, 1)).toEqual(Uint8Array.of(7));
  });
  it.each(AUTOMATA_PRESETS)("matches the reference seed for %s", (preset) => {
    expect(makePlaneSeed(preset)).toEqual(decodeRows(GOLDEN_SEEDS[preset]));
    const first = makePlaneSeed(preset);
    first[0] = 7;
    expect(makePlaneSeed(preset)[0]).toBe(0);
  });
  it("starts black and centers the white seed", () => {
    expect(makePlaneSeed("black")).toEqual(new Uint8Array(2401));
    const white = makePlaneSeed("white");
    expect(white[24 * 49 + 24]).toBe(7);
    expect([...white].filter(Boolean)).toEqual([7]);
  });
});
