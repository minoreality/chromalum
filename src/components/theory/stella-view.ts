import {
  CUBE_EDGES,
  STELLA_EDGES,
  COMPLEMENT_EDGES,
  THEORY_LEVELS,
  K8_EXPLORER_POINTS,
  K8_EXPLORER_VERTICES_3D,
  hammingDist,
} from "../../data/theory-data";
import { compareDepth, edgeDepth, projectOrthographic, type Point3 } from "../../utils/geometry-3d";

export type { Point3 } from "../../utils/geometry-3d";
export type StellaOrientation = readonly [number, number, number, number];
const point3 = (valueAt: (axis: number) => number): Point3 => [valueAt(0), valueAt(1), valueAt(2)];
const quaternion = (valueAt: (axis: number) => number): StellaOrientation => [valueAt(0), valueAt(1), valueAt(2), valueAt(3)];
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Point3, b: Point3): Point3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const defaultOrientation: StellaOrientation = [0, 0, 0, 1];

function rotate(point: Point3, orientation: StellaOrientation): Point3 {
  const axis: Point3 = [orientation[0], orientation[1], orientation[2]];
  const first = cross(axis, point);
  const second = cross(axis, first);
  return point3((coordinate) => point[coordinate] + 2 * (orientation[3] * first[coordinate] + second[coordinate]));
}

/** Apply `turn` after `from` and renormalize, giving one combined orientation. */
function composeStellaOrientation(turn: StellaOrientation, from: StellaOrientation): StellaOrientation {
  const turnAxis: Point3 = [turn[0], turn[1], turn[2]];
  const fromAxis: Point3 = [from[0], from[1], from[2]];
  const product = cross(turnAxis, fromAxis);
  const q: StellaOrientation = [
    ...point3((axis) => turn[3] * fromAxis[axis] + from[3] * turnAxis[axis] + product[axis]),
    turn[3] * from[3] - dot(turnAxis, fromAxis),
  ];
  const length = Math.hypot(...q);
  return quaternion((axis) => q[axis] / length);
}

/** One keyboard nudge. Twenty-four of them complete a full turn. */
export const STELLA_TURN_STEP = Math.PI / 12;

/**
 * Turn the graph one step toward a screen direction, as a keypad arrow reads:
 * `up` is positive toward the top of the screen, `right` toward its right side.
 * Pushing it up rolls the far side over the top, so the top face comes forward.
 * Screen x points right and screen y points down, so the axis for a push is
 * perpendicular to it in that plane. Diagonals turn by the same step as the
 * straight directions, keeping every press the same size.
 */
export function turnStellaOrientation(from: StellaOrientation, up: number, right: number, radians: number): StellaOrientation {
  const length = Math.hypot(up, right);
  if (length === 0) return from;
  const half = radians / 2;
  const sine = Math.sin(half) / length;
  return composeStellaOrientation([up * sine, right * sine, 0, Math.cos(half)], from);
}

/** Where the ball gives way to the sheet that continues it, as Bell's trackball sets it. */
const BALL_SPHERE_LIMIT = Math.SQRT1_2;

/**
 * How far out a drag still finds something to hold on to.
 *
 * `sphere` is the ball the figure is drawn on and nothing more. A vertex on it
 * follows the pointer exactly, and past the rim the grip slides onto the
 * silhouette, so the turn stops growing and the figure only rolls.
 *
 * `sheet` continues that ball past `1/√2` of its radius with the hyperbolic
 * sheet `1/2r`, which meets it at the same height and the same slope. The grip
 * never runs out, so a drag that leaves the figure keeps turning it, easing off
 * as it goes; in exchange only the middle of the ball follows exactly.
 */
export type StellaGrip = "sphere" | "sheet" | "spin" | "linear";

/**
 * Turn `base` by a drag from one point of the drawing surface to another, with
 * no ball under it at all: the turn simply follows how far the hand has gone, at
 * the rate the ball turns at its pole, so it agrees with the other grips near the
 * centre and then keeps going. A drag across the ball's diameter is half a
 * revolution, and nothing stops a longer one from turning further.
 */
export function linearStellaOrientation(
  base: StellaOrientation,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  ball: StellaBall = STELLA_BALL,
): StellaOrientation {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return base;
  // Carrying the near face along with the hand turns about the axis across it.
  return turnStellaOrientation(base, dy, -dx, (distance * Math.PI) / (2 * ball.radius));
}

