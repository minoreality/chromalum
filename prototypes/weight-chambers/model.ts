// Standalone prototype: no imports from the application or its state.
// The additive score sigma(S) = sum_{c in S} w_c on A = P({G,R,B}). Weights live on the integer
// lattice w_G + w_R + w_B = N, so every tie and every wall is decided exactly, without rounding.

export const COLORS = [
  { name: "K", hex: "#000000" },
  { name: "B", hex: "#0000ff" },
  { name: "R", hex: "#ff0000" },
  { name: "M", hex: "#ff00ff" },
  { name: "G", hex: "#00ff00" },
  { name: "C", hex: "#00ffff" },
  { name: "Y", hex: "#ffff00" },
  { name: "W", hex: "#ffffff" },
] as const;

// 168 is divisible by 2, 3, 4 and 7: 4:2:1 (96:48:24), the centre (56:56:56) and the walls
// w_i = 84 are all lattice points.
export const N = 168;
export type Weights = readonly [g: number, r: number, b: number];
export const A1_WEIGHTS: Weights = [96, 48, 24];
const PRIMARIES = [
  { name: "G", bit: 4 },
  { name: "R", bit: 2 },
  { name: "B", bit: 1 },
] as const;
type Primary = (typeof PRIMARIES)[number]["name"];
const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7];

export const name = (level: number) => COLORS[level].name;
export const bits = (level: number) => level.toString(2).padStart(3, "0");
export const score = (w: Weights, level: number) => PRIMARIES.reduce((sum, { bit }, i) => (level & bit ? sum + w[i] : sum), 0);

// States in ascending score, ties in ascending level. `rank` counts the states with a strictly
// lower score, so tied states share a rank; `tied[i]` compares order[i] with order[i + 1].
export function ranking(w: Weights) {
  const order = [...LEVELS].sort((x, y) => score(w, x) - score(w, y) || x - y);
  const tied = order.slice(1).map((level, i) => score(w, level) === score(w, order[i]));
  const rank = order.map((level) => LEVELS.filter((other) => score(w, other) < score(w, level)).length);
  return { order, tied, rank, strict: !tied.includes(true) };
}

export const orderText = (order: readonly number[], tied: readonly boolean[]) =>
  order.map((level, i) => (i ? (tied[i - 1] ? "=" : "<") : "") + name(level)).join("");

export const conditions = (w: Weights) => [
  { label: ["w", "B", " > 0"], holds: w[2] > 0 },
  { label: ["w", "R", " > w", "B"], holds: w[1] > w[2] },
  { label: ["w", "G", " > w", "R", " + w", "B"], holds: w[0] > w[1] + w[2] },
];

// Each interior wall is where a linear form in (w_G, w_R, w_B) vanishes. Crossing it swaps exactly
// the pairs whose [G,R,B] bits differ by the form's coefficients.
const bit = (level: number, i: number) => (level >> (2 - i)) & 1;
export const WALLS = [
  { label: ["w", "G", " = w", "R", " + w", "B"], coefficients: [1, -1, -1] },
  { label: ["w", "R", " = w", "G", " + w", "B"], coefficients: [-1, 1, -1] },
  { label: ["w", "B", " = w", "G", " + w", "R"], coefficients: [-1, -1, 1] },
  { label: ["w", "G", " = w", "R"], coefficients: [1, -1, 0] },
  { label: ["w", "G", " = w", "B"], coefficients: [1, 0, -1] },
  { label: ["w", "R", " = w", "B"], coefficients: [0, 1, -1] },
].map((wall) => ({
  ...wall,
  swaps: LEVELS.flatMap((x) => LEVELS.filter((y) => wall.coefficients.every((c, i) => bit(x, i) - bit(y, i) === c)).map((y) => [x, y])),
}));
export const onWall = (w: Weights, coefficients: readonly number[]) => coefficients.reduce((sum, c, i) => sum + c * w[i], 0) === 0;

