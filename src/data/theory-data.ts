/* ═══════════════════════════════════════════
   THEORY TAB — SHARED DATA & GEOMETRY
   ═══════════════════════════════════════════ */

import {
  CANONICAL_CHROMATIC_LEVEL_CYCLE,
  CHROMALUM_GRB_WEIGHTS,
  CHROMALUM_HUE_TOGGLE_CYCLE,
  CHROMALUM_LEVEL_BITS,
  CHROMALUM_LEVEL_HEX,
  CHROMALUM_LEVEL_LABELS,
  CHROMALUM_LEVEL_NAMES,
} from "../chromalum-color-model";
import { HAMMING_POSITION_ROLES } from "./hamming-data";

interface TheoryLevel {
  readonly lv: number;
  readonly name: string;
  readonly short: string; // single-letter abbreviation (K for Black to avoid clash with Blue's B)
  readonly bits: readonly [number, number, number]; // [G, R, B]
  readonly color: string;
  readonly hamming: string; // P1/P2/P4 for parity, D1-D4 for data, "—" for 0/7
}

const HAMMING_POSITION_LABELS = ["—", ...HAMMING_POSITION_ROLES] as const;

export const THEORY_LEVELS: readonly TheoryLevel[] = CHROMALUM_LEVEL_LABELS.map((short, lv) => ({
  lv,
  name: CHROMALUM_LEVEL_NAMES[lv],
  short,
  bits: CHROMALUM_LEVEL_BITS[lv],
  color: CHROMALUM_LEVEL_HEX[lv],
  hamming: HAMMING_POSITION_LABELS[lv],
}));

export const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇";

/** `K₀` … `W₇`: a level's abbreviation with its rank as a subscript. */
export function levelLabel(level: number): string {
  return `${THEORY_LEVELS[level].short}${SUBSCRIPT_DIGITS[level]}`;
}

/** 7 Fano plane lines — each [a, b, c] satisfies a XOR b XOR c = 0 */
export const FANO_LINES: readonly (readonly [number, number, number])[] = [
  [1, 2, 3], // τB·τR·τRB = id  (one-bit pair closure)
  [1, 4, 5], // τB·τG·τGB = id
  [2, 4, 6], // τR·τG·τGR = id
  [1, 6, 7], // τB·τGR·τGRB = id  (complement-mask closure)
  [2, 5, 7], // τR·τGB·τGRB = id
  [3, 4, 7], // τRB·τG·τGRB = id
  [3, 5, 6], // τRB·τGB·τGR = id  (two-bit closure)
];

/** Line category for display */
export const FANO_LINE_CATEGORIES = [
  "primary",
  "primary",
  "primary",
  "complement",
  "complement",
  "complement",
  "secondary",
] as const satisfies readonly ("primary" | "complement" | "secondary")[];

/** Gray code hexagon path and toggles derived from the shared rooted hue frame. */
export const GRAY_PATH = CANONICAL_CHROMATIC_LEVEL_CYCLE;
export const GRAY_TOGGLES = CHROMALUM_HUE_TOGGLE_CYCLE;

/** 2-2-2 staircase die net following the chromatic Gray path R→Y→G→C→B→M */
export const DICE_NET_FACES = GRAY_PATH.map((lv, index) => ({
  lv,
  col: Math.floor((index + 1) / 2),
  row: Math.floor(index / 2),
}));

/** 12 edges of the 3-cube (pairs of vertices differing by 1 bit) */
export const CUBE_EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [0, 4],
  [1, 3],
  [1, 5],
  [2, 3],
  [2, 6],
  [3, 7],
  [4, 5],
  [4, 6],
  [5, 7],
  [6, 7],
];

interface CubeFace {
  readonly id: string;
  readonly channel: "G" | "R" | "B";
  readonly bitIndex: number;
  readonly fixed: 0 | 1;
  /** Cyclic order: 00, 10, 11, 01 in the two free coordinates. */
  readonly vertices: readonly [number, number, number, number];
}

/** Three pairs of opposite faces, obtained by fixing one GRB coordinate. */
export const CUBE_FACES: readonly CubeFace[] = (["G", "R", "B"] as const).flatMap((channel, bitIndex) => {
  const weight = CHROMALUM_GRB_WEIGHTS[channel];
  const [a, b] = Object.values(CHROMALUM_GRB_WEIGHTS).filter((bit) => bit !== weight);
  return ([0, 1] as const).map((fixed) => {
    const base = fixed === 0 ? 0 : weight;
    return { id: `${channel}-${fixed}`, channel, bitIndex, fixed, vertices: [base, base | a, base | a | b, base | b] };
  });
});

/** Channel name for a cube edge (which bit differs) */
export function edgeChannel(a: number, b: number): "G" | "R" | "B" {
  const d = a ^ b;
  if (d === 4) return "G";
  if (d === 2) return "R";
  return "B";
}

/* ── Fano Plane geometry ─────────────────── */

const FANO_CX = 150,
  FANO_CY = 160,
  FANO_OUTER_R = 120;

