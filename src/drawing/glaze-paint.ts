import { LEVEL_MASK } from "../constants";
import type { ShapeToolId } from "../constants";
import { LEVEL_CANDIDATES, findClosestCandidate } from "../color-engine";
import { forEachBrushPixel, shapeMaskBBox } from "./brush-mask";
import type { BrushMask } from "./brush-mask";
import { restoreRect, unionBBox } from "./dirty-rect";
import { BRUSH_SHAPE_PAINTERS } from "./paint";
import type { DirtyRect, Point } from "../types";

/* ═══════════════════════════════════════════
   GLAZE PAINT FUNCTIONS
   Paint per-pixel candidate override values using hue-based auto-matching.
   Geometry matches paint.ts but writes per-pixel variant.
   ═══════════════════════════════════════════ */

/**
 * The 1-indexed candidate a level takes at this hue, or 0 for a level whose
 * fiber holds a single candidate. There is nothing to choose on K, B, Y and W,
 * which is already what GlazeCandidateGrid shows the reader and what the hue
 * ticks in GlazePanel skip; 0 is the same "leave this level alone" the direct
 * LUT below uses, so a stroke across them records no override to display.
 */
export function glazeOverrideValue(level: number, hueAngleDeg: number): number {
  return LEVEL_CANDIDATES[level].length > 1 ? findClosestCandidate(level, hueAngleDeg) + 1 : 0;
}

/** Pre-compute level→override value lookup for a given hue. Call once per stroke. */
export function buildGlazeLUT(hueAngleDeg: number): Uint8Array {
  const lut = new Uint8Array(8);
  for (let lv = 0; lv < 8; lv++) lut[lv] = glazeOverrideValue(lv, hueAngleDeg);
  return lut;
}

/** Build LUT for direct candidate mode: only levels in the map get values, rest are 0 (skip). */
export function buildMultiDirectLUT(candidates: Map<number, number>): Uint8Array {
  const lut = new Uint8Array(8);
  candidates.forEach((idx, level) => {
    lut[level] = idx + 1;
  });
  return lut;
}

interface GlazeShapePreview {
  workingOverrideMap: Uint8Array;
  beforeOverrideMap: Uint8Array;
  coverageMask: Uint8Array;
  levelData: Uint8Array;
  tool: ShapeToolId;
  origin: Point;
  point: Point;
  brushMask: BrushMask;
  width: number;
  height: number;
  glazeLUT: Uint8Array;
  previousBBox: DirtyRect | null;
}

/** Replace the preview with Source's outline geometry, applying only Glaze candidate overrides. */
export function previewGlazeShape({
  workingOverrideMap,
  beforeOverrideMap,
  coverageMask,
  levelData,
  tool,
  origin,
  point,
  brushMask,
  width,
  height,
  glazeLUT,
  previousBBox,
}: GlazeShapePreview): { shapeBBox: DirtyRect | null; dirtyBBox: DirtyRect | null } {
  const shapeBBox = shapeMaskBBox(origin.x, origin.y, point.x, point.y, brushMask, width, height);
  const dirtyBBox = unionBBox(previousBBox, shapeBBox);
  if (!dirtyBBox) return { shapeBBox, dirtyBBox };

  restoreRect(workingOverrideMap, beforeOverrideMap, width, dirtyBBox);
  for (let y = dirtyBBox.y; y < dirtyBBox.y + dirtyBBox.h; y++) {
    const start = y * width + dirtyBBox.x;
    coverageMask.fill(0, start, start + dirtyBBox.w);
  }
  if (shapeBBox) {
    BRUSH_SHAPE_PAINTERS[tool](coverageMask, origin.x, origin.y, point.x, point.y, brushMask, 1, width, height);
    for (let y = shapeBBox.y; y < shapeBBox.y + shapeBBox.h; y++) {
      const end = y * width + shapeBBox.x + shapeBBox.w;
      for (let idx = y * width + shapeBBox.x; idx < end; idx++) {
        if (coverageMask[idx] === 0) continue;
        const overrideValue = glazeLUT[levelData[idx] & LEVEL_MASK];
        if (overrideValue !== 0) workingOverrideMap[idx] = overrideValue;
      }
    }
  }
  return { shapeBBox, dirtyBBox };
}

export function paintGlazeBrush(
  pixelCandidateOverrideMap: Uint8Array,
  levelData: Uint8Array,
  cx: number,
  cy: number,
  mask: BrushMask,
  w: number,
  h: number,
  glazeLUT: Uint8Array,
): void {
  forEachBrushPixel(mask, cx, cy, w, h, (x, y) => {
    const idx = y * w + x;
    const lv = levelData[idx] & LEVEL_MASK;
    const overrideValue = glazeLUT[lv];
    if (overrideValue === 0) return;
    pixelCandidateOverrideMap[idx] = overrideValue;
  });
}

export function paintGlazeBrushLine(
  pixelCandidateOverrideMap: Uint8Array,
  levelData: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mask: BrushMask,
  w: number,
  h: number,
  glazeLUT: Uint8Array,
): void {
  if (w <= 0 || h <= 0) return;
  const ax = Math.abs(x1 - x0),
    ay = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1;
  let e = ax - ay;
  paintGlazeBrush(pixelCandidateOverrideMap, levelData, x0, y0, mask, w, h, glazeLUT);
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
    // Every lattice centre contributes boundary pixels, as in paintBrushLine.
    paintGlazeBrush(pixelCandidateOverrideMap, levelData, x0, y0, mask, w, h, glazeLUT);
  }
}

export function eraseGlazeBrush(
  pixelCandidateOverrideMap: Uint8Array,
  cx: number,
  cy: number,
  mask: BrushMask,
  w: number,
  h: number,
): void {
  forEachBrushPixel(mask, cx, cy, w, h, (x, y) => {
    pixelCandidateOverrideMap[y * w + x] = 0;
  });
}

export function eraseGlazeBrushLine(
  pixelCandidateOverrideMap: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mask: BrushMask,
  w: number,
  h: number,
): void {
  if (w <= 0 || h <= 0) return;
  const ax = Math.abs(x1 - x0),
    ay = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1;
  let e = ax - ay;
  eraseGlazeBrush(pixelCandidateOverrideMap, x0, y0, mask, w, h);
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
    eraseGlazeBrush(pixelCandidateOverrideMap, x0, y0, mask, w, h);
  }
}
