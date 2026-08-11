import { describe, expect, it } from "vitest";
import {
  CANONICAL_CHROMATIC_LEVEL_CYCLE,
  CANONICAL_HUE_ANCHORS,
  CANONICAL_HUE_ANGLES_BY_LEVEL,
  CANONICAL_HUE_CYCLE,
  CANONICAL_VERTEX_HUE_BY_LEVEL,
  CHROMALUM_CANDIDATE_COUNT_BY_LEVEL,
  CHROMALUM_CANDIDATE_TOTAL,
  CHROMALUM_CHANNEL_MAX,
  CHROMALUM_COMPLEMENT_SECTION_COUNT,
  CHROMALUM_GRB_WEIGHTS,
  CHROMALUM_HUE_LEVEL_TOTAL_VARIATION,
  CHROMALUM_HUE_EDGE_LEVEL_DELTAS,
  CHROMALUM_HUE_TOGGLE_CYCLE,
  CHROMALUM_LEVEL_BITS,
  CHROMALUM_LEVEL_LABELS,
  CHROMALUM_MIN_HUE_STEP_DEG,
  CHROMALUM_ORDERED_FRAME,
  CHROMALUM_PALETTE_SECTION_COUNT,
  CHROMALUM_TONE_DENOMINATOR,
  chromalumGrbToHue,
  chromalumGrbLevel,
  chromalumToneNorm,
  hueToChromalumGrb,
} from "../chromalum-color-model";

