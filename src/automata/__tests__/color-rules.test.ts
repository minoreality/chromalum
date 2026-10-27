import { describe, expect, it } from "vitest";
import { evolvePlane, evolveVisiblePlane } from "../model";

const cross = [4, 1, 3, 5, 7];

describe("Boolean color rules", () => {
  it.each(["or", "and", "majority"] as const)("evaluates every five-cell bit configuration for %s", (rule) => {
    for (const bit of [1, 2, 4]) {
      for (let pattern = 0; pattern < 32; pattern++) {
        const seed = new Uint8Array(9).fill(7);
        let count = 0;
        cross.forEach((cell, index) => {
          const on = (pattern >> index) & 1;
          seed[cell] = on * bit;
          count += on;
        });
        const expected = rule === "or" ? count > 0 : rule === "and" ? count === 5 : count >= 3;
        expect(evolvePlane(seed, 3, 1, rule)[4]).toBe(expected ? bit : 0);
      }
    }
  });

  it("preserves repeated OR channels and extracts the shared red from magenta and yellow", () => {
    expect(evolvePlane(Uint8Array.from([0, 2, 0, 2, 0, 0, 0, 0, 0]), 3, 1, "or")[4]).toBe(2);
    expect(evolvePlane(Uint8Array.from([0, 7, 0, 3, 7, 6, 0, 7, 0]), 3, 1, "and")[4]).toBe(2);
  });

  it("includes exterior black in AND and keeps a five-cell majority threshold at edges", () => {
    expect([...evolvePlane(new Uint8Array(9).fill(7), 3, 1, "and")]).toEqual([0, 0, 0, 0, 7, 0, 0, 0, 0]);
    expect(evolvePlane(new Uint8Array([7]), 1, 1, "majority")[0]).toBe(0);
  });
});

describe("distance-one color toggles", () => {
  it("distinguishes all 64 color pairs using the full color distance", () => {
    for (let current = 0; current < 8; current++) {
      for (let neighbor = 0; neighbor < 8; neighbor++) {
        const seed = new Uint8Array(9).fill(current);
        seed[1] = neighbor;
        const distance = [1, 2, 4].filter((bit) => Boolean(current & bit) !== Boolean(neighbor & bit)).length;
        expect(evolvePlane(seed, 3, 1, "hamming")[4]).toBe(distance === 1 ? neighbor : current);
      }
    }
  });

  it("cancels two matching proposals and includes black exterior proposals", () => {
    const seed = new Uint8Array(9).fill(2);
    seed[1] = seed[3] = 6;
    expect(evolvePlane(seed, 3, 1, "hamming")[4]).toBe(2);
    seed[5] = 6;
    expect(evolvePlane(seed, 3, 1, "hamming")[4]).toBe(6);
    expect([...evolvePlane(new Uint8Array(9).fill(2), 3, 1, "hamming")]).toEqual([2, 0, 2, 0, 2, 0, 2, 0, 2]);
  });
});

it.each(["or", "and", "majority", "hamming"] as const)("keeps a black background and the initial seed intact for %s", (rule) => {
  const seed = new Uint8Array(49 * 49);
  expect(evolveVisiblePlane(seed, 64, rule)).toEqual(seed);
  expect(seed.some(Boolean)).toBe(false);
});
