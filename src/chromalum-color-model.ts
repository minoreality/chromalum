/**
 * Exact CHROMALUM hue/tone coordinate model.
 *
 * The discrete rank joins two independent structures: the unique gapless
 * three-atom subset-sum weights {1,2,4}, and the named order G,R,B selected by
 * the brightness rank of the binary RGB vertices. Independently, the
 * chromatic vertices form an unrooted, unoriented six-cycle whose edges flip
 * one channel at a time, with cyclic labels in the dihedral class of
 * (G,R,B)^2. That class contains all six channel permutations, so it does not
 * select bit priority. A root and direction are chosen only to parameterize
 * canonical hue angles and Music. Model coordinates never use byte RGB values.
 */

const CHROMALUM_CHANNELS = ["G", "R", "B"] as const;
export type ChromalumChannel = (typeof CHROMALUM_CHANNELS)[number];
type BinaryChannel = 0 | 1;
type BinaryGrb = readonly [g: BinaryChannel, r: BinaryChannel, b: BinaryChannel];

function enumerateBinaryGrb(): readonly BinaryGrb[] {
  const vertices: BinaryGrb[] = [];
  for (const g of [0, 1] as const) {
    for (const r of [0, 1] as const) {
      for (const b of [0, 1] as const) vertices.push([g, r, b]);
    }
  }
  return vertices;
}

const BINARY_GRB_VERTICES = enumerateBinaryGrb();
const CHROMATIC_BINARY_GRB_VERTICES = BINARY_GRB_VERTICES.filter(([g, r, b]) => !(g === r && r === b));
const CHROMALUM_HUE_ROOT: BinaryGrb = [0, 1, 0];
const CHROMALUM_HUE_ORIENTED_NEIGHBOR: BinaryGrb = [1, 1, 0];

function equalBinaryGrb(a: BinaryGrb, b: BinaryGrb): boolean {
  return a.every((channel, index) => channel === b[index]);
}

function hammingDistance(a: BinaryGrb, b: BinaryGrb): number {
  return a.reduce<number>((distance, channel, index) => distance + Number(channel !== b[index]), 0);
}

function buildRootedChromaticBinaryCycle(): readonly BinaryGrb[] {
  const cycle: BinaryGrb[] = [];
  let previous: BinaryGrb | undefined;
  let current = CHROMALUM_HUE_ROOT;

  for (let index = 0; index < CHROMATIC_BINARY_GRB_VERTICES.length; index++) {
    cycle.push(current);
    const neighbors = CHROMATIC_BINARY_GRB_VERTICES.filter((candidate) => hammingDistance(current, candidate) === 1);
    const next =
      index === 0
        ? neighbors.find((candidate) => equalBinaryGrb(candidate, CHROMALUM_HUE_ORIENTED_NEIGHBOR))
        : neighbors.find((candidate) => !equalBinaryGrb(candidate, previous!));
    if (!next) throw new Error("Invalid rooted orientation for the chromatic six-cycle");
    previous = current;
    current = next;
  }

  if (!equalBinaryGrb(current, CHROMALUM_HUE_ROOT)) throw new Error("Chromatic traversal did not close");
  return cycle;
}

function changedChannel(from: BinaryGrb, to: BinaryGrb): ChromalumChannel {
  const changedIndex = from.findIndex((channel, index) => channel !== to[index]);
  if (changedIndex < 0) throw new Error("Chromatic edge must toggle exactly one channel");
  return CHROMALUM_CHANNELS[changedIndex];
}

const CHROMATIC_BINARY_GRB_CYCLE = buildRootedChromaticBinaryCycle();

/** One R-rooted, Y-oriented representative of the six-cycle's edge labels. */
export const CHROMALUM_HUE_TOGGLE_CYCLE: readonly ChromalumChannel[] = CHROMATIC_BINARY_GRB_CYCLE.map((vertex, index) =>
  changedChannel(vertex, CHROMATIC_BINARY_GRB_CYCLE[(index + 1) % CHROMATIC_BINARY_GRB_CYCLE.length]),
);

/** Named bit significance recorded by the binary-vertex brightness rank. */
export const CHROMALUM_ORDERED_FRAME: readonly ChromalumChannel[] = CHROMALUM_CHANNELS;

function deriveGaplessRankWeights(frame: readonly ChromalumChannel[]): Readonly<Record<ChromalumChannel, number>> {
  return Object.freeze(
    Object.fromEntries(frame.map((channel, index) => [channel, 2 ** (frame.length - index - 1)])) as Record<ChromalumChannel, number>,
  );
}

