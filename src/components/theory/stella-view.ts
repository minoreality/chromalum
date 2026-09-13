import {
  CUBE_EDGES,
  STELLA_EDGES,
  COMPLEMENT_EDGES,
  THEORY_LEVELS,
  K8_EXPLORER_POINTS,
  K8_EXPLORER_VERTICES_3D,
  hammingDist,
} from "../../data/theory-data";

type Point3 = readonly [number, number, number];
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
  const current: Point3 = [from[0], from[1], from[2]];
  const product = cross(turn, current);
  const q: StellaOrientation = [
    ...point3((axis) => cosine * current[axis] + from[3] * turn[axis] + product[axis]),
    cosine * from[3] - dot(turn, current),
  ];
  const length = Math.hypot(...q);
  const target = quaternion((axis) => q[axis] / length);
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
    : Object.fromEntries(vertices.map(([x, y], level) => [level, { x: 90 + scale * x, y: 63 + scale * y }]));
  // Filter only after sorting, so changing distance layers or emphasis
  // cannot promote a rear edge.
  const orderedEdges = edges
    .map((edge) => ({ ...edge, depth: (vertices[edge.a][2] + vertices[edge.b][2]) / 2 }))
    .sort((a, b) => (Math.abs(a.depth - b.depth) < 1e-9 ? a.index - b.index : b.depth - a.depth));
  const orderedLevels = original ? THEORY_LEVELS : [...THEORY_LEVELS].sort((a, b) => vertices[b.lv][2] - vertices[a.lv][2] || a.lv - b.lv);
  return { points, vertices, orderedEdges, orderedLevels };
}
