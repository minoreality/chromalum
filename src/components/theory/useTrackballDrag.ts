import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import {
  dragStellaOrientation,
  linearStellaOrientation,
  stellaBallDirection,
  stellaSpin,
  turnStellaOrientation,
  type Point3,
  type StellaBall,
  type StellaGrip,
  type StellaOrientation,
} from "./stella-view";

// How far a pointer travels before a press becomes a drag instead of a tap. A
// finger wanders more than a mouse, and a tap is already abandoned past 12px, so
// taking over there costs the tap nothing it had.
const MOUSE_DRAG_SLOP = 4;
const TOUCH_DRAG_SLOP = 12;
// Layout-free fallback, for environments that report no box (jsdom, hidden tabs).
const FALLBACK_DRAG_SIZE = 240;
// A finished drag is followed by a click the reader never asked for, and a
// right-button one by a context menu, both in the same breath as the release.
// A one-shot flag catches exactly that event; the next press disarms it, so a
// drag that ends without one does not eat a deliberate click later. A time
// window read the same intent off the clock, which meant guessing how long
// that breath is — a loaded main thread stretches it past any guess, and the
// suppression then lapses before the click it was waiting for arrives.

type Drag = {
  pointerId: number;
  x: number;
  y: number;
  /** Maps client coordinates into the SVG's drawing units at the press. */
  surfacePoint: (clientX: number, clientY: number) => { x: number; y: number };
  /** The point of the ball the press took hold of, and how far its hold reaches. */
  grabbed: Point3;
  grip: StellaGrip;
  /** Where the press landed on the drawing surface, for the grip with no ball. */
  fromX: number;
  fromY: number;
  /** Which held button keeps this drag alive. */
  buttonMask: number;
  /** Set while the spin grip is out past the rim and turning on its own. */
  spin: { up: number; right: number; rate: number } | null;
  /** The pose the drag started from; every move is measured against it. */
  base: StellaOrientation;
  active: boolean;
};

export interface TrackballOptions {
  /** Drawing bounds for the fallback when the SVG has no screen matrix. */
  viewBox: { readonly x: number; readonly y: number; readonly size: number };
  /** The sphere the figure is drawn on, in those same units. */
  ball: StellaBall;
  /** The pose on screen right now, which a new press takes hold of. */
  orientation: () => StellaOrientation;
  /** Report a turn. Given the previous pose so a running spin can accumulate. */
  onTurn: (next: (previous: StellaOrientation) => StellaOrientation) => void;
  /** Called once when a press becomes a drag. */
  onDragStart?: () => void;
}

/**
 * Turning a figure by dragging it, shared by every figure that has a pose.
 *
 * Which button was pressed picks how far the grip reaches: left holds the ball's
 * own surface, right carries on past it, and the middle one keeps turning after
 * the pointer leaves. Shift, and a finger, drop the ball and simply follow the
 * hand. The grips themselves live in stella-view; this hook is the pointer
 * bookkeeping around them.
 */
