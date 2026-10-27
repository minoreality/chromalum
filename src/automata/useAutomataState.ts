import { useCallback, useEffect, useRef, useState } from "react";
import { automataReducer, type AutomataAction, type AutomataState } from "./state";
import { loadAutomataState, saveAutomataState } from "./persistence";
export interface AutomataController {
  state: AutomataState;
  settledSeed: Uint8Array;
  revision: number;
  interacting: boolean;
  persistenceUnavailable: boolean;
  dispatch: (action: AutomataAction) => void;
  getSnapshot: () => { state: AutomataState; revision: number };
  beginInteraction: () => void;
  finishInteraction: () => void;
}
export function useAutomataState(): AutomataController {
  const [view, setView] = useState(() => {
    const loaded = loadAutomataState();
    return { ...loaded, settledSeed: loaded.state.seed, revision: 0, interacting: false };
  });
  const current = useRef(view);
  const dirty = useRef(false);
  const publish = useCallback(() => setView(current.current), []);
  const flush = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    current.current = { ...current.current, persistenceUnavailable: !saveAutomataState(current.current.state) };
  }, []);
  const finishInteraction = useCallback(() => {
    if (!current.current.interacting && !dirty.current) return;
    current.current = { ...current.current, settledSeed: current.current.state.seed, interacting: false };
    flush();
    publish();
  }, [flush, publish]);
  const beginInteraction = useCallback(() => {
    if (current.current.interacting) return;
    current.current = { ...current.current, interacting: true };
    publish();
  }, [publish]);
  const dispatch = useCallback(
    (action: AutomataAction) => {
      const setting = action.type.startsWith("set-");
      if (setting) finishInteraction();
      const previous = current.current;
      const state = automataReducer(previous.state, action);
      if (state === previous.state && !setting) return;
      current.current = {
        ...previous,
        state,
        settledSeed: previous.interacting ? previous.settledSeed : state.seed,
        revision: previous.revision + (setting ? 1 : 0),
      };
      if (state !== previous.state) dirty.current = true;
      if (!current.current.interacting) flush();
      publish();
    },
    [finishInteraction, flush, publish],
  );
  const getSnapshot = useCallback(() => ({ state: current.current.state, revision: current.current.revision }), []);
  useEffect(
    () => () => {
      if (dirty.current) {
        dirty.current = false;
        saveAutomataState(current.current.state);
      }
    },
    [],
  );
  return { ...view, dispatch, getSnapshot, beginInteraction, finishInteraction };
}
