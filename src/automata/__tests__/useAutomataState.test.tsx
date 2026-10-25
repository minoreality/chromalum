// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAutomataState } from "../useAutomataState";
import { loadAutomataState } from "../persistence";

afterEach(() => vi.restoreAllMocks());
describe("useAutomataState", () => {
  it("saves the last edit once on release or cancel", () => {
    const write = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useAutomataState());
    act(() => {
      result.current.beginInteraction();
      for (let x = 0; x < 20; x++) result.current.dispatch({ type: "paint-cells", cells: [{ x, y: 0 }], color: 7 });
    });
    expect(write).not.toHaveBeenCalled();
    act(() => result.current.finishInteraction());
    expect(write).toHaveBeenCalledTimes(1);
    const stored = loadAutomataState().state;
    expect(stored.seed.slice(0, 20)).toEqual(new Uint8Array(20).fill(7));
    expect([stored.x, stored.y]).toEqual([19, 0]);
    act(() => result.current.finishInteraction());
    expect(write).toHaveBeenCalledTimes(1);
  });
  it("flushes synchronous edits even before React rerenders", () => {
    const { result } = renderHook(() => useAutomataState());
    act(() => {
      result.current.beginInteraction();
      result.current.dispatch({ type: "paint-cells", cells: [{ x: 0, y: 0 }], color: 2 });
      expect(result.current.getSnapshot().state.seed[0]).toBe(2);
      result.current.finishInteraction();
    });
    expect(loadAutomataState().state.seed[0]).toBe(2);
  });
  it("ends strokes and increments revision for setting commands", () => {
    const { result } = renderHook(() => useAutomataState());
    act(() => {
      result.current.beginInteraction();
      result.current.dispatch({ type: "paint-cells", cells: [{ x: 0, y: 0 }], color: 7 });
      result.current.dispatch({ type: "set-time", time: 1 });
    });
    expect(result.current.interacting).toBe(false);
    expect(result.current.revision).toBe(1);
    expect(result.current.state.seed[0]).toBe(7);
    expect(JSON.parse(localStorage.getItem("chromalum-automata-state-v1")!).time).toBe(1);
  });
  it("continues editing in memory after storage rejects saves", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Denied");
    });
    const { result } = renderHook(() => useAutomataState());
    act(() => result.current.dispatch({ type: "paint-cells", cells: [{ x: 0, y: 0 }], color: 1 }));
    expect(result.current.persistenceUnavailable).toBe(true);
    act(() => result.current.dispatch({ type: "set-time", time: 20 }));
    expect([result.current.state.seed[0], result.current.state.time]).toEqual([1, 20]);
  });
});
