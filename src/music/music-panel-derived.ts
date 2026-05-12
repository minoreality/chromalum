import { LEVEL_CANDIDATES, LEVEL_INFO, findClosestCandidate } from "../color-engine";
import { FANO_LINES } from "../data/theory-data";
import type { SonificationLevel } from "./music-audio-graph";
import { MUSIC_ACTIVE_LEVELS, type ActiveMusicLevel, type MusicHueTick, type MusicLevelPreview } from "./types";

function getCandidateIndex(directCandidates: ReadonlyMap<number, number>, lv: number, hueAngle: number): number {
  return directCandidates.has(lv) ? directCandidates.get(lv)! : findClosestCandidate(lv, hueAngle);
}

export function findMusicFanoLine(a: number, b: number): number {
  const c = a ^ b;
  const triple = [a, b, c].sort((x, y) => x - y);
  return FANO_LINES.findIndex((line) => {
    const sorted = [...line].sort((x, y) => x - y);
    return sorted[0] === triple[0] && sorted[1] === triple[1] && sorted[2] === triple[2];
  });
}

export function buildMusicSonificationLevels(directCandidates: ReadonlyMap<number, number>, hueAngle: number): SonificationLevel[] {
  return MUSIC_ACTIVE_LEVELS.map((lv) => {
    const ci = getCandidateIndex(directCandidates, lv, hueAngle);
    const cand = LEVEL_CANDIDATES[lv][ci];
    return cand ? { lv, angle: cand.angle, gray: LEVEL_INFO[lv].gray } : { lv, angle: 0, gray: 0 };
  });
}

export function buildMusicLevelPreview(directCandidates: ReadonlyMap<number, number>, hueAngle: number): MusicLevelPreview[] {
  return LEVEL_INFO.map((info, lv) => {
    const candidates = LEVEL_CANDIDATES[lv];
    const ci = getCandidateIndex(directCandidates, lv, hueAngle);
    const rgb = candidates[ci]?.rgb ?? [128, 128, 128];
    return { lv, name: info.name, rgb, hex: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` };
  });
}

export function buildActiveMusicLevels(levelPreview: readonly MusicLevelPreview[]): ActiveMusicLevel[] {
  return levelPreview
    .filter((lp) => lp.lv >= 1 && lp.lv <= 6)
    .map((lp) => ({ lv: lp.lv, rgb: lp.rgb as readonly [number, number, number] }));
}

export function buildMusicHueTicks(): MusicHueTick[] {
  const ticks: MusicHueTick[] = [];
  for (let lv = 2; lv <= 5; lv++) {
    const cands = LEVEL_CANDIDATES[lv];
    if (cands.length <= 1 || cands[0].angle < 0) continue;
    const angles = cands.map((c) => c.angle).sort((a, b) => a - b);
    for (let i = 0; i < angles.length; i++) {
      const a1 = angles[i];
      const a2 = angles[(i + 1) % angles.length];
      const diff = (a2 - a1 + 360) % 360;
      const mid = (a1 + diff / 2) % 360;
      ticks.push({ deg: mid, color: `rgb(${cands[0].rgb.join(",")})` });
    }
  }
  return ticks;
}