// Outer triangle vertices
const P2 = { x: FANO_CX, y: FANO_CY - FANO_OUTER_R }; // top
const P1 = { x: FANO_CX - FANO_OUTER_R * Math.sin(Math.PI / 3), y: FANO_CY + FANO_OUTER_R * 0.5 }; // bottom-left
const P4 = { x: FANO_CX + FANO_OUTER_R * Math.sin(Math.PI / 3), y: FANO_CY + FANO_OUTER_R * 0.5 }; // bottom-right

// Inner triangle vertices = midpoints of outer triangle sides
const P3 = { x: (P1.x + P2.x) / 2, y: (P1.y + P2.y) / 2 }; // midpoint of 1→2 (left edge)
const P6 = { x: (P2.x + P4.x) / 2, y: (P2.y + P4.y) / 2 }; // midpoint of 2→4 (right edge)
const P5 = { x: (P1.x + P4.x) / 2, y: (P1.y + P4.y) / 2 }; // midpoint of 1→4 (bottom edge)

/** Fano point positions: outer triangle (2,1,4) + inner triangle (3,6,5) + center (7) */
interface Point2D {
  readonly x: number;
  readonly y: number;
}

export const FANO_POINTS: Readonly<Record<number, Point2D>> = {
  2: P2,
  1: P1,
  4: P4, // outer triangle
  3: P3,
  6: P6,
  5: P5, // inner triangle (midpoints)
  7: { x: FANO_CX, y: FANO_CY }, // center
};

/** Inscribed circle: circumcircle of inner triangle 3,5,6 (radius = half outer) */
const FANO_INNER_R = Math.sqrt((P3.x - FANO_CX) ** 2 + (P3.y - FANO_CY) ** 2);
export const FANO_CIRCLE = { cx: FANO_CX, cy: FANO_CY, r: FANO_INNER_R } as const;

/** Line endpoints for rendering: [from, to] for each of the 7 Fano lines */
export const FANO_LINE_ENDPOINTS: readonly (readonly [number, number])[] = [
  [1, 2], // {1,2,3}: left side of outer triangle (3 is midpoint)
  [1, 4], // {1,4,5}: bottom side of outer triangle (5 is midpoint)
  [2, 4], // {2,4,6}: right side of outer triangle (6 is midpoint)
  [1, 6], // {1,6,7}: diagonal through center
  [2, 5], // {2,5,7}: vertical through center
  [3, 4], // {3,4,7}: diagonal through center
  // line 6 = inscribed circle (no endpoints)
];

/* ── Color Cube isometric geometry ───────── */

const ISO_CX = 150,
  ISO_CY = 140;
const ISO_SCALE = 70;
// Isometric axes: R=up, G=down-right, B=down-left
// R-up matches color wheel convention (Red=0°) and produces standard hue order clockwise
const ISO_R = { dx: 0, dy: -1.2 };
const ISO_G = { dx: Math.cos(Math.PI / 6), dy: Math.sin(Math.PI / 6) };
const ISO_B = { dx: -Math.cos(Math.PI / 6), dy: Math.sin(Math.PI / 6) };

function buildCubePoints(): Readonly<Record<number, Point2D>> {
  const points: Record<number, Point2D> = {};
  for (let i = 0; i < 8; i++) {
    const g = (i >> 2) & 1,
      r = (i >> 1) & 1,
      b = i & 1;
    points[i] = {
      x: ISO_CX + ISO_SCALE * (g * ISO_G.dx + r * ISO_R.dx + b * ISO_B.dx),
      y: ISO_CY + ISO_SCALE * (g * ISO_G.dy + r * ISO_R.dy + b * ISO_B.dy),
    };
  }
  return points;
}

export const CUBE_POINTS = buildCubePoints();

/* ── Regular cube / tetrahedra in the K₈ Explorer ── */

// A single rigid rotation keeps the cube regular and its two inscribed
// tetrahedra regular. This view also avoids edges passing through other nodes.
// The small asymmetric angle keeps unrelated edges clear of node labels and
// the four body diagonals at distinct angles around their shared center.
const EXPLORER_YAW = (27.8 * Math.PI) / 180;
const EXPLORER_PITCH = (11.6 * Math.PI) / 180;
const EXPLORER_COS_YAW = Math.cos(EXPLORER_YAW);
const EXPLORER_SIN_YAW = Math.sin(EXPLORER_YAW);
const EXPLORER_COS_PITCH = Math.cos(EXPLORER_PITCH);
const EXPLORER_SIN_PITCH = Math.sin(EXPLORER_PITCH);

/** Centered unit-cube vertices after rotation: x right, y down, z away from the viewer. */
export const K8_EXPLORER_VERTICES_3D: readonly (readonly [number, number, number])[] = THEORY_LEVELS.map(({ bits }) => {
  const [g, r, b] = bits.map((bit) => bit - 0.5);
  return [
    EXPLORER_COS_YAW * r - EXPLORER_SIN_YAW * b,
    -EXPLORER_COS_PITCH * g - EXPLORER_SIN_PITCH * (EXPLORER_SIN_YAW * r + EXPLORER_COS_YAW * b),
    -EXPLORER_SIN_PITCH * g + EXPLORER_COS_PITCH * (EXPLORER_SIN_YAW * r + EXPLORER_COS_YAW * b),
  ] as const;
});

