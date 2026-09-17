import { describe, expect, it } from "vitest";
import { K8_EXPLORER_POINTS, K8_EXPLORER_VERTICES_3D } from "../../../data/theory-data";
import {
  dragStellaOrientation,
  interpolateStellaOrientation,
  linearStellaOrientation,
  stellaBallDirection,
  stellaOrientation,
  stellaSpin,
  stellaView,
  STELLA_BALL_RADIUS,
  STELLA_CENTRE,
  STELLA_SPIN_MAX,
  STELLA_TURN_STEP,
  turnStellaOrientation,
} from "../stella-view";

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

describe("Stella keypad turns", () => {
  const defaultView = stellaView(stellaOrientation(null));
  // The keypad read as a direction pad: [up, right] around 5.
  const DIRECTIONS = {
    7: [1, -1],
    8: [1, 0],
    9: [1, 1],
    4: [0, -1],
    6: [0, 1],
    1: [-1, -1],
    2: [-1, 0],
    3: [-1, 1],
  } as const;
  const press = (key: keyof typeof DIRECTIONS, from = stellaOrientation(null)) =>
    turnStellaOrientation(from, DIRECTIONS[key][0], DIRECTIONS[key][1], STELLA_TURN_STEP);

  it("turns by the same step for every key, diagonals included", () => {
    for (const key of Object.keys(DIRECTIONS).map(Number) as (keyof typeof DIRECTIONS)[]) {
      expect(rotationAngle(defaultView, stellaView(press(key)))).toBeCloseTo(STELLA_TURN_STEP, 10);
    }
  });

  it("pushes up and down about the screen's horizontal axis, left and right about its vertical one", () => {
    // Screen x is horizontal and screen y is vertical, so a straight push
    // leaves the coordinate along its own axis of rotation untouched.
    for (const [key, held] of [
      [8, 0],
      [2, 0],
      [4, 1],
      [6, 1],
    ] as const) {
      const after = stellaView(press(key));
      for (const level of levels) {
        expect(after.vertices[level][held]).toBeCloseTo(defaultView.vertices[level][held], 10);
      }
    }
  });

  it("moves the top of the graph toward the viewer when pushed up, and away when pushed down", () => {
    const top = levels.reduce((best, level) => (defaultView.vertices[level][1] < defaultView.vertices[best][1] ? level : best), 0);
    // Depth runs away from the viewer, so a smaller z is nearer.
    expect(stellaView(press(8)).vertices[top][2]).toBeLessThan(defaultView.vertices[top][2]);
    expect(stellaView(press(2)).vertices[top][2]).toBeGreaterThan(defaultView.vertices[top][2]);
  });

  it("splits each diagonal between its two straight neighbours", () => {
    for (const [diagonal, vertical, horizontal] of [
      [7, 8, 4],
      [9, 8, 6],
      [1, 2, 4],
      [3, 2, 6],
    ] as const) {
      const after = stellaView(press(diagonal));
      expect(rotationAngle(stellaView(press(vertical)), after)).toBeLessThan(STELLA_TURN_STEP);
      expect(rotationAngle(stellaView(press(horizontal)), after)).toBeLessThan(STELLA_TURN_STEP);
      expect(rotationAngle(stellaView(press(vertical)), after)).toBeGreaterThan(STELLA_TURN_STEP / 2);
    }
  });

  it("undoes any press with the key opposite it on the pad", () => {
    for (const [key, opposite] of [
      [8, 2],
      [4, 6],
      [7, 3],
      [9, 1],
    ] as const) {
      for (const start of poses) {
        const back = stellaView(press(opposite, press(key, start)));
        const origin = stellaView(start);
        for (const level of levels) {
          for (const coord of [0, 1, 2]) {
            expect(back.vertices[level][coord]).toBeCloseTo(origin.vertices[level][coord], 8);
          }
        }
      }
    }
  });

  it("returns to the starting projection after a full turn of presses", () => {
    for (const key of [8, 6, 9] as const) {
      let orientation = stellaOrientation(null);
      for (let count = 0; count < Math.round((2 * Math.PI) / STELLA_TURN_STEP); count++) {
        orientation = press(key, orientation);
      }
      const after = stellaView(orientation);
      for (const level of levels) {
        for (const coord of [0, 1, 2]) {
          expect(after.vertices[level][coord]).toBeCloseTo(defaultView.vertices[level][coord], 8);
        }
      }
    }
  });
});

