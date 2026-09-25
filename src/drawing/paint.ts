import { forEachBrushPixel } from "./brush-mask";
import type { BrushMask } from "./brush-mask";

/* ═══════════════════════════════════════════
   PAINT FUNCTIONS
   ═══════════════════════════════════════════ */

export function paintBrush(data: Uint8Array, cx: number, cy: number, mask: BrushMask, lv: number, w: number, h: number): void {
  forEachBrushPixel(mask, cx, cy, w, h, (x, y) => {
    data[y * w + x] = lv;
  });
}

export function paintBrushLine(
  data: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mask: BrushMask,
  lv: number,
  w: number,
  h: number,
): void {
  if (w <= 0 || h <= 0) return;
  const ax = Math.abs(x1 - x0),
    ay = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1;
  let e = ax - ay;
  paintBrush(data, x0, y0, mask, lv, w, h);
  for (;;) {
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 > -ay) {
      e -= ay;
      x0 += sx;
    }
    if (e2 < ax) {
      e += ax;
      y0 += sy;
    }
    // Every lattice centre contributes boundary pixels, even for a wide brush.
    paintBrush(data, x0, y0, mask, lv, w, h);
  }
}

function paintBrushRect(
  data: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mask: BrushMask,
  lv: number,
  w: number,
  h: number,
): void {
  if (w <= 0 || h <= 0) return;
  const left = Math.min(x0, x1),
    right = Math.max(x0, x1);
  const top = Math.min(y0, y1),
    bottom = Math.max(y0, y1);
  paintBrushLine(data, left, top, right, top, mask, lv, w, h);
  paintBrushLine(data, right, top, right, bottom, mask, lv, w, h);
  paintBrushLine(data, right, bottom, left, bottom, mask, lv, w, h);
  paintBrushLine(data, left, bottom, left, top, mask, lv, w, h);
}

function paintBrushEllipse(
  data: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mask: BrushMask,
  lv: number,
  w: number,
  h: number,
): void {
  if (w <= 0 || h <= 0) return;
  const cx = Math.round((x0 + x1) / 2),
    cy = Math.round((y0 + y1) / 2);
  const rx = Math.abs(x1 - x0) >> 1,
    ry = Math.abs(y1 - y0) >> 1;
  if (rx === 0 && ry === 0) {
    paintBrush(data, cx, cy, mask, lv, w, h);
    return;
  }
  if (rx === 0) {
    paintBrushLine(data, cx, cy - ry, cx, cy + ry, mask, lv, w, h);
    return;
  }
  if (ry === 0) {
    paintBrushLine(data, cx - rx, cy, cx + rx, cy, mask, lv, w, h);
    return;
  }
  let x = 0,
    y = ry;
  const rx2 = rx * rx,
    ry2 = ry * ry;
  let px = 0,
    py = 2 * rx2 * y;
  const plot4 = (ex: number, ey: number) => {
    paintBrush(data, cx + ex, cy + ey, mask, lv, w, h);
    if (ex !== 0) paintBrush(data, cx - ex, cy + ey, mask, lv, w, h);
    if (ey !== 0) {
      paintBrush(data, cx + ex, cy - ey, mask, lv, w, h);
      if (ex !== 0) paintBrush(data, cx - ex, cy - ey, mask, lv, w, h);
    }
  };
  let p1 = 4 * ry2 - 4 * rx2 * ry + rx2;
  while (px < py) {
    plot4(x, y);
    x++;
    px += 2 * ry2;
    if (p1 < 0) {
      p1 += 4 * (ry2 + px);
    } else {
      y--;
      py -= 2 * rx2;
      p1 += 4 * (ry2 + px - py);
    }
  }
  let p2 = ry2 * (2 * x + 1) * (2 * x + 1) + 4 * rx2 * (y - 1) * (y - 1) - 4 * rx2 * ry2;
  while (y >= 0) {
    plot4(x, y);
    y--;
    py -= 2 * rx2;
    if (p2 > 0) {
      p2 += 4 * (rx2 - py);
    } else {
      x++;
      px += 2 * ry2;
      p2 += 4 * (rx2 - py + px);
    }
  }
}

export const BRUSH_SHAPE_PAINTERS: Readonly<
  Record<
    string,
    (data: Uint8Array, x0: number, y0: number, x1: number, y1: number, mask: BrushMask, lv: number, w: number, h: number) => void
  >
> = {
  line: paintBrushLine,
  rect: paintBrushRect,
  ellipse: paintBrushEllipse,
};
