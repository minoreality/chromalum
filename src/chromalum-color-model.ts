/**
 * Exact, device-independent CHROMALUM hue/tone model.
 *
 * Model coordinates never use byte RGB. The canonical tuple order is G, R, B
 * so its components align with the 4:2:1 GRB Binary Tone weights. Each
 * channel uses 0..4 so every 15° tone intersection has integral coordinates.
 */

export const CHROMALUM_GRB_WEIGHTS = { G: 4, R: 2, B: 1 } as const;
export const CHROMALUM_TONE_DENOMINATOR = 7;
export const CHROMALUM_CHANNEL_MAX = 4;

export type ChromalumGrb = readonly [g: number, r: number, b: number];

/** R/G/B are 120° anchors; Y/C/M are the clockwise midpoints. */
export const CANONICAL_HUE_ANCHORS = {
  R: 0,
  Y: 60,
  G: 120,
  C: 180,
  B: 240,
  M: 300,
} as const;

/** Default binary RGB vertex hue for each L0..L7 level; -1 is achromatic. */
export const CANONICAL_VERTEX_HUE_BY_LEVEL = [
  -1,
  CANONICAL_HUE_ANCHORS.B,
  CANONICAL_HUE_ANCHORS.R,
  CANONICAL_HUE_ANCHORS.M,
  CANONICAL_HUE_ANCHORS.G,
  CANONICAL_HUE_ANCHORS.C,
  CANONICAL_HUE_ANCHORS.Y,
  -1,
] as const;

const interpolateHue = (from: number, to: number, fraction: number): number => from + (to - from) * fraction;

/** Exact GRB-level intersections in one clockwise traversal of the hue hexagon. */
export const CANONICAL_HUE_CYCLE = [
  { hueAngleDeg: CANONICAL_HUE_ANCHORS.R, levelIndex: 2 },
  { hueAngleDeg: interpolateHue(CANONICAL_HUE_ANCHORS.R, CANONICAL_HUE_ANCHORS.Y, 1 / 4), levelIndex: 3 },
  { hueAngleDeg: interpolateHue(CANONICAL_HUE_ANCHORS.R, CANONICAL_HUE_ANCHORS.Y, 1 / 2), levelIndex: 4 },
  { hueAngleDeg: interpolateHue(CANONICAL_HUE_ANCHORS.R, CANONICAL_HUE_ANCHORS.Y, 3 / 4), levelIndex: 5 },
  { hueAngleDeg: CANONICAL_HUE_ANCHORS.Y, levelIndex: 6 },
  { hueAngleDeg: interpolateHue(CANONICAL_HUE_ANCHORS.Y, CANONICAL_HUE_ANCHORS.G, 1 / 2), levelIndex: 5 },
  { hueAngleDeg: CANONICAL_HUE_ANCHORS.G, levelIndex: 4 },
  { hueAngleDeg: CANONICAL_HUE_ANCHORS.C, levelIndex: 5 },
  { hueAngleDeg: interpolateHue(CANONICAL_HUE_ANCHORS.C, CANONICAL_HUE_ANCHORS.B, 1 / 4), levelIndex: 4 },
  { hueAngleDeg: interpolateHue(CANONICAL_HUE_ANCHORS.C, CANONICAL_HUE_ANCHORS.B, 1 / 2), levelIndex: 3 },
  { hueAngleDeg: interpolateHue(CANONICAL_HUE_ANCHORS.C, CANONICAL_HUE_ANCHORS.B, 3 / 4), levelIndex: 2 },
  { hueAngleDeg: CANONICAL_HUE_ANCHORS.B, levelIndex: 1 },
  { hueAngleDeg: interpolateHue(CANONICAL_HUE_ANCHORS.B, CANONICAL_HUE_ANCHORS.M, 1 / 2), levelIndex: 2 },
  { hueAngleDeg: CANONICAL_HUE_ANCHORS.M, levelIndex: 3 },
] as const;

/** Canonical hue candidates grouped by their exact GRB Binary Tone level. */
export const CANONICAL_HUE_ANGLES_BY_LEVEL: readonly (readonly number[])[] = Array.from({ length: 8 }, (_, levelIndex) =>
  CANONICAL_HUE_CYCLE.filter((point) => point.levelIndex === levelIndex).map((point) => point.hueAngleDeg),
);

export function hueToChromalumGrb(hueAngleDeg: number): ChromalumGrb {
  const hue = ((hueAngleDeg % 360) + 360) % 360;
  const sector = Math.min(5, Math.floor(hue / 60));
  const variableChannel = ((hue % 60) / 60) * CHROMALUM_CHANNEL_MAX;
  return (
    [
      [variableChannel, CHROMALUM_CHANNEL_MAX, 0],
      [CHROMALUM_CHANNEL_MAX, CHROMALUM_CHANNEL_MAX - variableChannel, 0],
      [CHROMALUM_CHANNEL_MAX, 0, variableChannel],
      [CHROMALUM_CHANNEL_MAX - variableChannel, 0, CHROMALUM_CHANNEL_MAX],
      [0, variableChannel, CHROMALUM_CHANNEL_MAX],
      [0, CHROMALUM_CHANNEL_MAX, CHROMALUM_CHANNEL_MAX - variableChannel],
    ] as ChromalumGrb[]
  )[sector];
}

/** Recover a hue from a coordinate on the exact CHROMALUM hue hexagon. */
export function chromalumGrbToHue([g, r, b]: ChromalumGrb): number {
  if (r === CHROMALUM_CHANNEL_MAX && b === 0) return (g / CHROMALUM_CHANNEL_MAX) * 60;
  if (g === CHROMALUM_CHANNEL_MAX && b === 0) return 120 - (r / CHROMALUM_CHANNEL_MAX) * 60;
  if (g === CHROMALUM_CHANNEL_MAX && r === 0) return 120 + (b / CHROMALUM_CHANNEL_MAX) * 60;
  if (b === CHROMALUM_CHANNEL_MAX && r === 0) return 240 - (g / CHROMALUM_CHANNEL_MAX) * 60;
  if (b === CHROMALUM_CHANNEL_MAX && g === 0) return 240 + (r / CHROMALUM_CHANNEL_MAX) * 60;
  if (r === CHROMALUM_CHANNEL_MAX && g === 0) return 360 - (b / CHROMALUM_CHANNEL_MAX) * 60;
  return -1;
}

/** Exact 4:2:1 GRB level. Canonical hue-cycle intersections return integers 1..6. */
export function chromalumGrbLevel([g, r, b]: ChromalumGrb): number {
  return (CHROMALUM_GRB_WEIGHTS.G * g + CHROMALUM_GRB_WEIGHTS.R * r + CHROMALUM_GRB_WEIGHTS.B * b) / CHROMALUM_CHANNEL_MAX;
}

export function chromalumToneNorm(grb: ChromalumGrb): number {
  return chromalumGrbLevel(grb) / CHROMALUM_TONE_DENOMINATOR;
}
