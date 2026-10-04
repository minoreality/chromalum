import { useCallback, useEffect, useRef } from "react";
import type { usePanZoom } from "./usePanZoom";

export type CanvasNavigationHandlers = Pick<
  ReturnType<typeof usePanZoom>,
  "handleMiddleDown" | "movePan" | "endPan" | "cancelPanInteraction" | "resetView" | "onWheel" | "onPinchDown" | "onPinchMove" | "onPinchUp"
>;

// Match the existing middle-double-click interval. Moving or held contacts
// remain pan, pinch, or Map save gestures rather than taps.
const DOUBLE_TAP_MS = 400;
const TAP_MOVE_SQUARED = 100;
type Tap = { at: number; x: number; y: number };

export function usePreviewCanvasNavigation(navigation: CanvasNavigationHandlers, active = true) {
  const { handleMiddleDown, movePan, endPan, cancelPanInteraction, resetView, onWheel, onPinchDown, onPinchMove, onPinchUp } = navigation;
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const middlePointerRef = useRef<number | null>(null);
  const touchPointersRef = useRef(new Set<number>());
  const tapRef = useRef<(Tap & { pointerId: number }) | null>(null);
  const lastTapRef = useRef<Tap | null>(null);

  const cancel = useCallback(() => {
    if (middlePointerRef.current !== null || touchPointersRef.current.size > 0) cancelPanInteraction();
    middlePointerRef.current = null;
    touchPointersRef.current.clear();
    tapRef.current = null;
    lastTapRef.current = null;
  }, [cancelPanInteraction]);

  useEffect(() => {
    if (!active) return;
    const workspace = workspaceRef.current;
    workspace?.addEventListener("wheel", onWheel, { passive: false });
    // React settles captured pointer ends before this fallback. An end that
    // bypasses the workspace must not leave shared pan armed.
    const endOutside = (event: PointerEvent) => {
      if (middlePointerRef.current === event.pointerId || touchPointersRef.current.has(event.pointerId)) cancel();
    };
    window.addEventListener("pointerup", endOutside);
    window.addEventListener("pointercancel", endOutside);
    window.addEventListener("blur", cancel);
    return () => {
      workspace?.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerup", endOutside);
      window.removeEventListener("pointercancel", endOutside);
      window.removeEventListener("blur", cancel);
      cancel();
    };
  }, [active, onWheel, cancel]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!active) return;
      if (e.button === 1 && e.pointerType !== "touch") {
        if (touchPointersRef.current.size > 0) return;
        middlePointerRef.current = e.pointerId;
        lastTapRef.current = null;
        handleMiddleDown(e);
      } else if (e.pointerType === "touch") {
        if (middlePointerRef.current !== null) return;
        e.preventDefault();
        touchPointersRef.current.add(e.pointerId);
        if (touchPointersRef.current.size === 1) {
          tapRef.current = { pointerId: e.pointerId, at: performance.now(), x: e.clientX, y: e.clientY };
        } else {
          tapRef.current = null;
          lastTapRef.current = null;
        }
        onPinchDown(e);
      }
    },
    [active, handleMiddleDown, onPinchDown],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!active) return;
      if (middlePointerRef.current === e.pointerId) {
        if (!(e.buttons & 4)) {
          middlePointerRef.current = null;
          endPan();
          return;
        }
        movePan(e);
      } else if (touchPointersRef.current.has(e.pointerId)) {
        const tap = tapRef.current;
        if (tap && (e.clientX - tap.x) ** 2 + (e.clientY - tap.y) ** 2 > TAP_MOVE_SQUARED) {
          tapRef.current = null;
          lastTapRef.current = null;
        }
        onPinchMove(e);
      }
    },
    [active, movePan, endPan, onPinchMove],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (middlePointerRef.current === e.pointerId) {
        middlePointerRef.current = null;
        endPan();
      } else if (touchPointersRef.current.delete(e.pointerId)) {
        onPinchUp(e);
        const tap = tapRef.current;
        tapRef.current = null;
        if (!tap || tap.pointerId !== e.pointerId || performance.now() - tap.at > DOUBLE_TAP_MS) {
          lastTapRef.current = null;
          return;
        }
        const now = performance.now();
        const previous = lastTapRef.current;
        if (previous && now - previous.at < DOUBLE_TAP_MS && (tap.x - previous.x) ** 2 + (tap.y - previous.y) ** 2 <= TAP_MOVE_SQUARED) {
          lastTapRef.current = null;
          resetView();
        } else {
          lastTapRef.current = { at: now, x: tap.x, y: tap.y };
        }
      }
    },
    [endPan, onPinchUp, resetView],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (middlePointerRef.current === e.pointerId || touchPointersRef.current.has(e.pointerId)) cancel();
    },
    [cancel],
  );

  return { workspaceRef, onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
