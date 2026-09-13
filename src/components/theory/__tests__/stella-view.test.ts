import { describe, expect, it } from "vitest";
import { K8_EXPLORER_POINTS, K8_EXPLORER_VERTICES_3D } from "../../../data/theory-data";
import { interpolateStellaOrientation, stellaOrientation, stellaView } from "../stella-view";

const levels = [0, 1, 2, 3, 4, 5, 6, 7];
const views = [null, ...levels];
const phases = Array.from({ length: 81 }, (_, index) => index / 80);
const projectionScale =
  (K8_EXPLORER_POINTS[2].x - K8_EXPLORER_POINTS[0].x) / (K8_EXPLORER_VERTICES_3D[2][0] - K8_EXPLORER_VERTICES_3D[0][0]);
const poses = views.map((level) => stellaOrientation(level));
let previousPose = stellaOrientation(null);
for (const level of [7, 5, 2, 6, 0, 3, 4, 1]) {
  previousPose = stellaOrientation(level, previousPose);
  poses.push(previousPose);
}
const routes = poses.flatMap((from) => views.map((level) => ({ from, to: stellaOrientation(level, from) })));
const acos = (value: number) => Math.acos(Math.max(-1, Math.min(1, value)));

function rotationAngle(before: ReturnType<typeof stellaView>, after: ReturnType<typeof stellaView>) {
  // Read the relative rotation from the three unit cube edges, independently
  // of the camera's quaternion construction.
  const trace = [4, 2, 1].reduce(
    (sum, level) =>
      sum +
      before.vertices[level].reduce(
        (dot, value, axis) => dot + (value - before.vertices[0][axis]) * (after.vertices[level][axis] - after.vertices[0][axis]),
        0,
      ),
    0,
  );
  return acos((trace - 1) / 2);
}

