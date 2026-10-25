import { type Cell } from "./model";
import type { PlaneGeometry } from "./geometry";

const frames = new WeakMap<CanvasRenderingContext2D, { board: Uint8Array; width: number; height: number; image: ImageData }>();

export function drawPlane(ctx: CanvasRenderingContext2D, board: Uint8Array, geometry: PlaneGeometry, selection: Cell): void {
  const { cssWidth, cssHeight, width, height, cellSize, dpr } = geometry;
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
  if (ctx.canvas.width !== pixelWidth) ctx.canvas.width = pixelWidth;
  if (ctx.canvas.height !== pixelHeight) ctx.canvas.height = pixelHeight;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  let frame = frames.get(ctx);
  if (
    !frame ||
    frame.board !== board ||
    frame.width !== width ||
    frame.height !== height ||
    frame.image.width !== pixelWidth ||
    frame.image.height !== pixelHeight
  ) {
    const image = ctx.createImageData(pixelWidth, pixelHeight);
    const columns = Uint32Array.from({ length: pixelWidth }, (_, x) => Math.max(0, Math.ceil(((x + 0.5) * width) / pixelWidth) - 1));
    for (let y = 0; y < pixelHeight; y++) {
      const row = Math.max(0, Math.ceil(((y + 0.5) * height) / pixelHeight) - 1) * width;
      for (let x = 0; x < pixelWidth; x++) {
        const color = board[row + columns[x]],
          i = (y * pixelWidth + x) * 4;
        image.data[i] = color & 2 ? 255 : 0;
        image.data[i + 1] = color & 4 ? 255 : 0;
        image.data[i + 2] = color & 1 ? 255 : 0;
        image.data[i + 3] = 255;
      }
    }
    frame = { board, width, height, image };
    frames.set(ctx, frame);
  }
  ctx.putImageData(frame.image, 0, 0);
  ctx.setTransform(pixelWidth / cssWidth, 0, 0, pixelHeight / cssHeight, 0, 0);
  const x = selection.x * cellSize,
    y = selection.y * cellSize;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.min(3, cellSize / 2);
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, cellSize - ctx.lineWidth, cellSize - ctx.lineWidth);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.min(1, cellSize / 4);
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, cellSize - ctx.lineWidth, cellSize - ctx.lineWidth);
}