/** Minimal positive additive weights whose eight subset sums fill 0..7 exactly once. */
export const CHROMALUM_GRB_WEIGHTS = deriveGaplessRankWeights(CHROMALUM_ORDERED_FRAME);
export const CHROMALUM_TONE_DENOMINATOR = Object.values(CHROMALUM_GRB_WEIGHTS).reduce((sum, weight) => sum + weight, 0);

/**
 * The largest place value is also the smallest common channel scale on which
 * every integer-level crossing of a 60° hue edge has integral coordinates.
 */
export const CHROMALUM_CHANNEL_MAX = Math.max(...Object.values(CHROMALUM_GRB_WEIGHTS));
export const CHROMALUM_MIN_HUE_STEP_DEG = 60 / CHROMALUM_CHANNEL_MAX;

export type ChromalumGrb = readonly [g: number, r: number, b: number];

export const CHROMALUM_LEVEL_LABELS = ["K", "B", "R", "M", "G", "C", "Y", "W"] as const;
export const CHROMALUM_LEVEL_NAMES = ["Black", "Blue", "Red", "Magenta", "Green", "Cyan", "Yellow", "White"] as const;
export const CHROMALUM_LEVEL_HEX = ["#000000", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", "#ffffff"] as const;
export const CHROMALUM_LEVEL_BITS: readonly ChromalumGrb[] = Array.from({ length: 8 }, (_, level) => {
  const bits = BINARY_GRB_VERTICES.find(
    ([g, r, b]) => CHROMALUM_GRB_WEIGHTS.G * g + CHROMALUM_GRB_WEIGHTS.R * r + CHROMALUM_GRB_WEIGHTS.B * b === level,
  );
  if (!bits) throw new Error(`Missing binary GRB vertex for level ${level}`);
  return bits;
});

/** R→Y→G→C→B→M, obtained by successively applying G,R,B,G,R,B toggles. */
export const CANONICAL_CHROMATIC_LEVEL_CYCLE: readonly number[] = CHROMATIC_BINARY_GRB_CYCLE.map(
  ([g, r, b]) => CHROMALUM_GRB_WEIGHTS.G * g + CHROMALUM_GRB_WEIGHTS.R * r + CHROMALUM_GRB_WEIGHTS.B * b,
);

type ChromaticLabel = "R" | "Y" | "G" | "C" | "B" | "M";

/** R/G/B are 120° anchors; Y/C/M are the intervening vertices. */
export const CANONICAL_HUE_ANCHORS = Object.freeze(
  Object.fromEntries(CANONICAL_CHROMATIC_LEVEL_CYCLE.map((level, index) => [CHROMALUM_LEVEL_LABELS[level], index * 60])) as Record<
    ChromaticLabel,
    number
  >,
);

/** Default binary RGB vertex hue for each L0..L7 level; -1 is achromatic. */
export const CANONICAL_VERTEX_HUE_BY_LEVEL: readonly number[] = Array.from({ length: 8 }, (_, level) => {
  const index = CANONICAL_CHROMATIC_LEVEL_CYCLE.indexOf(level);
  return index < 0 ? -1 : index * 60;
});

function integerLevelsBetween(from: number, to: number): readonly number[] {
  const direction = Math.sign(to - from);
  const levels: number[] = [];
  for (let level = from + direction; level !== to; level += direction) levels.push(level);
  return levels;
}

export interface CanonicalHueEdge {
  readonly fromVertexIndex: number;
  readonly toVertexIndex: number;
  readonly fromLevel: number;
  readonly toLevel: number;
  readonly fromHueAngleDeg: number;
  readonly toHueAngleDeg: number;
  readonly interiorLevels: readonly number[];
}

/** Six affine edges of the rooted, oriented pure-hue loop. */
export const CANONICAL_HUE_EDGES: readonly CanonicalHueEdge[] = CANONICAL_CHROMATIC_LEVEL_CYCLE.map((fromLevel, fromVertexIndex) => {
  const toVertexIndex = (fromVertexIndex + 1) % CANONICAL_CHROMATIC_LEVEL_CYCLE.length;
  const toLevel = CANONICAL_CHROMATIC_LEVEL_CYCLE[toVertexIndex];
  return {
    fromVertexIndex,
    toVertexIndex,
    fromLevel,
    toLevel,
    fromHueAngleDeg: fromVertexIndex * 60,
    toHueAngleDeg: (fromVertexIndex + 1) * 60,
    interiorLevels: integerLevelsBetween(fromLevel, toLevel),
  };
});

export interface CanonicalHuePoint {
  readonly hueAngleDeg: number;
  readonly levelIndex: number;
}

/** Exact integer-level intersections in one traversal of the pure-hue loop. */
export const CANONICAL_HUE_CYCLE: readonly CanonicalHuePoint[] = CANONICAL_HUE_EDGES.flatMap((edge) => {
  const levelDelta = edge.toLevel - edge.fromLevel;
  return [
    { hueAngleDeg: edge.fromHueAngleDeg, levelIndex: edge.fromLevel },
    ...edge.interiorLevels.map((levelIndex) => ({
      hueAngleDeg: edge.fromHueAngleDeg + ((levelIndex - edge.fromLevel) / levelDelta) * 60,
      levelIndex,
    })),
  ];
});

/** Canonical hue candidates grouped by their exact GRB Binary Tone level. */
export const CANONICAL_HUE_ANGLES_BY_LEVEL: readonly (readonly number[])[] = Array.from({ length: 8 }, (_, levelIndex) =>
  CANONICAL_HUE_CYCLE.filter((point) => point.levelIndex === levelIndex).map((point) => point.hueAngleDeg),
);

/** D0={K}, D7={W}; the other fibers are the integer-level intersections on H. */
export const CHROMALUM_CANDIDATE_COUNT_BY_LEVEL: readonly number[] = CANONICAL_HUE_ANGLES_BY_LEVEL.map((angles, level) =>
  level === 0 || level === CHROMALUM_TONE_DENOMINATOR ? 1 : angles.length,
);
export const CHROMALUM_CANDIDATE_TOTAL = CHROMALUM_CANDIDATE_COUNT_BY_LEVEL.reduce((product, count) => product + count, 0);
export const CHROMALUM_PALETTE_SECTION_COUNT = CHROMALUM_CANDIDATE_COUNT_BY_LEVEL.reduce((product, count) => product * count, 1);
export const CHROMALUM_COMPLEMENT_SECTION_COUNT = [1, 2, 3].reduce(
  (product, level) => product * CHROMALUM_CANDIDATE_COUNT_BY_LEVEL[level],
  1,
);

export const CHROMALUM_TONE_VALUES: readonly number[] = Array.from(
  { length: CHROMALUM_TONE_DENOMINATOR + 1 },
  (_, level) => level / CHROMALUM_TONE_DENOMINATOR,
);
export const CHROMALUM_CHROMATIC_COMPLEMENT_PAIRS: readonly (readonly [number, number])[] = [1, 2, 3].map((level) => [
  level,
  CHROMALUM_TONE_DENOMINATOR - level,
]);

/** 2(4+2+1)=14: also the number of integer-level intersections on H. */
export const CHROMALUM_HUE_LEVEL_TOTAL_VARIATION = CANONICAL_HUE_EDGES.reduce(
  (sum, edge) => sum + Math.abs(edge.toLevel - edge.fromLevel),
  0,
);
export const CHROMALUM_HUE_EDGE_LEVEL_DELTAS: readonly number[] = CANONICAL_HUE_EDGES.map((edge) => edge.toLevel - edge.fromLevel);

/** The 14 crossings plus the closing R point at 360°, used by the Music traversal. */
export const CHROMALUM_TONE_CROSSING_SEQUENCE = [
  ...CANONICAL_HUE_CYCLE,
  { hueAngleDeg: 360, levelIndex: CANONICAL_CHROMATIC_LEVEL_CYCLE[0] },
].map(({ hueAngleDeg, levelIndex }) => ({
  angleDeg: hueAngleDeg,
  semitone: hueAngleDeg / CHROMALUM_MIN_HUE_STEP_DEG,
  lv: levelIndex,
}));

export function hueToChromalumGrb(hueAngleDeg: number): ChromalumGrb {
  const hue = ((hueAngleDeg % 360) + 360) % 360;
  const sector = Math.min(5, Math.floor(hue / 60));
  const t = (hue % 60) / 60;
  const fromLevel = CANONICAL_CHROMATIC_LEVEL_CYCLE[sector];
  const toLevel = CANONICAL_CHROMATIC_LEVEL_CYCLE[(sector + 1) % CANONICAL_CHROMATIC_LEVEL_CYCLE.length];
  const from = CHROMALUM_LEVEL_BITS[fromLevel];
  const to = CHROMALUM_LEVEL_BITS[toLevel];
  return from.map((channel, index) => ((1 - t) * channel + t * to[index]) * CHROMALUM_CHANNEL_MAX) as unknown as ChromalumGrb;
}

/** Recover a hue from a coordinate on the exact CHROMALUM pure-hue loop. */
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
