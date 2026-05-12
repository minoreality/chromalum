import { hue2rgb, LEVEL_CANDIDATES } from "../color-engine";
import { NUM_VERTICES } from "../constants";

/* ═══════════════════════════════════════════
   HEXAGON DIAGRAM DATA
   ═══════════════════════════════════════════ */

export const HEX_ANGLES: readonly number[] = [0, 60, 120, 180, 240, 300];

interface HexVertex {
  readonly c: string;
  readonly lv: number;
  readonly rgb: string;
  readonly a: number;
}

export const HEX_VERTICES = [
  { c: "R", lv: 2, rgb: "#ff0000", a: -90 },
  { c: "Y", lv: 6, rgb: "#ffff00", a: -30 },
  { c: "G", lv: 4, rgb: "#00ff00", a: 30 },
  { c: "C", lv: 5, rgb: "#00ffff", a: 90 },
  { c: "B", lv: 1, rgb: "#0000ff", a: 150 },
  { c: "M", lv: 3, rgb: "#ff00ff", a: 210 },
] as const satisfies readonly HexVertex[];

interface HexEdge {
  readonly f: number;
  readonly t: number;
  readonly lv: readonly number[];
}

/* t:6 is equivalent to t:0 (wraps via % NUM_VERTICES) — represents the edge from vertex 5 to vertex 0 */
export const HEX_EDGES = [
  { f: 0, t: 1, lv: [3, 4, 5] },
  { f: 1, t: 2, lv: [5] },
  { f: 2, t: 3, lv: [] },
  { f: 3, t: 4, lv: [4, 3, 2] },
  { f: 4, t: 5, lv: [2] },
  { f: 5, t: 6, lv: [] },
] as const satisfies readonly HexEdge[];

interface EdgeColor {
  readonly hex: string;
  readonly hue: number;
}

export const HEX_EDGE_COLORS: readonly (readonly EdgeColor[])[] = HEX_EDGES.map((e) => {
  const hs = HEX_ANGLES[e.f],
    he = e.t >= NUM_VERTICES ? 360 : HEX_ANGLES[e.t];
  const ts = Math.abs(HEX_VERTICES[e.f].lv - HEX_VERTICES[e.t % NUM_VERTICES].lv);
  if (ts === 0)
    return e.lv.map(() => {
      const c = hue2rgb(hs);
      return { hex: "#" + c.map((v) => v.toString(16).padStart(2, "0")).join(""), hue: hs };
    });
  return e.lv.map((_, i) => {
    const t = (i + 1) / ts,
      h = hs + (he - hs) * t,
      c = hue2rgb(h);
    return { hex: "#" + c.map((v) => v.toString(16).padStart(2, "0")).join(""), hue: h };
  });
});

function calcAlt(lv: number, hue: number): number {
  const a = LEVEL_CANDIDATES[lv];
  if (!a || a.length <= 1) return 0;
  let best = 0,
    bestDist = Infinity;
  a.forEach((x, j) => {
    if (x.angle < 0) return;
    let d = Math.abs(x.angle - hue);
    if (d > 180) d = 360 - d;
    if (d < bestDist) {
      bestDist = d;
      best = j;
    }
  });
  return best;
}

export const HEX_VERTEX_ALTS: readonly number[] = HEX_VERTICES.map((v, i) => calcAlt(v.lv, HEX_ANGLES[i]));
export const HEX_EDGE_ALTS: readonly (readonly number[])[] = HEX_EDGES.map((e, ei) =>
  e.lv.map((lv, li) => calcAlt(lv, HEX_EDGE_COLORS[ei][li].hue)),
);

interface HexDot {
  readonly lv: number;
  readonly alt: number;
  readonly vi: number;
  readonly ei: number;
  readonly si: number;
}

function buildHexDots(): readonly HexDot[] {
  const dots: HexDot[] = [];
  HEX_VERTICES.forEach((v, i) => dots.push({ lv: v.lv, alt: HEX_VERTEX_ALTS[i], vi: i, ei: -1, si: -1 }));
  HEX_EDGES.forEach((e, ei) => e.lv.forEach((lv, li) => dots.push({ lv, alt: HEX_EDGE_ALTS[ei][li], vi: -1, ei, si: li })));
  return dots;
}

export const HEX_DOTS = buildHexDots();

/** Hex diagram angle for each (level, candidateIndex) — matches dot positions on the hex diagram */
function buildHexCandidateAngles(): readonly (readonly (number | null)[])[] {
  const angles: (number | null)[][] = LEVEL_CANDIDATES.map((alts) => alts.map(() => null));
  HEX_VERTICES.forEach((v, i) => {
    angles[v.lv][HEX_VERTEX_ALTS[i]] = HEX_ANGLES[i];
  });
  HEX_EDGES.forEach((e, ei) => {
    e.lv.forEach((lv, li) => {
      angles[lv][HEX_EDGE_ALTS[ei][li]] = HEX_EDGE_COLORS[ei][li].hue;
    });
  });
  return angles;
}

export const HEX_CANDIDATE_ANGLES = buildHexCandidateAngles();

export const HEX_CX = 200,
  HEX_CY = 175,
  HEX_R = 130;

interface HexVP {
  readonly x: number;
  readonly y: number;
}

export const HEX_VP: readonly HexVP[] = HEX_VERTICES.map((v) => {
  const a = (v.a * Math.PI) / 180;
  return { x: HEX_CX + HEX_R * Math.cos(a), y: HEX_CY + HEX_R * Math.sin(a) };
});
