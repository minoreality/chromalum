import { CA_COLORS, PLANE_SIZE, type Cell } from "./model";
import type { PlaneGeometry } from "./geometry";

export function drawPlane(ctx: CanvasRenderingContext2D, board: Uint8Array, geometry: PlaneGeometry, selection: Cell): void {
  const { cssSize, cellSize, dpr } = geometry;
  const pixels = Math.max(1, Math.round(cssSize * dpr));
  if (ctx.canvas.width !== pixels) ctx.canvas.width = pixels;
  if (ctx.canvas.height !== pixels) ctx.canvas.height = pixels;
  ctx.setTransform(pixels / cssSize, 0, 0, pixels / cssSize, 0, 0);
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < PLANE_SIZE; y++)
    for (let x = 0; x < PLANE_SIZE; x++) {
      ctx.fillStyle = CA_COLORS[board[y * PLANE_SIZE + x]];
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  const x = selection.x * cellSize,
    y = selection.y * cellSize;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.min(3, cellSize / 2);
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, cellSize - ctx.lineWidth, cellSize - ctx.lineWidth);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.min(1, cellSize / 4);
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, cellSize - ctx.lineWidth, cellSize - ctx.lineWidth);
}