/** Full speed for a drag that keeps turning the figure on its own, in radians a second. */
export const STELLA_SPIN_MAX = (2 * Math.PI) / 3;

/**
 * How a held drag that has left the ball keeps turning it, as `up` and `right`
 * for `turnStellaOrientation` plus a rate in radians a second. The rate starts
 * from a standstill at the rim, so taking hold and crossing out never jerks, and
 * reaches full speed one radius beyond it, where it stays however far out it goes.
 *
 * A drag carries the near face of the ball along with the hand, which turns the
 * figure the opposite way from aiming the camera at that side, so the heading is
 * the reverse of where the pointer has gone. Without that, crossing the rim would
 * reverse the turn the drag had already started.
 */
export function stellaSpin(
  surfaceX: number,
  surfaceY: number,
  ball: StellaBall = STELLA_BALL,
): { up: number; right: number; rate: number } {
  const u = (surfaceX - ball.centreX) / ball.radius;
  const v = (surfaceY - ball.centreY) / ball.radius;
  const radius = Math.hypot(u, v);
  if (radius <= 1) return { up: 0, right: 0, rate: 0 };
  return { up: v / radius, right: -u / radius, rate: Math.min(1, radius - 1) * STELLA_SPIN_MAX };
}

/** Turn a point of the model by an orientation. */
export function rotateStellaPoint(point: Point3, orientation: StellaOrientation): Point3 {
  return rotate(point, orientation);
}

/**
 * Where a point on the drawing surface meets the trackball. A hand can only
 * reach the face of a ball, so this is always the side facing the viewer,
 * whatever the figure happens to be drawing there; depth runs away from the
 * viewer, hence the negative z.
 */
export function stellaBallDirection(surfaceX: number, surfaceY: number, grip: StellaGrip, ball: StellaBall = STELLA_BALL): Point3 {
  const u = (surfaceX - ball.centreX) / ball.radius;
  const v = (surfaceY - ball.centreY) / ball.radius;
  const radius = Math.hypot(u, v);
  if (grip === "sphere") {
    if (radius >= 1) return [u / radius, v / radius, 0];
    return [u, v, -Math.sqrt(1 - radius * radius)];
  }
  const depth = radius <= BALL_SPHERE_LIMIT ? Math.sqrt(1 - radius * radius) : 1 / (2 * radius);
  const length = Math.hypot(radius, depth);
  return [u / length, v / length, -depth / length];
}

