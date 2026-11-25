import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { canHandleUnmodifiedShortcut, FLOW_SOUND_KEY } from "../shortcuts";
import { boardChangeSpectrum, generationSpectrum, playGenerationChange, playPaintChanges, startDragChord } from "./generationSound";
import type { VisibleEvolution } from "./model";

type SliderGesture = { id: number; startX: number; moved: boolean; tapSpectrum?: ReturnType<typeof generationSpectrum> };

export function useGenerationSound(active: boolean, time: number, evolution: VisibleEvolution, board: Uint8Array, drawingLine: boolean) {
  const context = useRef<AudioContext | null>(null);
  const lastNote = useRef<GainNode | undefined>(undefined);
  const lastPaint = useRef<GainNode | undefined>(undefined);
  const dragChord = useRef<ReturnType<typeof startDragChord> | null>(null);
  const resultChord = useRef<ReturnType<typeof startDragChord> | null>(null);
  const lastBoard = useRef(board);
  const pointer = useRef<SliderGesture | null>(null);
  const previous = useRef({ time, evolution });
  const [enabled, setEnabled] = useState(false);
  const endDrag = useCallback(() => {
    pointer.current = null;
    dragChord.current?.release();
    dragChord.current = null;
  }, []);
  const stop = useCallback(() => {
    endDrag();
    resultChord.current?.release();
    resultChord.current = null;
    const audio = context.current;
    context.current = null;
    lastNote.current = undefined;
    lastPaint.current = undefined;
    if (audio) void audio.close().catch(() => {});
    setEnabled(false);
  }, [endDrag]);

  const onPaintChanges = useCallback((changes: readonly number[]) => {
    const audio = context.current;
    if (audio?.state !== "running") return;
    lastPaint.current?.gain.setTargetAtTime(0, audio.currentTime, 0.003);
    lastPaint.current = playPaintChanges(audio, changes);
  }, []);

  const toggle = useCallback(
    (on: boolean) => {
      if (!on) return stop();
      try {
        const audio = new AudioContext();
        context.current = audio;
        setEnabled(true);
        void audio.resume().catch(() => {
          if (context.current === audio) stop();
        });
      } catch {
        stop();
      }
    },
    [stop],
  );

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (pointer.current && ["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key)) endDrag();
      if (event.key.toUpperCase() !== FLOW_SOUND_KEY || typeof AudioContext === "undefined" || !canHandleUnmodifiedShortcut(event)) return;
      event.preventDefault();
      toggle(context.current === null);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    const onPointerEnd = (event: PointerEvent) => {
      const held = pointer.current;
      if (held?.id !== event.pointerId) return;
      const audio = context.current;
      if (event.type === "pointerup" && held.tapSpectrum && audio?.state === "running") {
        lastNote.current = playGenerationChange(audio, held.tapSpectrum);
      }
      endDrag();
    };
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("lostpointercapture", onPointerEnd);
    window.addEventListener("blur", endDrag);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("lostpointercapture", onPointerEnd);
      window.removeEventListener("blur", endDrag);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [active, endDrag, stop, toggle]);

  useLayoutEffect(() => {
    const last = previous.current;
    previous.current = { time, evolution };
    const audio = context.current;
    if (!active || audio?.state !== "running" || (last.evolution === evolution && last.time === time)) return;
    lastNote.current?.gain.setTargetAtTime(0, audio.currentTime, 0.003);
    lastNote.current = undefined;
    if (last.evolution !== evolution) return endDrag();
    // A jump sounds its final adjacent transition, in either direction.
    const from = time + Math.sign(last.time - time);
    const spectrum = generationSpectrum(evolution, from, time);
    const held = pointer.current;
    if (held?.moved) {
      held.tapSpectrum = undefined;
      if (spectrum) dragChord.current ??= startDragChord(audio);
      dragChord.current?.update(spectrum);
    } else if (held) {
      // A press on the track can turn into a drag. Sound a tap only once it is released.
      held.tapSpectrum = spectrum;
    } else if (spectrum) {
      lastNote.current = playGenerationChange(audio, spectrum);
    }
  }, [active, time, evolution, endDrag]);

  useLayoutEffect(() => {
    const before = lastBoard.current;
    lastBoard.current = board;
    const audio = context.current;
    if (!active || !drawingLine || audio?.state !== "running" || !enabled) {
      resultChord.current?.release();
      resultChord.current = null;
      return;
    }
    if (before === board) return;
    // Edits compare two displayed boards at the same generation.
    const spectrum = boardChangeSpectrum(before, board, evolution.neighborOffsets);
    if (spectrum) resultChord.current ??= startDragChord(audio);
    resultChord.current?.update(spectrum);
  }, [active, drawingLine, board, evolution, enabled]);

  const sliderEvents = {
    onPointerDown(event: ReactPointerEvent<HTMLInputElement>) {
      if (!event.isPrimary || event.button !== 0 || !context.current) return;
      endDrag();
      pointer.current = { id: event.pointerId, startX: event.clientX, moved: false };
    },
    onPointerMove(event: ReactPointerEvent<HTMLInputElement>) {
      const held = pointer.current;
      if (held?.id === event.pointerId && held.startX !== event.clientX) held.moved = true;
    },
    onBlur: endDrag,
  };
  return { enabled, toggle, sliderEvents, onPaintChanges: enabled ? onPaintChanges : undefined };
}
