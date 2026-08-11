import { describe, expect, it } from "vitest";
import { CHROMALUM_CHANNEL_MAX } from "../../chromalum-color-model";
import { DEFAULT_CANDIDATE_INDEX_BY_LEVEL, LEVEL_CANDIDATES } from "../../color-engine";
import {
  MUSIC_COMPLEMENT_LEVEL_PAIRS,
  createBinaryVertexMusicCandidateOverrides,
  findClosestMusicComplementPairCandidateIndex,
  findMusicComplementCandidateIndex,
  resolveMusicCandidateIndices,
  withMusicComplementCandidate,
} from "../music-candidate-pairs";

function expectComplementaryPair(candidateIndices: ReadonlyMap<number, number>, lowerLevelIndex: number, upperLevelIndex: number) {
  const lowerCandidateIndex = candidateIndices.get(lowerLevelIndex)!;
  const upperCandidateIndex = candidateIndices.get(upperLevelIndex)!;
  const lowerCandidate = LEVEL_CANDIDATES[lowerLevelIndex][lowerCandidateIndex];
  const upperCandidate = LEVEL_CANDIDATES[upperLevelIndex][upperCandidateIndex];
  const hueDifference = Math.abs(lowerCandidate.hueAngleDeg - upperCandidate.hueAngleDeg) % 360;

  expect(Math.min(hueDifference, 360 - hueDifference)).toBe(180);
  expect(lowerCandidate.chromalumGrb.map((channel, channelIndex) => channel + upperCandidate.chromalumGrb[channelIndex])).toEqual([
    CHROMALUM_CHANNEL_MAX,
    CHROMALUM_CHANNEL_MAX,
    CHROMALUM_CHANNEL_MAX,
  ]);
  expect(findMusicComplementCandidateIndex(lowerLevelIndex, lowerCandidateIndex)).toBe(upperCandidateIndex);
  expect(findMusicComplementCandidateIndex(upperLevelIndex, upperCandidateIndex)).toBe(lowerCandidateIndex);
}

function expectAllPairsComplementary(candidateIndices: ReadonlyMap<number, number>) {
  for (const [lowerLevelIndex, upperLevelIndex] of MUSIC_COMPLEMENT_LEVEL_PAIRS) {
    expectComplementaryPair(candidateIndices, lowerLevelIndex, upperLevelIndex);
  }
}

function hueDistanceDeg(a: number, b: number): number {
  const difference = Math.abs(a - b) % 360;
  return Math.min(difference, 360 - difference);
}

describe("music complementary candidate pairs", () => {
  it("builds the binary-vertex section while enforcing exact complements", () => {
    const defaults = createBinaryVertexMusicCandidateOverrides();

    expect([...defaults.entries()].sort(([a], [b]) => a - b)).toEqual(
      DEFAULT_CANDIDATE_INDEX_BY_LEVEL.slice(1, 7).map((candidateIndex, index) => [index + 1, candidateIndex]),
    );
    expectAllPairsComplementary(defaults);
  });

  it("resolves every hue-control position to three exact complementary pairs", () => {
    for (let hueAngleDeg = 0; hueAngleDeg < 360; hueAngleDeg++) {
      expectAllPairsComplementary(resolveMusicCandidateIndices(new Map(), hueAngleDeg));
    }
  });

  it("selects the complement pair with an endpoint nearest to the global hue", () => {
    for (let hueAngleDeg = 0; hueAngleDeg < 360; hueAngleDeg++) {
      const resolved = resolveMusicCandidateIndices(new Map(), hueAngleDeg);
      for (const [lowerLevelIndex, upperLevelIndex] of MUSIC_COMPLEMENT_LEVEL_PAIRS) {
        const selectedLowerIndex = resolved.get(lowerLevelIndex)!;
        const selectedUpperIndex = resolved.get(upperLevelIndex)!;
        const selectedDistance = Math.min(
          hueDistanceDeg(LEVEL_CANDIDATES[lowerLevelIndex][selectedLowerIndex].hueAngleDeg, hueAngleDeg),
          hueDistanceDeg(LEVEL_CANDIDATES[upperLevelIndex][selectedUpperIndex].hueAngleDeg, hueAngleDeg),
        );
        const closestDistance = Math.min(
          ...LEVEL_CANDIDATES[lowerLevelIndex].map((candidate, candidateIndex) => {
            const complementCandidateIndex = findMusicComplementCandidateIndex(lowerLevelIndex, candidateIndex);
            return Math.min(
              hueDistanceDeg(candidate.hueAngleDeg, hueAngleDeg),
              hueDistanceDeg(LEVEL_CANDIDATES[upperLevelIndex][complementCandidateIndex].hueAngleDeg, hueAngleDeg),
            );
          }),
        );

        expect(selectedLowerIndex).toBe(findClosestMusicComplementPairCandidateIndex(lowerLevelIndex, hueAngleDeg));
        expect(selectedDistance).toBe(closestDistance);
      }
    }
  });

  it("uses the pair containing the exact 180 degree candidate at hue 180", () => {
    const resolved = resolveMusicCandidateIndices(new Map(), 180);
    expect(LEVEL_CANDIDATES[5][resolved.get(5)!].hueAngleDeg).toBe(180);
  });

  it("updates the counterpart when any individual candidate is selected", () => {
    for (let levelIndex = 1; levelIndex <= 6; levelIndex++) {
      for (let candidateIndex = 0; candidateIndex < LEVEL_CANDIDATES[levelIndex].length; candidateIndex++) {
        const selected = withMusicComplementCandidate(new Map(), levelIndex, candidateIndex);
        expect(selected.get(levelIndex)).toBe(candidateIndex);
        const lowerLevelIndex = Math.min(levelIndex, 7 - levelIndex);
        expectComplementaryPair(selected, lowerLevelIndex, 7 - lowerLevelIndex);
      }
    }
  });

  it("honors a direct override made from the upper-tone member", () => {
    for (const [, upperLevelIndex] of MUSIC_COMPLEMENT_LEVEL_PAIRS) {
      for (let candidateIndex = 0; candidateIndex < LEVEL_CANDIDATES[upperLevelIndex].length; candidateIndex++) {
        const resolved = resolveMusicCandidateIndices(new Map([[upperLevelIndex, candidateIndex]]), 0);
        expect(resolved.get(upperLevelIndex)).toBe(candidateIndex);
        expectAllPairsComplementary(resolved);
      }
    }
  });
});
