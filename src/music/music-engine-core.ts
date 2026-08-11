import { COMPLEMENT_EDGES, CUBE_EDGES, FANO_LINES, STELLA_EDGES } from "../data/theory-data";
import { fanoLinesThrough, GRB_TONE_VALUES } from "../data/music-data";

export const PARITY_GROUPS: readonly (readonly number[])[] = [
  [1, 3, 5, 7],
  [2, 3, 6, 7],
  [4, 5, 6, 7],
] as const;
export const ALL_POINTS = [1, 2, 3, 4, 5, 6, 7] as const;
export const FULL_GRAY_CODE = [0, 1, 3, 2, 6, 7, 5, 4] as const;

/** Shared GRB Binary Tone values per chromatic level (L1-L6). */
export const GRB_TONE_BY_LEVEL: Readonly<Record<number, number>> = GRB_TONE_VALUES;
export const MAX_GRB_TONE = Math.max(...Object.values(GRB_TONE_BY_LEVEL));

/** GL(3,2) generators operating on {1..7} via bit manipulation */
// Gen A: [G,R,B] -> [B,G,R] (cyclic coordinate rotation)
export function gl32GenA(lv: number): number {
  const g = (lv >> 2) & 1,
    r = (lv >> 1) & 1,
    b = lv & 1;
  return (b << 2) | (g << 1) | r;
}

// Gen B: [G,R,B] -> [G,B,R] (swap R and B)
export function gl32GenB(lv: number): number {
  const g = (lv >> 2) & 1,
    r = (lv >> 1) & 1,
    b = lv & 1;
  return (g << 2) | (b << 1) | r;
}

// Gen C: [G,R,B] -> [G,R,R xor B] (true linear mix, not a channel permutation)
export function gl32GenC(lv: number): number {
  const g = (lv >> 2) & 1,
    r = (lv >> 1) & 1,
    b = lv & 1;
  return (g << 2) | (r << 1) | (r ^ b);
}

export type Gl32Generator = "A" | "B" | "C";

/** Full UI/audio permutation indexed by the source level. Black stays fixed. */
export const GL32_IDENTITY_PERMUTATION = [0, 1, 2, 3, 4, 5, 6, 7] as const;

/** Compose a generator after the current seven-point permutation. */
export function composeGl32Permutation(current: readonly number[], generator: Gl32Generator): number[] {
  const generatorFn = generator === "A" ? gl32GenA : generator === "B" ? gl32GenB : gl32GenC;
  return GL32_IDENTITY_PERMUTATION.map((sourceLevel) => {
    if (sourceLevel === 0) return 0;
    return generatorFn(current[sourceLevel] ?? sourceLevel);
  });
}

/**
 * 3-voice frequencies for Gray code decomposition. bit0=B, bit1=R, bit2=G.
 * Ratio 330:440:550 = 3:4:5, an inversion of the just-intonation A-major 4:5:6 triad (E4, A4, C#5).
 */
export const GRAY_VOICE_FREQS = [550, 440, 330] as const;

export const AND_TRIADS: readonly (readonly [number, number, number])[] = [
  [3, 5, 1],
  [5, 6, 4],
  [6, 3, 2],
];
export const K8_LAYER_EDGES = {
  1: CUBE_EDGES,
  2: STELLA_EDGES,
  3: COMPLEMENT_EDGES,
} as const;

/** Normalized tone -> frequency (distinct from angleToFreq: sonifies complement tone symmetry). */
export function toneToFreq(toneNorm: number): number {
  return 220 + Math.max(0, Math.min(1, toneNorm)) * 660; // 220-880 Hz linear
}

/** Lines through a Fano point */
export function linesThrough(p: number): number[] {
  return fanoLinesThrough(p);
}

/** [8,4,4] extended Hamming codewords (sorted by weight) */
export function extendedHammingCodewords(): { positions: number[]; weight: number }[] {
  const codewords: { positions: number[]; weight: number }[] = [];
  codewords.push({ positions: [], weight: 0 });
  // w=4: Fano lines + Black
  for (const line of FANO_LINES) {
    codewords.push({ positions: [0, ...line], weight: 4 });
  }
  // w=4: complements of Fano lines (no Black)
  for (const line of FANO_LINES) {
    const lineSet = new Set(line);
    codewords.push({ positions: ALL_POINTS.filter((lv) => !lineSet.has(lv)), weight: 4 });
  }
  codewords.push({ positions: [0, ...ALL_POINTS], weight: 8 });
  return codewords;
}
