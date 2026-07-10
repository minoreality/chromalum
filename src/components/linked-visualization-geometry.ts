import { CANONICAL_HUE_ANCHORS, type ChromalumGrb } from "../chromalum-color-model";
import { LEVEL_CANDIDATES, findClosestCandidate, levelToneNorm } from "../color-engine";
import { complementPairScreenUnit, hueScreenUnit } from "../music/music-phase";

export interface LinkedVisualizationDot {
  levelIndex: number;
  candidateIndex: number;
  angleDeg: number;
  chromalumGrb: ChromalumGrb;
  rgb: readonly [number, number, number];
  isActive: boolean;
}

export interface LinkedVisualizationHover {
  levelIndex: number;
  candidateIndex: number;
}

interface LinkedVisualizationPoint {
  x: number;
  y: number;
}

const LINKED_VIZ_LAYOUT = {
  WR: 58,
  WO: 18,
  WCX: 68,
  WCY: 68,
  RING_R: 70,
  GRAPH_GAP: 8,
  RW: 170,
  BH: 170,
} as const;

export const WR = LINKED_VIZ_LAYOUT.WR;
export const WO = LINKED_VIZ_LAYOUT.WO;
export const RW = LINKED_VIZ_LAYOUT.RW;
export const BH = LINKED_VIZ_LAYOUT.BH;
export const CX = WO + LINKED_VIZ_LAYOUT.WCX;
export const CY = WO + LINKED_VIZ_LAYOUT.WCY;
export const RX = CX + LINKED_VIZ_LAYOUT.RING_R + LINKED_VIZ_LAYOUT.GRAPH_GAP;
export const RYtop = CY - WR - 4;
export const RYbot = CY + WR + 4;
export const RH = RYbot - RYtop;
export const BY = CY + LINKED_VIZ_LAYOUT.RING_R + LINKED_VIZ_LAYOUT.GRAPH_GAP;
export const BXleft = CX - WR - 4;
export const BXright = CX + WR + 4;
export const BW = BXright - BXleft;
export const TW = RX + RW + 4;
export const TH = BY + BH + 16;

export const ACTIVE_LEVELS = [1, 2, 3, 4, 5, 6] as const;
export const HUE_LABELS = [
  CANONICAL_HUE_ANCHORS.R,
  CANONICAL_HUE_ANCHORS.Y,
  CANONICAL_HUE_ANCHORS.G,
  CANONICAL_HUE_ANCHORS.C,
  CANONICAL_HUE_ANCHORS.B,
  CANONICAL_HUE_ANCHORS.M,
  360,
] as const;
export const LV_COLORS = ["", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", ""] as const;
export const C2_PAIR: Readonly<Record<number, number>> = { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };

export const toneR0 = (levelIndex: number) => levelToneNorm(levelIndex) * WR;
export const toneR7 = (levelIndex: number) => (1 - levelToneNorm(levelIndex)) * WR;

export function wheelPoint(
  angle: number,
  level: number,
  alpha: number,
  radiusFn: (levelIndex: number) => number,
  cx = CX,
  cy = CY,
): LinkedVisualizationPoint {
  const unit = hueScreenUnit(angle, alpha);
  const r = radiusFn(level);
  return { x: cx + r * unit.x, y: cy + r * unit.y };
}

export function rightProjectionX(angle: number): number {
  return RX + 10 + (angle / 360) * (RW - 14);
}

export function bottomProjectionY(angle: number): number {
  return BY + 8 + (angle / 360) * (BH - 16);
}

export function clampHueFromRightGraphX(x: number): number {
  return Math.max(0, Math.min(360, ((x - RX - 10) / (RW - 14)) * 360));
}

export function clampHueFromBottomGraphY(y: number): number {
  return Math.max(0, Math.min(360, ((y - BY - 8) / (BH - 16)) * 360));
}

export function buildLinkedVisualizationDots(
  hueAngleDeg: number,
  candidateOverridesByLevel?: Map<number, number>,
): LinkedVisualizationDot[] {
  const result: LinkedVisualizationDot[] = [];
  for (let levelIndex = 0; levelIndex < LEVEL_CANDIDATES.length; levelIndex++) {
    for (let candidateIndex = 0; candidateIndex < LEVEL_CANDIDATES[levelIndex].length; candidateIndex++) {
      const candidate = LEVEL_CANDIDATES[levelIndex][candidateIndex];
      if (candidate.hueAngleDeg < 0) continue;
      const activeCandidateIndex = candidateOverridesByLevel?.has(levelIndex)
        ? candidateOverridesByLevel.get(levelIndex)!
        : findClosestCandidate(levelIndex, hueAngleDeg);
      result.push({
        levelIndex,
        candidateIndex,
        angleDeg: candidate.hueAngleDeg,
        chromalumGrb: candidate.chromalumGrb,
        rgb: candidate.rgb,
        isActive: activeCandidateIndex === candidateIndex,
      });
    }
  }
  return result;
}

export function sinePath(level: number, radiusFn: (levelIndex: number) => number, alpha: number): string {
  const r = radiusFn(level);
  if (r < 1) return "";
  const pts: string[] = [];
  for (let h = 0; h <= 360; h += 2) {
    const y = CY + r * hueScreenUnit(h, alpha).y;
    pts.push(`${h === 0 ? "M" : "L"}${rightProjectionX(h).toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

export function cosinePath(level: number, radiusFn: (levelIndex: number) => number, alpha: number): string {
  const r = radiusFn(level);
  if (r < 1) return "";
  const pts: string[] = [];
  for (let h = 0; h <= 360; h += 2) {
    const x = CX + r * hueScreenUnit(h, alpha).x;
    pts.push(`${h === 0 ? "M" : "L"}${x.toFixed(1)},${bottomProjectionY(h).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function compositeSinePath(radius: number, alpha0: number, alpha7: number): string {
  if (radius < 1) return "";
  const pts: string[] = [];
  for (let h = 0; h <= 360; h += 2) {
    const y = CY + radius * complementPairScreenUnit(h, alpha0, alpha7).y;
    pts.push(`${h === 0 ? "M" : "L"}${rightProjectionX(h).toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

export function compositeCosinePath(radius: number, alpha0: number, alpha7: number): string {
  if (radius < 1) return "";
  const pts: string[] = [];
  for (let h = 0; h <= 360; h += 2) {
    const x = CX + radius * complementPairScreenUnit(h, alpha0, alpha7).x;
    pts.push(`${h === 0 ? "M" : "L"}${x.toFixed(1)},${bottomProjectionY(h).toFixed(1)}`);
  }
  return pts.join(" ");
}
