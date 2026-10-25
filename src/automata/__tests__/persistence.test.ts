// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAutomataState, saveAutomataState, serializeAutomataState } from "../persistence";
import { createAutomataState } from "../state";

afterEach(() => vi.restoreAllMocks());
describe("Automata persistence", () => {
  it("carries forward edits saved before image support", () => {
    const seed = Array<number>(2401).fill(0);
    seed[2400] = 6;
    localStorage.setItem(
      "chromalum-automata-state-v1",
      JSON.stringify({ version: 1, seed, preset: "black", rule: 4, time: 20, x: 48, y: 48, color: 6 }),
    );
    const state = loadAutomataState().state;
    expect(Array.from(state.seed)).toEqual(seed);
    expect([state.time, state.x, state.y, state.color]).toEqual([20, 48, 48, 6]);
  });
  it.each(["A".repeat(1200), "?" + "A".repeat(1200), "A".repeat(1200) + "B"])(
    "rejects malformed packed cells without losing editability (%#)",
    (seed) => {
      localStorage.setItem(
        "chromalum-automata-state-v1",
        JSON.stringify({ version: 2, width: 49, height: 49, seed, preset: "black", time: 7 }),
      );
      expect(loadAutomataState()).toEqual({ state: createAutomataState(), persistenceUnavailable: false });
    },
  );
  it("migrates a rectangular preset to the fixed board without overwriting its original record", () => {
    const legacy = JSON.stringify({
      version: 2,
      width: 80,
      height: 30,
      seed: "A".repeat(1200),
      preset: "white",
      rule: "rug",
      time: 7,
      x: 79,
      y: 29,
      color: 5,
    });
    localStorage.setItem("chromalum-automata-state-v1", legacy);
    const state = loadAutomataState().state;
    expect(state.seed.length).toBe(2401);
    expect(state.seed[1200]).toBe(7);
    expect(state.seed.reduce((total, value) => total + value, 0)).toBe(7);
    expect([state.preset, state.rule, state.time, state.x, state.y, state.color]).toEqual(["white", "rug", 0, 24, 24, 5]);
    expect(saveAutomataState(state)).toBe(true);
    expect(localStorage.getItem("chromalum-automata-state-v1")).toBe(legacy);
    expect(localStorage.getItem("chromalum-flow-state-v1")).not.toBeNull();
    expect(loadAutomataState().state).toEqual(state);
  });
  it("restores edited 49x49 packed data and prefers subsequent fixed-board saves", () => {
    localStorage.setItem(
      "chromalum-automata-state-v1",
      JSON.stringify({
        version: 2,
        width: 49,
        height: 49,
        seed: "A".repeat(600) + "Y" + "A".repeat(600),
        preset: "black",
        rule: 5,
        time: 7,
        x: 2,
        y: 6,
        color: 5,
      }),
    );
    const state = loadAutomataState().state;
    expect(state.seed[1200]).toBe(3);
    expect(state.seed.reduce((total, value) => total + value, 0)).toBe(3);
    expect([state.preset, state.rule, state.time, state.x, state.y, state.color]).toEqual(["black", 5, 7, 2, 6, 5]);
    expect(saveAutomataState({ ...state, time: 12 })).toBe(true);
    expect(localStorage.getItem("chromalum-flow-state-v1")).not.toBeNull();
    expect(loadAutomataState().state.time).toBe(12);
  });
  it("replaces the retired image preset with the default editable pattern", () => {
    localStorage.setItem(
      "chromalum-automata-state-v1",
      JSON.stringify({ version: 2, width: 3, height: 2, seed: "///", preset: "image", rule: "life", time: 20, color: 1 }),
    );
    const state = loadAutomataState().state;
    expect(state.seed.length).toBe(2401);
    expect(state.seed[1200]).toBe(1);
    expect([state.preset, state.rule, state.time, state.x, state.y, state.color]).toEqual(["rosette", "life", 0, 24, 24, 1]);
  });
  it("round-trips edited data through its own key", () => {
    const state = { ...createAutomataState(), time: 20, x: 48, color: 0 as const };
    state.seed[0] = 7;
    expect(saveAutomataState(state)).toBe(true);
    expect(loadAutomataState()).toEqual({ state, persistenceUnavailable: false });
    expect(Object.keys(localStorage)).toEqual(["chromalum-flow-state-v1"]);
    const raw = JSON.parse(serializeAutomataState(state));
    expect(raw.version).toBe(1);
    expect(raw.seed).toEqual(Array.from(state.seed));
  });
  it("resets broken JSON without claiming an API failure", () => {
    expect(loadAutomataState({ getItem: () => "{bad" })).toEqual({ state: createAutomataState(), persistenceUnavailable: false });
    expect(loadAutomataState({ getItem: () => null }).persistenceUnavailable).toBe(false);
  });
  it("keeps defaults if the storage getter throws", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    expect(loadAutomataState()).toEqual({ state: createAutomataState(), persistenceUnavailable: true });
    expect(saveAutomataState(createAutomataState())).toBe(false);
  });
  it("reports read and quota failures without throwing", () => {
    expect(
      loadAutomataState({
        getItem: () => {
          throw new Error("Denied");
        },
      }).persistenceUnavailable,
    ).toBe(true);
    expect(
      saveAutomataState(createAutomataState(), {
        setItem: () => {
          throw new DOMException("Full", "QuotaExceededError");
        },
      }),
    ).toBe(false);
  });
});
