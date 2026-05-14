import { describe, expect, it } from "vitest";
import { CUBE_EDGES, COMPLEMENT_EDGES, STELLA_EDGES } from "../../data/theory-data";
import {
  ALL_POINTS,
  FULL_GRAY_CODE,
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
    expect(toneToFreq(255)).toBe(880);
    expect(MAX_GRB_TONE).toBe(GRB_TONE_BY_LEVEL[6]);
  });

  it("applies GL(3,2) generators to all nonzero points", () => {
    expect(ALL_POINTS.map(gl32GenA)).toEqual([4, 1, 5, 2, 6, 3, 7]);
    expect(ALL_POINTS.map(gl32GenB)).toEqual([2, 1, 3, 4, 6, 5, 7]);
    expect(ALL_POINTS.map(gl32GenC)).toEqual([1, 3, 2, 4, 5, 7, 6]);
  });

  it("builds extended Hamming codewords in the expected weight distribution", () => {
    const codewords = extendedHammingCodewords();

    expect(codewords).toHaveLength(16);
    expect(codewords[0]).toEqual({ positions: [], weight: 0 });
    expect(codewords[codewords.length - 1]).toEqual({ positions: [0, ...ALL_POINTS], weight: 8 });
    expect(codewords.filter((cw) => cw.weight === 4)).toHaveLength(14);
    expect(codewords.every((cw) => cw.positions.length === cw.weight)).toBe(true);
  });

  it("exposes point and K8 layer topology used by sequence playback", () => {
    expect(linesThrough(1)).toEqual([0, 1, 3]);
    expect(K8_LAYER_EDGES[1]).toBe(CUBE_EDGES);
    expect(K8_LAYER_EDGES[2]).toBe(STELLA_EDGES);
    expect(K8_LAYER_EDGES[3]).toBe(COMPLEMENT_EDGES);
  });
});