describe("Stella camera rotation", () => {
  it("returns the original projection exactly", () => {
    const view = stellaView(stellaOrientation(null));
    expect(view.points).toEqual(K8_EXPLORER_POINTS);
    expect(view.vertices).toEqual(K8_EXPLORER_VERTICES_3D);
  });

  it.each(levels)("puts vertex %i nearest and preserves the radial hue cycle from every starting pose", (level) => {
    for (const from of poses) {
      const orientation = stellaOrientation(level, from);
      const { points, vertices, orderedLevels } = stellaView(orientation);
      expect(points[level]).toEqual({ x: 90, y: 63 });
      expect(points[level ^ 7]).toEqual(points[level]);
      expect(orderedLevels[0].lv).toBe(level ^ 7);
      expect(orderedLevels[orderedLevels.length - 1].lv).toBe(level);
      expect(vertices[level][2]).toBe(Math.min(...vertices.map((point) => point[2])));
      expect(stellaOrientation(level, orientation)).toBe(orientation);
      if (from === poses[0]) {
        expect(points[level ^ 2].x).toBe(90);
        expect(points[level ^ 2].y).toBeLessThan(63);
        expect(points[level ^ 5].x).toBe(90);
        expect(points[level ^ 5].y).toBeGreaterThan(63);
      }
      const radius = Math.hypot(points[level ^ 2].x - 90, points[level ^ 2].y - 63);
      for (const other of levels.filter((value) => value !== level && value !== (level ^ 7))) {
        expect(Math.hypot(points[other].x - 90, points[other].y - 63)).toBeCloseTo(radius, 10);
        expect(points[other].x + points[other ^ 7].x).toBeCloseTo(180, 10);
        expect(points[other].y + points[other ^ 7].y).toBeCloseTo(126, 10);
      }
      const hues = [2, 6, 4, 5, 1, 3];
      const around = hues
        .map((mask, index) => ({ index, angle: Math.atan2(points[level ^ mask].y - 63, points[level ^ mask].x - 90) }))
        .sort((a, b) => a.angle - b.angle);
      const steps = around.map(({ index }, i) => (around[(i + 1) % 6].index - index + 6) % 6);
      expect(steps.every((step) => step === 1) || steps.every((step) => step === 5)).toBe(true);
      for (const { angle } of around) {
        const slot = (angle + Math.PI / 2) / (Math.PI / 3);
        expect(slot).toBeCloseTo(Math.round(slot), 10);
      }
    }
  });

  it("uses the smallest possible rotation angle between settled node views", () => {
    let maxError = 0;
    for (const pose of poses.slice(1)) {
      const before = stellaView(pose);
      for (const level of levels) {
        const vertex = before.vertices[level];
        const minimum = acos(-vertex[2] / Math.hypot(...vertex));
        const after = stellaView(stellaOrientation(level, pose));
        maxError = Math.max(maxError, Math.abs(rotationAngle(before, after) - minimum));
      }
    }
    expect(maxError).toBeLessThan(1e-6);
  });

  it("handles exact and nearly opposite directions without numerical instability", () => {
    for (const progress of [1, 1 - 1e-8]) {
      const from = interpolateStellaOrientation(stellaOrientation(null), stellaOrientation(7), progress);
      const target = stellaOrientation(0, from);
      const view = stellaView(target);
      expect(target.every(Number.isFinite)).toBe(true);
      expect(view.points[0].x).toBeCloseTo(90, 10);
      expect(view.points[0].y).toBeCloseTo(63, 10);
      expect(view.vertices[0][2]).toBeCloseTo(-Math.sqrt(3) / 2, 10);
      expect(rotationAngle(stellaView(from), view)).toBeCloseTo(Math.PI, 6);
    }
  });

  it("lets the current pose determine the hue directions instead of imposing a fixed roll", () => {
    const direct = stellaView(stellaOrientation(7));
    const viaCyan = stellaView(stellaOrientation(7, stellaOrientation(5)));
    expect(direct.points[7]).toEqual(viaCyan.points[7]);
    expect(Math.hypot(direct.points[5].x - viaCyan.points[5].x, direct.points[5].y - viaCyan.points[5].y)).toBeGreaterThan(1);
  });

  it("rotates rigidly without reflection, clipping, scale changes or jumps between every pair of views", () => {
    let maxLengthError = 0;
    let maxProjectionError = 0;
    let maxStep = 0;
    let minMargin = Infinity;
    let minHandedness = Infinity;
    for (const { from, to } of routes) {
      let previous = stellaView(from);
      for (const phase of phases) {
        const view = stellaView(interpolateStellaOrientation(from, to, phase));
        for (const level of levels) {
          const point = view.points[level];
          maxProjectionError = Math.max(
            maxProjectionError,
            Math.abs(point.x - 90 - projectionScale * view.vertices[level][0]),
            Math.abs(point.y - 63 - projectionScale * view.vertices[level][1]),
          );
          minMargin = Math.min(minMargin, point.x - 8.7 - 12, 168 - point.x - 8.7, point.y - 8.7 + 15, 141 - point.y - 8.7);
          maxStep = Math.max(maxStep, Math.hypot(point.x - previous.points[level].x, point.y - previous.points[level].y));
          for (let other = level + 1; other < 8; other++) {
            const length = Math.hypot(...view.vertices[level].map((coordinate, axis) => coordinate - view.vertices[other][axis]));
            const expected = Math.sqrt((level ^ other).toString(2).replace(/0/g, "").length);
            maxLengthError = Math.max(maxLengthError, Math.abs(length - expected));
          }
        }
        const [g, r, b] = [4, 2, 1].map((level) => view.vertices[level].map((value, axis) => value - view.vertices[0][axis]));
        const determinant = g[0] * (r[1] * b[2] - r[2] * b[1]) - g[1] * (r[0] * b[2] - r[2] * b[0]) + g[2] * (r[0] * b[1] - r[1] * b[0]);
        minHandedness = Math.min(minHandedness, determinant);
        previous = view;
      }
    }
    expect(maxLengthError).toBeLessThan(1e-10);
    expect(maxProjectionError).toBeLessThan(1e-10);
    expect(maxStep).toBeLessThan(3);
    expect(minMargin).toBeGreaterThan(0);
    expect(minHandedness).toBeCloseTo(1, 10);
  });

  it("keeps crossing depth correct between every pair of views", () => {
    let strictCrossings = 0;
    let wrongCrossings = 0;
    for (const { from, to } of routes)
      for (const phase of phases) {
        const { vertices, points, orderedEdges } = stellaView(interpolateStellaOrientation(from, to, phase));
        for (let i = 0; i < orderedEdges.length; i++)
          for (let j = i + 1; j < orderedEdges.length; j++) {
            const first = orderedEdges[i],
              second = orderedEdges[j];
            if ([first.a, first.b].some((level) => level === second.a || level === second.b)) continue;
            const a = points[first.a],
              b = points[first.b],
              c = points[second.a],
              d = points[second.b];
            const ab = [b.x - a.x, b.y - a.y],
              cd = [d.x - c.x, d.y - c.y],
              ac = [c.x - a.x, c.y - a.y];
            const determinant = ab[0] * cd[1] - ab[1] * cd[0];
            if (Math.abs(determinant) < 1e-9) continue;
            const t = (ac[0] * cd[1] - ac[1] * cd[0]) / determinant;
            const u = (ac[0] * ab[1] - ac[1] * ab[0]) / determinant;
            if (t <= 1e-9 || t >= 1 - 1e-9 || u <= 1e-9 || u >= 1 - 1e-9) continue;
            const zFirst = vertices[first.a][2] + t * (vertices[first.b][2] - vertices[first.a][2]);
            const zSecond = vertices[second.a][2] + u * (vertices[second.b][2] - vertices[second.a][2]);
            if (Math.abs(zFirst - zSecond) < 1e-9) continue;
            strictCrossings++;
            if (zFirst < zSecond) wrongCrossings++;
          }
      }
    expect(strictCrossings).toBeGreaterThan(100000);
    expect(wrongCrossings).toBe(0);
  });

  it("interpolates continuously and holds an already selected view", () => {
    const pose = stellaOrientation(3);
    const target = stellaOrientation(4, pose);
    expect(interpolateStellaOrientation(pose, target, 0)).toBe(pose);
    expect(interpolateStellaOrientation(pose, target, 1)).toBe(target);
    for (const phase of phases) {
      const held = stellaView(interpolateStellaOrientation(target, target, phase));
      held.vertices.forEach((point, level) =>
        point.forEach((value, axis) => expect(value).toBeCloseTo(stellaView(target).vertices[level][axis], 10)),
      );
    }
  });
});
