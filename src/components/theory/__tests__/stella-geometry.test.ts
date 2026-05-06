import { describe, expect, it } from "vitest";
import { CUBE_POINTS, STELLA_3D, STELLA_EDGES, STELLA_FACES, vertexDepth } from "../../../data/theory-data";
import {
  VIEW_FRONT,
  clipPolygon,
  computeEdgeSegments,
  computeFaceLighting,
  computeSilhouetteEdges,
  computeSortedFaces,
  computeSurfaceFaces,
  computeSurfaceRidgeEdges,
  pointInTri,
  triDepthAt,
} from "../stella-geometry";

describe("stella geometry", () => {
  it("precomputes front view data with stable topology counts", () => {
    expect(VIEW_FRONT.pts).toBe(CUBE_POINTS);
    expect(VIEW_FRONT.faceLighting).toHaveLength(STELLA_FACES.length);
    expect(VIEW_FRONT.sortedFaces).toHaveLength(STELLA_FACES.length);
    expect(VIEW_FRONT.edgeSegments).toHaveLength(STELLA_EDGES.length);
    expect(VIEW_FRONT.faceOcclusions).toHaveLength(STELLA_FACES.length);
    expect(VIEW_FRONT.surfaceFaces).toHaveLength(STELLA_FACES.length * 3);
    expect(VIEW_FRONT.surfaceRidgeEdges.length).toBeGreaterThan(0);
    expect(VIEW_FRONT.silhouetteEdges.length).toBeGreaterThan(0);
  });

  it("sorts stella faces far-to-near by diagonal depth", () => {
    const sorted = computeSortedFaces();

    expect(sorted.map((face) => face.origIdx).sort((a, b) => a - b)).toEqual(STELLA_FACES.map((_, i) => i));
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].depth).toBeGreaterThanOrEqual(sorted[i - 1].depth);
    }
  });

  it("computes visible edge segments that cover each stella edge", () => {
    const lighting = computeFaceLighting(STELLA_3D);

    for (let edgeIdx = 0; edgeIdx < STELLA_EDGES.length; edgeIdx++) {
      const segments = computeEdgeSegments(edgeIdx, CUBE_POINTS, lighting);

      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0].t0).toBe(0);
      expect(segments[segments.length - 1].t1).toBe(1);
      for (let i = 0; i < segments.length; i++) {
        expect(segments[i].t0).toBeLessThan(segments[i].t1);
        if (i > 0) expect(segments[i].t0).toBe(segments[i - 1].t1);
      }
    }
  });

  it("keeps triangle hit testing and depth interpolation deterministic", () => {
    expect(pointInTri(1, 1, 0, 0, 4, 0, 0, 4)).toBe(true);
    expect(pointInTri(4, 4, 0, 0, 4, 0, 0, 4)).toBe(false);

    const face = STELLA_FACES[0];
    const lv = face.verts[0];
    const p = CUBE_POINTS[lv];
    expect(triDepthAt(p.x, p.y, face.verts, CUBE_POINTS)).toBeCloseTo(vertexDepth(lv));
  });

  it("clips overlapping polygons inside a convex clip area", () => {
    const clipped = clipPolygon(
      [
        { x: -1, y: -1 },
        { x: 3, y: -1 },
        { x: 3, y: 3 },
        { x: -1, y: 3 },
      ],
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 2 },
        { x: 0, y: 2 },
      ],
    );

    expect(clipped.length).toBeGreaterThanOrEqual(4);
    for (const p of clipped) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(2);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(2);
    }
  });

  it("derives the surface overlay from pure geometry inputs", () => {
    const surfaceFaces = computeSurfaceFaces(CUBE_POINTS);
    const ridgeEdges = computeSurfaceRidgeEdges(surfaceFaces);
    const silhouetteEdges = computeSilhouetteEdges(surfaceFaces);

    expect(surfaceFaces).toHaveLength(STELLA_FACES.length * 3);
    expect(surfaceFaces.map((face) => face.depth)).toEqual([...surfaceFaces.map((face) => face.depth)].sort((a, b) => a - b));
    expect(ridgeEdges.length).toBeGreaterThan(0);
    expect(silhouetteEdges.length).toBeGreaterThan(0);
    expect(surfaceFaces.every((face) => STELLA_FACES.some((stellaFace) => stellaFace.color === face.color))).toBe(true);
  });
});