describe("exact CHROMALUM color model", () => {
  it("derives the unique unnamed complete subset-sum weights", () => {
    const admissibleWeights: number[][] = [];
    for (let a = 1; a <= 7; a++) {
      for (let b = a + 1; b <= 7; b++) {
        for (let c = b + 1; c <= 7; c++) {
          const sums = [0, a, b, c, a + b, a + c, b + c, a + b + c].sort((x, y) => x - y);
          if (sums.every((value, index) => value === index)) admissibleWeights.push([a, b, c]);
        }
      }
    }

    expect(admissibleWeights).toEqual([[1, 2, 4]]);
  });

  it("uses color brightness rank to name the binary weights B=1, R=2, and G=4", () => {
    expect(CHROMALUM_ORDERED_FRAME).toEqual(["G", "R", "B"]);
    expect(CHROMALUM_GRB_WEIGHTS).toEqual({ G: 4, R: 2, B: 1 });
    expect(CHROMALUM_TONE_DENOMINATOR).toBe(7);
    expect(CHROMALUM_LEVEL_LABELS).toEqual(["K", "B", "R", "M", "G", "C", "Y", "W"]);
    expect(CHROMALUM_LEVEL_BITS).toEqual([
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 1],
    ]);
  });

  it("recomputes the binary brightness rank from standard additive RGB orderings", () => {
    const binaryColors = [
      { label: "K", bits: [0, 0, 0] },
      { label: "B", bits: [0, 0, 1] },
      { label: "R", bits: [0, 1, 0] },
      { label: "M", bits: [0, 1, 1] },
      { label: "G", bits: [1, 0, 0] },
      { label: "C", bits: [1, 0, 1] },
      { label: "Y", bits: [1, 1, 0] },
      { label: "W", bits: [1, 1, 1] },
    ] as const;
    const standardWeights = [
      { G: 0.587, R: 0.299, B: 0.114 },
      { G: 0.7152, R: 0.2126, B: 0.0722 },
      { G: 0.678, R: 0.2627, B: 0.0593 },
    ] as const;

    for (const weights of standardWeights) {
      const ranked = [...binaryColors].sort((left, right) => {
        const score = ({ bits: [g, r, b] }: (typeof binaryColors)[number]) => weights.G * g + weights.R * r + weights.B * b;
        return score(left) - score(right);
      });

      expect(ranked.map(({ label }) => label)).toEqual(CHROMALUM_LEVEL_LABELS);
      ranked.forEach(({ bits: [g, r, b] }, rank) => {
        expect(rank).toBe(CHROMALUM_GRB_WEIGHTS.G * g + CHROMALUM_GRB_WEIGHTS.R * r + CHROMALUM_GRB_WEIGHTS.B * b);
      });
    }
  });

  it("checks the two brightness inequalities against the complete vertex order", () => {
    for (let wG = 1; wG <= 8; wG++) {
      for (let wR = 1; wR <= 8; wR++) {
        for (let wB = 1; wB <= 8; wB++) {
          const satisfiesTwoInequalities = wG > wR + wB && wR > wB;
          const scoresInExpectedOrder = [0, wB, wR, wR + wB, wG, wG + wB, wG + wR, wG + wR + wB];
          const hasCompleteOrder = scoresInExpectedOrder.every((score, index) => index === 0 || scoresInExpectedOrder[index - 1] < score);
          expect(hasCompleteOrder).toBe(satisfiesTwoInequalities);
        }
      }
    }
  });

  it("generates the six-color hue loop by repeating one-bit channel flips", () => {
    expect(CHROMALUM_HUE_TOGGLE_CYCLE).toEqual(["G", "R", "B", "G", "R", "B"]);
    expect(CANONICAL_CHROMATIC_LEVEL_CYCLE).toEqual([2, 6, 4, 5, 1, 3]);
    expect(new Set(CANONICAL_CHROMATIC_LEVEL_CYCLE)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    CANONICAL_CHROMATIC_LEVEL_CYCLE.forEach((level, index) => {
      const next = CANONICAL_CHROMATIC_LEVEL_CYCLE[(index + 1) % CANONICAL_CHROMATIC_LEVEL_CYCLE.length];
      expect(level ^ next).toBe(CHROMALUM_GRB_WEIGHTS[CHROMALUM_HUE_TOGGLE_CYCLE[index]]);
    });
  });

  it("makes the flipped channel weight exactly the hue-edge brightness-rank difference", () => {
    const channelIndex = { G: 0, R: 1, B: 2 } as const;

    CANONICAL_CHROMATIC_LEVEL_CYCLE.forEach((fromLevel, index) => {
      const toLevel = CANONICAL_CHROMATIC_LEVEL_CYCLE[(index + 1) % CANONICAL_CHROMATIC_LEVEL_CYCLE.length];
      const channel = CHROMALUM_HUE_TOGGLE_CYCLE[index];
      const fromBit = CHROMALUM_LEVEL_BITS[fromLevel][channelIndex[channel]];
      const toBit = CHROMALUM_LEVEL_BITS[toLevel][channelIndex[channel]];
      const delta = toLevel - fromLevel;

      expect(toBit).toBe(1 - fromBit);
      expect(delta).toBe((1 - 2 * fromBit) * CHROMALUM_GRB_WEIGHTS[channel]);
      expect(Math.abs(delta)).toBe(CHROMALUM_GRB_WEIGHTS[channel]);
    });

    expect(CHROMALUM_HUE_EDGE_LEVEL_DELTAS).toEqual([4, -2, 1, -4, 2, -1]);
    expect(CHROMALUM_HUE_TOGGLE_CYCLE.reduce((mask, channel) => mask ^ CHROMALUM_GRB_WEIGHTS[channel], 0)).toBe(0);
    expect(CHROMALUM_HUE_EDGE_LEVEL_DELTAS.reduce((sum, delta) => sum + delta, 0)).toBe(0);
    expect(CHROMALUM_HUE_LEVEL_TOTAL_VARIATION).toBe(2 * (4 + 2 + 1));
  });

  it("carries the same number chain into hue fibers and palette sections", () => {
    expect(CANONICAL_HUE_CYCLE).toHaveLength(14);
    expect(CHROMALUM_MIN_HUE_STEP_DEG).toBe(15);
    expect(CHROMALUM_CANDIDATE_COUNT_BY_LEVEL).toEqual([1, 1, 3, 3, 3, 3, 1, 1]);
    expect(CHROMALUM_CANDIDATE_TOTAL).toBe(16);
    expect(CHROMALUM_PALETTE_SECTION_COUNT).toBe(81);
    expect(CHROMALUM_COMPLEMENT_SECTION_COUNT).toBe(9);
  });

  it("defines R/G/B as 120° anchors and Y/C/M as their midpoints", () => {
    expect(CANONICAL_HUE_ANCHORS).toEqual({ R: 0, Y: 60, G: 120, C: 180, B: 240, M: 300 });
    expect(CANONICAL_HUE_ANCHORS.Y).toBe((CANONICAL_HUE_ANCHORS.R + CANONICAL_HUE_ANCHORS.G) / 2);
    expect(CANONICAL_HUE_ANCHORS.C).toBe((CANONICAL_HUE_ANCHORS.G + CANONICAL_HUE_ANCHORS.B) / 2);
    expect(CANONICAL_HUE_ANCHORS.M).toBe((CANONICAL_HUE_ANCHORS.B + 360) / 2);
    expect(CANONICAL_VERTEX_HUE_BY_LEVEL).toEqual([-1, 240, 0, 300, 120, 180, 60, -1]);
  });

  it("groups the exact hue-cycle intersections by GRB level", () => {
    expect(CANONICAL_HUE_ANGLES_BY_LEVEL).toEqual([[], [240], [0, 225, 270], [15, 210, 300], [30, 120, 195], [45, 90, 180], [60], []]);
  });

  it("represents every canonical intersection with exact quarter channels and tone", () => {
    const grbByLevel = CANONICAL_HUE_ANGLES_BY_LEVEL.map((angles) => angles.map(hueToChromalumGrb));
    expect(grbByLevel).toEqual([
      [],
      [[0, 0, 4]],
      [
        [0, 4, 0],
        [1, 0, 4],
        [0, 2, 4],
      ],
      [
        [1, 4, 0],
        [2, 0, 4],
        [0, 4, 4],
      ],
      [
        [2, 4, 0],
        [4, 0, 0],
        [3, 0, 4],
      ],
      [
        [3, 4, 0],
        [4, 2, 0],
        [4, 0, 4],
      ],
      [[4, 4, 0]],
      [],
    ]);

    for (const { hueAngleDeg, levelIndex } of CANONICAL_HUE_CYCLE) {
      const grb = hueToChromalumGrb(hueAngleDeg);
      expect(grb.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= CHROMALUM_CHANNEL_MAX)).toBe(true);
      expect(chromalumGrbToHue(grb)).toBe(hueAngleDeg);
      expect(chromalumGrbLevel(grb)).toBe(levelIndex);
      expect(chromalumToneNorm(grb)).toBe(levelIndex / 7);
    }
  });

  it("makes a 180° hue rotation the exact channel complement", () => {
    for (const { hueAngleDeg, levelIndex } of CANONICAL_HUE_CYCLE) {
      const grb = hueToChromalumGrb(hueAngleDeg);
      const complement = hueToChromalumGrb(hueAngleDeg + 180);
      expect(complement).toEqual(grb.map((channel) => CHROMALUM_CHANNEL_MAX - channel));
      expect(chromalumGrbLevel(complement)).toBe(7 - levelIndex);
    }
  });
});
