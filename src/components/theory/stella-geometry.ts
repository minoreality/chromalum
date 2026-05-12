import { CUBE_POINTS, STELLA_3D, STELLA_EDGES, STELLA_FACES, vertexDepth } from "../../data/theory-data";

const LIGHT_DIR: [number, number, number] = (() => {
  const lx = -0.4,
    ly = 0.7,
    lz = 0.6;
  const len = Math.sqrt(lx * lx + ly * ly + lz * lz);
  return [lx / len, ly / len, lz / len];
})();

const CUBE_CENTER: [number, number, number] = [0.5, 0.5, 0.5];

interface FaceLighting {
  isFront: boolean;
  diffuse: number;
}

type Pt2 = { readonly x: number; readonly y: number };
type Pt2Map = Readonly<Record<number, Pt2>>;
type Pt3 = readonly [number, number, number];
type Pt3Map = Readonly<Record<number, Pt3>>;

interface EdgeSegment {
  t0: number;
  t1: number;
  hidden: boolean;
}

interface FaceOcclusion {
  clipPoints: string;
  dimAmount: number;
}

interface SurfaceFace {
  verts2D: [Pt2, Pt2, Pt2];
  ridgeBase: [Pt2, Pt2];
  ridgeDepths: [number, number];
  depth: number;
  isFront: boolean;
  diffuse: number;
  tipVertex: number;
  tetra: 0 | 1;
  color: number;
}

interface SurfaceRidgeEdge {
  from: Pt2;
  to: Pt2;
  depth: number;
  isFront: boolean;
}

interface SilhouetteEdge {
  from: Pt2;
  to: Pt2;
}

export interface ViewData {
  pts: Pt2Map;
  faceLighting: FaceLighting[];
  sortedFaces: ((typeof STELLA_FACES)[number] & { origIdx: number; depth: number })[];
  backEdges: Set<string>;
  edgeSegments: EdgeSegment[][];
  faceOcclusions: FaceOcclusion[][];
  surfaceFaces: SurfaceFace[];
  surfaceRidgeEdges: SurfaceRidgeEdge[];
  silhouetteEdges: SilhouetteEdge[];
}

export function computeFaceLighting(coords3D: Pt3Map): FaceLighting[] {
  return STELLA_FACES.map((f) => {
    const p0 = coords3D[f.verts[0]],
      p1 = coords3D[f.verts[1]],
      p2 = coords3D[f.verts[2]];
    const e1: [number, number, number] = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const e2: [number, number, number] = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1];
    const ny = e1[2] * e2[0] - e1[0] * e2[2];
    const nz = e1[0] * e2[1] - e1[1] * e2[0];
    const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const cx = (p0[0] + p1[0] + p2[0]) / 3 - CUBE_CENTER[0];
    const cy = (p0[1] + p1[1] + p2[1]) / 3 - CUBE_CENTER[1];
    const cz = (p0[2] + p1[2] + p2[2]) / 3 - CUBE_CENTER[2];
    const outSign = nx * cx + ny * cy + nz * cz > 0 ? 1 : -1;
    const nnx = (outSign * nx) / nLen;
    const nny = (outSign * ny) / nLen;
    const nnz = (outSign * nz) / nLen;
    const isFront = nnx + nny + nnz > 0;
    const dot = nnx * LIGHT_DIR[0] + nny * LIGHT_DIR[1] + nnz * LIGHT_DIR[2];
    const diffuse = 0.15 + 0.85 * Math.max(0, dot);
    return { isFront, diffuse };
  });
}

function computeBackEdges(lighting: { isFront: boolean }[]): Set<string> {
  const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const edgeFaces = new Map<string, number[]>();
  for (let fi = 0; fi < STELLA_FACES.length; fi++) {
    const vs = STELLA_FACES[fi].verts;
    for (let i = 0; i < 3; i++) {
      const k = edgeKey(vs[i], vs[(i + 1) % 3]);
      if (!edgeFaces.has(k)) edgeFaces.set(k, []);
      edgeFaces.get(k)!.push(fi);
    }
  }
  const result = new Set<string>();
  for (const [k, faces] of edgeFaces) {
    if (faces.length >= 2 && faces.every((fi) => !lighting[fi].isFront)) {
      result.add(k);
    }
  }
  return result;
}

