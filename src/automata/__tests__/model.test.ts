import { describe, expect, it } from "vitest";
import { CA_RULES, evolvePlane, type AutomataRule } from "../model";
import { GOLDEN_CASES, GOLDEN_SEEDS, decodeRows } from "./fixtures/ca-golden";

function binaryOracle(seed: Uint8Array, size: number, steps: number, rule: AutomataRule): Uint8Array {
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
              if (center && ![5, 9, "diagonal-center"].includes(rule)) continue;
              if (!center && (rule === 4 || rule === 5) && diagonal) continue;
              if (!center && (rule === "diagonal" || rule === "diagonal-center") && !diagonal) continue;
              const xx = x + dx,
                yy = y + dy;
              if (xx >= 0 && xx < size && yy >= 0 && yy < size) count += (current[yy * size + xx] >> bit) & 1;
            }
          }
          const alive = Boolean(current[y * size + x] & (1 << bit));
          const on =
            rule === "life" ? count === 3 || (alive && count === 2) : rule === "rug" ? !alive && count >= 2 && count <= 4 : count % 2 === 1;
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

  it.each(CA_RULES)("matches the independent binary oracle for %s", (rule) => {
    const seed = Uint8Array.from({ length: 25 }, (_, i) => (i * 5 + 3) % 8);
    const before = seed.slice();
    expect(evolvePlane(seed, 5, 3, rule)).toEqual(binaryOracle(seed, 5, 3, rule));
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
    for (const time of [-1, 21, 0.5, NaN]) expect(() => evolvePlane(new Uint8Array(9), 3, time, 4)).toThrow(RangeError);
    expect(() => evolvePlane(new Uint8Array(8), 3, 1, 4)).toThrow(RangeError);
    expect(() => evolvePlane(new Uint8Array(9).fill(8), 3, 1, 4)).toThrow(RangeError);
    expect(() => evolvePlane(new Uint8Array(9), 3, 1, "wrong" as AutomataRule)).toThrow(RangeError);
  });
});
