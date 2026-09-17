import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { K8Target } from "./k8-selection";
import {
  interpolateStellaOrientation,
  stellaOrientation,
  STELLA_BALL,
  STELLA_TURN_STEP,
  STELLA_VIEWBOX,
  turnStellaOrientation,
  type StellaOrientation,
} from "./stella-view";
import { useTrackballDrag } from "./useTrackballDrag";

const DOUBLE_PRESS_INTERVAL = 200;
const MAX_TAP_DURATION = 350;
const TAP_SLOP = 24;
// A vertex turn sweeps up to half a revolution; a keypad nudge is a small step,
// so it gets a short duration or holding the key would lag behind the presses.
const TURN_DURATION = 650;
const NUDGE_DURATION = 130;
type Tap = { x: number; y: number; time: number; selection: K8Target | null; level: number | null };
type Click = Pick<Tap, "time" | "selection" | "level">;
type Pose = { frontLevel: number | null; orientation: StellaOrientation; duration: number };
const DEFAULT_POSE: Pose = { frontLevel: null, orientation: stellaOrientation(null), duration: TURN_DURATION };

function nodeAt(target: EventTarget | null): number | null {
  const value = target instanceof Element ? target.closest("[data-stella-vertex]")?.getAttribute("data-stella-vertex") : null;
  return value == null ? null : Number(value);
}

