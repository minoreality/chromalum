// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock idb-persistence so IndexedDB is not required
vi.mock("../../utils/idb-persistence", () => ({
  loadState: vi.fn(() => Promise.resolve(null)),
  saveState: vi.fn(() => Promise.resolve()),
}));

import { useAppState } from "../useAppState";
import { W0, H0 } from "../../constants";

// Minimal translation stub
const t = ((key: string) => key) as import("../../i18n").TranslationFn;

describe("useAppState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("composes the initial app state needed by the canvas UI", () => {
    const { result } = renderHook(() => useAppState(t));
    const s = result.current;

    expect(s.cvs.w).toBe(W0);
    expect(s.cvs.h).toBe(H0);
    expect(s.cvs.data).toBeInstanceOf(Uint8Array);
    expect(s.cvs.data.length).toBe(W0 * H0);
    expect(s.state.undoStack).toBeDefined();
    expect(s.state.redoStack).toBeDefined();
    expect(s.state.hist.length).toBe(8);
    expect(s.tool).toBe("brush");
    expect(s.brushLevel).toBe(7);
    expect(s.brushSize).toBe(12);
    expect(Array.isArray(s.locked)).toBe(true);
    expect(result.current.colorLUT).toHaveLength(8);
    for (const rgb of result.current.colorLUT) expect(rgb).toHaveLength(3);
  });

  it("passes through composed tool and color-state actions", () => {
    const { result } = renderHook(() => useAppState(t));

    act(() => {
      result.current.setTool("fill");
      result.current.setBrushLevel(3);
      result.current.setBrushSize(24);
      result.current.toggleLock(2);
    });

    expect(result.current.tool).toBe("fill");
    expect(result.current.brushLevel).toBe(3);
    expect(result.current.brushSize).toBe(24);
    expect(result.current.locked[2]).toBe(true);
    expect(result.current.locked[0]).toBe(false);
  });
});