describe("Stella drag turns", () => {
  const defaultView = stellaView(stellaOrientation(null));
  const surfaceOf = (level: number, orientation = stellaOrientation(null)) => {
    const point = stellaView(orientation).points[level];
    return [point.x, point.y] as const;
  };
  const spot = (fractionX: number, fractionY = 0) =>
    [STELLA_CENTRE.x + STELLA_BALL_RADIUS * fractionX, STELLA_CENTRE.y + STELLA_BALL_RADIUS * fractionY] as const;

  it("lays the authored default out exactly where the projection puts it", () => {
    // The ball a drag turns is the sphere the vertices are drawn on, so the
    // first drag out of the authored layout must not jump.
    for (const level of levels) {
      const vertex = K8_EXPLORER_VERTICES_3D[level];
      const scale = STELLA_BALL_RADIUS / Math.hypot(...vertex);
      expect(K8_EXPLORER_POINTS[level].x).toBeCloseTo(STELLA_CENTRE.x + scale * vertex[0], 6);
      expect(K8_EXPLORER_POINTS[level].y).toBeCloseTo(STELLA_CENTRE.y + scale * vertex[1], 6);
    }
  });

  it("uses the figure's own circumscribed sphere as the ball", () => {
    // All eight vertices are corners of one cube, so they share a sphere.
    const norms = levels.map((level) => Math.hypot(...K8_EXPLORER_VERTICES_3D[level]));
    for (const norm of norms) expect(norm).toBeCloseTo(norms[0], 12);
    const unitsPerModel = STELLA_BALL_RADIUS / norms[0];

    for (const pose of poses) {
      const view = stellaView(pose);
      for (const level of levels) {
        const point = view.points[level];
        const flat = Math.hypot(point.x - STELLA_CENTRE.x, point.y - STELLA_CENTRE.y);
        const depth = unitsPerModel * view.vertices[level][2];
        // Every vertex sits on the ball in every pose, so none can fall outside
        // its rim, and one reaches the rim exactly when it crosses the silhouette.
        expect(Math.hypot(flat, depth)).toBeCloseTo(STELLA_BALL_RADIUS, 9);
        expect(flat).toBeLessThanOrEqual(STELLA_BALL_RADIUS + 1e-9);
      }
    }
  });

  describe.each(["sphere", "sheet"] as const)("with the %s grip", (grip) => {
    const held = (fractionX: number, fractionY = 0) => stellaBallDirection(...spot(fractionX, fractionY), grip);

    it("only ever takes hold of the face of the ball, never the far side", () => {
      // Every point of the figure, including where a far vertex is drawn.
      for (const level of levels) expect(stellaBallDirection(...surfaceOf(level), grip)[2]).toBeLessThanOrEqual(0);
      for (const fraction of [0, 0.5, 1, 4]) expect(held(fraction)[2]).toBeLessThanOrEqual(0);
    });

    it("puts the centre on the near pole and matches the sphere across the middle", () => {
      expect(held(0)).toEqual([0, 0, -1]);
      for (const fraction of [0.25, 0.5, Math.SQRT1_2]) {
        const direction = held(fraction);
        expect(Math.hypot(...direction)).toBeCloseTo(1, 12);
        expect(Math.acos(-direction[2])).toBeCloseTo(Math.asin(fraction), 12);
      }
    });

    it("keeps a vertex on the sphere exactly under the pointer", () => {
      // Where the grip is the figure's own surface it is exact, and a vertex
      // there doubles as a visible probe. Both grips share that middle.
      const probes = levels.filter((level) => {
        const [x, y] = surfaceOf(level);
        return (
          Math.hypot(x - STELLA_CENTRE.x, y - STELLA_CENTRE.y) <= STELLA_BALL_RADIUS * Math.SQRT1_2 && defaultView.vertices[level][2] < 0
        );
      });
      expect(probes.length).toBeGreaterThan(0);
      for (const level of probes) {
        const grabbed = stellaBallDirection(...surfaceOf(level), grip);
        for (const target of [spot(0), spot(0.4, -0.3), spot(-0.45, 0.2)]) {
          const pointer = stellaBallDirection(target[0], target[1], grip);
          const [x, y] = surfaceOf(level, dragStellaOrientation(stellaOrientation(null), grabbed, pointer));
          expect(x).toBeCloseTo(target[0], 6);
          expect(y).toBeCloseTo(target[1], 6);
        }
      }
    });

    it("turns the same way from a far vertex as from any other spot beside it", () => {
      const pullRight = (from: readonly [number, number]) =>
        dragStellaOrientation(
          stellaOrientation(null),
          stellaBallDirection(from[0], from[1], grip),
          stellaBallDirection(from[0] + STELLA_BALL_RADIUS * 0.3, from[1], grip),
        );
      // Whatever is drawn under the press, a rightward pull spins the same way.
      const signs = levels.map((level) => Math.sign(pullRight(surfaceOf(level))[1]));
      expect(new Set(signs).size).toBe(1);
      expect(signs[0]).not.toBe(0);
    });

    it("lands on the same pose however the drag is split into moves", () => {
      const grabbed = held(0);
      const end = spot(0.8, -0.2);
      const direct = dragStellaOrientation(stellaOrientation(null), grabbed, stellaBallDirection(end[0], end[1], grip));
      // Intermediate moves never feed back, so the path cannot drift.
      for (const fraction of [0.2, 0.5, 0.9]) {
        dragStellaOrientation(stellaOrientation(null), grabbed, held(0.8 * fraction, -0.2 * fraction));
      }
      expect(dragStellaOrientation(stellaOrientation(null), grabbed, stellaBallDirection(end[0], end[1], grip))).toEqual(direct);
    });

    it("rolls the figure when the pointer circles it from outside", () => {
      const far = (angle: number) => held(Math.cos(angle) * 20, Math.sin(angle) * 20);
      const rolled = dragStellaOrientation(stellaOrientation(null), far(0), far(Math.PI / 2));
      expect(Math.abs(rolled[0])).toBeLessThan(0.01);
      expect(Math.abs(rolled[1])).toBeLessThan(0.01);
      expect(Math.abs(rolled[2])).toBeGreaterThan(0.6);
      const after = stellaView(rolled);
      for (const level of levels) expect(after.vertices[level][2]).toBeCloseTo(defaultView.vertices[level][2], 2);
      expect(rotationAngle(defaultView, after)).toBeCloseTo(Math.PI / 2, 2);
    });
  });

  it("stops growing at the rim with the sphere grip and keeps going with the sheet", () => {
    const turnTo = (fraction: number, grip: "sphere" | "sheet") =>
      rotationAngle(
        defaultView,
        stellaView(
          dragStellaOrientation(
            stellaOrientation(null),
            stellaBallDirection(...spot(0), grip),
            stellaBallDirection(...spot(fraction), grip),
          ),
        ),
      );
    // The sphere reaches a quarter turn at the rim and holds there.
    expect(turnTo(1, "sphere")).toBeCloseTo(Math.PI / 2, 6);
    for (const fraction of [1.5, 4, 20]) expect(turnTo(fraction, "sphere")).toBeCloseTo(Math.PI / 2, 6);
    // The sheet keeps turning, easing toward a quarter turn it never takes.
    let previous = turnTo(Math.SQRT1_2, "sheet");
    for (const fraction of [1, 2, 5, 20]) {
      const angle = turnTo(fraction, "sheet");
      expect(angle).toBeGreaterThan(previous);
      expect(angle).toBeLessThan(Math.PI / 2);
      previous = angle;
    }
  });

  it("joins the sphere to the sheet without a step or a crease", () => {
    const depthAt = (fraction: number) => -stellaBallDirection(...spot(fraction), "sheet")[2];
    const step = 1e-6;
    // The surface falls at a slope of one where the two meet, so samples that
    // close together may differ by about their separation and no more.
    expect(Math.abs(depthAt(Math.SQRT1_2 + step) - depthAt(Math.SQRT1_2 - step))).toBeLessThan(3 * step);
    const before = (depthAt(Math.SQRT1_2 - step) - depthAt(Math.SQRT1_2 - 2 * step)) / step;
    const after = (depthAt(Math.SQRT1_2 + 2 * step) - depthAt(Math.SQRT1_2 + step)) / step;
    expect(after).toBeCloseTo(before, 3);
  });

  it("turns the figure over when the sheet grip is swept right across it", () => {
    const flipped = dragStellaOrientation(
      stellaOrientation(null),
      stellaBallDirection(...spot(-20), "sheet"),
      stellaBallDirection(...spot(20), "sheet"),
    );
    expect(rotationAngle(defaultView, stellaView(flipped))).toBeGreaterThan((Math.PI * 170) / 180);
  });
});