const EXPLORER_SCALE = 108 / (EXPLORER_COS_YAW + EXPLORER_SIN_YAW);

/** Orthographic projection with one uniform scale; no per-vertex adjustments. */
export const K8_EXPLORER_POINTS: Readonly<Record<number, Point2D>> = Object.fromEntries(
  K8_EXPLORER_VERTICES_3D.map(([x, y], lv) => [lv, { x: 90 + EXPLORER_SCALE * x, y: 63 + EXPLORER_SCALE * y }]),
);

/** Determine if an edge is a "back edge" (behind the cube) for dashed rendering */
export function isBackEdge(a: number, b: number): boolean {
  // Back edges: those connecting to vertex 0 (Black, hidden corner)
  return a === 0 || b === 0;
}

/* ── Octahedron relations used by the Music tab ──── */

/** 3 complement axes: R↔C, G↔M, B↔Y */
export const OCTA_COMPLEMENT_AXES: readonly (readonly [number, number])[] = [
  [2, 5],
  [4, 3],
  [1, 6],
];

/** 12 octahedron edges = all non-complement chromatic pairs */
export const OCTA_EDGES: readonly (readonly [number, number])[] = [
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 5],
  [2, 3],
  [2, 4],
  [2, 6],
  [3, 5],
  [3, 6],
  [4, 5],
  [4, 6],
  [5, 6],
];

/** 8 octahedron faces — each octant maps to one GF(2)^3 color.
 *  Sign convention: vertex lv is on the + side of its axis if it's a primary (weight 1),
 *  and on the − side if it's a secondary (weight 2).
 *  For each axis i, the octant sign determines bit i of the face color. */
export const OCTA_FACES: readonly { readonly verts: readonly [number, number, number]; readonly color: number }[] = [
  { verts: [2, 4, 1], color: 7 }, // (+R,+G,+B) = White
  { verts: [2, 4, 6], color: 6 }, // (+R,+G,−B) = Yellow
  { verts: [2, 3, 1], color: 3 }, // (+R,−G,+B) = Magenta
  { verts: [2, 3, 6], color: 2 }, // (+R,−G,−B) = Red
  { verts: [5, 4, 1], color: 5 }, // (−R,+G,+B) = Cyan
  { verts: [5, 4, 6], color: 4 }, // (−R,+G,−B) = Green
  { verts: [5, 3, 1], color: 1 }, // (−R,−G,+B) = Blue
  { verts: [5, 3, 6], color: 0 }, // (−R,−G,−B) = Black
];

/* ── Inscribed Tetrahedra (T0 / T1) ──────── */

/** T0 = even-weight vectors = Klein four-group V₄ under XOR */
export const TETRA_T0 = [0, 3, 5, 6] as const;

/** Edges of the T0 tetrahedron inscribed in the cube */
export const TETRA_T0_EDGES: readonly (readonly [number, number])[] = [
  [0, 3],
  [0, 5],
  [0, 6],
  [3, 5],
  [3, 6],
  [5, 6],
];
/** Edges of the T1 tetrahedron inscribed in the cube */
const TETRA_T1_EDGES: readonly (readonly [number, number])[] = [
  [1, 2],
  [1, 4],
  [1, 7],
  [2, 4],
  [2, 7],
  [4, 7],
];

/* ── K₈ Three-Factor Decomposition ─────────
   K₈ = Q₃ (dist 1, 12 edges) ∪ Stella (dist 2, 12 edges) ∪ M₄ (dist 3, 4 edges)
   Degrees: 3 + 3 + 1 = 7 = deg(K₈)  */

/** Hamming distance between two GF(2)³ elements */
export function hammingDist(a: number, b: number): number {
  const d = a ^ b;
  return (d & 1) + ((d >> 1) & 1) + ((d >> 2) & 1);
}

/** Distance-2 edges (stella octangula): T0 internal + T1 internal */
export const STELLA_EDGES: readonly (readonly [number, number])[] = [...TETRA_T0_EDGES, ...TETRA_T1_EDGES];

/** Distance-3 edges (complement matching): 4 body diagonals */
export const COMPLEMENT_EDGES: readonly (readonly [number, number])[] = [
  [0, 7],
  [1, 6],
  [2, 5],
  [3, 4],
];

/* ── Gray Code Hexagon geometry ──────────── */

const GRAY_CX = 150,
  GRAY_CY = 150,
  GRAY_R = 110;

function buildGrayPoints(): Readonly<Record<number, Point2D>> {
  const points: Record<number, Point2D> = {};
  GRAY_PATH.forEach((lv, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 6;
    points[lv] = {
      x: GRAY_CX + GRAY_R * Math.cos(angle),
      y: GRAY_CY + GRAY_R * Math.sin(angle),
    };
  });
  return points;
}

export const GRAY_POINTS = buildGrayPoints();
