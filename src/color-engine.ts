/* ═══════════════════════════════════════════
   COLOR ENGINE
   8-level pure-color mapping using the GRB Binary Tone model.

   The canonical CHROMALUM tone is the normalized 4:2:1 GRB level:
     level = 4G + 2R + B
     tone = level / 7

   8-bit tone values are derived only for Canvas, PNG, and image I/O.
   ═══════════════════════════════════════════ */
export const GRB_TONE_R = 2 / 7,
  GRB_TONE_G = 4 / 7,
  GRB_TONE_B = 1 / 7;

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
}

export const levelToneNorm = (level: number): number => clamp01(level / 7);
export const levelTone8 = (level: number): number => Math.round(255 * levelToneNorm(level));
export const rgbGrbToneNorm = (r: number, g: number, b: number): number =>
  GRB_TONE_R * clamp01(r / 255) + GRB_TONE_G * clamp01(g / 255) + GRB_TONE_B * clamp01(b / 255);
export const rgbGrbTone8 = (r: number, g: number, b: number): number => Math.round(255 * rgbGrbToneNorm(r, g, b));

const EIGHT_LEVEL_TONE_TARGETS = Array.from({ length: 8 }, (_, level) => 255 * levelToneNorm(level));

interface LevelInfo {
  readonly name: string;
  readonly gray: number;
}

export const LEVEL_INFO: readonly LevelInfo[] = ["Black", "Blue", "Red", "Magenta", "Green", "Cyan", "Yellow", "White"].map((name, i) => ({
  name,
  gray: levelTone8(i),
}));

export function hue2rgb(h: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const s = Math.min(5, Math.floor(h / 60)),
    f = (h % 60) / 60;
  return (
    [
      [255, Math.round(255 * f), 0],
      [Math.round(255 * (1 - f)), 255, 0],
      [0, 255, Math.round(255 * f)],
      [0, Math.round(255 * (1 - f)), 255],
      [Math.round(255 * f), 0, 255],
      [255, 0, Math.round(255 * (1 - f))],
    ] as [number, number, number][]
  )[s];
}

/**
 * Convert a pure RGB color to its hue angle (0–360).
 * PRECONDITION: the color must be "pure" — exactly one channel is 255
 * and exactly one channel is 0. For non-pure colors (e.g. grays or
 * desaturated values) the result is 0, which is intentional since
 * this function is only used via findPure() / LEVEL_CANDIDATES.
 */
export function rgb2hue(r: number, g: number, b: number): number {
  if (r === 255 && b === 0) return (g / 255) * 60;
  if (g === 255 && b === 0) return 120 - (r / 255) * 60;
  if (g === 255 && r === 0) return 120 + (b / 255) * 60;
  if (b === 255 && r === 0) return 240 - (g / 255) * 60;
  if (b === 255 && g === 0) return 240 + (r / 255) * 60;
  if (r === 255 && g === 0) return 360 - (b / 255) * 60;
  return 0;
}

/**
 * Minimum RGB Manhattan distance (|Δr|+|Δg|+|Δb|) to treat two
 * candidates as distinct colors. Rounding in solve() can produce
 * nearly-identical colors from different formulas; 8 filters those
 * out while keeping perceptually different hues.
 */
const PURE_DUPL_THRESHOLD = 8;

interface ColorCandidate {
  readonly hueAngleDeg: number;
  readonly rgb: readonly [number, number, number];
  readonly hueLabel: string;
}

