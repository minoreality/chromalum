import { describe, expect, it } from "vitest";
import { LEVEL_CANDIDATES, LEVEL_INFO } from "../../color-engine";
import {
  buildActiveMusicLevels,
  buildMusicHueTicks,
  buildMusicLevelPreview,
  buildMusicSonificationLevels,
  findMusicFanoLine,
} from "../music-panel-derived";
import { MUSIC_COMPLEMENT_LEVEL_PAIRS, resolveMusicCandidateIndices } from "../music-candidate-pairs";

function expectComplementaryHues(levels: readonly { levelIndex: number; hueAngleDeg: number }[]) {
  for (const [lowerLevelIndex, upperLevelIndex] of MUSIC_COMPLEMENT_LEVEL_PAIRS) {
    const lowerHue = levels.find((level) => level.levelIndex === lowerLevelIndex)!.hueAngleDeg;
    const upperHue = levels.find((level) => level.levelIndex === upperLevelIndex)!.hueAngleDeg;
    const difference = Math.abs(lowerHue - upperHue) % 360;
    expect(Math.min(difference, 360 - difference)).toBe(180);
  }
}

describe("music panel derived data", () => {
  it("finds Fano line indices from XOR operands independent of order", () => {
    expect(findMusicFanoLine(1, 2)).toBe(0);
    expect(findMusicFanoLine(2, 1)).toBe(0);
    expect(findMusicFanoLine(1, 6)).toBe(3);
    expect(findMusicFanoLine(1, 1)).toBe(-1);
  });

  it("builds sonification levels from direct candidates and hue fallback", () => {
    const directCandidate = Math.min(1, LEVEL_CANDIDATES[2].length - 1);
    const candidateOverridesByLevel = new Map<number, number>([[2, directCandidate]]);
    const levels = buildMusicSonificationLevels(candidateOverridesByLevel, 123);

    expect(levels.map((level) => level.levelIndex)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(levels[1]).toEqual({
      levelIndex: 2,
      hueAngleDeg: LEVEL_CANDIDATES[2][directCandidate].hueAngleDeg,
      toneNorm: 2 / 7,
    });

    const fallbackCandidate = resolveMusicCandidateIndices(candidateOverridesByLevel, 123).get(3)!;
    expect(levels[2]).toEqual({
      levelIndex: 3,
      hueAngleDeg: LEVEL_CANDIDATES[3][fallbackCandidate].hueAngleDeg,
      toneNorm: 3 / 7,
    });
    expectComplementaryHues(levels);
  });

  it("builds level previews for all eight levels", () => {
    const directCandidate = Math.min(1, LEVEL_CANDIDATES[4].length - 1);
    const preview = buildMusicLevelPreview(new Map([[4, directCandidate]]), 90);

    expect(preview).toHaveLength(8);
    expect(preview[0]).toMatchObject({ levelIndex: 0, name: "Black", hex: "rgb(0,0,0)" });
    expect(preview[4]).toEqual({
      levelIndex: 4,
      name: LEVEL_INFO[4].name,
      rgb: LEVEL_CANDIDATES[4][directCandidate].rgb,
      hex: `rgb(${LEVEL_CANDIDATES[4][directCandidate].rgb.join(",")})`,
    });
  });

  it("filters active levels to L1-L6 for visual components", () => {
    const preview = buildMusicLevelPreview(new Map(), 180);
    const active = buildActiveMusicLevels(preview);

    expect(active.map((level) => level.levelIndex)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(active[0].rgb).toEqual(preview[1].rgb);
  });

  it("derives hue ticks from the complement-section resolver axes", () => {
    const ticks = buildMusicHueTicks();
    expect(ticks.map(({ hueAngleDeg }) => hueAngleDeg)).toEqual([22.5, 67.5, 75, 135, 157.5, 202.5, 247.5, 255, 315, 337.5]);
    expect(ticks.every((tick) => tick.hueAngleDeg >= 0 && tick.hueAngleDeg < 360)).toBe(true);
  });
});
