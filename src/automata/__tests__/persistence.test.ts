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
    expect(raw.version).toBe(2);
    expect(typeof raw.seed).toBe("string");
  });
  it("round-trips a maximum-size image plane within the local storage budget", () => {
    const state = { ...createAutomataState(2048, 2048), preset: "image" as const, sourceKey: "image-key", time: 20 };
    for (let i = 0; i < state.seed.length; i++) state.seed[i] = i % 8;
    const serialized = serializeAutomataState(state);
    expect(serialized.length * 2).toBeLessThan(5 * 1024 * 1024);
    const restored = loadAutomataState({ getItem: () => serialized }).state;
    expect({ ...restored, seed: null }).toEqual({ ...state, seed: null });
    expect(restored.seed.length).toBe(state.seed.length);
    expect(restored.seed.every((value, i) => value === state.seed[i])).toBe(true);
  });
  it.each([1, 2, 3, 5, 7, 9, 31])("preserves all bits for a %s-pixel row", (width) => {
    const state = createAutomataState(width, 1);
    for (let i = 0; i < width; i++) state.seed[i] = i % 8;
    expect(loadAutomataState({ getItem: () => serializeAutomataState(state) }).state).toEqual(state);
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
