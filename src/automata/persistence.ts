import { createAutomataState, restoreAutomataState, type AutomataState } from "./state";
import { isAllowedCanvasSize } from "../constants";
const STORAGE_KEY = "chromalum-automata-state-v1";
const DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
// Reducer edits replace the seed array. Time, selection and rule changes can reuse its encoding.
const packedSeeds = new WeakMap<Uint8Array, string>();
// Two 3-bit cells per character keep even 2048x2048 planes below 5 MiB of UTF-16 storage.
function packSeed(seed: Uint8Array): string {
  const chunks: string[] = [];
  for (let start = 0; start < seed.length; start += 8192) {
    let chunk = "";
    for (let i = start; i < Math.min(start + 8192, seed.length); i += 2) chunk += DIGITS[(seed[i] << 3) | (seed[i + 1] ?? 0)];
    chunks.push(chunk);
  }
  return chunks.join("");
}
function unpackSeed(raw: string, length: number): Uint8Array {
  if (raw.length !== Math.ceil(length / 2)) throw new RangeError("Invalid saved Flow seed length");
  const seed = new Uint8Array(length);
  for (let i = 0; i < raw.length; i++) {
    const pair = DIGITS.indexOf(raw[i]);
    if (pair < 0 || (i * 2 + 1 === length && (pair & 7) !== 0)) throw new RangeError("Invalid saved Flow cell");
    seed[i * 2] = pair >> 3;
    if (i * 2 + 1 < length) seed[i * 2 + 1] = pair & 7;
  }
  return seed;
}
export function serializeAutomataState(state: AutomataState): string {
  let seed = packedSeeds.get(state.seed);
  if (seed === undefined) {
    seed = packSeed(state.seed);
    packedSeeds.set(state.seed, seed);
  }
  return JSON.stringify({ ...state, version: 2, seed });
}
export function loadAutomataState(storage?: Pick<Storage, "getItem">): { state: AutomataState; persistenceUnavailable: boolean } {
  let raw: string | null;
  try {
    raw = (storage ?? window.localStorage).getItem(STORAGE_KEY);
  } catch {
    return { state: createAutomataState(), persistenceUnavailable: true };
  }
  try {
    const data = raw === null ? null : JSON.parse(raw);
    if (data?.version === 2 && typeof data.seed === "string") {
      if (!isAllowedCanvasSize(data.width, data.height)) throw new RangeError("Invalid saved Flow dimensions");
      data.seed = unpackSeed(data.seed, data.width * data.height);
    }
    return { state: restoreAutomataState(data), persistenceUnavailable: false };
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
