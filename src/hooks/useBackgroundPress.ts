import { useCallback, useEffect, useRef } from "react";
import type React from "react";

const HOLD_MS = 500;
const SLOP_PX = 10;
const CONTROLS = 'button, a, input, select, textarea, [role="button"], [role="checkbox"], [role="slider"], [contenteditable="true"]';

function isBackground(event: React.MouseEvent | React.PointerEvent) {
  if (!(event.target instanceof Element) || event.target.closest(CONTROLS)) return false;
  // The original disabled die is pointer-transparent. Its visual area still
  // belongs to that control, even when the browser targets the polygon below it.
  for (const control of event.currentTarget.querySelectorAll('[aria-disabled="true"]')) {
    const style = getComputedStyle(control);
    if (style.visibility === "hidden" || style.pointerEvents !== "none") continue;
    const box = control.getBoundingClientRect();
    if (
      box.width > 0 &&
      box.height > 0 &&
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom
    )
      return false;
  }
  return true;
}

export function useBackgroundPress(toggle: () => void, view: string) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const consumed = useRef(false);
  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    origin.current = null;
  }, []);

  useEffect(() => cancel(), [view, cancel]);
  useEffect(() => {
    const cancelSecondTouch = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && !event.isPrimary) cancel();
    };
    document.addEventListener("pointerdown", cancelSecondTouch, true);
    return () => {
      cancel();
      document.removeEventListener("pointerdown", cancelSecondTouch, true);
    };
  }, [cancel]);

  return {
    onDoubleClick: (event: React.MouseEvent) => {
      if (!isBackground(event)) return;
      event.preventDefault();
      cancel();
      toggle();
    },
    onPointerDown: (event: React.PointerEvent) => {
      cancel();
      consumed.current = false;
      if (event.pointerType === "mouse" || !event.isPrimary || !isBackground(event)) return;
      origin.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
      timer.current = setTimeout(() => {
        consumed.current = true;
        toggle();
      }, HOLD_MS);
    },
    onPointerMove: (event: React.PointerEvent) => {
      const start = origin.current;
      if (start && (event.pointerId !== start.id || Math.hypot(event.clientX - start.x, event.clientY - start.y) > SLOP_PX)) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (event: React.MouseEvent) => {
      if (!isBackground(event) || (!origin.current && !consumed.current)) return;
      event.preventDefault();
      if (!consumed.current) toggle();
      consumed.current = true;
      cancel();
    },
  };
}
