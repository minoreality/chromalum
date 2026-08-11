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
  it("derives 4:2:1 as the unique complete three-atom subset-sum valuation", () => {
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
    expect(CHROMALUM_ORDERED_FRAME).toEqual(["G", "R", "B"]);
    expect(CHROMALUM_GRB_WEIGHTS).toEqual({ G: 4, R: 2, B: 1 });
    expect(CHROMALUM_TONE_DENOMINATOR).toBe(7);
  });

  it("derives the chromatic Gray cycle from the rooted frame", () => {
    expect(CHROMALUM_HUE_TOGGLE_CYCLE).toEqual(["G", "R", "B", "G", "R", "B"]);
    expect(CANONICAL_CHROMATIC_LEVEL_CYCLE).toEqual([2, 6, 4, 5, 1, 3]);
    CANONICAL_CHROMATIC_LEVEL_CYCLE.forEach((level, index) => {
      const next = CANONICAL_CHROMATIC_LEVEL_CYCLE[(index + 1) % CANONICAL_CHROMATIC_LEVEL_CYCLE.length];
      expect(level ^ next).toBe(CHROMALUM_GRB_WEIGHTS[CHROMALUM_HUE_TOGGLE_CYCLE[index]]);
    });
  });

  it("carries the same number chain into hue fibers and palette sections", () => {
    expect(CHROMALUM_HUE_EDGE_LEVEL_DELTAS).toEqual([4, -2, 1, -4, 2, -1]);
    expect(CHROMALUM_HUE_LEVEL_TOTAL_VARIATION).toBe(2 * CHROMALUM_TONE_DENOMINATOR);
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
