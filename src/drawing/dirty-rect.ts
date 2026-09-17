import type { DirtyRect } from "../types";

/* ═══════════════════════════════════════════
   DIRTY RECT HELPERS
   ═══════════════════════════════════════════ */

/** 2つの dirty rect の合併 (union) */
export function unionBBox(a: DirtyRect | null, b: DirtyRect | null): DirtyRect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x),
    y = Math.min(a.y, b.y);
  const r = Math.max(a.x + a.w, b.x + b.w);
  const bot = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: r - x, h: bot - y };
}

/** Compute dirty rect from an array of changed pixel indices. */
export function dirtyFromChanged(changedIndices: Uint32Array, w: number, h: number): DirtyRect | null {
  if (changedIndices.length === 0) return null;
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
  for (let i = 0; i < changedIndices.length; i++) {
    const idx = changedIndices[i];
    const x = idx % w,
      y = (idx / w) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Restore only the bbox region from beforeData into workingData. */
export function restoreRect(workingData: Uint8Array, beforeData: Uint8Array, stride: number, bb: DirtyRect): void {
  const x0 = bb.x,
    x1 = bb.x + bb.w,
    y1 = bb.y + bb.h;
  for (let y = bb.y; y < y1; y++) {
    const start = y * stride + x0;
    workingData.set(beforeData.subarray(start, y * stride + x1), start);
  }
}
