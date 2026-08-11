import {
  CANONICAL_CHROMATIC_LEVEL_CYCLE,
  CANONICAL_HUE_EDGES,
  CHROMALUM_LEVEL_HEX,
  CHROMALUM_LEVEL_LABELS,
} from "../chromalum-color-model";
import { hue2rgb, LEVEL_CANDIDATES } from "../color-engine";
import { NUM_VERTICES } from "../constants";

/* ═══════════════════════════════════════════
   HEXAGON DIAGRAM DATA
   ═══════════════════════════════════════════ */

export const HEX_ANGLES: readonly number[] = CANONICAL_HUE_EDGES.map((edge) => edge.fromHueAngleDeg);

interface HexVertex {
  readonly label: string;
  readonly level: number;
  readonly rgb: string;
  readonly angleDeg: number;
}

export const HEX_VERTICES: readonly HexVertex[] = CANONICAL_CHROMATIC_LEVEL_CYCLE.map((level, vertexIndex) => ({
  label: CHROMALUM_LEVEL_LABELS[level],
  level,
  rgb: CHROMALUM_LEVEL_HEX[level],
  angleDeg: vertexIndex * 60 - 90,
}));

interface HexEdge {
  readonly fromVertexIndex: number;
  readonly toVertexIndex: number;
  readonly levels: readonly number[];
}

/* t:6 is equivalent to t:0 (wraps via % NUM_VERTICES) — represents the edge from vertex 5 to vertex 0 */
export const HEX_EDGES: readonly HexEdge[] = CANONICAL_HUE_EDGES.map((edge) => ({
  fromVertexIndex: edge.fromVertexIndex,
  // Keep 6 rather than 0 on the closing edge so hue interpolation reaches 360°.
  toVertexIndex: edge.fromVertexIndex + 1,
  levels: edge.interiorLevels,
}));

interface EdgeColor {
  readonly hex: string;
  readonly hue: number;
}

export const HEX_EDGE_COLORS: readonly (readonly EdgeColor[])[] = HEX_EDGES.map((e) => {
  const startHueDeg = HEX_ANGLES[e.fromVertexIndex],
    endHueDeg = e.toVertexIndex >= NUM_VERTICES ? 360 : HEX_ANGLES[e.toVertexIndex];
  const levelSpan = Math.abs(HEX_VERTICES[e.fromVertexIndex].level - HEX_VERTICES[e.toVertexIndex % NUM_VERTICES].level);
  if (levelSpan === 0)
    return e.levels.map(() => {
      const c = hue2rgb(startHueDeg);
      return { hex: "#" + c.map((v) => v.toString(16).padStart(2, "0")).join(""), hue: startHueDeg };
    });
  return e.levels.map((_, i) => {
    const t = (i + 1) / levelSpan,
      h = startHueDeg + (endHueDeg - startHueDeg) * t,
      c = hue2rgb(h);
    return { hex: "#" + c.map((v) => v.toString(16).padStart(2, "0")).join(""), hue: h };
  });
});

function calcCandidateIndex(level: number, hue: number): number {
  const candidates = LEVEL_CANDIDATES[level];
  if (!candidates || candidates.length <= 1) return 0;
  let best = 0,
    bestDist = Infinity;
  candidates.forEach((candidate, candidateIndex) => {
    if (candidate.hueAngleDeg < 0) return;
    let distanceDeg = Math.abs(candidate.hueAngleDeg - hue);
    if (distanceDeg > 180) distanceDeg = 360 - distanceDeg;
    if (distanceDeg < bestDist) {
      bestDist = distanceDeg;
      best = candidateIndex;
    }
  });
  return best;
}

export const HEX_VERTEX_CANDIDATE_INDICES: readonly number[] = HEX_VERTICES.map((v, i) => calcCandidateIndex(v.level, HEX_ANGLES[i]));
export const HEX_EDGE_CANDIDATE_INDICES: readonly (readonly number[])[] = HEX_EDGES.map((e, ei) =>
  e.levels.map((level, levelIndex) => calcCandidateIndex(level, HEX_EDGE_COLORS[ei][levelIndex].hue)),
);

interface HexDot {
  readonly level: number;
  readonly candidateIndex: number;
  readonly vertexIndex: number;
  readonly edgeIndex: number;
  readonly segmentIndex: number;
}

function buildHexDots(): readonly HexDot[] {
  const dots: HexDot[] = [];
  HEX_VERTICES.forEach((v, i) =>
    dots.push({ level: v.level, candidateIndex: HEX_VERTEX_CANDIDATE_INDICES[i], vertexIndex: i, edgeIndex: -1, segmentIndex: -1 }),
  );
  HEX_EDGES.forEach((e, edgeIndex) =>
    e.levels.forEach((level, segmentIndex) =>
      dots.push({
        level,
        candidateIndex: HEX_EDGE_CANDIDATE_INDICES[edgeIndex][segmentIndex],
        vertexIndex: -1,
        edgeIndex,
        segmentIndex,
      }),
    ),
  );
  return dots;
}

export const HEX_DOTS = buildHexDots();

export const HEX_CX = 200,
  HEX_CY = 175,
  HEX_R = 130;

interface HexVertexPosition {
  readonly x: number;
  readonly y: number;
}

export const HEX_VERTEX_POSITIONS: readonly HexVertexPosition[] = HEX_VERTICES.map((v) => {
  const angleRad = (v.angleDeg * Math.PI) / 180;
  return { x: HEX_CX + HEX_R * Math.cos(angleRad), y: HEX_CY + HEX_R * Math.sin(angleRad) };
});
