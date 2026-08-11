import { CHROMALUM_CHANNEL_MAX } from "../chromalum-color-model";
import { DEFAULT_CANDIDATE_INDEX_BY_LEVEL, LEVEL_CANDIDATES } from "../color-engine";

export const MUSIC_COMPLEMENT_LEVEL_PAIRS = [
  [1, 6],
  [2, 5],
  [3, 4],
] as const;

function isCandidateIndex(levelIndex: number, candidateIndex: number | undefined): candidateIndex is number {
  return (
    candidateIndex !== undefined &&
    Number.isInteger(candidateIndex) &&
    candidateIndex >= 0 &&
    candidateIndex < (LEVEL_CANDIDATES[levelIndex]?.length ?? 0)
  );
}

function hueDistanceDeg(a: number, b: number): number {
  const difference = Math.abs(a - b) % 360;
  return Math.min(difference, 360 - difference);
}

export function findMusicComplementCandidateIndex(levelIndex: number, candidateIndex: number): number {
  const complementLevelIndex = 7 - levelIndex;
  const candidate = LEVEL_CANDIDATES[levelIndex]?.[candidateIndex];
  if (!candidate || complementLevelIndex < 1 || complementLevelIndex > 6) {
    throw new RangeError(`Invalid active music candidate L${levelIndex}:${candidateIndex}`);
  }

  const complementIndex = LEVEL_CANDIDATES[complementLevelIndex].findIndex(
    (possibleComplement) =>
      hueDistanceDeg(candidate.hueAngleDeg, possibleComplement.hueAngleDeg) === 180 &&
      candidate.chromalumGrb.every(
        (channel, channelIndex) => channel + possibleComplement.chromalumGrb[channelIndex] === CHROMALUM_CHANNEL_MAX,
      ),
  );
  if (complementIndex < 0) {
    throw new Error(`Missing complementary candidate for L${levelIndex}:${candidateIndex}`);
  }
  return complementIndex;
}

export function findClosestMusicComplementPairCandidateIndex(lowerLevelIndex: number, hueAngleDeg: number): number {
  const upperLevelIndex = 7 - lowerLevelIndex;
  if (lowerLevelIndex < 1 || lowerLevelIndex > 3) {
    throw new RangeError(`Invalid lower music complement level L${lowerLevelIndex}`);
  }

  const canonicalCandidateIndex = DEFAULT_CANDIDATE_INDEX_BY_LEVEL[lowerLevelIndex];
  let closestCandidateIndex = 0;
  let closestDistance = Infinity;
  for (let candidateIndex = 0; candidateIndex < LEVEL_CANDIDATES[lowerLevelIndex].length; candidateIndex++) {
    const complementCandidateIndex = findMusicComplementCandidateIndex(lowerLevelIndex, candidateIndex);
    const pairDistance = Math.min(
      hueDistanceDeg(LEVEL_CANDIDATES[lowerLevelIndex][candidateIndex].hueAngleDeg, hueAngleDeg),
      hueDistanceDeg(LEVEL_CANDIDATES[upperLevelIndex][complementCandidateIndex].hueAngleDeg, hueAngleDeg),
    );
    if (pairDistance < closestDistance || (pairDistance === closestDistance && candidateIndex === canonicalCandidateIndex)) {
      closestCandidateIndex = candidateIndex;
      closestDistance = pairDistance;
    }
  }
  return closestCandidateIndex;
}

/**
 * Resolves all active candidates as complementary pairs. Each automatic pair
 * is selected by whichever endpoint is nearest to the global hue control; a
 * direct override on either member anchors the pair instead.
 */
export function resolveMusicCandidateIndices(
  candidateOverridesByLevel: ReadonlyMap<number, number>,
  hueAngleDeg: number,
): Map<number, number> {
  const resolved = new Map<number, number>();
  for (const [lowerLevelIndex, upperLevelIndex] of MUSIC_COMPLEMENT_LEVEL_PAIRS) {
    const lowerOverride = candidateOverridesByLevel.get(lowerLevelIndex);
    const upperOverride = candidateOverridesByLevel.get(upperLevelIndex);
    const lowerCandidateIndex = isCandidateIndex(lowerLevelIndex, lowerOverride)
      ? lowerOverride
      : isCandidateIndex(upperLevelIndex, upperOverride)
        ? findMusicComplementCandidateIndex(upperLevelIndex, upperOverride)
        : findClosestMusicComplementPairCandidateIndex(lowerLevelIndex, hueAngleDeg);
    resolved.set(lowerLevelIndex, lowerCandidateIndex);
    resolved.set(upperLevelIndex, findMusicComplementCandidateIndex(lowerLevelIndex, lowerCandidateIndex));
  }
  return resolved;
}

export function withMusicComplementCandidate(
  previous: ReadonlyMap<number, number>,
  levelIndex: number,
  candidateIndex: number,
): Map<number, number> {
  if (!isCandidateIndex(levelIndex, candidateIndex) || levelIndex < 1 || levelIndex > 6) {
    throw new RangeError(`Invalid active music candidate L${levelIndex}:${candidateIndex}`);
  }
  const next = new Map(previous);
  next.set(levelIndex, candidateIndex);
  next.set(7 - levelIndex, findMusicComplementCandidateIndex(levelIndex, candidateIndex));
  return next;
}

/** The section containing only the six binary chromatic vertices. */
export function createBinaryVertexMusicCandidateOverrides(): Map<number, number> {
  const lowerLevelDefaults = new Map<number, number>();
  for (const [lowerLevelIndex] of MUSIC_COMPLEMENT_LEVEL_PAIRS) {
    lowerLevelDefaults.set(lowerLevelIndex, DEFAULT_CANDIDATE_INDEX_BY_LEVEL[lowerLevelIndex]);
  }
  return resolveMusicCandidateIndices(lowerLevelDefaults, 0);
}