export function useStellaView(selection: K8Target | null, restoreSelection: (selection: K8Target | null) => void) {
  const [destination, setDestination] = useState(DEFAULT_POSE);
  const [frameState, setFrameState] = useState(() => ({ orientation: DEFAULT_POSE.orientation, progress: 1 }));
  const position = useRef(frameState.orientation);
  const rotating = useRef(false);
  const savedPose = useRef<Pose | null>(null);
  const canReverse = useRef(false);
  const previousClick = useRef<Click | null>(null);
  const doubleClick = useRef<Click | null>(null);
  const touchStart = useRef<Tap | null>(null);
  const previousTap = useRef<Tap | null>(null);
  const ignoreClickUntil = useRef(0);
  const ignoreDoubleClickUntil = useRef(0);
  const trackball = useTrackballDrag({
    viewBox: STELLA_VIEWBOX,
    ball: STELLA_BALL,
    orientation: () => position.current,
    onTurn: (next) => setDestination((pose) => ({ frontLevel: null, orientation: next(pose.orientation), duration: 0 })),
    onDragStart: () => {
      savedPose.current = null;
      canReverse.current = false;
    },
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const from = position.current;
    const target = destination.orientation;
    const duration = destination.duration;
    // Time the turn from the first animation frame. The frame timestamp and
    // performance.now() are not guaranteed to share an origin, and mixing them
    // can start the turn already past its end.
    let start: number | null = null;
    let frame = 0;
    const update = (value: StellaOrientation, progress: number) => {
      position.current = value;
      rotating.current = progress < 1;
      setFrameState({ orientation: value, progress });
    };
    const finish = () => {
      cancelAnimationFrame(frame);
      update(target, 1);
      if (destination.frontLevel === null && savedPose.current) canReverse.current = true;
    };
    const animate = (now: number) => {
      if (start === null) start = now;
      const elapsed = Math.min(1, Math.max(0, (now - start) / duration));
      if (elapsed === 1) {
        finish();
        return;
      }
      const eased = elapsed * elapsed * (3 - 2 * elapsed);
      update(interpolateStellaOrientation(from, target, eased), elapsed);
      frame = requestAnimationFrame(animate);
    };
    const onMotionChange = () => {
      if (media.matches) finish();
    };
    // A drag is direct manipulation, not motion the page plays by itself, so it
    // asks for no duration and lands on each frame the pointer produces.
    if (media.matches || from === target || duration <= 0) finish();
    else {
      update(from, 0);
      frame = requestAnimationFrame(animate);
    }
    media.addEventListener("change", onMotionChange);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", onMotionChange);
    };
  }, [destination]);

  const aim = (level: number | null, before: K8Target | null) => {
    restoreSelection(before);
    if (level !== null) {
      if (rotating.current || level === destination.frontLevel) return;
      savedPose.current = null;
      canReverse.current = false;
      rotating.current = true;
      setDestination({ frontLevel: level, orientation: stellaOrientation(level, position.current), duration: TURN_DURATION });
      return;
    }

    // Finish the node turn and the first return before allowing reversals.
    if (rotating.current && !canReverse.current) return;
    let next: Pose;
    if (destination.frontLevel === null) {
      if (!savedPose.current) return;
      next = savedPose.current;
    } else {
      // Keep the settled pose, including its roll, throughout every reversal.
      if (!rotating.current) savedPose.current = { ...destination, duration: TURN_DURATION };
      next = DEFAULT_POSE;
    }
    rotating.current = position.current !== next.orientation;
    setDestination(next);
  };
  /**
   * Push the view one step toward a screen direction. Chaining from the
   * destination rather than the drawn frame lets a held key accumulate instead
   * of fighting the animation still running from the previous press.
   */
  const turn = (up: number, right: number) => {
    savedPose.current = null;
    canReverse.current = false;
    rotating.current = true;
    setDestination({
      frontLevel: null,
      orientation: turnStellaOrientation(destination.orientation, up, right, STELLA_TURN_STEP),
      duration: NUDGE_DURATION,
    });
  };

  const resetView = () => {
    savedPose.current = null;
    canReverse.current = false;
    rotating.current = position.current !== DEFAULT_POSE.orientation;
    setDestination(DEFAULT_POSE);
  };

  const cancelTouch = () => {
    touchStart.current = null;
    previousTap.current = null;
  };

  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!trackball.onPointerUp(event)) return false;
    cancelTouch();
    return true;
  };

  return {
    ...frameState,
    frontLevel: destination.frontLevel,
    // Only the untouched projection is the default one; a nudged view is free.
    isDefaultView: destination.frontLevel === null && destination.orientation === DEFAULT_POSE.orientation,
    // Vertices sweep under a resting pointer while the view moves, whether the
    // camera is playing a turn or the reader is dragging it.
    interacting: frameState.progress < 1 || trackball.dragging,
    turn,
    resetView,
    handlers: {
      onClickCapture(event: MouseEvent<SVGSVGElement>) {
        const now = performance.now();
        doubleClick.current = null;
        // Asked before the || so a drag's trailing click is always consumed,
        // even when the touch suppression below would have caught it anyway.
        const swallowsDragClick = trackball.swallowsClick();
        if (now < ignoreClickUntil.current || swallowsDragClick) {
          previousClick.current = null;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        const previous = previousClick.current;
        const level = nodeAt(event.target);
        // The browser may report dblclick at a slower, OS-defined interval.
        // Outside our shorter window, both clicks keep their normal action.
        if (
          event.detail > 1 &&
          event.detail % 2 === 0 &&
          previous &&
          previous.level === level &&
          now - previous.time <= DOUBLE_PRESS_INTERVAL
        ) {
          doubleClick.current = previous;
          previousClick.current = null;
          event.preventDefault();
          event.stopPropagation();
        } else previousClick.current = { time: now, selection, level };
      },
      onDoubleClick(event: MouseEvent<SVGSVGElement>) {
        event.preventDefault();
        event.stopPropagation();
        const candidate = doubleClick.current;
        doubleClick.current = null;
        if (candidate && performance.now() >= ignoreDoubleClickUntil.current) aim(candidate.level, candidate.selection);
      },
      onPointerDown(event: PointerEvent<SVGSVGElement>) {
        ignoreClickUntil.current = 0;
        trackball.onPointerDown(event);
        if (event.pointerType !== "touch") return;
        if (!event.isPrimary) {
          cancelTouch();
          return;
        }
        touchStart.current = { x: event.clientX, y: event.clientY, time: performance.now(), selection, level: nodeAt(event.target) };
      },
      onPointerMove(event: PointerEvent<SVGSVGElement>) {
        if (trackball.onPointerMove(event)) return;
        const start = touchStart.current;
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) cancelTouch();
      },
      onContextMenu: trackball.onContextMenu,
      onPointerCancel(event: PointerEvent<SVGSVGElement>) {
        endDrag(event);
        cancelTouch();
      },
      onPointerUp(event: PointerEvent<SVGSVGElement>) {
        if (endDrag(event)) return;
        if (event.pointerType !== "touch") return;
        const start = touchStart.current;
        touchStart.current = null;
        const now = performance.now();
        if (!start || now - start.time > MAX_TAP_DURATION || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
          previousTap.current = null;
          return;
        }
        const previous = previousTap.current;
        if (
          previous &&
          previous.level === start.level &&
          now - previous.time <= DOUBLE_PRESS_INTERVAL &&
          Math.hypot(start.x - previous.x, start.y - previous.y) <= TAP_SLOP
        ) {
          event.preventDefault();
          previousTap.current = null;
          // Some browsers synthesize both click and dblclick after touch.
          ignoreClickUntil.current = now + 500;
          ignoreDoubleClickUntil.current = now + 500;
          aim(start.level, previous.selection);
        } else previousTap.current = { ...start, time: now };
      },
    },
  };
}
