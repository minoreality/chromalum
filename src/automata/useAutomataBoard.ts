import { useEffect, useMemo, useState } from "react";
import { evolvePlane, type AutomataRule } from "./model";

export function useAutomataBoard(seed: Uint8Array, width: number, height: number, time: number, rule: AutomataRule, active: boolean) {
  const input = useMemo(() => ({ seed, width, height, time, rule }), [seed, width, height, time, rule]);
  const [result, setResult] = useState<{ input: typeof input; board: Uint8Array } | null>(null);
  // Keep tiny patterns immediate; image-sized planes must not block pointer/slider input.
  const asynchronous = seed.length > 128 * 128 && typeof Worker !== "undefined";
  const immediate = useMemo(
    () => (time === 0 ? seed : asynchronous ? null : evolvePlane(seed, { width, height }, time, rule)),
    [seed, width, height, time, rule, asynchronous],
  );
  useEffect(() => {
    if (!active || immediate) return;
    let cancelled = false;
    let worker: Worker | undefined;
    const fallback = () => {
      if (!cancelled) setResult({ input, board: evolvePlane(input.seed, input, input.time, input.rule) });
    };
    try {
      worker = new Worker(new URL("./evolution.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<Uint8Array>) => {
        if (!cancelled) setResult({ input, board: event.data });
      };
      worker.onerror = (event) => {
        event.preventDefault();
        fallback();
      };
      worker.postMessage(input);
    } catch {
      fallback();
    }
    return () => {
      cancelled = true;
      worker?.terminate();
    };
  }, [active, input, immediate]);
  const completed = result?.input === input;
  return { board: immediate ?? (completed ? result.board : seed), pending: immediate === null && !completed };
}