export function useTrackballDrag({ viewBox, ball, orientation, onTurn, onDragStart }: TrackballOptions) {
  const drag = useRef<Drag | null>(null);
  const spinFrame = useRef(0);
  const spinSince = useRef(0);
  const swallowNextClick = useRef(false);
  const swallowNextMenu = useRef(false);
  const [dragging, setDragging] = useState(false);

  const stopSpin = () => {
    cancelAnimationFrame(spinFrame.current);
    spinFrame.current = 0;
  };

  // Timed from the frame stamps themselves, so the clock matches the frames and
  // the first one only starts the measurement.
  const runSpin = (now: number) => {
    const current = drag.current;
    if (!current?.spin || current.spin.rate <= 0) {
      stopSpin();
      return;
    }
    const previous = spinSince.current;
    spinSince.current = now;
    // Cap the step so a tab left in the background cannot come back and lurch.
    const seconds = previous === 0 ? 0 : Math.min(0.05, (now - previous) / 1000);
    if (seconds > 0) {
      const { up, right, rate } = current.spin;
      onTurn((pose) => turnStellaOrientation(pose, up, right, rate * seconds));
    }
    spinFrame.current = requestAnimationFrame(runSpin);
  };

  useEffect(() => stopSpin, []);

  return {
    dragging,
    /** Whether this click is the one a finished drag left behind. Consumes it. */
    swallowsClick: () => {
      if (!swallowNextClick.current) return false;
      swallowNextClick.current = false;
      return true;
    },

    onPointerDown(event: PointerEvent<SVGSVGElement>) {
      // A new press means the last drag's trailing click never came.
      swallowNextClick.current = false;
      swallowNextMenu.current = false;
      const box = event.currentTarget.getBoundingClientRect();
      const unit = (Math.min(box.width, box.height) || FALLBACK_DRAG_SIZE) / viewBox.size;
      // The SVG matrix includes non-square viewBoxes and preserveAspectRatio
      // padding. A square estimate is only for layout-free environments.
      const matrix = event.currentTarget.getScreenCTM?.()?.inverse();
      const surfacePoint: Drag["surfacePoint"] = matrix
        ? (clientX, clientY) => ({
            x: matrix.a * clientX + matrix.c * clientY + matrix.e,
            y: matrix.b * clientX + matrix.d * clientY + matrix.f,
          })
        : (clientX, clientY) => ({
            x: viewBox.x + (clientX - box.left) / unit,
            y: viewBox.y + (clientY - box.top) / unit,
          });
      const { x, y } = surfacePoint(event.clientX, event.clientY);
      // The press takes hold of the face of the ball at that spot, never of
      // whatever the figure draws there, so the same place always turns the same
      // way whether a near vertex, a far one, or nothing sits under it.
      // Motion the reader did not ask for is what reduced motion rules out, so
      // there the middle button holds the surface like the left one.
      const spins = event.button === 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // A finger has no button to pick with, the ball leaves it almost no room to
      // work outside, and reaching for that room runs into the system's own edge
      // gestures. One rate everywhere also keeps it off the hair trigger at the
      // rim, which a fingertip is wide enough to land on whether it means to or not.
      const grip: StellaGrip =
        event.pointerType === "touch" || event.shiftKey ? "linear" : event.button === 2 ? "sheet" : spins ? "spin" : "sphere";
      // Middle-button autoscroll would take the gesture away on Windows.
      if (event.button === 1) event.preventDefault();
      drag.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        surfacePoint,
        grabbed: stellaBallDirection(x, y, grip === "sheet" ? "sheet" : "sphere", ball),
        grip,
        fromX: x,
        fromY: y,
        buttonMask: event.button === 2 ? 2 : event.button === 1 ? 4 : 1,
        spin: null,
        base: orientation(),
        active: false,
      };
    },

    /** Returns true when the move drove the figure, so the caller leaves it alone. */
    onPointerMove(event: PointerEvent<SVGSVGElement>): boolean {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return false;
      // A press that ended off the figure leaves no pointerup here, so the held
      // button is what says the drag is still live. Without this a later pass of
      // the bare pointer would keep turning the figure.
      if ((event.buttons & current.buttonMask) === 0) {
        drag.current = null;
        stopSpin();
        if (current.active) setDragging(false);
        return false;
      }
      if (!current.active) {
        const slop = event.pointerType === "touch" ? TOUCH_DRAG_SLOP : MOUSE_DRAG_SLOP;
        if (Math.hypot(event.clientX - current.x, event.clientY - current.y) <= slop) return false;
        current.active = true;
        setDragging(true);
        onDragStart?.();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* capture is an optimisation; the drag still works without it */
        }
      }
      const { x, y } = current.surfacePoint(event.clientX, event.clientY);
      if (current.grip === "linear") {
        onTurn(() => linearStellaOrientation(current.base, current.fromX, current.fromY, x, y, ball));
        return true;
      }
      if (current.grip === "spin") {
        const spin = stellaSpin(x, y, ball);
        if (spin.rate > 0) {
          // Out past the rim the pointer sets a heading and a speed, and the
          // figure goes on turning whether or not the hand moves again.
          if (!current.spin) {
            current.base = orientation();
            spinSince.current = 0;
            spinFrame.current = requestAnimationFrame(runSpin);
          }
          current.spin = spin;
          return true;
        }
        if (current.spin) {
          // Back inside, take hold again where the pointer now is, so the figure
          // neither jumps nor keeps drifting.
          current.spin = null;
          stopSpin();
          current.base = orientation();
          current.grabbed = stellaBallDirection(x, y, "sphere", ball);
          return true;
        }
      }
      const pointer = stellaBallDirection(x, y, current.grip === "sheet" ? "sheet" : "sphere", ball);
      onTurn(() => dragStellaOrientation(current.base, current.grabbed, pointer));
      return true;
    },

    /** Returns true when a real drag ended here, so the caller skips its own tap handling. */
    onPointerUp(event: PointerEvent<SVGSVGElement>): boolean {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return false;
      drag.current = null;
      stopSpin();
      if (!current.active) return false;
      setDragging(false);
      swallowNextClick.current = true;
      if (current.buttonMask === 2) swallowNextMenu.current = true;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* the browser may have released it already */
      }
      return true;
    },

    onContextMenu(event: MouseEvent<SVGSVGElement>) {
      // Turning with the right button ends in a menu nobody asked for. A right
      // click that never became a drag still gets its menu.
      const current = drag.current;
      if (current?.buttonMask === 2 && current.active) {
        event.preventDefault();
        return;
      }
      if (!swallowNextMenu.current) return;
      swallowNextMenu.current = false;
      event.preventDefault();
    },
  };
}
