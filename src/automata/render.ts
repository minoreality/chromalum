import { CA_COLORS, PLANE_SIZE, type Cell } from "./model";
import type { PlaneGeometry } from "./geometry";

export function drawPlane(ctx: CanvasRenderingContext2D, board: Uint8Array, geometry: PlaneGeometry, selection: Cell): void {
  const { cssSize, cellSize, dpr } = geometry;
  const pixels = Math.max(1, Math.round(cssSize * dpr));
  if (ctx.canvas.width !== pixels) ctx.canvas.width = pixels;
  if (ctx.canvas.height !== pixels) ctx.canvas.height = pixels;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  // Shared integer backing-pixel boundaries keep cell fills opaque and erase the previous frame completely.
  const boundaries = Array.from({ length: PLANE_SIZE + 1 }, (_, i) => Math.round((i * pixels) / PLANE_SIZE));
  for (let y = 0; y < PLANE_SIZE; y++)
    for (let x = 0; x < PLANE_SIZE; x++) {
      ctx.fillStyle = CA_COLORS[board[y * PLANE_SIZE + x]];
      ctx.fillRect(boundaries[x], boundaries[y], boundaries[x + 1] - boundaries[x], boundaries[y + 1] - boundaries[y]);
    }
  ctx.setTransform(pixels / cssSize, 0, 0, pixels / cssSize, 0, 0);
  const x = selection.x * cellSize,
    y = selection.y * cellSize;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.min(3, cellSize / 2);
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, cellSize - ctx.lineWidth, cellSize - ctx.lineWidth);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.min(1, cellSize / 4);
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, cellSize - ctx.lineWidth, cellSize - ctx.lineWidth);
}
