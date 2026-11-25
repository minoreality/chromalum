import { useEffect, useRef, useState } from "react";
import PreviewWorker from "../workers/automata-preview.worker?worker";
import type { AutomataPreviewRequest } from "../workers/automata-preview.worker";
import { evolveVisiblePlane, type AutomataRule } from "./model";

type PreviewJob = AutomataPreviewRequest & { base: Uint8Array };

/** Show completed frames during a stroke, keeping only the newest edit waiting for the worker. */
export function useStrokePreview(active: boolean, seed: Uint8Array, base: Uint8Array, rule: AutomataRule, time: number) {
  const submit = useRef<((job: PreviewJob | null) => void) | null>(null);
  const [result, setResult] = useState<(PreviewJob & { board: Uint8Array }) | null>(null);

  useEffect(() => {
    if (!active) return;
    let worker: Worker | undefined;
    let background = typeof Worker !== "undefined";
    let pending: PreviewJob | null = null;
    let running: PreviewJob | null = null;
    let frame: number | null = null;

    function publish(board: Uint8Array) {
      if (!running) return;
      setResult({ ...running, board });
      running = null;
      schedule();
    }
    function fallback() {
      worker?.terminate();
      worker = undefined;
      background = false;
      if (running) publish(evolveVisiblePlane(running.seed, running.time, running.rule));
    }
    function schedule() {
      if (!pending || running || frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        if (!pending) return;
        running = pending;
        pending = null;
        if (!background) return fallback();
        try {
          if (!worker) {
            worker = new PreviewWorker();
            worker.onmessage = (event: MessageEvent<Uint8Array>) => publish(event.data);
            worker.onerror = fallback;
          }
          const { seed, rule, time } = running;
          worker.postMessage({ seed, rule, time } satisfies AutomataPreviewRequest);
        } catch {
          fallback();
        }
      });
    }
    submit.current = (job) => {
      pending = job;
      schedule();
    };
    return () => {
      submit.current = null;
      pending = running = null;
      if (frame !== null) cancelAnimationFrame(frame);
      worker?.terminate();
    };
  }, [active]);

  const editing = active && time > 0 && seed !== base;
  useEffect(() => {
    submit.current?.(editing ? { seed, base, rule, time } : null);
  }, [active, editing, seed, base, rule, time]);

  // Late replies from an earlier stroke, generation or rule must never replace the displayed board.
  if (active && result?.rule === rule && result.time === time && (result.seed === seed || (editing && result.base === base))) return result;
  return null;
}
