import { CA_RULES, MAX_TIME, PLANE_SIZE, resizePlane, type CAColor, type Cell, type AutomataRule, type PlaneDimensions } from "./model";
import { AUTOMATA_PRESETS, type AutomataPreset, makePlaneSeed } from "./presets";
import { isAllowedCanvasSize } from "../constants";
export interface AutomataImage extends PlaneDimensions {
  levelData: Uint8Array;
}
export type AutomataPattern = AutomataPreset | "image";
export interface AutomataState extends PlaneDimensions {
  seed: Uint8Array;
  preset: AutomataPattern;
  sourceKey: string | null;
  rule: AutomataRule;
  time: number;
  x: number;
  y: number;
  color: CAColor;
}
export type AutomataAction =
  | { type: "set-image" | "sync-source"; image: AutomataImage; sourceKey: string }
  | { type: "set-rule"; rule: AutomataRule }
  | { type: "set-preset"; preset: AutomataPreset }
  | { type: "set-time"; time: number }
  | { type: "set-color"; color: CAColor }
  | { type: "select-cell"; x: number; y: number }
  | { type: "paint-cells"; cells: readonly Cell[]; color: CAColor };
export function createAutomataState(width = PLANE_SIZE, height = PLANE_SIZE): AutomataState {
  return {
    width,
    height,
    seed: makePlaneSeed("rosette", width, height),
    preset: "rosette",
    sourceKey: null,
    rule: 4,
    time: 0,
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
    color: 4,
  };
}
function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}
function validCell(cell: Cell, dimensions: PlaneDimensions): boolean {
  return integer(cell.x, 0, dimensions.width - 1) && integer(cell.y, 0, dimensions.height - 1);
}
export function restoreAutomataState(raw: unknown): AutomataState {
  let fallback = createAutomataState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  const data = raw as Record<string, unknown>;
  if (data.version !== 1 && data.version !== 2) return fallback;
  if (data.version === 2) {
    if (typeof data.width !== "number" || typeof data.height !== "number" || !isAllowedCanvasSize(data.width, data.height)) return fallback;
    fallback = createAutomataState(data.width, data.height);
  }
  const { width, height } = fallback;
  return {
    width,
    height,
    sourceKey: typeof data.sourceKey === "string" ? data.sourceKey : null,
    seed:
      (Array.isArray(data.seed) || (data.version === 2 && data.seed instanceof Uint8Array)) &&
      data.seed.length === width * height &&
      data.seed.every((value: unknown) => integer(value, 0, 7))
        ? Uint8Array.from(data.seed)
        : fallback.seed,
    preset:
      data.preset === "image" || AUTOMATA_PRESETS.includes(data.preset as AutomataPreset)
        ? (data.preset as AutomataPattern)
        : fallback.preset,
    rule: CA_RULES.includes(data.rule as AutomataRule) ? (data.rule as AutomataRule) : fallback.rule,
    time: integer(data.time, 0, MAX_TIME) ? data.time : fallback.time,
    x: integer(data.x, 0, width - 1) ? data.x : fallback.x,
    y: integer(data.y, 0, height - 1) ? data.y : fallback.y,
    color: integer(data.color, 0, 7) ? (data.color as CAColor) : fallback.color,
  };
}
export function automataReducer(state: AutomataState, action: AutomataAction): AutomataState {
  switch (action.type) {
    case "set-image":
    case "sync-source": {
      const { width, height, levelData } = action.image;
      if (!isAllowedCanvasSize(width, height) || levelData.length !== width * height || levelData.some((value) => value > 7)) return state;
      const imageSelected = action.type === "set-image" || state.preset === "image";
      const resized = width !== state.width || height !== state.height;
      if (action.type === "sync-source" && !resized && (!imageSelected || state.sourceKey === action.sourceKey)) return state;
      return {
        ...state,
        width,
        height,
        seed: imageSelected ? levelData.slice() : resizePlane(state.seed, state, { width, height }),
        preset: imageSelected ? "image" : state.preset,
        sourceKey: imageSelected ? action.sourceKey : null,
        time: 0,
        x: Math.floor(width / 2),
        y: Math.floor(height / 2),
      };
    }
    case "set-rule":
      return CA_RULES.includes(action.rule) && state.rule !== action.rule ? { ...state, rule: action.rule } : state;
    case "set-preset":
      return AUTOMATA_PRESETS.includes(action.preset)
        ? {
            ...state,
            preset: action.preset,
            sourceKey: null,
            seed: makePlaneSeed(action.preset, state.width, state.height),
            time: 0,
            x: Math.floor(state.width / 2),
            y: Math.floor(state.height / 2),
          }
        : state;
    case "set-time": {
      if (!Number.isInteger(action.time)) return state;
      const time = Math.max(0, Math.min(MAX_TIME, action.time));
      return time !== state.time ? { ...state, time } : state;
    }
    case "set-color":
      return integer(action.color, 0, 7) && state.color !== action.color ? { ...state, color: action.color } : state;
    case "select-cell":
      return validCell(action, state) && (state.x !== action.x || state.y !== action.y) ? { ...state, x: action.x, y: action.y } : state;
    case "paint-cells": {
      if (state.time !== 0 || !integer(action.color, 0, 7)) return state;
      let seed = state.seed;
      let last: Cell | undefined;
      for (const cell of action.cells) {
        if (!validCell(cell, state)) continue;
        last = cell;
        const index = cell.y * state.width + cell.x;
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
