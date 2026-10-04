import { CA_RULES, MAX_TIME, PLANE_SIZE, type CAColor, type Cell, type AutomataRule } from "./model";
import { AUTOMATA_PRESETS, type AutomataPreset, makePlaneSeed } from "./presets";
export interface AutomataState {
  seed: Uint8Array;
  preset: AutomataPreset;
  rule: AutomataRule;
  time: number;
  x: number;
  y: number;
  color: CAColor;
}
export type AutomataAction =
  | { type: "set-rule"; rule: AutomataRule }
  | { type: "set-preset"; preset: AutomataPreset }
  | { type: "set-time"; time: number }
  | { type: "set-color"; color: CAColor }
  | { type: "select-cell"; x: number; y: number }
  | { type: "paint-cells"; cells: readonly Cell[]; color: CAColor };
export function createAutomataState(): AutomataState {
  return { seed: makePlaneSeed("rosette"), preset: "rosette", rule: 4, time: 0, x: 24, y: 24, color: 4 };
}
function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}
function validCell(cell: Cell): boolean {
  return integer(cell.x, 0, PLANE_SIZE - 1) && integer(cell.y, 0, PLANE_SIZE - 1);
}
export function restoreAutomataState(raw: unknown): AutomataState {
  const fallback = createAutomataState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  const data = raw as Record<string, unknown>;
  if (data.version !== 1) return fallback;
  return {
    seed:
      Array.isArray(data.seed) &&
      data.seed.length === PLANE_SIZE * PLANE_SIZE &&
      Array.from(data.seed).every((value) => integer(value, 0, 7))
        ? Uint8Array.from(data.seed)
        : fallback.seed,
    preset: AUTOMATA_PRESETS.includes(data.preset as AutomataPreset) ? (data.preset as AutomataPreset) : fallback.preset,
    rule: CA_RULES.includes(data.rule as AutomataRule) ? (data.rule as AutomataRule) : fallback.rule,
    time: integer(data.time, 0, MAX_TIME) ? data.time : fallback.time,
    x: integer(data.x, 0, PLANE_SIZE - 1) ? data.x : fallback.x,
    y: integer(data.y, 0, PLANE_SIZE - 1) ? data.y : fallback.y,
    color: integer(data.color, 0, 7) ? (data.color as CAColor) : fallback.color,
  };
}
export function automataReducer(state: AutomataState, action: AutomataAction): AutomataState {
  switch (action.type) {
    case "set-rule":
      return CA_RULES.includes(action.rule) && state.rule !== action.rule ? { ...state, rule: action.rule } : state;
    case "set-preset":
      return AUTOMATA_PRESETS.includes(action.preset)
        ? { ...state, preset: action.preset, seed: makePlaneSeed(action.preset), time: 0, x: 24, y: 24 }
        : state;
    case "set-time": {
      if (!Number.isInteger(action.time)) return state;
      const time = Math.max(0, Math.min(MAX_TIME, action.time));
      return time !== state.time ? { ...state, time } : state;
    }
    case "set-color":
      return integer(action.color, 0, 7) && state.color !== action.color ? { ...state, color: action.color } : state;
    case "select-cell":
      return validCell(action) && (state.x !== action.x || state.y !== action.y) ? { ...state, x: action.x, y: action.y } : state;
    case "paint-cells": {
      if (state.time !== 0 || !integer(action.color, 0, 7)) return state;
      let seed = state.seed;
      let last: Cell | undefined;
      for (const cell of action.cells) {
        if (!validCell(cell)) continue;
        last = cell;
        const index = cell.y * PLANE_SIZE + cell.x;
        if (seed[index] !== action.color) {
          if (seed === state.seed) seed = seed.slice();
          seed[index] = action.color;
        }
      }
      if (!last || (seed === state.seed && last.x === state.x && last.y === state.y)) return state;
      return { ...state, seed, x: last.x, y: last.y };
    }
  }
}
