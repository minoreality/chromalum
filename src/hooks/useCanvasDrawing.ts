import { useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { LEVEL_MASK } from "../constants";
import type { ToolId } from "../constants";
import { LEVEL_INFO } from "../color-engine";
import {
  allocateStrokeBuffers,
  createStrokeState,
  applyBrushStroke,
  applyBrushDot,
  applyShapeStroke,
  applyShapeDot,
  computeStrokeResult,
  resolveLevel,
  isShapeTool,
} from "./useStrokeManager";
import { useFloodFillWorker } from "./useFloodFillWorker";
import { renderCanvasBuffers } from "../drawing/render-buf";
import { formatSourcePixelStatus } from "../utils/pixel-status";
import type { BufferPool } from "./useStrokeManager";
import { useSyncRef, useSyncRefs } from "./useSyncRef";
import { useCursorOverlay } from "./useCursorOverlay";
import {
  trySetPointerCapture,
  canvasPosFromRefs,
  canvasPosUnclamped,
  isCanvasPointInBounds,
  updateStatusBase,
  hasPointerCapture,
  usePaintFrameQueue,
  useStrokePointerEnd,
} from "./useDrawingBase";
import type { DrawingRefs } from "./useDrawingBase";
import { unionBBox } from "../drawing/dirty-rect";
import { createStrokeSmoother, smoothStrokePoint } from "../drawing/stroke-smoothing";
import type { StrokeSmoother } from "../drawing/stroke-smoothing";
import { pressureAdjustedBrushSize } from "../drawing/stroke-pressure";
import type { PointerPressureSample } from "../drawing/stroke-pressure";
import type { CanvasData, StrokeState, ImageRenderCache, CanvasAction, DirtyRect, Point } from "../types";
import { useDrawingContext } from "../state/DrawingContext";
import { controlOwnsKey } from "../shortcuts";

export interface CanvasDrawingResult {
  sourceCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  cursorCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  statusRef: React.MutableRefObject<HTMLDivElement | null>;
  imgCacheRef: React.MutableRefObject<ImageRenderCache>;
  strokeRef: React.MutableRefObject<StrokeState | null>;
  drawingRef: React.MutableRefObject<boolean>;
  lastRef: React.MutableRefObject<{ x: number; y: number } | null>;
  cursorRafRef: React.MutableRefObject<number | null>;
  scheduleCursorRedrawRef: React.MutableRefObject<(() => void) | null>;
  cursorPosRef: React.MutableRefObject<{ dx: number; dy: number } | null>;
  onDown: (e: React.PointerEvent) => void;
  onMove: (e: React.PointerEvent) => void;
  onUp: (event?: Pick<PointerEvent, "pointerId">) => void;
  onWorkspaceDown: (e: React.PointerEvent) => void;
  onWorkspaceMove: (e: React.PointerEvent) => void;
  onWorkspaceLeave: (e: React.PointerEvent) => void;
  trackCursor: (e: React.PointerEvent) => void;
  clearCursor: () => void;
  beginKeyboardDrawing: (level: number, code: string) => void;
  endKeyboardDrawing: (code: string) => void;
  cancelKeyboardDrawing: () => void;
}

interface CanvasDrawingOptions {
  canvasData: CanvasData;
  dispatch: React.Dispatch<CanvasAction>;
  colorLUT: [number, number, number][];
  brushLevel: number;
  brushSize: number;
  tool: ToolId;
  setBrushLevel: (lv: number) => void;
}

/** What one brush frame renders: the stroke's working buffer and the surfaces it lands on. */
interface BrushFrame {
  levelData: Uint8Array;
  w: number;
  h: number;
  lut: [number, number, number][];
  sourceCanvas: HTMLCanvasElement | null;
  imgCache: ImageRenderCache;
}

export function useCanvasDrawing(opts: CanvasDrawingOptions): CanvasDrawingResult {
  const { canvasData, dispatch, colorLUT, brushLevel, brushSize, tool, setBrushLevel } = opts;
  const ctx = useDrawingContext();
  const { displayWidth, displayHeight, panningRef, spaceRef, zoomRef, panRef, startPan, movePan, endPan, announce, t } = ctx;
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const imgCacheRef = useRef<ImageRenderCache>({
    sourceImageData: null,
    previewImageData: null,
    sourcePixels32: null,
    previewPixels32: null,
  });
  const strokeRef = useRef<StrokeState | null>(null);
  const drawingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const hoverPointRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const keyboardGestureRef = useRef<{ code: string; tool: ToolId } | null>(null);
  // Buffer pool: reuse before/working allocations across strokes
  const strokeBufferPoolRef = useRef<BufferPool>({ beforeData: null, workingData: null, size: 0 });
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const strokeSmootherRef = useRef<StrokeSmoother | null>(null);
  const forceRawNextMoveRef = useRef(false);
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { queue: queuePaint, cancel: cancelPaint } = usePaintFrameQueue<BrushFrame>((frame, dirty) =>
    renderCanvasBuffers(frame.levelData, frame.w, frame.h, frame.lut, frame.sourceCanvas, null, frame.imgCache, dirty),
  );
  const fillPendingRef = useRef(false);
  const pendingUpRef = useRef(false);
  const fillGenerationRef = useRef(0);
  const pendingWorkspaceStartRef = useRef<{
    refEl: HTMLCanvasElement | null;
    cursorTrack: (e: React.PointerEvent) => void;
    clearCursor: () => void;
    startPos: Point;
  } | null>(null);
  const { requestCanvasFill } = useFloodFillWorker();

  // Undo, Redo and Clear can replace the canvas mid-stroke, and not only while
  // a Worker fill is in flight: their buttons carry no isStrokeActive() guard,
  // so a second pointer reaches them with the first still down. A brush stroke
  // paints into buffers
  // snapshotted from the canvas it started on, so a replacement leaves it
  // measuring against an image that is gone: the release either stamps those
  // stale pixels onto the new one or, once the reducer's compare-and-swap
  // rejects them, dispatches nothing — and with no state change there is no
  // second render, so the replacement useCanvasCoordination skipped while the
  // stroke was live never gets drawn. Dropping the stroke here, before that
  // redraw runs in the same commit, settles both.
  useLayoutEffect(() => {
    fillGenerationRef.current++;
    fillPendingRef.current = false;
    pendingUpRef.current = false;
    strokeRef.current = null;
    keyboardGestureRef.current = null;
    drawingRef.current = false;
    pointerIdRef.current = null;
    pendingWorkspaceStartRef.current = null;
    // Cancel before a replacement redraw, and when this canvas unmounts.
    return () => {
      cancelPaint();
    };
  }, [canvasData, cancelPaint]);

  // Refs needed by useCursorOverlay (individual for interface compatibility)
  const brushSizeRef = useSyncRef(brushSize);
  const toolRef = useSyncRef(tool);
  const canvasDataRef = useSyncRef(canvasData);
  const displayWidthRef = useSyncRef(displayWidth);
  const displayHeightRef = useSyncRef(displayHeight);

  // Batch-sync remaining values used in imperative callbacks
  const s = useSyncRefs({ brushLevel, colorLUT, startPan, movePan, endPan, setBrushLevel, announce, t });

  // Cursor overlay sub-hook
  const cursor = useCursorOverlay(
    { zoomRef, panRef, canvasDataRef, displayWidthRef, displayHeightRef, panningRef, brushSizeRef, toolRef },
    statusRef,
  );

  const drawRefs: DrawingRefs = { zoomRef, panRef, canvasDataRef };

  function cPos(e: React.PointerEvent, refEl?: HTMLCanvasElement | null) {
    const c = refEl ?? activeCanvasRef.current ?? cursor.cursorCanvasRef.current;
    return canvasPosFromRefs(e, c, drawRefs);
  }

  function isInCanvasBounds(e: React.PointerEvent, refEl: HTMLCanvasElement | null) {
    const pos = canvasPosUnclamped(e, refEl, zoomRef.current, panRef.current, canvasDataRef.current);
    return isCanvasPointInBounds(pos, canvasDataRef.current);
  }

  function isInWorkspaceBounds(e: React.PointerEvent, refEl: HTMLCanvasElement | null) {
    if (!refEl) return false;
    const r = refEl.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    return e.clientX >= r.left && e.clientX < r.left + r.width && e.clientY >= r.top && e.clientY < r.top + r.height;
  }

  function updateStatus(e: React.PointerEvent, refEl: HTMLCanvasElement | null) {
    const d = drawingRef.current && strokeRef.current?.workingData ? strokeRef.current.workingData : canvasDataRef.current.levelData;
    const statusCanvas = refEl ?? activeCanvasRef.current ?? cursor.cursorCanvasRef.current;
    updateStatusBase(e, statusRef.current, statusCanvas, drawRefs, d, (pos, lv) => formatSourcePixelStatus({ x: pos.x, y: pos.y, lv }));
  }

  function queueBrushRender(levelData: Uint8Array, W: number, H: number, dirtyBB: DirtyRect) {
    queuePaint(
      {
        levelData,
        w: W,
        h: H,
        lut: s.current.colorLUT,
        sourceCanvas: sourceCanvasRef.current,
        imgCache: imgCacheRef.current,
      },
      dirtyBB,
    );
  }

  const resetStroke = useCallback(() => {
    drawingRef.current = false;
    pointerIdRef.current = null;
    keyboardGestureRef.current = null;
    pendingWorkspaceStartRef.current = null;
    lastRef.current = null;
    strokeSmootherRef.current = null;
    forceRawNextMoveRef.current = false;
    strokeRef.current = null;
    activeCanvasRef.current = null;
  }, []);

  const finishStroke = useCallback(() => {
    // Flush pending brush render
    if (cancelPaint()) {
      const st2 = strokeRef.current;
      if (st2)
        renderCanvasBuffers(
          st2.workingData,
          canvasDataRef.current.width,
          canvasDataRef.current.height,
          s.current.colorLUT,
          sourceCanvasRef.current,
          null,
          imgCacheRef.current,
        );
    }
    const st = strokeRef.current;
    if (drawingRef.current && st) {
      const finalData = new Uint8Array(st.workingData);
      const diff = st.beforeData ? computeStrokeResult(st.beforeData, finalData, st.fillChangedIndices) : null;
      dispatch({ type: "stroke_end", finalLevelData: finalData, diff });
    }
    resetStroke();
  }, [cancelPaint, canvasDataRef, s, dispatch, resetStroke]);

  const cancelKeyboardDrawing = useCallback(() => {
    if (!keyboardGestureRef.current) return;
    fillGenerationRef.current++;
    fillPendingRef.current = false;
    pendingUpRef.current = false;
    cancelPaint();
    resetStroke();
    const cv = canvasDataRef.current;
    renderCanvasBuffers(cv.levelData, cv.width, cv.height, s.current.colorLUT, sourceCanvasRef.current, null, imgCacheRef.current);
  }, [cancelPaint, resetStroke, canvasDataRef, s]);

  const requestFill = useCallback(
    (cv: CanvasData, pos: Point, level: number) => {
      const fillStroke = strokeRef.current;
      if (!fillStroke) return;
      const fillGeneration = fillGenerationRef.current;
      const { width: W, height: H } = cv;
      fillPendingRef.current = true;
      requestCanvasFill(fillStroke.workingData, pos.x, pos.y, level, W, H)
        .then((res) => {
          if (
            fillGenerationRef.current !== fillGeneration ||
            canvasDataRef.current !== cv ||
            strokeRef.current !== fillStroke ||
            res.levelData.length !== W * H
          )
            return;
          fillStroke.workingData.set(res.levelData);
          if (res.changedIndices.length > 0) {
            fillStroke.fillChangedIndices = res.changedIndices;
            if (res.truncated) s.current.announce(s.current.t("toast_fill_truncated"));
          }
          renderCanvasBuffers(fillStroke.workingData, W, H, s.current.colorLUT, sourceCanvasRef.current, null, imgCacheRef.current);
          fillPendingRef.current = false;
          if (pendingUpRef.current) {
            pendingUpRef.current = false;
            finishStroke();
          }
        })
        .catch((err) => {
          if (fillGenerationRef.current !== fillGeneration || canvasDataRef.current !== cv || strokeRef.current !== fillStroke) return;
          fillPendingRef.current = false;
          pendingUpRef.current = false;
          resetStroke();
          s.current.announce(s.current.t("toast_fill_error"));
          console.error("CHROMALUM: canvas flood fill failed:", err);
        });
    },
    [requestCanvasFill, canvasDataRef, s, finishStroke, resetStroke],
  );

  function doDown(e: React.PointerEvent, refEl: HTMLCanvasElement | null, buttonOverride?: 0 | 1 | 2, startPos?: Point) {
    if (pointerIdRef.current !== null && pointerIdRef.current !== e.pointerId) return;
    const button = buttonOverride ?? e.button;
    if (button !== 0 && button !== 1 && button !== 2) return;
    e.preventDefault();
    if (drawingRef.current || fillPendingRef.current) return;
    activeCanvasRef.current = refEl;
    if (buttonOverride === undefined && (button === 2 || (button === 0 && e.altKey))) {
      const pos = cPos(e, refEl);
      const cv = canvasDataRef.current;
      if (pos.x >= 0 && pos.x < cv.width && pos.y >= 0 && pos.y < cv.height) {
        const lv = cv.levelData[pos.y * cv.width + pos.x] & LEVEL_MASK;
        s.current.setBrushLevel(lv);
        const info = LEVEL_INFO[lv];
        s.current.announce(s.current.t("announce_level", lv, info.name));
      }
      return;
    }
    if (button === 1 || spaceRef.current) {
      s.current.startPan(e);
      return;
    }
    trySetPointerCapture(e);
    pointerIdRef.current = e.pointerId;
    drawingRef.current = true;
    const curTool = toolRef.current,
      curBL = s.current.brushLevel,
      curBS = brushSizeRef.current;
    const pos = startPos ?? cPos(e, refEl);
    lastRef.current = pos;
    strokeSmootherRef.current = curTool === "fill" || isShapeTool(curTool) ? null : createStrokeSmoother(pos);
    forceRawNextMoveRef.current = startPos !== undefined && !isCanvasPointInBounds(startPos, canvasDataRef.current);
    const cv = canvasDataRef.current;
    const { beforeData, workingData } = allocateStrokeBuffers(strokeBufferPoolRef.current, cv.levelData);
    strokeRef.current = createStrokeState(workingData, beforeData, curTool, curBL, curBS, pos);
    const lv = resolveLevel(curTool, curBL);
    const W = cv.width,
      H = cv.height;

    if (curTool === "fill") {
      requestFill(cv, pos, lv);
      return;
    } else if (isShapeTool(curTool)) {
      const bb = applyShapeDot(workingData, curTool, pos, curBS, lv, W, H);
      strokeRef.current.prevShapeBBox = bb;
      if (bb) renderCanvasBuffers(workingData, W, H, s.current.colorLUT, sourceCanvasRef.current, null, imgCacheRef.current, bb);
    } else {
      const effectiveBrushSize = pressureAdjustedBrushSize(curBS, e.nativeEvent);
      const dirtyBB = applyBrushDot(workingData, pos, effectiveBrushSize, lv, W, H);
      if (dirtyBB) renderCanvasBuffers(workingData, W, H, s.current.colorLUT, sourceCanvasRef.current, null, imgCacheRef.current, dirtyBB);
    }
  }

  function canArmWorkspaceStart(e: React.PointerEvent) {
    return e.button === 0 && !e.altKey && toolRef.current !== "fill";
  }

  function doWorkspaceDown(
    e: React.PointerEvent,
    refEl: HTMLCanvasElement | null,
    cursorTrack: (e: React.PointerEvent) => void,
    clearCursor: () => void,
  ) {
    if (keyboardGestureRef.current) {
      e.preventDefault();
      return;
    }
    if (pointerIdRef.current !== null && pointerIdRef.current !== e.pointerId) return;
    pendingWorkspaceStartRef.current = null;
    if (e.button === 1 || spaceRef.current || isInCanvasBounds(e, refEl)) {
      doDown(e, refEl);
      return;
    }
    e.preventDefault();
    if (!isInWorkspaceBounds(e, refEl)) {
      clearCursor();
      return;
    }
    cursorTrack(e);
    updateStatus(e, refEl);
    if (!canArmWorkspaceStart(e)) return;
    trySetPointerCapture(e);
    pointerIdRef.current = e.pointerId;
    pendingWorkspaceStartRef.current = {
      refEl,
      cursorTrack,
      clearCursor,
      startPos: canvasPosUnclamped(e, refEl, zoomRef.current, panRef.current, canvasDataRef.current),
    };
  }

  function doWorkspaceMove(
    e: React.PointerEvent,
    refEl: HTMLCanvasElement | null,
    cursorTrack: (e: React.PointerEvent) => void,
    clearCursor: () => void,
  ) {
    if (pointerIdRef.current !== null && pointerIdRef.current !== e.pointerId) return;
    const pending = pendingWorkspaceStartRef.current;
    if (pending) {
      e.preventDefault();
      const pendingRefEl = pending.refEl ?? refEl;
      if (isInWorkspaceBounds(e, pendingRefEl)) {
        pending.cursorTrack(e);
        updateStatus(e, pendingRefEl);
      } else {
        pending.clearCursor();
      }
      if ((e.buttons & 1) !== 1) {
        pointerIdRef.current = null;
        pendingWorkspaceStartRef.current = null;
        clearCursor();
        return;
      }
      if (!isInCanvasBounds(e, pendingRefEl)) return;
      pendingWorkspaceStartRef.current = null;
      doDown(e, pendingRefEl, 0, pending.startPos);
      doMove(e, pendingRefEl, pending.cursorTrack, pending.clearCursor);
      return;
    }
    if (!drawingRef.current && !panningRef.current && !isInCanvasBounds(e, refEl)) {
      if (isInWorkspaceBounds(e, refEl)) {
        cursorTrack(e);
        updateStatus(e, refEl);
      } else {
        clearCursor();
      }
      return;
    }
    doMove(e, refEl, cursorTrack, clearCursor);
  }

  function doMove(
    e: React.PointerEvent,
    refEl: HTMLCanvasElement | null,
    cursorTrack: (e: React.PointerEvent) => void,
    clearCursor: () => void,
  ) {
    if (pointerIdRef.current !== null && pointerIdRef.current !== e.pointerId) return;
    const canvasEl = refEl ?? activeCanvasRef.current ?? cursor.cursorCanvasRef.current;
    if (isInWorkspaceBounds(e, canvasEl) || drawingRef.current) {
      cursorTrack(e);
    } else {
      clearCursor();
    }
    updateStatus(e, canvasEl);
    if (keyboardGestureRef.current) return;
    if (panningRef.current) {
      s.current.movePan(e);
      return;
    }
    if (!drawingRef.current) return;
    if (e.buttons === 0) {
      onUp(e);
      return;
    }
    const st = strokeRef.current;
    if (!st || st.params.tool === "fill") return;
    e.preventDefault();
    const sp = st.params;
    const workingData = st.workingData;
    const lv = resolveLevel(sp.tool, sp.brushLevel);
    const cv = canvasDataRef.current;
    const W = cv.width,
      H = cv.height;

    if (isShapeTool(sp.tool)) {
      const pos = canvasPosUnclamped(e, canvasEl, zoomRef.current, panRef.current, cv);
      const origin = st.shapeStart || pos;
      const { shapeBBox: newBB, dirtyBBox: dirtyBB } = applyShapeStroke(
        workingData,
        st.beforeData,
        sp.tool,
        origin,
        pos,
        sp.brushSize,
        lv,
        W,
        H,
        st.prevShapeBBox,
      );
      st.prevShapeBBox = newBB;
      lastRef.current = pos;
      renderCanvasBuffers(workingData, W, H, s.current.colorLUT, sourceCanvasRef.current, null, imgCacheRef.current, dirtyBB);
      return;
    }

    // Brush / eraser: keep true canvas-space positions, including samples
    // outside the canvas. Paint kernels clip to the buffer, which avoids edge
    // clamping while keeping strokes continuous when the pointer re-enters.
    const nativeEvent = e.nativeEvent;
    const zoom = zoomRef.current,
      pan = panRef.current;
    const coalesced = typeof nativeEvent.getCoalescedEvents === "function" ? nativeEvent.getCoalescedEvents() : [];
    const events: Array<{ clientX: number; clientY: number } & PointerPressureSample> = coalesced.length > 0 ? coalesced : [nativeEvent];

    let last = lastRef.current;
    let dirtyBB: DirtyRect | null = null;
    for (const ev of events) {
      const raw = canvasPosUnclamped(ev, canvasEl, zoom, pan, cv);
      const useRaw = forceRawNextMoveRef.current;
      if (useRaw) forceRawNextMoveRef.current = false;
      const p = useRaw || !strokeSmootherRef.current ? raw : smoothStrokePoint(strokeSmootherRef.current, raw);
      if (useRaw && strokeSmootherRef.current) {
        strokeSmootherRef.current.x = raw.x;
        strokeSmootherRef.current.y = raw.y;
      }
      const effectiveBrushSize = pressureAdjustedBrushSize(sp.brushSize, ev);
      const bb = last
        ? applyBrushStroke(workingData, last, p, effectiveBrushSize, lv, W, H)
        : applyBrushDot(workingData, p, effectiveBrushSize, lv, W, H);
      dirtyBB = unionBBox(dirtyBB, bb);
      last = p;
    }
    lastRef.current = last;

    if (!dirtyBB) return;

    queueBrushRender(workingData, W, H, dirtyBB);
  }

  const onDown = useCallback((e: React.PointerEvent) => {
    doDown(e, cursor.cursorCanvasRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- doDown reads from sync refs, cursor.cursorCanvasRef is stable
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      doMove(e, cursor.cursorCanvasRef.current, cursor.trackCursor, cursor.clearCursor);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- doMove reads from sync refs, cursor.cursorCanvasRef is stable
    [cursor.trackCursor, cursor.clearCursor],
  );

  const onUp = useCallback(
    (event?: Pick<PointerEvent, "pointerId">) => {
      // Pointer release/leave cannot finish a key-owned gesture. A lifecycle
      // call without a pointer (for example switching tabs) abandons it.
      if (keyboardGestureRef.current) {
        if (!event) cancelKeyboardDrawing();
        return;
      }
      if (event && pointerIdRef.current !== null && pointerIdRef.current !== event.pointerId) return;
      pointerIdRef.current = null;
      pendingWorkspaceStartRef.current = null;
      if (panningRef.current) {
        s.current.endPan();
      }
      if (fillPendingRef.current) {
        pendingUpRef.current = true;
        return;
      }
      finishStroke();
    },
    [cancelKeyboardDrawing, finishStroke, panningRef, s],
  );

  useStrokePointerEnd(pointerIdRef, onUp);

  const onWorkspaceDown = useCallback(
    (e: React.PointerEvent) => {
      doWorkspaceDown(e, cursor.cursorCanvasRef.current, cursor.trackCursor, cursor.clearCursor);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- doWorkspaceDown reads from sync refs, cursor.cursorCanvasRef is stable
    [cursor.trackCursor, cursor.clearCursor],
  );

  const onWorkspaceMove = useCallback(
    (e: React.PointerEvent) => {
      doWorkspaceMove(e, cursor.cursorCanvasRef.current, cursor.trackCursor, cursor.clearCursor);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- doWorkspaceMove reads from sync refs, cursor.cursorCanvasRef is stable
    [cursor.trackCursor, cursor.clearCursor],
  );

  /**
   * A live stroke owns its ring. doMove keeps the ring tracking once the pointer
   * leaves the workspace, and the overlay clips it, so it thins out at the border
   * instead of blinking off and on every time the pointer crosses. These wrappers
   * are what everyone else holds — the leave handlers, the panels' onMouseLeave,
   * the document-level pointermove — so none of them can clear it mid-stroke.
   * finishStroke drops drawingRef before the clear that ends the stroke, so the
   * ring still goes away when the pointer is released outside.
   */
  const clearCursor = useCallback(() => {
    if (drawingRef.current) return;
    cursor.clearCursor();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drawingRef is a stable ref read via .current
  }, [cursor.clearCursor]);

  const beginKeyboardDrawing = useCallback(
    (level: number, code: string) => {
      const point = hoverPointRef.current;
      const overlay = cursor.cursorCanvasRef.current;
      const workspace = overlay?.parentElement;
      if (
        !point ||
        !overlay ||
        !workspace ||
        drawingRef.current ||
        pointerIdRef.current !== null ||
        fillPendingRef.current ||
        panningRef.current ||
        spaceRef.current
      )
        return;
      // Test the current hit target and transform, not the previous hover's pixel:
      // zoom, pan, scrolling, or a popup can move the canvas under a still pointer.
      if (!workspace.contains(document.elementFromPoint(point.clientX, point.clientY))) return;
      const cv = canvasDataRef.current;
      const pos = canvasPosUnclamped(point, overlay, zoomRef.current, panRef.current, cv);
      if (!isCanvasPointInBounds(pos, cv)) return;
      const selectedTool = toolRef.current;
      const size = brushSizeRef.current;
      if (selectedTool !== "fill" && !isShapeTool(selectedTool)) {
        dispatch({ type: "brush_stamp", x: pos.x, y: pos.y, level, brushSize: size });
        return;
      }
      const { beforeData, workingData } = allocateStrokeBuffers(strokeBufferPoolRef.current, cv.levelData);
      strokeRef.current = createStrokeState(workingData, beforeData, selectedTool, level, size, pos);
      keyboardGestureRef.current = { code, tool: selectedTool };
      drawingRef.current = true;
      activeCanvasRef.current = overlay;
      lastRef.current = pos;
      if (selectedTool === "fill") {
        // Keyboard fill is a complete action even when the worker finishes
        // before keyup; pointer fill still waits for its pointer release.
        pendingUpRef.current = true;
        requestFill(cv, pos, level);
      } else {
        const bb = applyShapeDot(workingData, selectedTool, pos, size, level, cv.width, cv.height);
        strokeRef.current.prevShapeBBox = bb;
        if (bb)
          renderCanvasBuffers(workingData, cv.width, cv.height, s.current.colorLUT, sourceCanvasRef.current, null, imgCacheRef.current, bb);
      }
    },
    [dispatch, cursor.cursorCanvasRef, canvasDataRef, zoomRef, panRef, panningRef, spaceRef, brushSizeRef, toolRef, requestFill, s],
  );

  const moveKeyboardShape = useCallback(
    (point: { clientX: number; clientY: number }) => {
      const gesture = keyboardGestureRef.current;
      const st = strokeRef.current;
      if (!gesture || !isShapeTool(gesture.tool) || !st) return;
      const cv = canvasDataRef.current;
      const pos = canvasPosUnclamped(point, cursor.cursorCanvasRef.current, zoomRef.current, panRef.current, cv);
      const { shapeBBox, dirtyBBox } = applyShapeStroke(
        st.workingData,
        st.beforeData,
        st.params.tool,
        st.shapeStart!,
        pos,
        st.params.brushSize,
        st.params.brushLevel,
        cv.width,
        cv.height,
        st.prevShapeBBox,
      );
      st.prevShapeBBox = shapeBBox;
      lastRef.current = pos;
      renderCanvasBuffers(
        st.workingData,
        cv.width,
        cv.height,
        s.current.colorLUT,
        sourceCanvasRef.current,
        null,
        imgCacheRef.current,
        dirtyBBox,
      );
    },
    [canvasDataRef, cursor.cursorCanvasRef, zoomRef, panRef, s],
  );

  const endKeyboardDrawing = useCallback(
    (code: string) => {
      const gesture = keyboardGestureRef.current;
      if (!gesture || gesture.code !== code || !isShapeTool(gesture.tool)) return;
      const point = hoverPointRef.current;
      if (point) moveKeyboardShape(point);
      finishStroke();
    },
    [moveKeyboardShape, finishStroke],
  );

  useEffect(() => {
    const clearPoint = () => {
      hoverPointRef.current = null;
      cancelKeyboardDrawing();
    };
    const trackPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        clearPoint();
        return;
      }
      hoverPointRef.current = { clientX: event.clientX, clientY: event.clientY };
      moveKeyboardShape(event);
    };
    const startTouch = (event: PointerEvent) => {
      if (event.pointerType === "touch") clearPoint();
    };
    const leaveWindow = (event: PointerEvent) => {
      if (event.relatedTarget === null) clearPoint();
    };
    const focusControl = (event: FocusEvent) => {
      if (controlOwnsKey(event.target, { key: "0", code: "Digit0" })) cancelKeyboardDrawing();
    };
    window.addEventListener("pointermove", trackPointer);
    window.addEventListener("pointerdown", startTouch);
    window.addEventListener("pointerout", leaveWindow);
    window.addEventListener("blur", clearPoint);
    window.addEventListener("focusin", focusControl);
    return () => {
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("pointerdown", startTouch);
      window.removeEventListener("pointerout", leaveWindow);
      window.removeEventListener("blur", clearPoint);
      window.removeEventListener("focusin", focusControl);
      cancelKeyboardDrawing();
    };
  }, [moveKeyboardShape, cancelKeyboardDrawing]);

  const onWorkspaceLeave = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== null && pointerIdRef.current !== e.pointerId) return;
      if (pendingWorkspaceStartRef.current) {
        pendingWorkspaceStartRef.current = null;
        pointerIdRef.current = null;
        clearCursor();
        return;
      }
      if (drawingRef.current && hasPointerCapture(e, [sourceCanvasRef.current])) return;
      onUp(e);
      clearCursor();
    },
    [onUp, clearCursor],
  );

  return {
    sourceCanvasRef,
    cursorCanvasRef: cursor.cursorCanvasRef,
    statusRef,
    imgCacheRef,
    strokeRef,
    drawingRef,
    lastRef,
    cursorRafRef: cursor.cursorRafRef,
    scheduleCursorRedrawRef: cursor.scheduleCursorRedrawRef,
    cursorPosRef: cursor.cursorPosRef,
    onDown,
    onMove,
    onUp,
    onWorkspaceDown,
    onWorkspaceMove,
    onWorkspaceLeave,
    trackCursor: cursor.trackCursor,
    clearCursor,
    beginKeyboardDrawing,
    endKeyboardDrawing,
    cancelKeyboardDrawing,
  };
}