describe("Stella spin rate", () => {
  const spotAt = (fractionX: number, fractionY = 0) =>
    [STELLA_CENTRE.x + STELLA_BALL_RADIUS * fractionX, STELLA_CENTRE.y + STELLA_BALL_RADIUS * fractionY] as const;

  it("stays still anywhere on the ball and starts from a standstill at its rim", () => {
    for (const fraction of [0, 0.25, 0.5, 0.9]) expect(stellaSpin(...spotAt(fraction)).rate).toBe(0);
    // The rim itself is the standstill, to within the arithmetic that finds it.
    expect(stellaSpin(...spotAt(1)).rate).toBeCloseTo(0, 12);
    // Just outside, the speed is a thousandth of full, so crossing out cannot jerk.
    const justOut = stellaSpin(...spotAt(1.001)).rate;
    expect(justOut).toBeGreaterThan(0);
    expect(justOut).toBeLessThan(STELLA_SPIN_MAX / 100);
  });

  it("reaches full speed a radius beyond the rim and holds it however far out", () => {
    expect(stellaSpin(...spotAt(1.5)).rate).toBeCloseTo(STELLA_SPIN_MAX / 2, 12);
    for (const fraction of [2, 5, 50]) expect(stellaSpin(...spotAt(fraction)).rate).toBeCloseTo(STELLA_SPIN_MAX, 12);
  });

  it("carries the near face the way the hand went, whichever way that was", () => {
    // A unit heading for turnStellaOrientation. It points back toward the centre,
    // because dragging the face of a ball one way turns it the other.
    for (const [place, up, right] of [
      [spotAt(2, 0), 0, -1],
      [spotAt(-2, 0), 0, 1],
      [spotAt(0, -2), -1, 0],
      [spotAt(0, 2), 1, 0],
    ] as const) {
      const heading = stellaSpin(place[0], place[1]);
      expect(heading.up).toBeCloseTo(up, 12);
      expect(heading.right).toBeCloseTo(right, 12);
    }
    const diagonal = stellaSpin(...spotAt(2, -2));
    expect(Math.hypot(diagonal.up, diagonal.right)).toBeCloseTo(1, 12);
    expect(diagonal.up).toBeCloseTo(diagonal.right, 12);
    expect(diagonal.up).toBeLessThan(0);
  });

  it("goes on turning the way the drag that reached it was already turning", () => {
    // Crossing the rim must not reverse anything, so the spin has to turn about
    // the same axis the drag was turning about as it went out.
    const start = stellaOrientation(null);
    const grabbed = stellaBallDirection(STELLA_CENTRE.x, STELLA_CENTRE.y, "sphere");
    for (const [fractionX, fractionY] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0.8, -0.6],
    ] as const) {
      const heading = stellaBallDirection(
        STELLA_CENTRE.x + STELLA_BALL_RADIUS * 0.4 * fractionX,
        STELLA_CENTRE.y + STELLA_BALL_RADIUS * 0.4 * fractionY,
        "sphere",
      );
      const dragged = dragStellaOrientation(start, grabbed, heading);
      const spin = stellaSpin(STELLA_CENTRE.x + STELLA_BALL_RADIUS * 2 * fractionX, STELLA_CENTRE.y + STELLA_BALL_RADIUS * 2 * fractionY);
      const spun = turnStellaOrientation(start, spin.up, spin.right, 0.2);
      // Both start from the same pose, so their axes are directly comparable.
      const dragAxis = [dragged[0], dragged[1], dragged[2]];
      const spinAxis = [spun[0], spun[1], spun[2]];
      const along =
        (dragAxis[0] * spinAxis[0] + dragAxis[1] * spinAxis[1] + dragAxis[2] * spinAxis[2]) /
        (Math.hypot(...dragAxis) * Math.hypot(...spinAxis));
      expect(along).toBeCloseTo(1, 9);
    }
  });
});

