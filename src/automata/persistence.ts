import { createAutomataState, restoreAutomataState, type AutomataState } from "./state";
const STORAGE_KEY = "chromalum-automata-state-v1";
export function serializeAutomataState(state: AutomataState): string {
  return JSON.stringify({ ...state, version: 1, seed: Array.from(state.seed) });
}
export function loadAutomataState(storage?: Pick<Storage, "getItem">): { state: AutomataState; persistenceUnavailable: boolean } {
  let raw: string | null;
  try {
    raw = (storage ?? window.localStorage).getItem(STORAGE_KEY);
  } catch {
    return { state: createAutomataState(), persistenceUnavailable: true };
  }
  try {
    return { state: raw === null ? createAutomataState() : restoreAutomataState(JSON.parse(raw)), persistenceUnavailable: false };
  } catch {
    return { state: createAutomataState(), persistenceUnavailable: false };
  }
}
export function saveAutomataState(state: AutomataState, storage?: Pick<Storage, "setItem">): boolean {
  try {
    (storage ?? window.localStorage).setItem(STORAGE_KEY, serializeAutomataState(state));
    return true;
  } catch {
    return false;
  }
}
