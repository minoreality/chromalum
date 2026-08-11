import { describe, expect, it } from "vitest";
import { CUBE_EDGES, COMPLEMENT_EDGES, STELLA_EDGES } from "../../data/theory-data";
import {
  ALL_POINTS,
  composeGl32Permutation,
  FULL_GRAY_CODE,
  GL32_IDENTITY_PERMUTATION,
  GRB_TONE_BY_LEVEL,
  K8_LAYER_EDGES,
  MAX_GRB_TONE,
  extendedHammingCodewords,
  gl32GenA,
  gl32GenB,
  gl32GenC,
  linesThrough,
  toneToFreq,
} from "../music-engine-core";

describe("music-engine-core", () => {
  it("keeps the Gray code sequence and tone frequency endpoints stable", () => {
    expect(FULL_GRAY_CODE).toEqual([0, 1, 3, 2, 6, 7, 5, 4]);
    for (let i = 1; i < FULL_GRAY_CODE.length; i++) {
      const diff = FULL_GRAY_CODE[i - 1] ^ FULL_GRAY_CODE[i];
      expect(diff && diff & (diff - 1)).toBe(0);
    }

    expect(toneToFreq(0)).toBe(220);
    expect(toneToFreq(1)).toBe(880);
    expect(MAX_GRB_TONE).toBe(GRB_TONE_BY_LEVEL[6]);
  });

  it("keeps the expressive linear-Hz tone adapter separate from an octave-ratio map", () => {
    for (const tone of [0, 1 / 7, 2 / 7, 0.5, 5 / 7, 6 / 7, 1]) {
      expect(toneToFreq(tone) + toneToFreq(1 - tone)).toBeCloseTo(1100, 12);
    }
    expect(toneToFreq(1) / toneToFreq(0)).toBe(4);
    expect(toneToFreq(6 / 7) / toneToFreq(1 / 7)).not.toBeCloseTo(toneToFreq(5 / 7) / toneToFreq(2 / 7), 12);
  });

  it("applies GL(3,2) generators to all nonzero points", () => {
    expect(ALL_POINTS.map(gl32GenA)).toEqual([4, 1, 5, 2, 6, 3, 7]);
    expect(ALL_POINTS.map(gl32GenB)).toEqual([2, 1, 3, 4, 6, 5, 7]);
    expect(ALL_POINTS.map(gl32GenC)).toEqual([1, 3, 2, 4, 5, 7, 6]);
  });

  it("composes GL(3,2) as a full seven-point permutation", () => {
    const genC = composeGl32Permutation(GL32_IDENTITY_PERMUTATION, "C");
    expect(genC).toEqual([0, 1, 3, 2, 4, 5, 7, 6]);
    expect([...genC.slice(1)].sort((a, b) => a - b)).toEqual(ALL_POINTS);

    const afterA = composeGl32Permutation(genC, "A");
    expect([...afterA.slice(1)].sort((a, b) => a - b)).toEqual(ALL_POINTS);
  });

  it("keeps the generators linear and generates all 168 elements of GL(3,2)", () => {
    const generators = [gl32GenA, gl32GenB, gl32GenC];
    for (const generator of generators) {
      const images = GL32_IDENTITY_PERMUTATION.map(generator);
      expect([...images].sort((a, b) => a - b)).toEqual([...GL32_IDENTITY_PERMUTATION]);
      for (const left of GL32_IDENTITY_PERMUTATION) {
        for (const right of GL32_IDENTITY_PERMUTATION) expect(generator(left ^ right)).toBe(generator(left) ^ generator(right));
      }
    }

    const seen = new Map<string, number[]>([[GL32_IDENTITY_PERMUTATION.join(","), [...GL32_IDENTITY_PERMUTATION]]]);
    const queue: number[][] = [[...GL32_IDENTITY_PERMUTATION]];
    for (let index = 0; index < queue.length; index++) {
      for (const generator of ["A", "B", "C"] as const) {
        const next = composeGl32Permutation(queue[index], generator);
        const key = next.join(",");
        if (!seen.has(key)) {
          seen.set(key, next);
          queue.push(next);
        }
      }
    }
    expect(seen.size).toBe(168);
  });

  it("builds extended Hamming codewords in the expected weight distribution", () => {
    const codewords = extendedHammingCodewords();

    expect(codewords).toHaveLength(16);
    expect(codewords[0]).toEqual({ positions: [], weight: 0 });
    expect(codewords[codewords.length - 1]).toEqual({ positions: [0, ...ALL_POINTS], weight: 8 });
    expect(codewords.filter((cw) => cw.weight === 4)).toHaveLength(14);
    expect(codewords.every((cw) => cw.positions.length === cw.weight)).toBe(true);

    const masks = codewords.map((codeword) => codeword.positions.reduce((mask, position) => mask | (1 << position), 0));
    const maskSet = new Set(masks);
    for (const left of masks) {
      for (const right of masks) expect(maskSet.has(left ^ right)).toBe(true);
    }

    const distances = masks.flatMap((left, leftIndex) =>
      masks.slice(leftIndex + 1).map((right) => (left ^ right).toString(2).match(/1/g)?.length ?? 0),
    );
    expect(Math.min(...distances)).toBe(4);
  });

  it("exposes point and K8 layer topology used by sequence playback", () => {
    expect(linesThrough(1)).toEqual([0, 1, 3]);
    expect(K8_LAYER_EDGES[1]).toBe(CUBE_EDGES);
    expect(K8_LAYER_EDGES[2]).toBe(STELLA_EDGES);
    expect(K8_LAYER_EDGES[3]).toBe(COMPLEMENT_EDGES);
  });
});