export function computeSortedFaces(): ViewData["sortedFaces"] {
  return STELLA_FACES.map((f, i) => {
    const [a, b, c] = f.verts;
    const depth = vertexDepth(a) + vertexDepth(b) + vertexDepth(c);
    return { ...f, origIdx: i, depth };
  }).sort((a, b) => a.depth - b.depth);
}

export function pointInTri(px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(d) < 1e-10) return false;
  const u = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
  const v = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
  return u >= -0.01 && v >= -0.01 && u + v <= 1.01;
}

export function triDepthAt(px: number, py: number, verts: readonly [number, number, number], pts2D: Pt2Map): number {
  const [a, b, c] = verts;
  const pa = pts2D[a],
    pb = pts2D[b],
    pc = pts2D[c];
  const d = (pb.y - pc.y) * (pa.x - pc.x) + (pc.x - pb.x) * (pa.y - pc.y);
  if (Math.abs(d) < 1e-10) return 0;
  const u = ((pb.y - pc.y) * (px - pc.x) + (pc.x - pb.x) * (py - pc.y)) / d;
  const v = ((pc.y - pa.y) * (px - pc.x) + (pa.x - pc.x) * (py - pc.y)) / d;
  const w = 1 - u - v;
  return u * vertexDepth(a) + v * vertexDepth(b) + w * vertexDepth(c);
}

export function computeEdgeSegments(edgeIdx: number, pts2D: Pt2Map, faceLighting: { isFront: boolean }[]): EdgeSegment[] {
  const [a, b] = STELLA_EDGES[edgeIdx];
  const pa = pts2D[a],
    pb = pts2D[b];
  const da = vertexDepth(a),
    db = vertexDepth(b);

  const occluderFaces = STELLA_FACES.map((f, i) => ({ ...f, idx: i })).filter((f) => {
    if (!faceLighting[f.idx].isFront) return false;
    const vSet = new Set(f.verts);
    if (vSet.has(a) && vSet.has(b)) return false;
    return true;
  });

  if (occluderFaces.length === 0) {
    return [{ t0: 0, t1: 1, hidden: false }];
  }

  const sampleCount = 40;
  const samples: boolean[] = [];
  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const px = pa.x + t * (pb.x - pa.x);
    const py = pa.y + t * (pb.y - pa.y);
    const edgeDepth = da + t * (db - da);

    let hidden = false;
    for (const face of occluderFaces) {
      const [v0, v1, v2] = face.verts;
      const p0 = pts2D[v0],
        p1 = pts2D[v1],
        p2 = pts2D[v2];
      if (pointInTri(px, py, p0.x, p0.y, p1.x, p1.y, p2.x, p2.y)) {
        const faceDepth = triDepthAt(px, py, face.verts, pts2D);
        if (faceDepth > edgeDepth + 0.05) {
          hidden = true;
          break;
        }
      }
    }
    samples.push(hidden);
  }

  const segments: EdgeSegment[] = [];
  let segStart = 0;
  let segHidden = samples[0];
  for (let i = 1; i <= sampleCount; i++) {
    if (i === sampleCount || samples[i] !== segHidden) {
      segments.push({
        t0: segStart / sampleCount,
        t1: i === sampleCount && samples[i - 1] === segHidden ? 1 : i / sampleCount,
        hidden: segHidden,
      });
      if (i < sampleCount) {
        segStart = i;
        segHidden = samples[i];
      }
    }
  }
  return segments;
}

export function clipPolygon(subject: Pt2[], clip: Pt2[]): Pt2[] {
  let output = subject;
  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) return [];
    const input = output;
    output = [];
    const a = clip[i],
      b = clip[(i + 1) % clip.length];
    for (let j = 0; j < input.length; j++) {
      const p = input[j],
        q = input[(j + 1) % input.length];
      const pInside = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
      const qInside = (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x) >= 0;
      if (pInside && qInside) {
        output.push(q);
      } else if (pInside) {
        output.push(intersectEdge(p, q, a, b));
      } else if (qInside) {
        output.push(intersectEdge(p, q, a, b));
        output.push(q);
      }
    }
  }
  return output;
}