describe("Stella drag with no ball under it", () => {
  const defaultView = stellaView(stellaOrientation(null));
  const start = stellaOrientation(null);
  const from = [STELLA_CENTRE.x, STELLA_CENTRE.y] as const;
  const turnOf = (dx: number, dy = 0) =>
    rotationAngle(defaultView, stellaView(linearStellaOrientation(start, from[0], from[1], from[0] + dx, from[1] + dy)));

  it("turns in step with the distance the hand has gone", () => {
    for (const fraction of [0.25, 0.5, 1, 1.5]) {
      expect(turnOf(STELLA_BALL_RADIUS * fraction)).toBeCloseTo((Math.PI / 2) * fraction, 9);
    }
  });

  it("agrees with the ball at the centre and at its rim", () => {
    // The two anchors the other grips share: nothing at the centre, a quarter
    // turn one radius out. In between this one runs straight where they curve.
    // acos cannot resolve a standstill any finer than this.
    expect(turnOf(0)).toBeCloseTo(0, 6);
    expect(turnOf(STELLA_BALL_RADIUS)).toBeCloseTo(Math.PI / 2, 9);
    const ball = rotationAngle(
      defaultView,
      stellaView(
        dragStellaOrientation(
          start,
          stellaBallDirection(from[0], from[1], "sphere"),
          stellaBallDirection(from[0] + STELLA_BALL_RADIUS * 0.5, from[1], "sphere"),
        ),
      ),
    );
    expect(turnOf(STELLA_BALL_RADIUS * 0.5)).toBeGreaterThan(ball);
  });

  it("has no ceiling, turning right past a full revolution", () => {
    // Twice the diameter is a whole turn, and it keeps going from there.
    const full = linearStellaOrientation(start, from[0], from[1], from[0] + 4 * STELLA_BALL_RADIUS, from[1]);
    const after = stellaView(full);
    for (const level of levels) {
      for (const coord of [0, 1, 2]) expect(after.vertices[level][coord]).toBeCloseTo(defaultView.vertices[level][coord], 9);
    }
    // Half of that is the half turn, so the middle of the range is not a fixed point.
    expect(turnOf(2 * STELLA_BALL_RADIUS)).toBeCloseTo(Math.PI, 9);
  });

  it("carries the near face the way the hand goes, whichever way that is", () => {
    // The same direction the ball grip would take for a small drag, so switching
    // grips mid-thought never reverses anything.
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0.6, -0.8],
    ] as const) {
      const step = STELLA_BALL_RADIUS * 0.3;
      const linear = linearStellaOrientation(start, from[0], from[1], from[0] + dx * step, from[1] + dy * step);
      const ball = dragStellaOrientation(
        start,
        stellaBallDirection(from[0], from[1], "sphere"),
        stellaBallDirection(from[0] + dx * step, from[1] + dy * step, "sphere"),
      );
      const along =
        (linear[0] * ball[0] + linear[1] * ball[1] + linear[2] * ball[2]) /
        (Math.hypot(linear[0], linear[1], linear[2]) * Math.hypot(ball[0], ball[1], ball[2]));
      expect(along).toBeCloseTo(1, 9);
    }
  });

  it("comes back to where it started when the hand does", () => {
    // Measured from the press, so wandering out and back leaves no trace.
    const wandered = linearStellaOrientation(start, from[0], from[1], from[0] + 900, from[1] - 400);
    expect(rotationAngle(defaultView, stellaView(wandered))).toBeGreaterThan(0.5);
    expect(linearStellaOrientation(start, from[0], from[1], from[0], from[1])).toBe(start);
  });
});
