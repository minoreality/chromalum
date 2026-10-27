import { describe, expect, it } from "vitest";
import { CA_RULES, evolvePlane, evolveVisiblePlane, type AutomataRule } from "../model";
import { GOLDEN_CASES, GOLDEN_SEEDS, decodeRows } from "./fixtures/ca-golden";

function referenceOracle(seed: Uint8Array, size: number, steps: number, rule: AutomataRule): Uint8Array {
  let current = seed.slice();
  for (let t = 0; t < steps; t++) {
    const next = new Uint8Array(seed.length);
    for (let bit = 0; bit < 3; bit++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const center = dx === 0 && dy === 0;
              const diagonal = dx !== 0 && dy !== 0;
              if (center && ![5, 9, "diagonal-center", "or", "and", "majority"].includes(rule)) continue;
              if (!center && [4, 5, "or", "and", "majority", "hamming"].includes(rule) && diagonal) continue;
              if (!center && (rule === "diagonal" || rule === "diagonal-center") && !diagonal) continue;
              const xx = x + dx,
                yy = y + dy;
              const neighbor = xx >= 0 && xx < size && yy >= 0 && yy < size ? current[yy * size + xx] : 0;
              if (rule === "hamming") {
                const here = current[y * size + x];
                const distance =
                  Number((here & 1) !== (neighbor & 1)) + Number((here & 2) !== (neighbor & 2)) + Number((here & 4) !== (neighbor & 4));
                if (distance === 1 && ((here >> bit) & 1) !== ((neighbor >> bit) & 1)) count++;
              } else count += (neighbor >> bit) & 1;
            }
          }
          const alive = Boolean(current[y * size + x] & (1 << bit));
          const on =
            rule === "or"
              ? count > 0
              : rule === "and"
                ? count === 5
                : rule === "majority"
                  ? count >= 3
                  : rule === "hamming"
                    ? alive !== (count % 2 === 1)
                    : rule === "life"
                      ? count === 3 || (alive && count === 2)
                      : rule === "rug"
                        ? !alive && count >= 2 && count <= 4
                        : count % 2 === 1;
          if (on) next[y * size + x] += 2 ** bit;
        }
      }
    }
    current = next;
  }
  return current;
}

describe("evolvePlane", () => {
  it("updates synchronously with black exterior", () => {
    const seed = Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect([...evolvePlane(seed, 3, 1, 4)]).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0]);
    expect([...evolvePlane(Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0]), 3, 1, 4)]).toEqual([0, 1, 0, 1, 0, 0, 0, 0, 0]);
    expect([...seed]).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect(evolvePlane(seed, 3, 0, 4)).not.toBe(seed);
  });

  it.each(CA_RULES)("matches the independent reference oracle for %s", (rule) => {
    const seed = Uint8Array.from({ length: 25 }, (_, i) => (i * 5 + 3) % 8);
    const before = seed.slice();
    expect(evolvePlane(seed, 5, 3, rule)).toEqual(referenceOracle(seed, 5, 3, rule));
    expect(seed).toEqual(before);
  });

  it.each(GOLDEN_CASES)("matches reference $preset / $rule / t=$time", ({ preset, rule, time, rows }) => {
    expect(evolvePlane(decodeRows(GOLDEN_SEEDS[preset]), 49, time, rule)).toEqual(decodeRows(rows));
  });

  it("keeps Life blocks and the period-two blinker", () => {
    const block = Uint8Array.from([0, 0, 0, 0, 0, 0, 7, 7, 0, 0, 0, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(evolvePlane(block, 5, 20, "life")).toEqual(block);
    const horizontal = Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const vertical = Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 7, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0]);
    expect(evolvePlane(horizontal, 5, 1, "life")).toEqual(vertical);
    expect(evolvePlane(horizontal, 5, 2, "life")).toEqual(horizontal);
  });

  it("kills occupied rug channels even when surrounded", () => {
    expect(evolvePlane(new Uint8Array(9).fill(7), 3, 1, "rug")).toEqual(new Uint8Array(9));
    const seed = Uint8Array.from([4, 2, 0, 4, 0, 2, 1, 1, 0]);
    expect(evolvePlane(seed, 3, 1, "rug")[4]).toBe(7);
  });

  it("rejects invalid dimensions, times, cells and rules", () => {
    for (const size of [0, -1, 1.5, NaN]) expect(() => evolvePlane(new Uint8Array(9), size, 1, 4)).toThrow(RangeError);
    for (const time of [-1, 65, 0.5, NaN]) expect(() => evolvePlane(new Uint8Array(9), 3, time, 4)).toThrow(RangeError);
    expect(() => evolvePlane(new Uint8Array(8), 3, 1, 4)).toThrow(RangeError);
    expect(() => evolvePlane(new Uint8Array(9).fill(8), 3, 1, 4)).toThrow(RangeError);
    expect(() => evolvePlane(new Uint8Array(9), 3, 1, "wrong" as AutomataRule)).toThrow(RangeError);
  });
});

