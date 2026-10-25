import { createAutomataState, restoreAutomataState, type AutomataState } from "./state";
import { PLANE_SIZE } from "./model";
import { makePlaneSeed } from "./presets";
const STORAGE_KEY = "chromalum-flow-state-v1";
// Read the earlier record without overwriting image-sized experiments on save.
const LEGACY_STORAGE_KEY = "chromalum-automata-state-v1";
const DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function restoreSavedState(data: unknown): AutomataState {
  if (!data || typeof data !== "object" || !("version" in data) || data.version !== 2) return restoreAutomataState(data);
  const legacy = data as Record<string, unknown>;
  const state = restoreAutomataState({ ...legacy, version: 1, seed: undefined });
  if (legacy.width !== PLANE_SIZE || legacy.height !== PLANE_SIZE || legacy.preset === "image") {
    return { ...state, seed: makePlaneSeed(state.preset), time: 0, x: 24, y: 24 };
  }
  const length = PLANE_SIZE * PLANE_SIZE;
  if (typeof legacy.seed !== "string" || legacy.seed.length !== Math.ceil(length / 2)) throw new RangeError("Invalid saved Flow seed");
  const seed: number[] = [];
  for (let i = 0; i < legacy.seed.length; i++) {
    const pair = DIGITS.indexOf(legacy.seed[i]);
    if (pair < 0 || (i * 2 + 1 === length && (pair & 7) !== 0)) throw new RangeError("Invalid saved Flow cell");
    seed.push(pair >> 3);
    if (i * 2 + 1 < length) seed.push(pair & 7);
  }
  return restoreAutomataState({ ...legacy, version: 1, seed });
}
export function serializeAutomataState(state: AutomataState): string {
  return JSON.stringify({ ...state, version: 1, seed: Array.from(state.seed) });
}
export function loadAutomataState(storage?: Pick<Storage, "getItem">): { state: AutomataState; persistenceUnavailable: boolean } {
  let raw: string | null;
  try {
    const source = storage ?? window.localStorage;
    raw = source.getItem(STORAGE_KEY) ?? source.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return { state: createAutomataState(), persistenceUnavailable: true };
  }
  try {
    return { state: raw === null ? createAutomataState() : restoreSavedState(JSON.parse(raw)), persistenceUnavailable: false };
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
