import { LEVEL_MASK } from "../constants";
import { LEVEL_CANDIDATES, findClosestCandidate } from "../color-engine";
import { forEachBrushPixel } from "./brush-mask";
import type { BrushMask } from "./brush-mask";

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
  const skipDist = Math.max(1, Math.floor(mask.size / 8));
  const skipDist2 = skipDist * skipDist;
  let lastPX = x0,
    lastPY = y0;
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
    const dx = x0 - lastPX,
      dy = y0 - lastPY;
    if (dx * dx + dy * dy >= skipDist2) {
      paintGlazeBrush(pixelCandidateOverrideMap, levelData, x0, y0, mask, w, h, glazeLUT);
      lastPX = x0;
      lastPY = y0;
    }
  }
  paintGlazeBrush(pixelCandidateOverrideMap, levelData, x1, y1, mask, w, h, glazeLUT);
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
  const skipDist = Math.max(1, Math.floor(mask.size / 8));
  const skipDist2 = skipDist * skipDist;
  let lastPX = x0,
    lastPY = y0;
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
    const dx = x0 - lastPX,
      dy = y0 - lastPY;
    if (dx * dx + dy * dy >= skipDist2) {
      eraseGlazeBrush(pixelCandidateOverrideMap, x0, y0, mask, w, h);
      lastPX = x0;
      lastPY = y0;
    }
  }
  eraseGlazeBrush(pixelCandidateOverrideMap, x1, y1, mask, w, h);
}
