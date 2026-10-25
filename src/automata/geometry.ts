import { PLANE_SIZE, type Cell, type PlaneDimensions } from "./model";
const DEFAULT_DIMENSIONS = { width: PLANE_SIZE, height: PLANE_SIZE };
export interface PlaneGeometry extends PlaneDimensions {
  cssWidth: number;
  cssHeight: number;
  cellSize: number;
  dpr: number;
}
export function getPlaneGeometry(cssWidth: number, dpr: number, dimensions = DEFAULT_DIMENSIONS): PlaneGeometry {
  const cellSize = cssWidth / dimensions.width;
  return { ...dimensions, cssWidth, cssHeight: cellSize * dimensions.height, cellSize, dpr };
}
export function hitTestCell(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  dimensions = DEFAULT_DIMENSIONS,
): Cell | null {
  if (![clientX, clientY, rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0)
    return null;
  const x = clientX - rect.left,
    y = clientY - rect.top;
  if (x < 0 || x >= rect.width || y < 0 || y >= rect.height) return null;
  return { x: Math.floor((x / rect.width) * dimensions.width), y: Math.floor((y / rect.height) * dimensions.height) };
}
export function cellsOnLine(from: Cell, to: Cell): Cell[] {
  const cells: Cell[] = [];
  let { x, y } = from;
  const dx = Math.abs(to.x - x),
    dy = -Math.abs(to.y - y);
  const sx = x < to.x ? 1 : -1,
    sy = y < to.y ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    cells.push({ x, y });
    if (x === to.x && y === to.y) return cells;
    const twice = 2 * error;
    if (twice >= dy) {
      error += dy;
      x += sx;
    }
    if (twice <= dx) {
      error += dx;
      y += sy;
    }
  }
}
