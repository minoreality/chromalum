import { CUBE_EDGES, OCTA_COMPLEMENT_AXES, OCTA_EDGES, OCTA_FACES, THEORY_LEVELS } from "../../data/theory-data";
import { rotateStellaPoint, type StellaBall, type StellaOrientation } from "./stella-view";

type Point3D = readonly [number, number, number];

// Look straight at the CMY face, with the opposite GRB face behind it.
// Their projections are two equilateral triangles, with R above C and
// M/Y and B/G mirrored across that vertical axis.
export const DUAL_CUBE_VERTICES: readonly Point3D[] = THEORY_LEVELS.map(({ bits }) => {
  const [g, r, b] = bits.map((bit) => bit - 0.5);
  return [(g - b) / Math.SQRT2, (g + b - 2 * r) / Math.sqrt(6), (g + r + b) / Math.sqrt(3)];
});

function centroid(points: readonly Point3D[]): Point3D {
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length,
    points.reduce((sum, point) => sum + point[2], 0) / points.length,
  ];
}

/** Cube faces are fixed-coordinate squares; their centers are the dual vertices. */
export const DUAL_DIE_FACES = OCTA_COMPLEMENT_AXES.flatMap(([primary, secondary]) => {
  const channel = THEORY_LEVELS[primary].bits.findIndex((bit) => bit === 1);
  return [primary, secondary].map((lv, index) => {
    const vertices = THEORY_LEVELS.filter((level) => level.bits[channel] === 1 - index).map((level) => level.lv);
    const center = centroid(vertices.map((vertex) => DUAL_CUBE_VERTICES[vertex]));
    return { lv, vertices, center, hidden: center[2] > 0 };
  });
});

export const DUAL_OCTA_VERTICES: Readonly<Record<number, Point3D>> = Object.fromEntries(
  DUAL_DIE_FACES.map((face) => [face.lv, face.center]),
);

export const DUAL_OCTA_FACES = OCTA_FACES.map((face) => ({
  ...face,
  center: centroid(face.verts.map((lv) => DUAL_OCTA_VERTICES[lv])),
  // The corresponding cube vertex points along this triangular face's outward normal.
  hidden: DUAL_CUBE_VERTICES[face.color][2] > 0,
}));

export const DUAL_CUBE_EDGES = CUBE_EDGES.map(([a, b]) => ({
  a,
  b,
  hidden: DUAL_DIE_FACES.filter((face) => face.vertices.includes(a) && face.vertices.includes(b)).every((face) => face.hidden),
}));

export const DUAL_OCTA_EDGES = OCTA_EDGES.map(([a, b]) => {
  const incidentFaces = DUAL_OCTA_FACES.filter((face) => face.verts.includes(a) && face.verts.includes(b));
  const xor = a ^ b;
  const complement = xor ^ 7;
  return {
    a,
    b,
    xor,
    complement,
    xorFace: incidentFaces.find((face) => face.verts.includes(xor))!,
    complementFace: incidentFaces.find((face) => face.verts.includes(complement))!,
    hidden: incidentFaces.every((face) => face.hidden),
  };
});

/** Orthographic projection of the regular octahedron and its cube construction. */
export function projectDualPoint([x, y]: Point3D): { x: number; y: number } {
  return { x: 200 + 220 * x, y: 200 + 220 * y };
}

/** The surface the octahedron is laid out on, shared with its svg element. */
export const DUAL_VIEWBOX = { x: 85, y: 95, size: 230 } as const;

/** Where the model's origin lands on that surface, and the sphere its vertices sit on. */
export const DUAL_BALL: StellaBall = {
  centreX: projectDualPoint([0, 0, 0]).x,
  centreY: projectDualPoint([0, 0, 0]).y,
  radius: 220 * Math.hypot(...DUAL_OCTA_VERTICES[1]),
};

/**
 * The octahedron seen from a given pose. Turning the model turns its cube too,
 * so which faces and edges lie at the back is read from the same rotation rather
 * than from a fixed projection.
 */
export function dualOctaView(orientation: StellaOrientation) {
  const vertices = Object.fromEntries(
    Object.entries(DUAL_OCTA_VERTICES).map(([lv, point]) => [Number(lv), rotateStellaPoint(point, orientation)]),
  ) as Record<number, Point3D>;
  const cubeVertices = DUAL_CUBE_VERTICES.map((point) => rotateStellaPoint(point, orientation));
  const faces = DUAL_OCTA_FACES.map((face) => ({
    ...face,
    center: centroid(face.verts.map((lv) => vertices[lv])),
    hidden: cubeVertices[face.color][2] > 0,
  }));
  const edges = DUAL_OCTA_EDGES.map((edge) => {
    const incident = faces.filter((face) => face.verts.includes(edge.a) && face.verts.includes(edge.b));
    return {
      ...edge,
      hidden: incident.every((face) => face.hidden),
      xorFace: incident.find((face) => face.verts.includes(edge.xor))!,
      complementFace: incident.find((face) => face.verts.includes(edge.complement))!,
    };
  });
  const points = Object.fromEntries(Object.entries(vertices).map(([lv, point]) => [Number(lv), projectDualPoint(point)]));
  // Farthest edge first. Drawn in this order the nearest edge lands on top, and
  // because svg hit testing takes the last match, it is also the one a pointer
  // finds where two edges cross.
  const depth = (edge: { a: number; b: number }) => (vertices[edge.a][2] + vertices[edge.b][2]) / 2;
  edges.sort((left, right) => depth(right) - depth(left));
  return { vertices, faces, edges, points };
}