/** The shortest rotation carrying one unit direction onto another. */
function rotationBetween(from: Point3, to: Point3): StellaOrientation {
  const axis = cross(from, to);
  const w = 1 + dot(from, to);
  if (w < 1e-9) {
    // Opposite directions: every perpendicular axis is an equally short half turn.
    const aside: Point3 = Math.abs(from[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const perpendicular = cross(from, aside);
    const length = Math.hypot(...perpendicular) || 1;
    return [perpendicular[0] / length, perpendicular[1] / length, perpendicular[2] / length, 0];
  }
  const q: StellaOrientation = [axis[0], axis[1], axis[2], w];
  const length = Math.hypot(...q);
  return quaternion((index) => q[index] / length);
}

/**
 * Turn `base` so the grabbed direction lands under the pointer. Measured from
 * the pose the drag started in, so the grabbed point tracks the cursor exactly
 * however the drag is split into moves.
 */
export function dragStellaOrientation(base: StellaOrientation, grabbed: Point3, pointer: Point3): StellaOrientation {
  return composeStellaOrientation(rotationBetween(grabbed, pointer), base);
}

export function stellaOrientation(frontLevel: number | null, from: StellaOrientation = defaultOrientation): StellaOrientation {
  if (frontLevel === null) return defaultOrientation;
  const [x, y, z] = rotate(K8_EXPLORER_VERTICES_3D[frontLevel], from);
  const planar = Math.hypot(x, y);
  if (planar < 1e-12 && z < 0) return from;

  // Turn the current vertex direction toward the viewer (-z), with no extra
  // roll. atan2 stays accurate even for almost aligned or opposite directions.
  const halfAngle = Math.atan2(planar, -z) / 2;
  const sine = Math.sin(halfAngle);
  const cosine = Math.cos(halfAngle);
  // For an exact half-turn, any perpendicular axis is minimal; choose screen x.
  const turn: Point3 = planar < 1e-12 ? [sine, 0, 0] : [(-y / planar) * sine, (x / planar) * sine, 0];
  const target = composeStellaOrientation([turn[0], turn[1], turn[2], cosine], from);
  if (from !== defaultOrientation) return target;

  // The first node view after the default projection sets a common reading
  // direction. Later shortest turns between settled node views preserve the
  // upright hexagon without keeping any particular edge color at the top.
  const red = rotate(K8_EXPLORER_VERTICES_3D[frontLevel ^ 2], target);
  const halfRoll = (-Math.PI / 2 - Math.atan2(red[1], red[0])) / 2;
  const s = Math.sin(halfRoll),
    c = Math.cos(halfRoll);
  return [c * target[0] - s * target[1], c * target[1] + s * target[0], c * target[2] + s * target[3], c * target[3] - s * target[2]];
}

export function interpolateStellaOrientation(from: StellaOrientation, to: StellaOrientation, progress: number): StellaOrientation {
  if (progress <= 0) return from;
  if (progress >= 1) return to;
  const cosine = from.reduce((sum, value, axis) => sum + value * to[axis], 0);
  // q and -q represent the same orientation; take the shorter rotation.
  const sign = cosine < 0 ? -1 : 1;
  const angle = Math.acos(Math.min(1, Math.abs(cosine)));
  const sine = Math.sin(angle);
  const a = sine < 1e-6 ? 1 - progress : Math.sin((1 - progress) * angle) / sine;
  const b = sine < 1e-6 ? progress : Math.sin(progress * angle) / sine;
  const q = quaternion((axis) => a * from[axis] + sign * b * to[axis]);
  const length = Math.hypot(...q);
  return quaternion((axis) => q[axis] / length);
}

const scale = (K8_EXPLORER_POINTS[2].x - K8_EXPLORER_POINTS[0].x) / (K8_EXPLORER_VERTICES_3D[2][0] - K8_EXPLORER_VERTICES_3D[0][0]);
/** The drawing surface the figure is laid out on, shared with the svg element. */
export const STELLA_VIEWBOX = { x: 12, y: -15, size: 156 } as const;
/** Where the model's origin lands on that surface. */
export const STELLA_CENTRE = { x: 90, y: 63 } as const;
/** The eight vertices sit on this sphere, which is also the ball a drag turns. */
export const STELLA_BALL_RADIUS = scale * Math.hypot(...K8_EXPLORER_VERTICES_3D[0]);

/** The ball a drag takes hold of, in the units the figure is drawn in. */
export interface StellaBall {
  readonly centreX: number;
  readonly centreY: number;
  readonly radius: number;
}

/** The K₈ graph's own ball; other figures pass their own. */
export const STELLA_BALL: StellaBall = { centreX: STELLA_CENTRE.x, centreY: STELLA_CENTRE.y, radius: STELLA_BALL_RADIUS };
const edges = [...CUBE_EDGES, ...STELLA_EDGES, ...COMPLEMENT_EDGES].map(([a, b], index) => ({ a, b, index, distance: hammingDist(a, b) }));

export function stellaView(orientation: StellaOrientation) {
  const original = orientation === defaultOrientation;
  // Rigid quaternion rotation preserves lengths and handedness throughout
  // each turn between the default projection and the node views.
  const vertices = original
    ? K8_EXPLORER_VERTICES_3D
    : K8_EXPLORER_VERTICES_3D.map((point): Point3 => {
        const rotated = rotate(point, orientation);
        return point3((coordinate) => {
          const value = rotated[coordinate];
          return Math.abs(value) < 1e-12 ? 0 : value;
        });
      });
  const points = original
    ? K8_EXPLORER_POINTS
    : Object.fromEntries(vertices.map((point, level) => [level, projectOrthographic(point, STELLA_CENTRE, scale)]));
  // Filter only after sorting, so changing distance layers or emphasis
  // cannot promote a rear edge.
  const orderedEdges = edges.map((edge) => ({ ...edge, depth: edgeDepth(vertices[edge.a], vertices[edge.b]) })).sort(compareDepth);
  const orderedLevels = original ? THEORY_LEVELS : [...THEORY_LEVELS].sort((a, b) => vertices[b.lv][2] - vertices[a.lv][2] || a.lv - b.lv);
  return { points, vertices, orderedEdges, orderedLevels };
}