function findPure(target: number): ColorCandidate[] {
  if (target <= 0 || target >= 255) return [];
  const formulas = [
    { solve: (L: number) => (L - 255 * GRB_TONE_R) / GRB_TONE_G, make: (v: number): [number, number, number] => [255, v, 0] },
    { solve: (L: number) => (L - 255 * GRB_TONE_G) / GRB_TONE_R, make: (v: number): [number, number, number] => [v, 255, 0] },
    { solve: (L: number) => (L - 255 * GRB_TONE_G) / GRB_TONE_B, make: (v: number): [number, number, number] => [0, 255, v] },
    { solve: (L: number) => (L - 255 * GRB_TONE_B) / GRB_TONE_G, make: (v: number): [number, number, number] => [0, v, 255] },
    { solve: (L: number) => (L - 255 * GRB_TONE_B) / GRB_TONE_R, make: (v: number): [number, number, number] => [v, 0, 255] },
    { solve: (L: number) => (L - 255 * GRB_TONE_R) / GRB_TONE_B, make: (v: number): [number, number, number] => [255, 0, v] },
  ];
  const results: ColorCandidate[] = [];
  for (const f of formulas) {
    const v = Math.round(f.solve(target));
    if (v < 0 || v > 255) continue;
    const c = f.make(v);
    if (Math.max(...c) !== 255 || Math.min(...c) !== 0) continue;
    if (
      results.some(
        (prev) => Math.abs(prev.rgb[0] - c[0]) + Math.abs(prev.rgb[1] - c[1]) + Math.abs(prev.rgb[2] - c[2]) < PURE_DUPL_THRESHOLD,
      )
    )
      continue;
    const angle = rgb2hue(...c);
    results.push({ hueAngleDeg: angle, rgb: c, hueLabel: Math.round(angle) + "°" });
  }
  return results.sort((a, b) => a.hueAngleDeg - b.hueAngleDeg);
}

const CANONICAL_COLORS: readonly (readonly [number, number, number])[] = [
  [0, 0, 0],
  [0, 0, 255],
  [255, 0, 0],
  [255, 0, 255],
  [0, 255, 0],
  [0, 255, 255],
  [255, 255, 0],
  [255, 255, 255],
];

export const LEVEL_CANDIDATES: readonly (readonly ColorCandidate[])[] = LEVEL_INFO.map((_, i) => {
  if (i === 0) return [{ hueAngleDeg: -1, rgb: [0, 0, 0] as const, hueLabel: "—" }];
  if (i === 7) return [{ hueAngleDeg: -1, rgb: [255, 255, 255] as const, hueLabel: "—" }];
  const a = findPure(EIGHT_LEVEL_TONE_TARGETS[i]);
  if (!a.length) {
    // Fallback for levels with no pure-color solution (should not occur with GRB tone weights)
    return [{ hueAngleDeg: -1, rgb: [128, 128, 128] as const, hueLabel: "?" }];
  }
  // Sort by hue angle ascending (0°→360°)
  return a.sort((x, y) => x.hueAngleDeg - y.hueAngleDeg);
});

export const DEFAULT_CANDIDATE_INDEX_BY_LEVEL: readonly number[] = LEVEL_CANDIDATES.map((alts, i) => {
  let best = 0,
    bestDist = Infinity;
  alts.forEach((x, j) => {
    const d =
      Math.abs(x.rgb[0] - CANONICAL_COLORS[i][0]) +
      Math.abs(x.rgb[1] - CANONICAL_COLORS[i][1]) +
      Math.abs(x.rgb[2] - CANONICAL_COLORS[i][2]);
    if (d < bestDist) {
      bestDist = d;
      best = j;
    }
  });
  return best;
});

function buildGrayLut(): Uint8Array {
  const lut = new Uint8Array(256);
  for (let g = 0; g < 256; g++) {
    let best = 0,
      bestDist = Infinity;
    for (let i = 0; i < 8; i++) {
      const d = Math.abs(g - LEVEL_INFO[i].gray);
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
const CANDIDATE_LUT: number[][] = LEVEL_CANDIDATES.map((cands) => {
  if (cands.length <= 1 || cands[0].hueAngleDeg < 0) return Array(360).fill(0);
  return Array.from({ length: 360 }, (_, deg) => {
    let best = 0,
      bestDist = Infinity;
    for (let i = 0; i < cands.length; i++) {
      const diff = Math.abs(cands[i].hueAngleDeg - deg);
      const d = Math.min(diff, 360 - diff);
      if (d < bestDist) {
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
