import { LEVEL_CANDIDATES } from "../color-engine";

export type ColorAction =
  | { type: "set_color"; levelIndex: number; candidateIndex: number }
  | { type: "cycle_color"; levelIndex: number; direction: number }
  | { type: "randomize"; lockedLevels?: boolean[]; levelHistogram?: number[] }
  | { type: "load_all"; values: number[] };

export function colorReducer(state: number[], action: ColorAction): number[] {
  switch (action.type) {
    case "set_color": {
      if (action.levelIndex < 0 || action.levelIndex >= LEVEL_CANDIDATES.length) return state;
      const alts = LEVEL_CANDIDATES[action.levelIndex];
      if (action.candidateIndex < 0 || action.candidateIndex >= alts.length) return state;
      const n = [...state];
      n[action.levelIndex] = action.candidateIndex;
      return n;
    }
    case "cycle_color": {
      if (action.levelIndex < 0 || action.levelIndex >= LEVEL_CANDIDATES.length) return state;
      const a = LEVEL_CANDIDATES[action.levelIndex];
      if (a.length <= 1) return state;
      const n = [...state];
      n[action.levelIndex] = (((n[action.levelIndex] + action.direction) % a.length) + a.length) % a.length;
      return n;
    }
    case "randomize": {
      const lockedLevels = action.lockedLevels;
      const levelHistogram = action.levelHistogram;
      /** A level the roll may move: unlocked, on the canvas, and holding a choice. */
      const isFree = (lv: number) =>
        !lockedLevels?.[lv] && !(levelHistogram && levelHistogram[lv] === 0) && LEVEL_CANDIDATES[lv].length > 1;

      const base = LEVEL_CANDIDATES.map((alts, lv) => {
        if (lockedLevels?.[lv]) return state[lv];
        if (levelHistogram && levelHistogram[lv] === 0) return state[lv];
        if (alts.length <= 1) return 0;
        return ((state[lv] % alts.length) + alts.length) % alts.length;
      });

      // Number the free levels as the digits of a mixed-radix counter and draw one
      // of the OTHER combinations, instead of re-drawing each digit on its own.
      // Independent digits land back on the combination already showing 1 roll in
      // T, which a canvas down to one free level of two candidates turns into every
      // other roll — the die visibly does nothing.
      let total = 1;
      for (let lv = 0; lv < LEVEL_CANDIDATES.length; lv++) if (isFree(lv)) total *= LEVEL_CANDIDATES[lv].length;
      if (total <= 1) return state;

      let current = 0;
      let weight = 1;
      for (let lv = 0; lv < LEVEL_CANDIDATES.length; lv++) {
        if (!isFree(lv)) continue;
        current += base[lv] * weight;
        weight *= LEVEL_CANDIDATES[lv].length;
      }

      // Uniform over the T - 1 combinations that are not the current one.
      let rest = (Math.random() * (total - 1)) | 0;
      if (rest >= current) rest++;

      const next = [...base];
      for (let lv = 0; lv < LEVEL_CANDIDATES.length; lv++) {
        if (!isFree(lv)) continue;
        const len = LEVEL_CANDIDATES[lv].length;
        next[lv] = rest % len;
        rest = (rest / len) | 0;
      }
      return next;
    }
    case "load_all": {
      if (!Array.isArray(action.values) || action.values.length !== LEVEL_CANDIDATES.length) return state;
      return LEVEL_CANDIDATES.map((alts, lv) => {
        const idx = action.values[lv];
        return typeof idx === "number" && idx >= 0 && idx < alts.length ? idx : 0;
      });
    }
    default:
      return state;
  }
}
