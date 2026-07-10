import {
  CANONICAL_HUE_ANGLES_BY_LEVEL,
  CANONICAL_VERTEX_HUE_BY_LEVEL,
  CHROMALUM_CHANNEL_MAX,
  CHROMALUM_GRB_WEIGHTS,
  CHROMALUM_TONE_DENOMINATOR,
  hueToChromalumGrb,
  type ChromalumGrb,
} from "./chromalum-color-model";

/* ═══════════════════════════════════════════
   COLOR ENGINE
   8-level pure-color mapping using the GRB Binary Tone model.

   The canonical CHROMALUM tone is the normalized 4:2:1 GRB level:
     level = 4G + 2R + B
     tone = level / 7

   8-bit tone values are derived only for Canvas, PNG, and image I/O.
   ═══════════════════════════════════════════ */
export const GRB_TONE_R = CHROMALUM_GRB_WEIGHTS.R / CHROMALUM_TONE_DENOMINATOR,
  GRB_TONE_G = CHROMALUM_GRB_WEIGHTS.G / CHROMALUM_TONE_DENOMINATOR,
  GRB_TONE_B = CHROMALUM_GRB_WEIGHTS.B / CHROMALUM_TONE_DENOMINATOR;

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
}

export const levelToneNorm = (level: number): number => clamp01(level / 7);
export const levelTone8 = (level: number): number => Math.round(255 * levelToneNorm(level));
export const rgbGrbToneNorm = (r: number, g: number, b: number): number =>
  GRB_TONE_R * clamp01(r / 255) + GRB_TONE_G * clamp01(g / 255) + GRB_TONE_B * clamp01(b / 255);
export const rgbGrbTone8 = (r: number, g: number, b: number): number => Math.round(255 * rgbGrbToneNorm(r, g, b));

interface LevelInfo {
  readonly name: string;
  readonly gray8: number;
}

export const LEVEL_INFO: readonly LevelInfo[] = ["Black", "Blue", "Red", "Magenta", "Green", "Cyan", "Yellow", "White"].map((name, i) => ({
  name,
  gray8: levelTone8(i),
}));

/** Canvas/PNG adapter. Device bytes are not used to recover model coordinates. */
export function chromalumGrbToRgb8([g, r, b]: ChromalumGrb): [number, number, number] {
  const toByte = (channel: number) => Math.round(255 * clamp01(channel / CHROMALUM_CHANNEL_MAX));
  return [toByte(r), toByte(g), toByte(b)];
}

/** Convenience display adapter for arbitrary CHROMALUM hue angles. */
export function hue2rgb(h: number): [number, number, number] {
  return chromalumGrbToRgb8(hueToChromalumGrb(h));
}

export interface ColorCandidate {
  readonly hueAngleDeg: number;
  readonly chromalumGrb: ChromalumGrb;
  /** 8-bit display/output projection; never the source of hue or tone. */
  readonly rgb: readonly [number, number, number];
  readonly hueLabel: string;
}

export const LEVEL_CANDIDATES: readonly (readonly ColorCandidate[])[] = LEVEL_INFO.map((_, i) => {
  if (i === 0) return [{ hueAngleDeg: -1, chromalumGrb: [0, 0, 0], rgb: [0, 0, 0], hueLabel: "—" }];
  if (i === 7)
    return [
      {
        hueAngleDeg: -1,
        chromalumGrb: [CHROMALUM_CHANNEL_MAX, CHROMALUM_CHANNEL_MAX, CHROMALUM_CHANNEL_MAX],
        rgb: [255, 255, 255],
        hueLabel: "—",
      },
    ];
  return CANONICAL_HUE_ANGLES_BY_LEVEL[i].map((hueAngleDeg) => {
    const chromalumGrb = hueToChromalumGrb(hueAngleDeg);
    return {
      hueAngleDeg,
      chromalumGrb,
      rgb: chromalumGrbToRgb8(chromalumGrb),
      hueLabel: hueAngleDeg + "°",
    };
  });
});

export const DEFAULT_CANDIDATE_INDEX_BY_LEVEL: readonly number[] = LEVEL_CANDIDATES.map((alts, i) => {
  const canonicalIndex = alts.findIndex((candidate) => candidate.hueAngleDeg === CANONICAL_VERTEX_HUE_BY_LEVEL[i]);
  return canonicalIndex < 0 ? 0 : canonicalIndex;
});

function buildGrayLut(): Uint8Array {
  const lut = new Uint8Array(256);
  for (let g = 0; g < 256; g++) {
    let best = 0,
      bestDist = Infinity;
    for (let i = 0; i < 8; i++) {
      const d = Math.abs(g - LEVEL_INFO[i].gray8);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    lut[g] = best;
  }
  return lut;
}

export const GRAY_LUT = buildGrayLut();

export function buildColorLUT(candidateIndexByLevel: readonly number[]): [number, number, number][] {
  return LEVEL_CANDIDATES.map((alts, lv) => {
    const raw = lv < candidateIndexByLevel.length ? candidateIndexByLevel[lv] : 0;
    const ci = alts.length > 0 ? ((raw % alts.length) + alts.length) % alts.length : 0;
    const rgb = alts[ci]?.rgb ?? ([128, 128, 128] as [number, number, number]);
    return [rgb[0], rgb[1], rgb[2]];
  });
}

/** Pre-computed lookup table: CANDIDATE_LUT[level][degree] → candidate index */
const CANDIDATE_LUT: number[][] = LEVEL_CANDIDATES.map((cands, levelIndex) => {
  if (cands.length <= 1 || cands[0].hueAngleDeg < 0) return Array(360).fill(0);
  const defaultCandidateIndex = DEFAULT_CANDIDATE_INDEX_BY_LEVEL[levelIndex] ?? 0;
  return Array.from({ length: 360 }, (_, deg) => {
    let best = 0,
      bestDist = Infinity;
    for (let i = 0; i < cands.length; i++) {
      const diff = Math.abs(cands[i].hueAngleDeg - deg);
      const d = Math.min(diff, 360 - diff);
      // Exact model coordinates create midpoint ties. Prefer the level's
      // canonical hue anchor for deterministic boundary selection.
      if (d < bestDist || (d === bestDist && i === defaultCandidateIndex)) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  });
});

/** Find the candidate index in LEVEL_CANDIDATES[level] closest to the given hue angle. O(1) lookup. */
export function findClosestCandidate(level: number, hueAngleDeg: number): number {
  return CANDIDATE_LUT[level][Math.round(((hueAngleDeg % 360) + 360) % 360) % 360];
}
