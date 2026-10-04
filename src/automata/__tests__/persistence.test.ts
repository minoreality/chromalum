// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAutomataState, saveAutomataState, serializeAutomataState } from "../persistence";
import { createAutomataState } from "../state";

afterEach(() => vi.restoreAllMocks());
describe("Automata persistence", () => {
  it("round-trips edited data through its own key", () => {
    const state = { ...createAutomataState(), time: 20, x: 48, color: 0 as const };
    state.seed[0] = 7;
    expect(saveAutomataState(state)).toBe(true);
    expect(loadAutomataState()).toEqual({ state, persistenceUnavailable: false });
    expect(Object.keys(localStorage)).toEqual(["chromalum-automata-state-v1"]);
    const raw = JSON.parse(serializeAutomataState(state));
    expect(raw.version).toBe(1);
    expect(Object.keys(raw).sort()).toEqual(["color", "preset", "rule", "seed", "time", "version", "x", "y"]);
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
