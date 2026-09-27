/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
export const DEFAULT_CANVAS_WIDTH = 320,
  DEFAULT_CANVAS_HEIGHT = 320;
export const MAX_UNDO = 40;
export const DISPLAY_MIN = 280;
export const DISPLAY_MAX_LIMIT = 1600;
export const ZOOM_MIN = 0.25,
  ZOOM_MAX = 16,
  ZOOM_STEP = 1.15;
/**
 * Continuous wheel zoom: zoom *= exp(-deltaPx * ZOOM_WHEEL_RATE). Derived from
 * ZOOM_STEP so one 100px mouse notch still lands on exactly 1.15x, while a
 * trackpad's stream of small deltas accumulates to the same factor over the same
 * distance instead of applying 1.15x per event.
 */
export const ZOOM_WHEEL_RATE = Math.log(ZOOM_STEP) / 100;
/** Per-event delta ceiling, so one coalesced burst cannot cross the zoom range. */
export const ZOOM_WHEEL_MAX_DELTA = 120;
/**
 * Trackpad pinch rate. A pinch reports roughly a tenth of the delta a scroll does
 * for the same finger travel, so it needs its own rate; ZOOM_WHEEL_RATE alone made
 * a full pinch move the zoom by a few percent.
 */
export const ZOOM_PINCH_RATE = 0.01;
/** Wheel deltaMode 1 (line) and 2 (page) in CSS pixels, to normalise before zooming. */
export const WHEEL_LINE_PX = 16,
  WHEEL_PAGE_PX = 400;
/** One notch of a classic mouse wheel, in CSS pixels, on Chromium and WebKit. */
export const MOUSE_NOTCH_PX = 100;
/** Idle gap that ends a wheel gesture, so a device switch never lands mid-scroll. */
export const WHEEL_GESTURE_GAP_MS = 120;
export const BRUSH_MIN = 1,
  BRUSH_MAX = 100,
  BRUSH_STEP = 1;
const DEFAULT_BRUSH_SIZE = 12;
export const MAX_IMAGE_SIZE = 2048;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 50_000_000;
export const GRID_ZOOM_THRESHOLD = 4;
export const MIN_TAP_SIZE = 44;
export const TOAST_DURATION = 2500;
/* ═══════════════════════════════════════════
   MODULE-LEVEL CONSTANTS (early, used by HEX data)
   ═══════════════════════════════════════════ */
export const LEVEL_COUNT = 8; /* number of source tone levels */
export const LEVEL_MASK = 7; /* 3-bit mask for 8 levels (0-7) */
export const NUM_VERTICES = 6; /* hexagon vertex count */

/* ═══════════════════════════════════════════
   TOOLS DEFINITION
   ═══════════════════════════════════════════ */
export type ToolId = "brush" | "eraser" | "fill" | "line" | "rect" | "ellipse";

interface ToolDef {
  readonly id: ToolId;
  readonly key: string;
  readonly shape: boolean;
}

export const TOOLS = [
  { id: "brush", key: "B", shape: false },
  { id: "eraser", key: "E", shape: false },
  { id: "fill", key: "F", shape: false },
  { id: "line", key: "L", shape: true },
  { id: "rect", key: "R", shape: true },
  { id: "ellipse", key: "O", shape: true },
] as const satisfies readonly ToolDef[];

const SHAPE_TOOL_SET: ReadonlySet<ToolId> = new Set(TOOLS.filter((t) => t.shape).map((t) => t.id));
export const isShapeTool = (t: ToolId): boolean => SHAPE_TOOL_SET.has(t);

export type GlazeToolId = "glaze_brush" | "glaze_eraser" | "glaze_fill";

export function isAllowedCanvasSize(w: number, h: number): boolean {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) return false;
  return w <= MAX_IMAGE_SIZE && h <= MAX_IMAGE_SIZE;
}

export function defaultBrushSizeForCanvas(w: number, h: number): number {
  const shortEdge = Math.max(1, Math.min(w, h));
  const size = Math.round((shortEdge * DEFAULT_BRUSH_SIZE) / DEFAULT_CANVAS_WIDTH);
  return Math.max(BRUSH_MIN, Math.min(BRUSH_MAX, size));
}
