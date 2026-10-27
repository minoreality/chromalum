import { useId, useLayoutEffect, useRef, useState } from "react";
import type { AutomataController } from "./useAutomataState";
import { getPlaneGeometry, type PlaneGeometry } from "./geometry";
import { useAutomataInteraction } from "./useAutomataInteraction";
import { drawPlane } from "./render";
import { PLANE_SIZE } from "./model";
export function AutomataCanvas({
  active,
  controller,
  board,
  label,
  description,
  editable,
  testId = "automata-board",
  busy = false,
}: {
  active: boolean;
  controller: AutomataController;
  board: Uint8Array;
  label: string;
  description: string;
  editable?: boolean;
  testId?: string;
  busy?: boolean;
}): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null),
    id = useId();
  const [geometry, setGeometry] = useState<PlaneGeometry | null>(null);
  const measured = useRef<PlaneGeometry | null>(null);
  const { cancelInteraction, cursorCell, ...handlers } = useAutomataInteraction({ canvasRef: ref, active, controller, geometry, editable });
  const canEdit = editable ?? controller.state.time === 0;
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!active || !canvas) return;
    const measure = () => {
      const size = canvas.getBoundingClientRect().width;
      if (!Number.isFinite(size) || size <= 0) {
        cancelInteraction();
        measured.current = null;
        setGeometry(null);
        return;
      }
      const next = getPlaneGeometry(size, window.devicePixelRatio || 1);
      if (measured.current?.cssSize === next.cssSize && measured.current.dpr === next.dpr) return;
      cancelInteraction();
      measured.current = next;
      setGeometry(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [active, cancelInteraction]);
  useLayoutEffect(() => {
    if (!active || !geometry) return;
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawPlane(ctx, board, geometry, canEdit ? null : { x: controller.state.x, y: controller.state.y });
  }, [active, board, geometry, controller.state.x, controller.state.y, canEdit]);
  return (
    <div className="automata-canvas-group">
      <div className="automata-board-frame">
        <canvas
          className="automata-board"
          data-testid={testId}
          data-editable={canEdit}
          data-columns={PLANE_SIZE}
          data-rows={PLANE_SIZE}
          ref={ref}
          role="application"
          aria-label={label}
          aria-describedby={id}
          aria-busy={busy}
          tabIndex={0}
          {...handlers}
        />
        {cursorCell && geometry && (
          <span
            className="automata-cell-cursor"
            aria-hidden="true"
            style={{
              left: `${(cursorCell.x * 100) / PLANE_SIZE}%`,
              top: `${(cursorCell.y * 100) / PLANE_SIZE}%`,
              width: `${100 / PLANE_SIZE}%`,
              height: `${100 / PLANE_SIZE}%`,
            }}
          />
        )}
      </div>
      <p className="automata-sr-only" id={id}>
        {description}
      </p>
    </div>
  );
}
