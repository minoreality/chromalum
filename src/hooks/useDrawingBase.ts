/* ═══════════════════════════════════════════
   DRAWING BASE UTILITIES
   Shared helpers used by both useCanvasDrawing and useGlazeDrawing: the
   pointer geometry, the status readout, the pointer-capture check and the
   one-render-per-frame queue. What a pixel holds stays in each hook.
   ═══════════════════════════════════════════ */

import { useRef } from "react";
import { LEVEL_MASK } from "../constants";
import { LEVEL_INFO } from "../color-engine";
import { unionBBox } from "../drawing/dirty-rect";
import type { CanvasData, DirtyRect, Point } from "../types";
import { applyStatusText, type StatusTextLike } from "../utils/status-display";
import { useSyncRef } from "./useSyncRef";

type CanvasRect = { left: number; top: number; width: number; height: number };

function canvasPosFromRect(
  e: { clientX: number; clientY: number },
  r: CanvasRect,
  zoom: number,
  pan: { x: number; y: number },
  canvasData: CanvasData,
): Point {
  const rx = (e.clientX - r.left) / r.width,
    ry = (e.clientY - r.top) / r.height;
  const vx = (rx - 0.5) / zoom + 0.5 - pan.x / canvasData.width;
  const vy = (ry - 0.5) / zoom + 0.5 - pan.y / canvasData.height;
  return {
    x: Math.floor(vx * canvasData.width),
    y: Math.floor(vy * canvasData.height),
  };
}

/**
 * Convert a pointer event's client coordinates to canvas pixel coordinates,
 * accounting for zoom, pan, and canvas dimensions.
 */
export function canvasPos(
  e: { clientX: number; clientY: number },
  refEl: HTMLCanvasElement | null,
  zoom: number,
  pan: { x: number; y: number },
  canvasData: CanvasData,
): Point {
  if (!refEl) return { x: 0, y: 0 };
  const r = refEl.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return { x: -1, y: -1 };
  const pos = canvasPosFromRect(e, r, zoom, pan, canvasData);
  return {
    x: Math.max(0, Math.min(canvasData.width - 1, pos.x)),
    y: Math.max(0, Math.min(canvasData.height - 1, pos.y)),
  };
}

/**
 * Convert pointer coordinates to canvas pixel coordinates without clamping.
 * Use this for pointer-stream drawing so samples outside the canvas remain in
 * canvas space instead of being smeared onto the nearest edge.
 */
export function canvasPosUnclamped(
  e: { clientX: number; clientY: number },
  refEl: HTMLCanvasElement | null,
  zoom: number,
  pan: { x: number; y: number },
  canvasData: CanvasData,
): Point {
  if (!refEl) return { x: 0, y: 0 };
  const r = refEl.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return { x: -1, y: -1 };
  return canvasPosFromRect(e, r, zoom, pan, canvasData);
}

export function isCanvasPointInBounds(pos: Point, canvasData: CanvasData): boolean {
  return pos.x >= 0 && pos.x < canvasData.width && pos.y >= 0 && pos.y < canvasData.height;
}

/**
 * Attempt to set pointer capture on the event target.
 * Silently ignores failures (browser inconsistencies).
 */
