import { describe, expect, it } from "vitest";
import { colorCubeView, hasseRankY } from "../color-cube-geometry";

const subtract = (a: readonly number[], b: readonly number[]) => a.map((value, axis) => value - b[axis]);
const dot = (a: readonly number[], b: readonly number[]) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);

describe("ColorCube rigid rotation", () => {
  it("crossfades hidden edges instead of switching their dash pattern in one step", () => {
    const dash = (progress: number, key: string) =>
      colorCubeView(progress).orderedEdges.find(({ edge }) => edge.join("-") === key)!.dashWeight;
    expect(dash(0, "0-1")).toBe(1);
    expect(dash(0, "2-3")).toBe(0);
    expect(dash(0.65, "0-1")).toBe(0);
    expect(dash(0.65, "2-3")).toBe(1);
    for (const key of ["0-1", "2-3"]) {
      expect(dash(0.35, key)).toBeGreaterThan(0);
      expect(dash(0.35, key)).toBeLessThan(1);
    }
    // Their shared red edge stays hidden while the other two edges change.
    expect(dash(0.35, "0-2")).toBe(1);
    for (const { edge } of colorCubeView(0).orderedEdges) {
      const key = edge.join("-");
      let previous = dash(0, key);
      for (let step = 1; step <= 100; step++) {
        const weight = dash(step / 100, key);
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
        expect(Math.abs(weight - previous)).toBeLessThan(0.1);
        previous = weight;
      }
      expect(dash(1, key)).toBe(0);
    }
  });

  it("preserves all 28 distances, right angles and handedness throughout the turn", () => {
    for (let step = 0; step <= 100; step++) {
      const { vertices } = colorCubeView(step / 100);
      for (let a = 0; a < 8; a++) {
        for (let b = a + 1; b < 8; b++) {
          const distance = subtract(vertices[a], vertices[b]);
          // A unit cube's squared distance is the number of differing bits.
          const expected = (a ^ b).toString(2).replace(/0/g, "").length;
          expect(dot(distance, distance)).toBeCloseTo(expected, 12);
        }
      }
      const [g, r, b] = [4, 2, 1].map((level) => subtract(vertices[level], vertices[0]));
      expect(dot(g, r)).toBeCloseTo(0, 12);
      expect(dot(r, b)).toBeCloseTo(0, 12);
      expect(dot(b, g)).toBeCloseTo(0, 12);
      const cross = [r[1] * b[2] - r[2] * b[1], r[2] * b[0] - r[0] * b[2], r[0] * b[1] - r[1] * b[0]];
      expect(dot(g, cross)).toBeCloseTo(1, 12);
    }
  });

  it("uses one orthographic scale and keeps the cube inside the unchanged viewport", () => {
    const initial = colorCubeView(0);
    const initialScale = Math.hypot(...[4, 2, 1].map((lv) => initial.points[lv].x - initial.points[0].x));
    for (let step = 0; step <= 100; step++) {
      const { vertices, points, orderedEdges } = colorCubeView(step / 100);
      for (let lv = 0; lv < 8; lv++) {
        expect(points[lv].x).toBeCloseTo(initial.points[lv].x, 12);
        expect(points[lv].x - points[0].x).toBeCloseTo(initialScale * (vertices[lv][0] - vertices[0][0]), 10);
        expect(points[lv].y - points[0].y).toBeCloseTo(initialScale * (vertices[lv][1] - vertices[0][1]), 10);
        // Existing viewBox 30 35 240 195, with the full 17-unit hit radius.
        expect(points[lv].x).toBeGreaterThan(47);
        expect(points[lv].x).toBeLessThan(253);
        expect(points[lv].y).toBeGreaterThan(52);
        expect(points[lv].y).toBeLessThan(213);
      }
      const depths = orderedEdges.map(({ edge: [a, b] }) => (vertices[a][2] + vertices[b][2]) / 2);
      for (let i = 1; i < depths.length; i++) expect(depths[i]).toBeLessThanOrEqual(depths[i - 1] + 1e-9);
    }
  });

  it("ends in four equally spaced rank layers with every cover edge pointing upward", () => {
    const { points, orderedEdges } = colorCubeView(1);
    const ranks = [[0], [1, 2, 4], [3, 5, 6], [7]];
    const spacing = points[0].y - points[1].y;
    expect(spacing).toBeGreaterThan(0);
    ranks.forEach((levels, rank) => {
      for (const lv of levels) {
        expect(points[lv].y).toBeCloseTo(points[0].y - spacing * rank, 10);
        expect(hasseRankY(rank)).toBeCloseTo(points[lv].y, 10);
      }
    });
    for (const {
      edge: [a, b],
    } of orderedEdges)
      expect(points[a].y - points[b].y).toBeCloseTo(spacing, 10);
    expect(colorCubeView(0).points[2].y).toBeLessThan(colorCubeView(0).points[7].y);
    expect(colorCubeView(0).points[0].y).toBeGreaterThan(colorCubeView(0).points[7].y);
  });
});