function intersectEdge(p: Pt2, q: Pt2, a: Pt2, b: Pt2): Pt2 {
  const dx1 = q.x - p.x,
    dy1 = q.y - p.y;
  const dx2 = b.x - a.x,
    dy2 = b.y - a.y;
  const d = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(d) < 1e-10) return p;
  const t = ((a.x - p.x) * dy2 - (a.y - p.y) * dx2) / d;
  return { x: p.x + t * dx1, y: p.y + t * dy1 };
}

function computeFaceOcclusions(pts2D: Pt2Map, faceLighting: { isFront: boolean }[]): FaceOcclusion[][] {
  return STELLA_FACES.map((face, fi) => {
    const occlusions: FaceOcclusion[] = [];
    const fVerts = face.verts.map((v) => pts2D[v]);

    for (let oi = 0; oi < STELLA_FACES.length; oi++) {
      if (oi === fi) continue;
      if (!faceLighting[oi].isFront) continue;
      const oFace = STELLA_FACES[oi];

      if (face.verts.some((v) => oFace.verts.includes(v as number))) continue;

      const oVerts = oFace.verts.map((v) => pts2D[v]);
      const clipped = clipPolygon(
        fVerts.map((p) => ({ x: p.x, y: p.y })),
        oVerts.map((p) => ({ x: p.x, y: p.y })),
      );
      if (clipped.length < 3) continue;

      const cx = clipped.reduce((s, p) => s + p.x, 0) / clipped.length;
      const cy = clipped.reduce((s, p) => s + p.y, 0) / clipped.length;

      const faceDepth = triDepthAt(cx, cy, face.verts, pts2D);
      const occDepth = triDepthAt(cx, cy, oFace.verts, pts2D);

      if (occDepth > faceDepth + 0.05) {
        const pts = clipped.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        const dimAmount = Math.min(0.2, (occDepth - faceDepth) * 0.08);
        occlusions.push({ clipPoints: pts, dimAmount });
      }
    }
    return occlusions;
  });
}

export function computeSurfaceFaces(pts2D: Pt2Map): SurfaceFace[] {
  const mid2D = (a: number, b: number): Pt2 => ({
    x: (pts2D[a].x + pts2D[b].x) / 2,
    y: (pts2D[a].y + pts2D[b].y) / 2,
  });
  const midDepth = (a: number, b: number) => (vertexDepth(a) + vertexDepth(b)) / 2;

  const faces: SurfaceFace[] = [];

  for (const sf of STELLA_FACES) {
    const [v0, v1, v2] = sf.verts;
    const m01 = { p2D: mid2D(v0, v1), d: midDepth(v0, v1) };
    const m02 = { p2D: mid2D(v0, v2), d: midDepth(v0, v2) };
    const m12 = { p2D: mid2D(v1, v2), d: midDepth(v1, v2) };

    const spikes: { tip: number; mA: typeof m01; mB: typeof m01 }[] = [
      { tip: v0, mA: m01, mB: m02 },
      { tip: v1, mA: m01, mB: m12 },
      { tip: v2, mA: m02, mB: m12 },
    ];

    for (const spike of spikes) {
      const tipP = pts2D[spike.tip];
      const verts2D: [Pt2, Pt2, Pt2] = [tipP, spike.mA.p2D, spike.mB.p2D];
      const tipD = vertexDepth(spike.tip);
      const depth = (tipD + spike.mA.d + spike.mB.d) / 3;

      const p0 = STELLA_3D[v0],
        p1 = STELLA_3D[v1],
        p2 = STELLA_3D[v2];
      const e1: [number, number, number] = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const e2: [number, number, number] = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
      const nx = e1[1] * e2[2] - e1[2] * e2[1];
      const ny = e1[2] * e2[0] - e1[0] * e2[2];
      const nz = e1[0] * e2[1] - e1[1] * e2[0];
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      const cx = (p0[0] + p1[0] + p2[0]) / 3 - 0.5;
      const cy = (p0[1] + p1[1] + p2[1]) / 3 - 0.5;
      const cz = (p0[2] + p1[2] + p2[2]) / 3 - 0.5;
      const outSign = nx * cx + ny * cy + nz * cz > 0 ? 1 : -1;
      const nnx = (outSign * nx) / nLen,
        nny = (outSign * ny) / nLen,
        nnz = (outSign * nz) / nLen;
      const isFront = nnx + nny + nnz > 0;
      const dot = nnx * LIGHT_DIR[0] + nny * LIGHT_DIR[1] + nnz * LIGHT_DIR[2];
      const diffuse = 0.15 + 0.85 * Math.max(0, dot);

      faces.push({
        verts2D,
        ridgeBase: [spike.mA.p2D, spike.mB.p2D],
        ridgeDepths: [spike.mA.d, spike.mB.d],
        depth,
        isFront,
        diffuse,
        tipVertex: spike.tip,
        tetra: sf.tetra as 0 | 1,
        color: sf.color,
      });
    }
  }

  faces.sort((a, b) => a.depth - b.depth);
  return faces;
}

