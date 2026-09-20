export type Point3 = readonly [number, number, number];

interface Point2 {
  readonly x: number;
  readonly y: number;
}

/** Uniform orthographic projection; view coordinates use x right and y down. */
export function projectOrthographic([x, y]: Point3, centre: Point2, scale: number): Point2 {
  return { x: centre.x + scale * x, y: centre.y + scale * y };
}

/** Midpoint depth in view coordinates, where positive z points away. */
export function edgeDepth(a: Point3, b: Point3): number {
  return (a[2] + b[2]) / 2;
}

interface DepthOrder {
  readonly depth: number;
  readonly index: number;
}

/** Far to near, retaining authored order when depths coincide numerically. */
export function compareDepth(a: DepthOrder, b: DepthOrder): number {
  return Math.abs(a.depth - b.depth) < 1e-9 ? a.index - b.index : b.depth - a.depth;
}
