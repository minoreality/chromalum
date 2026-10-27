import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject, type CanvasHTMLAttributes } from "react";
import type { AutomataController } from "./useAutomataState";
import { cellsOnLine, hitTestCell, type PlaneGeometry } from "./geometry";
import { PLANE_SIZE, type CAColor, type Cell } from "./model";
import { controlOwnsKey } from "../shortcuts";
type Handlers = Pick<
  CanvasHTMLAttributes<HTMLCanvasElement>,
  | "onPointerDown"
  | "onPointerEnter"
  | "onPointerMove"
  | "onPointerLeave"
  | "onPointerUp"
  | "onPointerCancel"
  | "onLostPointerCapture"
  | "onKeyDown"
  | "onFocus"
  | "onBlur"
>;
type DrawingTarget = { kind: "pointer"; clientX: number; clientY: number } | { kind: "keyboard" };
type Cursor = { kind: "pointer"; cell: Cell } | { kind: "keyboard" };
const ARROW_DELTAS: Record<string, Cell> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};
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
  editable,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
  controller: AutomataController;
  geometry: PlaneGeometry | null;
  editable?: boolean | undefined;
}): Handlers & { cancelInteraction: () => void; cursorCell: Cell | null } {
  const owner = useRef<Stroke | null>(null);
  const target = useRef<DrawingTarget | null>(null);
  const arrows = useRef(new Set<string>());
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const { dispatch, getSnapshot, beginInteraction, finishInteraction, revision, interacting } = controller;
  const setTarget = useCallback(
    (aim: DrawingTarget | null) => {
      target.current = aim;
      const canvas = canvasRef.current;
      const cell = aim?.kind === "pointer" && canvas ? hitTestCell(aim.clientX, aim.clientY, canvas.getBoundingClientRect()) : null;
      const next: Cursor | null = aim?.kind === "keyboard" ? { kind: "keyboard" } : cell ? { kind: "pointer", cell } : null;
      setCursor((previous) => {
        if (previous?.kind === "keyboard" && next?.kind === "keyboard") return previous;
        if (previous?.kind === "pointer" && next?.kind === "pointer" && previous.cell.x === next.cell.x && previous.cell.y === next.cell.y)
          return previous;
        return next;
      });
    },
    [canvasRef],
  );
  const refreshPointerTarget = useCallback(() => {
    const aim = target.current;
    if (aim?.kind === "pointer") setTarget(document.elementFromPoint(aim.clientX, aim.clientY) === canvasRef.current ? aim : null);
  }, [canvasRef, setTarget]);
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
      if (editable ?? getSnapshot().state.time === 0) {
        dispatch({ type: "paint-cells", cells: stroke.last ? cellsOnLine(stroke.last, cell) : [cell], color: stroke.color });
      } else dispatch({ type: "select-cell", ...cell });
      stroke.last = cell;
    },
    [dispatch, getSnapshot, editable],
  );
  useLayoutEffect(() => {
    if (!active) {
      setTarget(null);
      arrows.current.clear();
    }
    if (!active || (owner.current && owner.current.revision !== revision)) cancelInteraction();
  }, [active, revision, cancelInteraction, setTarget]);
  useLayoutEffect(() => {
    cancelInteraction();
    refreshPointerTarget();
  }, [geometry?.cssSize, geometry?.dpr, cancelInteraction, refreshPointerTarget]);
  useEffect(() => {
    const blur = () => {
      setTarget(null);
      arrows.current.clear();
      cancelInteraction();
    };
    const end = (event: PointerEvent) => {
      if (owner.current?.id === event.pointerId) cancelInteraction();
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    const keyUp = (event: KeyboardEvent) => {
      arrows.current.delete(event.key);
    };
    window.addEventListener("blur", blur);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("keyup", keyUp);
    return () => {
      window.removeEventListener("blur", blur);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("keyup", keyUp);
      cancelInteraction();
    };
  }, [cancelInteraction, setTarget]);
  useEffect(() => {
    if (!active) return;
    const pointerMoved = (event: PointerEvent) => {
      if (event.isPrimary && (event.pointerType === "mouse" || event.pointerType === "pen") && event.target !== canvasRef.current) {
        setTarget(null);
      }
    };
    const draw = (event: KeyboardEvent) => {
      const canvas = canvasRef.current;
      const aim = target.current;
      if (
        !canvas ||
        !geometry ||
        !aim ||
        owner.current ||
        interacting ||
        document.hidden ||
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !/^[0-7]$/.test(event.key) ||
        controlOwnsKey(event.target, event) ||
        document.querySelector('[role="dialog"][aria-modal="true"], dialog[open]')
      )
        return;
      const state = getSnapshot().state;
      if (!(editable ?? state.time === 0)) return;
      let cell: Cell | null;
      if (aim.kind === "pointer") {
        // A scroll, popup or layout change may have put something else under this point.
        if (document.elementFromPoint(aim.clientX, aim.clientY) !== canvas) return;
        cell = hitTestCell(aim.clientX, aim.clientY, canvas.getBoundingClientRect());
      } else cell = document.activeElement === canvas ? { x: state.x, y: state.y } : null;
      if (!cell) return;
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      setTarget(aim);
      const color = Number(event.key) as CAColor;
      dispatch({ type: "set-color", color });
      dispatch({ type: "paint-cells", cells: [cell], color });
    };
    window.addEventListener("pointermove", pointerMoved);
    window.addEventListener("keydown", draw);
    window.addEventListener("scroll", refreshPointerTarget, true);
    window.addEventListener("resize", refreshPointerTarget);
    return () => {
      window.removeEventListener("pointermove", pointerMoved);
      window.removeEventListener("keydown", draw);
      window.removeEventListener("scroll", refreshPointerTarget, true);
      window.removeEventListener("resize", refreshPointerTarget);
    };
  }, [active, canvasRef, geometry, interacting, getSnapshot, editable, dispatch, setTarget, refreshPointerTarget]);
  return {
    cancelInteraction,
    cursorCell:
      active && (editable ?? controller.state.time === 0) && cursor
        ? cursor.kind === "pointer"
          ? cursor.cell
          : { x: controller.state.x, y: controller.state.y }
        : null,
    onFocus: () => {
      setTarget({ kind: "keyboard" });
    },
    onBlur: () => {
      setTarget(null);
      arrows.current.clear();
      cancelInteraction();
    },
    onPointerEnter: (event) => {
      if (active && event.isPrimary && (event.pointerType === "mouse" || event.pointerType === "pen")) {
        setTarget({ kind: "pointer", clientX: event.clientX, clientY: event.clientY });
      }
    },
    onPointerDown: (event) => {
      const canvas = canvasRef.current;
      if (!active || !geometry || !canvas || owner.current || !event.isPrimary || event.button !== 0) return;
      if ((event.pointerType === "mouse" || event.pointerType === "pen") && !(event.buttons & 1)) return;
      if (!hitTestCell(event.clientX, event.clientY, canvas.getBoundingClientRect())) return;
      const snapshot = getSnapshot();
      owner.current = { id: event.pointerId, color: snapshot.state.color, revision: snapshot.revision, last: null, canvas };
      canvas.focus({ preventScroll: true });
      arrows.current.clear();
      setTarget({ kind: "pointer", clientX: event.clientX, clientY: event.clientY });
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
      if (
        active &&
        ((event.isPrimary && (event.pointerType === "mouse" || event.pointerType === "pen")) || owner.current?.id === event.pointerId)
      ) {
        setTarget({ kind: "pointer", clientX: event.clientX, clientY: event.clientY });
      }
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
    onPointerLeave: () => {
      // Scrolling can move the canvas away from a still pointer without ending keyboard selection.
      if (target.current?.kind === "pointer") setTarget(null);
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
      const delta = ARROW_DELTAS[event.key];
      if (!delta && event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      cancelInteraction();
      setTarget({ kind: "keyboard" });
      const state = getSnapshot().state;
      if (delta) {
        if (event.repeat && !arrows.current.has(event.key)) return;
        arrows.current.add(event.key);
        const x = Number(arrows.current.has("ArrowRight")) - Number(arrows.current.has("ArrowLeft"));
        const y = Number(arrows.current.has("ArrowDown")) - Number(arrows.current.has("ArrowUp"));
        dispatch({
          type: "select-cell",
          x: Math.max(0, Math.min(PLANE_SIZE - 1, state.x + x)),
          y: Math.max(0, Math.min(PLANE_SIZE - 1, state.y + y)),
        });
      } else if (editable ?? state.time === 0) dispatch({ type: "paint-cells", cells: [{ x: state.x, y: state.y }], color: state.color });
    },
  };
}