describe("evolveVisiblePlane", () => {
  it.each([
    [0, 0],
    [48, 0],
    [0, 48],
    [48, 48],
    [0, 24],
    [48, 24],
    [24, 0],
    [24, 48],
  ])("preserves XOR cancellation through the exterior at (%i, %i)", (x, y) => {
    const seed = new Uint8Array(49 * 49);
    seed[y * 49 + x] = 7;
    // On the infinite plane the four return paths cancel in XOR after two steps.
    const result = evolveVisiblePlane(seed, 2, 4);
    const expected = new Uint8Array(seed.length);
    for (const [xx, yy] of [
      [x - 2, y],
      [x + 2, y],
      [x, y - 2],
      [x, y + 2],
    ]) {
      if (xx >= 0 && xx < 49 && yy >= 0 && yy < 49) expected[yy * 49 + xx] = 7;
    }
    expect(result).toEqual(expected);
    expect(seed[y * 49 + x]).toBe(7);
  });

  it.each(CA_RULES)("matches an independent larger plane through generation 64 for %s", (rule) => {
    const seed = Uint8Array.from({ length: 49 * 49 }, (_, i) => (i % 11 === 0 ? ((i * 5) % 7) + 1 : 0));
    const before = seed.slice();
    // Two extra rows of padding on each side avoid sharing the production boundary.
    const referenceSize = 181,
      offset = 66;
    const reference = new Uint8Array(referenceSize * referenceSize);
    for (let y = 0; y < 49; y++) reference.set(seed.subarray(y * 49, (y + 1) * 49), (y + offset) * referenceSize + offset);
    const evolved = referenceOracle(reference, referenceSize, 64, rule);
    const result = evolveVisiblePlane(seed, 64, rule);
    expect(result).toHaveLength(49 * 49);
    for (let y = 0; y < 49; y++) {
      const start = (y + offset) * referenceSize + offset;
      expect(result.subarray(y * 49, (y + 1) * 49)).toEqual(evolved.subarray(start, start + 49));
    }
    expect(seed).toEqual(before);
  });

  it("returns a separate, unchanged initial window at generation zero", () => {
    const seed = Uint8Array.from({ length: 49 * 49 }, (_, i) => i % 8);
    const result = evolveVisiblePlane(seed, 0, "rug");
    expect(result).toEqual(seed);
    expect(result).not.toBe(seed);
  });

  it("rejects invalid visible planes, times and rules", () => {
    expect(() => evolveVisiblePlane(new Uint8Array(2400), 0, 4)).toThrow(RangeError);
    expect(() => evolveVisiblePlane(new Uint8Array(2401).fill(8), 0, 4)).toThrow(RangeError);
    for (const time of [-1, 65, 0.5, NaN]) expect(() => evolveVisiblePlane(new Uint8Array(2401), time, 4)).toThrow(RangeError);
    expect(() => evolveVisiblePlane(new Uint8Array(2401), 1, "wrong" as AutomataRule)).toThrow(RangeError);
  });
});