// The four upper halves a complement-reversed order can have: a cube face "contains p", or majority.
export type Half = Primary | "majority";
export const HALVES: Record<Half, number[]> = {
  G: LEVELS.filter((level) => level & 4),
  R: LEVELS.filter((level) => level & 2),
  B: LEVELS.filter((level) => level & 1),
  majority: LEVELS.filter((level) => bits(level).split("1").length > 2),
};
export function upperHalf(order: readonly number[]): Half | null {
  const upper = [...order.slice(4)].sort();
  return (Object.keys(HALVES) as Half[]).find((half) => HALVES[half].join() === upper.join()) ?? null;
}

// Orders of the eight states that extend inclusion: a state enters only after all its subsets.
function linearExtensions() {
  const out: number[][] = [];
  const walk = (prefix: number[]) => {
    if (prefix.length === 8) return void out.push(prefix);
    for (const level of LEVELS) {
      const ready = LEVELS.every((below) => below === level || (below & level) !== below || prefix.includes(below));
      if (!prefix.includes(level) && ready) walk([...prefix, level]);
    }
  };
  walk([]);
  return out;
}
export const complementReversed = (order: readonly number[]) => order.every((level, i) => order[7 - i] === (level ^ 7));
export const additiveRank = (order: readonly number[]) =>
  LEVELS.every((level) => order.indexOf(level) === PRIMARIES.reduce((sum, { bit }) => (level & bit ? sum + order.indexOf(bit) : sum), 0));
export const isA1 = (order: readonly number[]) => order.every((level, i) => level === i);

const extensions = linearExtensions();
export const FUNNEL = [
  extensions,
  extensions.filter(complementReversed),
  extensions.filter((order) => complementReversed(order) && additiveRank(order)),
  extensions.filter(isA1),
];

// Twelve chambers: each corner triangle (one weight above N/2) is halved by its median, and the
// medial triangle is cut into six by the three medians.
const H = N / 2;
const Q = N / 4;
const T = N / 3;
const edgeMidpoints: Weights[] = [
  [H, H, 0],
  [H, 0, H],
  [0, H, H],
];
const [GR, GB, RB] = edgeMidpoints;
const halfway: Record<Primary, Weights> = { G: [H, Q, Q], R: [Q, H, Q], B: [Q, Q, H] };
const ring = [GR, halfway.G, GB, halfway.B, RB, halfway.R];
const chamberVertices: Weights[][] = [
  [[N, 0, 0], GR, halfway.G],
  [[N, 0, 0], halfway.G, GB],
  [[0, N, 0], GR, halfway.R],
  [[0, N, 0], halfway.R, RB],
  [[0, 0, N], GB, halfway.B],
  [[0, 0, N], halfway.B, RB],
  ...ring.map((point, i): Weights[] => [[T, T, T], point, ring[(i + 1) % ring.length]]),
];
export const CHAMBERS = chamberVertices.map((vertices) => {
  // Three times the centroid: the order is scale-invariant and the sum stays an integer.
  const sum = (i: number) => vertices.reduce((total, v) => total + v[i], 0);
  const order = ranking([sum(0), sum(1), sum(2)]).order;
  return { vertices, order, half: upperHalf(order) };
});

// Rounds barycentric fractions onto the lattice by largest remainder, clamping them into the triangle.
export function snap(fractions: readonly number[]): Weights {
  const clamped = fractions.map((f) => Math.max(0, f));
  const total = clamped.reduce((a, b) => a + b, 0) || 1;
  const scaled = clamped.map((f) => (f / total) * N);
  const floors = scaled.map(Math.floor);
  const byRemainder = [0, 1, 2].sort((i, j) => scaled[j] - floors[j] - (scaled[i] - floors[i]));
  for (let rest = N - floors.reduce((a, b) => a + b, 0), k = 0; rest > 0; rest--, k++) floors[byRemainder[k]]++;
  return [floors[0], floors[1], floors[2]];
}

export function parseWeights(text: string | null): Weights | null {
  const parts = text?.split(",").map(Number) ?? [];
  if (parts.length !== 3 || parts.some((v) => !Number.isInteger(v) || v < 0) || parts[0] + parts[1] + parts[2] !== N) return null;
  return [parts[0], parts[1], parts[2]];
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export const reduced = (w: Weights) => {
  const d = w.reduce(gcd);
  return w.map((v) => v / d);
};