export function computeSurfaceRidgeEdges(faces: SurfaceFace[]): SurfaceRidgeEdge[] {
  const edgeKey = (a: Pt2, b: Pt2) => {
    const ax = a.x.toFixed(1),
      ay = a.y.toFixed(1),
      bx = b.x.toFixed(1),
      by = b.y.toFixed(1);
    return ax < bx || (ax === bx && ay < by) ? `${ax},${ay}-${bx},${by}` : `${bx},${by}-${ax},${ay}`;
  };

  const ridges = new Map<string, SurfaceRidgeEdge & { count: number }>();
  for (const face of faces) {
    const [from, to] = face.ridgeBase;
    const depth = (face.ridgeDepths[0] + face.ridgeDepths[1]) / 2;
    const key = edgeKey(from, to);
    const existing = ridges.get(key);
    if (existing) {
      existing.depth += depth;
      existing.count += 1;
      existing.isFront ||= face.isFront;
    } else {
      ridges.set(key, { from, to, depth, isFront: face.isFront, count: 1 });
    }
  }

  return Array.from(ridges.values())
    .map(({ count, ...ridge }) => ({ ...ridge, depth: ridge.depth / count }))
    .sort((a, b) => a.depth - b.depth);
}

export function computeSilhouetteEdges(faces: SurfaceFace[]): SilhouetteEdge[] {
  const edgeKey = (a: Pt2, b: Pt2) => {
    const ax = a.x.toFixed(1),
      ay = a.y.toFixed(1),
      bx = b.x.toFixed(1),
      by = b.y.toFixed(1);
    return ax < bx || (ax === bx && ay < by) ? `${ax},${ay}-${bx},${by}` : `${bx},${by}-${ax},${ay}`;
  };
  const adj = new Map<string, { front: number; from: Pt2; to: Pt2 }>();
  for (const f of faces) {
    const verts = f.verts2D;
    for (let i = 0; i < 3; i++) {
      const a = verts[i],
        b = verts[(i + 1) % 3];
      const k = edgeKey(a, b);
      if (!adj.has(k)) adj.set(k, { front: 0, from: a, to: b });
      if (f.isFront) adj.get(k)!.front++;
    }
  }
  const result: SilhouetteEdge[] = [];
  for (const [, v] of adj) {
    if (v.front === 1) result.push({ from: v.from, to: v.to });
  }
  return result;
}

const FACE_LIGHTING_F = computeFaceLighting(STELLA_3D);
const SURFACE_FACES_F = computeSurfaceFaces(CUBE_POINTS);

export const VIEW_FRONT: ViewData = {
  pts: CUBE_POINTS,
  faceLighting: FACE_LIGHTING_F,
  sortedFaces: computeSortedFaces(),
  backEdges: computeBackEdges(FACE_LIGHTING_F),
  edgeSegments: STELLA_EDGES.map((_, ei) => computeEdgeSegments(ei, CUBE_POINTS, FACE_LIGHTING_F)),
  faceOcclusions: computeFaceOcclusions(CUBE_POINTS, FACE_LIGHTING_F),
  surfaceFaces: SURFACE_FACES_F,
  surfaceRidgeEdges: computeSurfaceRidgeEdges(SURFACE_FACES_F),
  silhouetteEdges: computeSilhouetteEdges(SURFACE_FACES_F),
};
