import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject, type CanvasHTMLAttributes } from "react";
import type { AutomataController } from "./useAutomataState";
import { cellsOnLine, hitTestCell, type PlaneGeometry } from "./geometry";
import { PLANE_SIZE, type CAColor, type Cell } from "./model";
type Handlers = Pick<
  CanvasHTMLAttributes<HTMLCanvasElement>,
  "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onLostPointerCapture" | "onKeyDown"
>;
interface Stroke {
  id: number;
  color: CAColor;
  revision: number;
  last: Cell | null;
  canvas: HTMLCanvasElement;
}
export function useAutomataInteraction({
  canvasRef,
  active,
  controller,
  geometry,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
  controller: AutomataController;
  geometry: PlaneGeometry | null;
}): Handlers & { cancelInteraction: () => void } {
  const owner = useRef<Stroke | null>(null);
  const { dispatch, getSnapshot, beginInteraction, finishInteraction, revision } = controller;
  const cancelInteraction = useCallback(() => {
    const stroke = owner.current;
    if (!stroke) return;
    owner.current = null;
    try {
      if (stroke.canvas.hasPointerCapture?.(stroke.id)) stroke.canvas.releasePointerCapture(stroke.id);
    } catch {
      /* The browser may already have released capture. */
    }
    finishInteraction();
  }, [finishInteraction]);
  const visit = useCallback(
    (clientX: number, clientY: number) => {
      const stroke = owner.current;
      if (!stroke) return;
      const cell = hitTestCell(clientX, clientY, stroke.canvas.getBoundingClientRect());
      if (!cell) {
        stroke.last = null;
        return;
      }
      if (getSnapshot().state.time === 0) {
        dispatch({ type: "paint-cells", cells: stroke.last ? cellsOnLine(stroke.last, cell) : [cell], color: stroke.color });
      } else dispatch({ type: "select-cell", ...cell });
      stroke.last = cell;
    },
    [dispatch, getSnapshot],
  );
  useLayoutEffect(() => {
    if (!active || (owner.current && owner.current.revision !== revision)) cancelInteraction();
  }, [active, revision, cancelInteraction]);
  useLayoutEffect(() => {
    cancelInteraction();
  }, [geometry?.cssSize, geometry?.dpr, cancelInteraction]);
  useEffect(() => {
    const end = (event: PointerEvent) => {
      if (owner.current?.id === event.pointerId) cancelInteraction();
    };
    const hidden = () => {
      if (document.hidden) cancelInteraction();
    };
    window.addEventListener("blur", cancelInteraction);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", cancelInteraction);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      document.removeEventListener("visibilitychange", hidden);
      cancelInteraction();
    };
  }, [cancelInteraction]);
  return {
    cancelInteraction,
    onPointerDown: (event) => {
      const canvas = canvasRef.current;
      if (!active || !geometry || !canvas || owner.current || !event.isPrimary || event.button !== 0) return;
      if ((event.pointerType === "mouse" || event.pointerType === "pen") && !(event.buttons & 1)) return;
      if (!hitTestCell(event.clientX, event.clientY, canvas.getBoundingClientRect())) return;
      const snapshot = getSnapshot();
      owner.current = { id: event.pointerId, color: snapshot.state.color, revision: snapshot.revision, last: null, canvas };
      canvas.focus({ preventScroll: true });
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        /* Window events still end the owner. */
      }
      event.preventDefault();
      beginInteraction();
      visit(event.clientX, event.clientY);
    },
    onPointerMove: (event) => {
      const stroke = owner.current;
      if (!stroke || stroke.id !== event.pointerId) return;
      if (
        !active ||
        stroke.revision !== getSnapshot().revision ||
        ((event.pointerType === "mouse" || event.pointerType === "pen") && !(event.buttons & 1))
      ) {
        cancelInteraction();
        return;
      }
      event.preventDefault();
      visit(event.clientX, event.clientY);
    },
    onPointerUp: (event) => {
      if (owner.current?.id !== event.pointerId) return;
      if (active && owner.current.revision === getSnapshot().revision) visit(event.clientX, event.clientY);
      cancelInteraction();
    },
    onPointerCancel: (event) => {
      if (owner.current?.id === event.pointerId) cancelInteraction();
    },
    onLostPointerCapture: (event) => {
      if (owner.current?.id === event.pointerId) cancelInteraction();
    },
    onKeyDown: (event) => {
      if (!active || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const deltas: Record<string, Cell> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      };
      const delta = deltas[event.key];
      if (!delta && event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      cancelInteraction();
      const state = getSnapshot().state;
      if (delta)
        dispatch({
          type: "select-cell",
          x: Math.max(0, Math.min(PLANE_SIZE - 1, state.x + delta.x)),
          y: Math.max(0, Math.min(PLANE_SIZE - 1, state.y + delta.y)),
        });
      else if (state.time === 0) dispatch({ type: "paint-cells", cells: [{ x: state.x, y: state.y }], color: state.color });
    },
  };
}