export function trySetPointerCapture(e: React.PointerEvent): void {
  if ((e.target as HTMLElement).setPointerCapture) {
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
}

/**
 * True when the event's current target, its target, or any of `elements`
 * still holds capture for this pointer — the workspace is then leaving because
 * the captured stroke crossed its edge, not because the pointer was lifted.
 * A browser that throws on the check counts as not captured.
 */
export function hasPointerCapture(e: React.PointerEvent, elements: ReadonlyArray<HTMLElement | null>): boolean {
  const candidates = [e.currentTarget as HTMLElement | null, e.target as HTMLElement | null, ...elements];
  for (const el of candidates) {
    if (!el || typeof el.hasPointerCapture !== "function") continue;
    try {
      if (el.hasPointerCapture(e.pointerId)) return true;
    } catch (err) {
      console.warn("CHROMALUM: pointerCapture check failed:", err);
    }
  }
  return false;
}

/**
 * One render per animation frame. `queue` keeps the latest frame and the
 * union of every dirty rect since the last render, and the frame is drawn
 * with that union on the next animation frame; a queue while one is pending
 * only widens the rect. `cancel` drops a pending render so the caller can
 * flush synchronously, and reports whether there was one to drop.
 */
export function usePaintFrameQueue<Frame>(render: (frame: Frame, dirty: DirtyRect) => void): {
  queue: (frame: Frame, dirty: DirtyRect) => void;
  cancel: () => boolean;
} {
  const rafRef = useRef<number | null>(null);
  const dirtyRef = useRef<DirtyRect | null>(null);
  const frameRef = useRef<Frame | null>(null);
  const renderRef = useSyncRef(render);

  function queue(frame: Frame, dirty: DirtyRect): void {
    dirtyRef.current = unionBBox(dirtyRef.current, dirty);
    frameRef.current = frame;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const dirtySnap = dirtyRef.current;
      const frameSnap = frameRef.current;
      dirtyRef.current = null;
      frameRef.current = null;
      if (dirtySnap && frameSnap) renderRef.current(frameSnap, dirtySnap);
    });
  }

  function cancel(): boolean {
    if (rafRef.current === null) return false;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    dirtyRef.current = null;
    frameRef.current = null;
    return true;
  }

  return { queue, cancel };
}

/**
 * Check if the pointer event should initiate panning instead of drawing.
 * Returns true if pan was started (caller should return early).
 */
export function tryStartPan(
  e: React.PointerEvent,
  spaceRef: React.MutableRefObject<boolean>,
  startPanRef: React.MutableRefObject<(e: React.PointerEvent) => void>,
): boolean {
  if (e.button === 1) {
    startPanRef.current(e);
    return true;
  }
  if (spaceRef.current) {
    startPanRef.current(e);
    return true;
  }
  return false;
}

/** Refs needed by the shared cPos / updateStatus helpers. */
export interface DrawingRefs {
  zoomRef: React.MutableRefObject<number>;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  canvasDataRef: React.MutableRefObject<CanvasData>;
}

/**
 * Compute canvas-pixel position from a pointer event using shared refs.
 * `refEl` is the canvas element used for bounding-rect lookup.
 */
export function canvasPosFromRefs(e: React.PointerEvent, refEl: HTMLCanvasElement | null, refs: DrawingRefs): Point {
  return canvasPos(e, refEl, refs.zoomRef.current, refs.panRef.current, refs.canvasDataRef.current);
}

/**
 * Shared status-bar update logic.
 * Computes the canvas position, performs bounds-checking, resolves the
 * pixel level, then delegates to `formatText` for mode-specific text.
 *
 * @param formatText Receives (pos, level index, LEVEL_INFO entry, pixel index)
 *                   and returns the status text to display.
 */
export function updateStatusBase(
  e: React.PointerEvent,
  statusEl: HTMLDivElement | null,
  refEl: HTMLCanvasElement | null,
  refs: DrawingRefs,
  dataSource: Uint8Array,
  formatText: (pos: Point, lv: number, info: { name: string }, idx: number) => StatusTextLike,
): void {
  if (!statusEl) return;
  const cv = refs.canvasDataRef.current;
  const pos = canvasPosUnclamped(e, refEl, refs.zoomRef.current, refs.panRef.current, cv);
  if (pos.x < 0 || pos.x >= cv.width || pos.y < 0 || pos.y >= cv.height) {
    statusEl.textContent = "\u2014";
    statusEl.title = "";
    return;
  }
  const idx = pos.y * cv.width + pos.x;
  const lv = dataSource[idx] & LEVEL_MASK;
  const info = LEVEL_INFO[lv];
  applyStatusText(statusEl, formatText(pos, lv, info, idx));
}
