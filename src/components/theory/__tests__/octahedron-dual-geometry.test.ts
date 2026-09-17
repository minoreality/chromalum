import { describe, expect, it } from "vitest";
import { TETRA_T0 } from "../../../data/theory-data";
import {
  DUAL_BALL,
  DUAL_CUBE_VERTICES,
  DUAL_CUBE_EDGES,
  DUAL_DIE_FACES,
  DUAL_OCTA_VERTICES,
  DUAL_OCTA_EDGES,
  DUAL_OCTA_FACES,
  dualOctaView,
  projectDualPoint,
} from "../octahedron-dual-geometry";
import { dragStellaOrientation, stellaBallDirection, stellaOrientation, type StellaOrientation } from "../stella-view";

const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((x, i) => x - b[i]));

describe("regular cube and octahedron dual geometry", () => {
  it("places red above every other vertex and cyan below, on the same vertical axis", () => {
    const points = Object.fromEntries(Object.entries(DUAL_OCTA_VERTICES).map(([lv, point]) => [lv, projectDualPoint(point)]));
    expect(points[2].x).toBeCloseTo(points[5].x, 12);
    for (const lv of [1, 3, 4, 6]) {
      expect(points[2].y).toBeLessThan(points[lv].y);
      expect(points[5].y).toBeGreaterThan(points[lv].y);
    }
  });

  it("projects GRB and CMY as equal equilateral triangles with vertical mirror symmetry", () => {
    const points = Object.fromEntries(Object.entries(DUAL_OCTA_VERTICES).map(([lv, point]) => [lv, projectDualPoint(point)]));
    const center = { x: points[2].x, y: (points[2].y + points[5].y) / 2 };
    const radius = center.y - points[2].y;
    for (const point of Object.values(points)) {
      expect(Math.hypot(point.x - center.x, point.y - center.y)).toBeCloseTo(radius, 12);
    }
    for (const [left, right] of [
      [3, 6],
      [1, 4],
    ]) {
      expect(points[left].y).toBeCloseTo(points[right].y, 12);
      expect(center.x - points[left].x).toBeCloseTo(points[right].x - center.x, 12);
    }
    const lengths = [
      [2, 4, 1],
      [5, 3, 6],
    ].flatMap((triangle) =>
      triangle.map((lv, i) => {
        const next = points[triangle[(i + 1) % 3]];
        return Math.hypot(points[lv].x - next.x, points[lv].y - next.y);
      }),
    );
    for (const length of lengths) expect(length).toBeCloseTo(lengths[0], 12);
  });

  it("marks only the three edges of the rear GRB triangle as hidden", () => {
    expect(DUAL_OCTA_EDGES.filter((edge) => edge.hidden).map(({ a, b }) => [a, b])).toEqual([
      [1, 2],
      [1, 4],
      [2, 4],
    ]);
  });

  it("shares all six face centers with the edge midpoints of each color tetrahedron", () => {
    for (const tetra of [TETRA_T0, TETRA_T0.map((lv) => lv ^ 7)]) {
      const members = new Set<number>(tetra);
      for (const face of DUAL_DIE_FACES) {
        const ends = face.vertices.filter((lv) => members.has(lv));
        expect(ends).toHaveLength(2);
        const midpoint = DUAL_CUBE_VERTICES[ends[0]].map((coordinate, axis) => (coordinate + DUAL_CUBE_VERTICES[ends[1]][axis]) / 2);
        expect(distance(midpoint, face.center)).toBeCloseTo(0, 12);
      }
    }
  });

  it("covers every chromatic XOR edge exactly once with the four zero-XOR faces", () => {
    const zeroFaces = DUAL_OCTA_FACES.filter((face) => face.verts.reduce<number>((x, y) => x ^ y, 0) === 0);
    expect(zeroFaces).toHaveLength(4);
    for (const { a, b } of DUAL_OCTA_EDGES) {
      expect(zeroFaces.filter((face) => face.verts.includes(a) && face.verts.includes(b))).toHaveLength(1);
    }
  });

  it("uses the exact cube face centers as the vertices of a regular octahedron", () => {
    for (const { a, b } of DUAL_CUBE_EDGES) expect(distance(DUAL_CUBE_VERTICES[a], DUAL_CUBE_VERTICES[b])).toBeCloseTo(1, 12);
    for (const { a, b } of DUAL_OCTA_EDGES) expect(distance(DUAL_OCTA_VERTICES[a], DUAL_OCTA_VERTICES[b])).toBeCloseTo(Math.SQRT1_2, 12);
    for (const face of DUAL_DIE_FACES) {
      expect(face.vertices).toHaveLength(4);
      for (let axis = 0; axis < 3; axis++) {
        expect(face.center[axis]).toBeCloseTo(face.vertices.reduce((sum, lv) => sum + DUAL_CUBE_VERTICES[lv][axis], 0) / 4, 12);
        expect(DUAL_OCTA_VERTICES[face.lv ^ 7][axis]).toBeCloseTo(-face.center[axis], 12);
      }
      const projected = projectDualPoint(face.center);
      expect(projected.x).toBeCloseTo(face.vertices.reduce((sum, lv) => sum + projectDualPoint(DUAL_CUBE_VERTICES[lv]).x, 0) / 4, 12);
      expect(projected.y).toBeCloseTo(face.vertices.reduce((sum, lv) => sum + projectDualPoint(DUAL_CUBE_VERTICES[lv]).y, 0) / 4, 12);
    }
  });

  it("preserves incidence for all eight dual triangles and twelve dual edges", () => {
    for (const face of DUAL_OCTA_FACES) {
      const incident = DUAL_DIE_FACES.filter((square) => square.vertices.includes(face.color))
        .map((square) => square.lv)
        .sort();
      expect([...face.verts].sort()).toEqual(incident);
      expect(face.hidden).toBe(DUAL_CUBE_VERTICES[face.color][2] > 0);
    }
    for (const { a, b } of DUAL_OCTA_EDGES) {
      const left = DUAL_DIE_FACES.find((face) => face.lv === a)!;
      const right = DUAL_DIE_FACES.find((face) => face.lv === b)!;
      const shared = left.vertices.filter((vertex) => right.vertices.includes(vertex));
      expect(shared).toHaveLength(2);
      expect(DUAL_CUBE_EDGES.some((edge) => shared.includes(edge.a) && shared.includes(edge.b))).toBe(true);
    }
  });

  it("keeps every projected triangle open and all six chromatic vertex labels apart", () => {
    for (const face of DUAL_OCTA_FACES) {
      const [a, b, c] = face.verts.map((lv) => projectDualPoint(DUAL_OCTA_VERTICES[lv]));
      const area = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
      expect(area).toBeGreaterThan(2000);
    }
    const points = Object.values(DUAL_OCTA_VERTICES).map(projectDualPoint);
    points.forEach((point, index) => {
      for (const other of points.slice(index + 1)) {
        expect(Math.hypot(point.x - other.x, point.y - other.y)).toBeGreaterThan(44);
      }
    });
  });

  it("grabs a ball through the vertex centers, so a drag across a diameter is a half turn", () => {
    // The drag grips a sphere, and that sphere is the one the six vertices sit on.
    // A vertex reaches the rim when it crosses the silhouette and never passes it.
    let furthest = 0;
    for (let step = 0; step < 2000; step++) {
      const raw = [Math.sin(step), Math.cos(step * 1.7), Math.sin(step * 2.3), Math.cos(step * 0.6)] as const;
      const length = Math.hypot(...raw);
      const pose = raw.map((part) => part / length) as unknown as StellaOrientation;
      for (const point of Object.values(dualOctaView(pose).points)) {
        furthest = Math.max(furthest, Math.hypot(point.x - DUAL_BALL.centreX, point.y - DUAL_BALL.centreY));
      }
    }
    expect(furthest).toBeLessThanOrEqual(DUAL_BALL.radius + 1e-9);
    expect(furthest).toBeCloseTo(DUAL_BALL.radius, 6);

    // The centre of the figure grips the near pole, never the far side.
    expect(stellaBallDirection(DUAL_BALL.centreX, DUAL_BALL.centreY, "sphere", DUAL_BALL)).toEqual([0, 0, -1]);

    // Opposite points of the rim are antipodal, which makes a diameter a half turn.
    const left = stellaBallDirection(DUAL_BALL.centreX - DUAL_BALL.radius, DUAL_BALL.centreY, "sphere", DUAL_BALL);
    const right = stellaBallDirection(DUAL_BALL.centreX + DUAL_BALL.radius, DUAL_BALL.centreY, "sphere", DUAL_BALL);
    expect(left[0] * right[0] + left[1] * right[1] + left[2] * right[2]).toBeCloseTo(-1, 9);

    // Past the rim the grip stays on the equator instead of wrapping to the back.
    for (const beyond of [1.2, 2, 6]) {
      const outside = stellaBallDirection(DUAL_BALL.centreX + DUAL_BALL.radius * beyond, DUAL_BALL.centreY, "sphere", DUAL_BALL);
      expect(outside[2]).toBeCloseTo(0, 9);
      expect(Math.hypot(...outside)).toBeCloseTo(1, 9);
    }
  });

  it("hands back its edges farthest first, so the nearest one wins a pointer at a crossing", () => {
    for (let step = 0; step < 500; step++) {
      const raw = [Math.sin(step * 1.1), Math.cos(step * 1.9), Math.sin(step * 0.7), Math.cos(step * 2.5)] as const;
      const length = Math.hypot(...raw);
      const pose = raw.map((part) => part / length) as unknown as StellaOrientation;
      const view = dualOctaView(pose);
      const depth = (edge: { a: number; b: number }) => (view.vertices[edge.a][2] + view.vertices[edge.b][2]) / 2;
      for (let i = 1; i < view.edges.length; i++) {
        expect(depth(view.edges[i - 1])).toBeGreaterThanOrEqual(depth(view.edges[i]) - 1e-12);
      }
      // A fully hidden edge can never end up in front of a visible one.
      const lastHidden = view.edges.map((edge) => edge.hidden).lastIndexOf(true);
      const firstVisible = view.edges.findIndex((edge) => !edge.hidden);
      if (lastHidden >= 0 && firstVisible >= 0) expect(lastHidden).toBeLessThan(firstVisible + view.edges.length);
      expect(view.edges).toHaveLength(12);
    }
  });

  it("turns the near side the way the pointer goes, so a drag pulls the face you took hold of", () => {
    // The viewer sits at -z, so the near vertices are the ones with the smaller z,
    // and they are the ones drawn solid rather than dashed.
    const rest = stellaOrientation(null);
    const before = dualOctaView(rest);
    const near = Object.keys(before.vertices)
      .map(Number)
      .filter((lv) => before.vertices[lv][2] < 0);
    const far = Object.keys(before.vertices)
      .map(Number)
      .filter((lv) => before.vertices[lv][2] > 0);
    expect(near).toHaveLength(3);
    expect(far).toHaveLength(3);
    // Those near vertices carry the visible edges; the hidden ones are the far triangle.
    for (const edge of before.edges.filter((e) => e.hidden)) {
      expect(far).toContain(edge.a);
      expect(far).toContain(edge.b);
    }

    const grab = stellaBallDirection(DUAL_BALL.centreX, DUAL_BALL.centreY, "sphere", DUAL_BALL);
    for (const [label, dx, dy] of [
      ["right", DUAL_BALL.radius * 0.3, 0],
      ["left", -DUAL_BALL.radius * 0.3, 0],
      ["down", 0, DUAL_BALL.radius * 0.3],
      ["up", 0, -DUAL_BALL.radius * 0.3],
    ] as const) {
      const pointer = stellaBallDirection(DUAL_BALL.centreX + dx, DUAL_BALL.centreY + dy, "sphere", DUAL_BALL);
      const after = dualOctaView(dragStellaOrientation(rest, grab, pointer));
      for (const lv of near) {
        const moved = [after.points[lv].x - before.points[lv].x, after.points[lv].y - before.points[lv].y];
        expect(moved[0] * dx + moved[1] * dy, "near vertex " + lv + " should follow a drag " + label).toBeGreaterThan(0);
      }
      for (const lv of far) {
        const moved = [after.points[lv].x - before.points[lv].x, after.points[lv].y - before.points[lv].y];
        expect(moved[0] * dx + moved[1] * dy, "far vertex " + lv + " should go against a drag " + label).toBeLessThan(0);
      }
    }
  });
});
