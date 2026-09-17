import { useState, useReducer, useMemo, useCallback } from "react";
import { buildColorLUT, DEFAULT_CANDIDATE_INDEX_BY_LEVEL, LEVEL_CANDIDATES } from "../color-engine";
import { LEVEL_COUNT } from "../constants";
import { colorReducer } from "../state/color-reducer";

export function useColorState(levelHistogram: number[]) {
  const [candidateIndexByLevel, candidateIndexDispatch] = useReducer(colorReducer, [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL]);
  const [pinnedLevels, setLockedLevels] = useState<boolean[]>(new Array(LEVEL_COUNT).fill(false));

  const setLevelLock = useCallback((lv: number, locked: boolean) => {
    setLockedLevels((prev) => {
      if (prev[lv] === locked) return prev;
      const n = [...prev];
      n[lv] = locked;
      return n;
    });
  }, []);

  /**
   * A pin can only be placed on a level the canvas uses, and it is read the
   * same way, so it cannot outlive one: paint over the last pixel of a pinned
   * level and the pin stops counting everywhere at once — the ring, the roll,
   * the pattern count. Read rather than erased, because an effect that cleared
   * the flag would be a setState cascading out of a render, and because
   * undoing the stroke should bring the pin back with the pixels it held.
   */
  const lockedLevels = useMemo(() => pinnedLevels.map((locked, lv) => locked && levelHistogram[lv] > 0), [pinnedLevels, levelHistogram]);

  const handleRandomize = useCallback(() => {
    candidateIndexDispatch({ type: "randomize", lockedLevels, levelHistogram });
  }, [candidateIndexDispatch, lockedLevels, levelHistogram]);

  const canRandomize = useMemo(
    () => LEVEL_CANDIDATES.some((alts, lv) => levelHistogram[lv] > 0 && !lockedLevels[lv] && alts.length > 1),
    [levelHistogram, lockedLevels],
  );

  const colorLUT = useMemo(() => buildColorLUT(candidateIndexByLevel), [candidateIndexByLevel]);

  const patternInfo = useMemo(() => {
    const allC: number[] = [];
    for (let lv = 0; lv < LEVEL_CANDIDATES.length; lv++) {
      const c = LEVEL_CANDIDATES[lv].length;
      allC.push(levelHistogram[lv] > 0 && !lockedLevels[lv] ? c : 1);
    }
    const total = allC.reduce((a, b) => a * b, 1);
    const expanded = allC.join("\u00d7");
    return { total, expanded, perLevel: allC };
  }, [levelHistogram, lockedLevels]);

  return {
    candidateIndexByLevel,
    candidateIndexDispatch,
    lockedLevels,
    setLockedLevels,
    setLevelLock,
    handleRandomize,
    canRandomize,
    colorLUT,
    patternInfo,
  };
}
