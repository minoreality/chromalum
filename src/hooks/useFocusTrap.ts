import { useEffect, useRef } from "react";

/**
 * Traps keyboard focus within a dialog element when active.
 * Handles Tab cycling and optional Escape to close.
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void): void {
  const previousActiveRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;
    const getFocusable = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    const focusable = getFocusable();
    if (focusable.length) {
      const first = focusable[0];
      // On touch devices, auto-focusing a form field pops up the virtual keyboard,
      // which is intrusive when the user hasn't asked for it. Combine multiple
      // signals because no single check is reliable across DevTools emulation,
      // hybrid devices, and real mobile browsers.
      const isFormField = first.tagName === "INPUT" || first.tagName === "TEXTAREA" || first.tagName === "SELECT";
      const isTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window || !window.matchMedia("(pointer: fine)").matches;
      if (isFormField && isTouch) el.focus();
      else first.focus();
    } else {
      el.focus();
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const currentFocusable = getFocusable();
      if (currentFocusable.length === 0) {
        e.preventDefault();
        el.focus();
        return;
      }
      const first = currentFocusable[0],
        last = currentFocusable[currentFocusable.length - 1];
      const focused = document.activeElement;
      if (focused === el || !el.contains(focused)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      const prev = previousActiveRef.current;
      if (prev && prev !== document.body && document.body.contains(prev)) {
        try {
          prev.focus();
        } catch {
          /* element may not be focusable */
        }
      }
    };
  }, [ref, active, onEscape]);
}
