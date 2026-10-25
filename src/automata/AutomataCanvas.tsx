import { useId, useLayoutEffect, useRef, useState } from "react";
import type { AutomataController } from "./useAutomataState";
import { getPlaneGeometry, type PlaneGeometry } from "./geometry";
import { useAutomataInteraction } from "./useAutomataInteraction";
import { drawPlane } from "./render";
export function AutomataCanvas({
  active,
  controller,
  board,
  pending = false,
  label,
  description,
}: {
  active: boolean;
  controller: AutomataController;
  board: Uint8Array;
  pending?: boolean;
  label: string;
  description: string;
}): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null),
    id = useId();
  const [geometry, setGeometry] = useState<PlaneGeometry | null>(null);
  const measured = useRef<PlaneGeometry | null>(null);
  const { width, height } = controller.state;
  const { cancelInteraction, ...handlers } = useAutomataInteraction({ canvasRef: ref, active, controller, geometry });
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
      const next = getPlaneGeometry(size, window.devicePixelRatio || 1, { width, height });
      if (
        measured.current?.cssWidth === next.cssWidth &&
        measured.current.cssHeight === next.cssHeight &&
        measured.current.width === width &&
        measured.current.height === height &&
        measured.current.dpr === next.dpr
      )
        return;
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
  }, [active, width, height, cancelInteraction]);
  useLayoutEffect(() => {
    if (!active || !geometry || geometry.width !== width || geometry.height !== height) return;
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawPlane(ctx, board, geometry, { x: controller.state.x, y: controller.state.y });
  }, [active, board, geometry, width, height, controller.state.x, controller.state.y]);
  return (
    <div className="automata-canvas-group">
      <div className="automata-board-frame">
        <canvas
          className="automata-board"
          data-testid="automata-board"
          data-columns={width}
          data-rows={height}
          style={{ aspectRatio: `${width} / ${height}` }}
          ref={ref}
          role="application"
          aria-label={label}
          aria-describedby={id}
          aria-busy={pending}
          tabIndex={0}
          onBlur={cancelInteraction}
          {...handlers}
        />
      </div>
      <p className="automata-sr-only" id={id}>
        {description}
      </p>
    </div>
  );
}
