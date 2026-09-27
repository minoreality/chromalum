import { useCallback, useRef, useState, type PointerEvent } from "react";
import { hammingDist } from "../../data/theory-data";
import { usePinReset } from "./pin-reset";

export type K8Target =
  { kind: "state"; state: number } | { kind: "transition"; state: number; mask: number } | { kind: "mask"; mask: number };

type Preview = { target: K8Target; source: "graph" | "table" };

export function targetState(target: K8Target | null): number | null {
  return target && target.kind !== "mask" ? target.state : null;
}

export function targetMask(target: K8Target | null): number | null {
  return target && target.kind !== "state" ? target.mask : null;
}

function sameTarget(a: K8Target | null, b: K8Target): boolean {
  return a?.kind === b.kind && targetState(a) === targetState(b) && targetMask(a) === targetMask(b);
}

export function useK8Selection(onHover: (level: number | null) => void) {
  const [visibleDistances, setVisibleDistances] = useState<ReadonlySet<number>>(() => new Set([1, 2, 3]));
  const [selection, setSelection] = useState<K8Target | null>(null);
  const [hover, setHover] = useState<Preview | null>(null);
  const [focus, setFocus] = useState<Preview | null>(null);
  const pointerPosition = useRef<{ x: number; y: number } | null>(null);
  const preview = focus ?? hover;

  const clearPreview = useCallback(() => {
    setHover(null);
    setFocus(null);
    onHover(null);
  }, [onHover]);
  const clear = useCallback(() => {
    setSelection(null);
    clearPreview();
  }, [clearPreview]);
  usePinReset(clear);

  const canSelectMask = (mask: number) => visibleDistances.size > 0 && (mask === 0 || visibleDistances.has(hammingDist(0, mask)));
  const canSelect = (target: K8Target) => (target.kind === "state" ? visibleDistances.size > 0 : canSelectMask(target.mask));

  const select = (target: K8Target) => {
    if (!canSelect(target)) return;
    setSelection(sameTarget(selection, target) ? null : target);
    clearPreview();
  };

  const selectVertex = (level: number) => {
    if (visibleDistances.size === 0) return;
    const state = targetState(selection);
    if (state !== null && state !== level && !canSelectMask(state ^ level)) return;
    if (state === level) setSelection(null);
    else if (selection?.kind === "transition" && (selection.state ^ selection.mask) === level) {
      setSelection({ kind: "state", state: selection.state });
    } else setSelection(state === null ? { kind: "state", state: level } : { kind: "transition", state, mask: state ^ level });
    clearPreview();
  };

  const setPreview = (target: K8Target | null, source: Preview["source"], input: "hover" | "focus") => {
    const value = target !== null && canSelect(target) ? { target, source } : null;
    if (input === "focus") setFocus(value);
    else setHover(value);
    onHover(
      value === null || value.target.kind === "mask"
        ? null
        : value.target.kind === "state"
          ? value.target.state
          : value.target.state ^ value.target.mask,
    );
  };

  const selectDistances = (next: ReadonlySet<number>) => {
    setVisibleDistances(next);
    setSelection((current) => {
      if (next.size === 0) return null;
      const mask = targetMask(current);
      if (mask === null || mask === 0 || next.has(hammingDist(0, mask))) return current;
      return current?.kind === "transition" ? { kind: "state", state: current.state } : null;
    });
    clearPreview();
  };

  // A confirmed transition or matching owns the readout. Table previews remain
  // useful before confirmation; graph hover only suggests a second vertex.
  const readout = selection && selection.kind !== "state" ? selection : preview?.source === "table" ? preview.target : selection;

  return {
    visibleDistances,
    selection,
    preview: preview?.target ?? null,
    readout,
    clear,
    restoreSelection(target: K8Target | null) {
      setSelection(target);
      clearPreview();
    },
    select,
    selectVertex,
    selectDistances,
    canSelectMask,
    onPreview: setPreview,
    onPointerMove(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      const previous = pointerPosition.current;
      if (!previous || previous.x !== event.clientX || previous.y !== event.clientY) setFocus(null);
      pointerPosition.current = { x: event.clientX, y: event.clientY };
    },
  };
}

export type K8Selection = ReturnType<typeof useK8Selection>;
