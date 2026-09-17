import { describe, it, expect } from "vitest";
import { colorReducer } from "../color-reducer";
import { LEVEL_CANDIDATES, DEFAULT_CANDIDATE_INDEX_BY_LEVEL } from "../../color-engine";

describe("colorReducer", () => {
  describe("set_color", () => {
    it("sets color index for a valid level", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const next = colorReducer(state, { type: "set_color", levelIndex: 2, candidateIndex: 1 });
      expect(next[2]).toBe(1);
      // Other levels unchanged
      expect(next[0]).toBe(state[0]);
      expect(next[7]).toBe(state[7]);
    });

    it("returns same state for out-of-range level (negative)", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const next = colorReducer(state, { type: "set_color", levelIndex: -1, candidateIndex: 0 });
      expect(next).toBe(state);
    });

    it("returns same state for out-of-range level (too high)", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const next = colorReducer(state, { type: "set_color", levelIndex: 8, candidateIndex: 0 });
      expect(next).toBe(state);
    });

    it("returns same state for out-of-range idx (negative)", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const next = colorReducer(state, { type: "set_color", levelIndex: 2, candidateIndex: -1 });
      expect(next).toBe(state);
    });

    it("returns same state for out-of-range idx (too high)", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const alts = LEVEL_CANDIDATES[2].length;
      const next = colorReducer(state, { type: "set_color", levelIndex: 2, candidateIndex: alts });
      expect(next).toBe(state);
    });
  });

  describe("cycle_color", () => {
    it("cycles forward", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      state[3] = 0;
      const alts = LEVEL_CANDIDATES[3].length;
      if (alts > 1) {
        const next = colorReducer(state, { type: "cycle_color", levelIndex: 3, direction: 1 });
        expect(next[3]).toBe(1);
      }
    });

    it("cycles backward with wrap", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      state[3] = 0;
      const alts = LEVEL_CANDIDATES[3].length;
      if (alts > 1) {
        const next = colorReducer(state, { type: "cycle_color", levelIndex: 3, direction: -1 });
        expect(next[3]).toBe(alts - 1);
      }
    });

    it("no-op for single-candidate levels (black/white)", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const next0 = colorReducer(state, { type: "cycle_color", levelIndex: 0, direction: 1 });
      expect(next0).toBe(state);
      const next7 = colorReducer(state, { type: "cycle_color", levelIndex: 7, direction: 1 });
      expect(next7).toBe(state);
    });

    it("returns same state for out-of-range level", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const next = colorReducer(state, { type: "cycle_color", levelIndex: -1, direction: 1 });
      expect(next).toBe(state);
    });
  });

  describe("randomize", () => {
    it("returns array of length 8", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const next = colorReducer(state, { type: "randomize" });
      expect(next.length).toBe(8);
    });

    it("each value is within valid range", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const next = colorReducer(state, { type: "randomize" });
      for (let lv = 0; lv < 8; lv++) {
        expect(next[lv]).toBeGreaterThanOrEqual(0);
        expect(next[lv]).toBeLessThan(LEVEL_CANDIDATES[lv].length);
      }
    });

    it("single-candidate levels are always 0", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const next = colorReducer(state, { type: "randomize" });
      // Level 0 (black) and 7 (white) have only 1 candidate
      expect(next[0]).toBe(0);
      expect(next[7]).toBe(0);
    });

    it("preserves locked levels", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      state[2] = 3; // set a specific value
      const locked = [false, false, true, false, false, false, false, false];
      const next = colorReducer(state, { type: "randomize", lockedLevels: locked });
      expect(next[2]).toBe(3); // locked level preserved
    });

    it("randomizes unlocked levels even when some are locked", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const locked = [false, false, true, true, false, false, false, false];
      const next = colorReducer(state, { type: "randomize", lockedLevels: locked });
      // Locked levels preserved
      expect(next[2]).toBe(state[2]);
      expect(next[3]).toBe(state[3]);
      // Unlocked levels have valid values
      for (let lv = 0; lv < 8; lv++) {
        expect(next[lv]).toBeGreaterThanOrEqual(0);
        expect(next[lv]).toBeLessThan(LEVEL_CANDIDATES[lv].length);
      }
    });

    it("works without locked array (backward compatible)", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      const next = colorReducer(state, { type: "randomize" });
      expect(next.length).toBe(8);
    });

    it("never lands on the combination already showing", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      for (let i = 0; i < 300; i++) {
        const next = colorReducer(state, { type: "randomize" });
        expect(next).not.toEqual(state);
      }
    });

    it("draws from every other combination when one level is left to roll", () => {
      // Only L2 is on the canvas, so the roll has three combinations and must
      // hand back one of the two that is not showing.
      const histogram = [0, 0, 1, 0, 0, 0, 0, 0];
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      state[2] = 1;
      const seen = new Set<number>();
      for (let i = 0; i < 200; i++) {
        const next = colorReducer(state, { type: "randomize", levelHistogram: histogram });
        expect(next[2]).not.toBe(1);
        seen.add(next[2]);
        // The levels that are not on the canvas keep whatever they were showing.
        expect(next[3]).toBe(state[3]);
        expect(next[5]).toBe(state[5]);
      }
      expect([...seen].sort()).toEqual([0, 2]);
    });

    it("hands the state straight back when no level is left to roll", () => {
      const state = [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL];
      // Every multi-candidate level is either off the canvas or locked, so there is
      // no second combination to move to.
      expect(colorReducer(state, { type: "randomize", levelHistogram: [1, 1, 0, 0, 0, 0, 1, 1] })).toBe(state);
      expect(colorReducer(state, { type: "randomize", lockedLevels: [false, false, true, true, true, true, false, false] })).toBe(state);
    });
  });
});
