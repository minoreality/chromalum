import { LEVEL_CANDIDATES, LEVEL_INFO, findClosestCandidate, levelToneNorm } from "../color-engine";
import { FANO_LINES } from "../data/theory-data";
import type { SonificationLevel } from "./music-audio-graph";
import { resolveMusicCandidateIndices } from "./music-candidate-pairs";
import { MUSIC_ACTIVE_LEVELS, type ActiveMusicLevel, type MusicHueTick, type MusicLevelPreview } from "./types";

function getCandidateIndex(resolvedCandidateIndices: ReadonlyMap<number, number>, levelIndex: number, hueAngleDeg: number): number {
  return resolvedCandidateIndices.get(levelIndex) ?? findClosestCandidate(levelIndex, hueAngleDeg);
}

export function findMusicFanoLine(a: number, b: number): number {
  const c = a ^ b;
  const triple = [a, b, c].sort((x, y) => x - y);
  return FANO_LINES.findIndex((line) => {
    const sorted = [...line].sort((x, y) => x - y);
    return sorted[0] === triple[0] && sorted[1] === triple[1] && sorted[2] === triple[2];
  });
}

export function buildMusicSonificationLevels(
  candidateOverridesByLevel: ReadonlyMap<number, number>,
  hueAngleDeg: number,
): SonificationLevel[] {
  const resolvedCandidateIndices = resolveMusicCandidateIndices(candidateOverridesByLevel, hueAngleDeg);
  return MUSIC_ACTIVE_LEVELS.map((levelIndex) => {
    const candidateIndex = getCandidateIndex(resolvedCandidateIndices, levelIndex, hueAngleDeg);
    const cand = LEVEL_CANDIDATES[levelIndex][candidateIndex];
    return cand
      ? { levelIndex, hueAngleDeg: cand.hueAngleDeg, toneNorm: levelToneNorm(levelIndex) }
      : { levelIndex, hueAngleDeg: 0, toneNorm: 0 };
  });
}

export function buildMusicLevelPreview(candidateOverridesByLevel: ReadonlyMap<number, number>, hueAngleDeg: number): MusicLevelPreview[] {
  const resolvedCandidateIndices = resolveMusicCandidateIndices(candidateOverridesByLevel, hueAngleDeg);
  return LEVEL_INFO.map((info, levelIndex) => {
    const candidates = LEVEL_CANDIDATES[levelIndex];
    const candidateIndex = getCandidateIndex(resolvedCandidateIndices, levelIndex, hueAngleDeg);
    const rgb = candidates[candidateIndex]?.rgb ?? [128, 128, 128];
    return { levelIndex, name: info.name, rgb, hex: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` };
  });
}

export function buildActiveMusicLevels(levelPreview: readonly MusicLevelPreview[]): ActiveMusicLevel[] {
  return levelPreview
    .filter((lp) => lp.levelIndex >= 1 && lp.levelIndex <= 6)
    .map((lp) => ({ levelIndex: lp.levelIndex, rgb: lp.rgb as readonly [number, number, number] }));
}

export function buildMusicHueTicks(): MusicHueTick[] {
  const boundaries = new Set<number>();
  // Complement endpoints represent the same undirected axis, so the actual
  // automatic-section Voronoi diagram lives modulo 180°, not independently
  // inside each level fiber.
  for (let lowerLevelIndex = 1; lowerLevelIndex <= 3; lowerLevelIndex++) {
    const axes = [...new Set(LEVEL_CANDIDATES[lowerLevelIndex].map(({ hueAngleDeg }) => ((hueAngleDeg % 180) + 180) % 180))].sort(
      (a, b) => a - b,
    );
    if (axes.length <= 1) continue;
    for (let index = 0; index < axes.length; index++) {
      const from = axes[index];
      const to = axes[(index + 1) % axes.length];
      const arc = (to - from + 180) % 180;
      const boundary = (from + arc / 2) % 180;
      boundaries.add(boundary);
      boundaries.add(boundary + 180);
    }
  }
  return [...boundaries].sort((a, b) => a - b).map((hueAngleDeg) => ({ hueAngleDeg, color: "rgb(128,128,160)" }));
}
