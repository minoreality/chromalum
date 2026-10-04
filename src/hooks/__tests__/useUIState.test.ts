// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUIState } from "../useUIState";
import { TOAST_DURATION } from "../../constants";

// Minimal translation stub
const t = ((key: string) => key) as import("../../i18n").TranslationFn;

describe("useUIState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("initial activeTab is 2 (Source)", () => {
    const { result } = renderHook(() => useUIState(t));
    expect(result.current.activeTab).toBe(2);
    expect(result.current.activeTabId).toBe("source");
  });

  it("opens Hex and canonicalizes a retired Color link", () => {
    window.history.replaceState(null, "", "/#color");

    const { result } = renderHook(() => useUIState(t));

    expect(result.current.activeTabId).toBe("hex");
    expect(window.location.hash).toBe("#hex");
  });

  it("redirects to Hex when a retired Color hash is entered after loading", () => {
    const { result } = renderHook(() => useUIState(t));

    act(() => {
      window.history.pushState(null, "", "#color");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(result.current.activeTabId).toBe("hex");
    expect(window.location.hash).toBe("#hex");
  });

  it.each([
    [3, "hex"],
    [4, "glaze"],
    [5, "map"],
    [6, "theory"],
    [7, "music"],
  ])("restores legacy saved tab %i as %s after Color removal", (index, tab) => {
    localStorage.setItem("chromalum-active-tab-v2", String(index));

    const { result } = renderHook(() => useUIState(t));

    expect(result.current.activeTabId).toBe(tab);
    expect(localStorage.getItem("chromalum-active-tab-v3")).toBe(tab);
  });

  it("prefers the stable saved tab ID over a legacy numeric tab", () => {
    localStorage.setItem("chromalum-active-tab-v3", "glaze");
    localStorage.setItem("chromalum-active-tab-v2", "7");

    const { result } = renderHook(() => useUIState(t));

    expect(result.current.activeTabId).toBe("glaze");
  });

  it("restores a legacy Music history entry without a hash", () => {
    const { result } = renderHook(() => useUIState(t));

    act(() => {
      window.history.replaceState({ chromalumActiveTab: 7 }, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate", { state: { chromalumActiveTab: 7 } }));
    });

    expect(result.current.activeTabId).toBe("music");
  });

  it("initial activeTab prefers a supported URL hash", () => {
    window.history.replaceState(null, "", "/#theory");

    const { result } = renderHook(() => useUIState(t));

    expect(result.current.activeTab).toBe(5);
    expect(result.current.activeTabId).toBe("theory");
  });

  it("tracks whether the map tab has been opened from the initial hash", () => {
    window.history.replaceState(null, "", "/#map");

    const { result } = renderHook(() => useUIState(t));

    expect(result.current.activeTab).toBe(4);
    expect(result.current.activeTabId).toBe("map");
    expect(result.current.hasOpenedMap).toBe(true);
  });

  it("initial activeTab supports the legacy map URL hash alias", () => {
    window.history.replaceState(null, "", "/#stats");

    const { result } = renderHook(() => useUIState(t));

    expect(result.current.activeTab).toBe(4);
    expect(result.current.activeTabId).toBe("map");
    expect(result.current.hasOpenedMap).toBe(true);
  });

  it("initial activeTab falls back to the stored tab when no hash is present", () => {
    localStorage.setItem("chromalum-active-tab-v2", "7");

    const { result } = renderHook(() => useUIState(t));

    expect(result.current.activeTab).toBe(6);
    expect(result.current.activeTabId).toBe("music");
  });

  it("initial activeTab falls back to Source when stored tab cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
      if (key.startsWith("chromalum-active-tab-")) throw new DOMException("Storage blocked", "SecurityError");
      return null;
    });

    const { result } = renderHook(() => useUIState(t));

    expect(result.current.activeTab).toBe(2);
    expect(result.current.activeTabId).toBe("source");
  });

  it("setActiveTab changes tab", () => {
    const { result } = renderHook(() => useUIState(t));
    act(() => {
      result.current.setActiveTab(5);
    });
    expect(result.current.activeTab).toBe(5);
    expect(result.current.activeTabId).toBe("theory");
    expect(window.location.hash).toBe("#theory");
    expect(localStorage.getItem("chromalum-active-tab-v3")).toBe("theory");
  });

  it("setActiveTabId changes tab while storing its stable ID", () => {
    const { result } = renderHook(() => useUIState(t));
    act(() => {
      result.current.setActiveTabId("theory");
    });
    expect(result.current.activeTab).toBe(5);
    expect(result.current.activeTabId).toBe("theory");
    expect(window.location.hash).toBe("#theory");
    expect(localStorage.getItem("chromalum-active-tab-v3")).toBe("theory");
  });

  it("setActiveTab still changes tab when storage cannot be written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key) => {
      if (key.startsWith("chromalum-active-tab-")) throw new DOMException("Storage blocked", "SecurityError");
    });
    const { result } = renderHook(() => useUIState(t));

    act(() => {
      result.current.setActiveTab(5);
    });

    expect(result.current.activeTab).toBe(5);
    expect(result.current.activeTabId).toBe("theory");
    expect(window.location.hash).toBe("#theory");
  });

  it("tracks whether the map tab has been opened through tab changes", () => {
    const { result } = renderHook(() => useUIState(t));
    expect(result.current.hasOpenedMap).toBe(false);

    act(() => {
      result.current.setActiveTab(4);
    });
    expect(result.current.hasOpenedMap).toBe(true);
    expect(result.current.activeTabId).toBe("map");

    act(() => {
      result.current.setActiveTab(2);
    });
    expect(result.current.hasOpenedMap).toBe(true);
    expect(result.current.activeTabId).toBe("source");
  });

  it("syncs activeTab from manual hash changes", () => {
    const { result } = renderHook(() => useUIState(t));

    act(() => {
      window.history.pushState(null, "", "#music");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(result.current.activeTab).toBe(6);
    expect(result.current.activeTabId).toBe("music");
    expect(localStorage.getItem("chromalum-active-tab-v3")).toBe("music");
  });

  it("tracks map opening from manual hash changes", () => {
    const { result } = renderHook(() => useUIState(t));
    expect(result.current.hasOpenedMap).toBe(false);

    act(() => {
      window.history.pushState(null, "", "#map");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(result.current.activeTab).toBe(4);
    expect(result.current.activeTabId).toBe("map");
    expect(result.current.hasOpenedMap).toBe(true);
  });

  it("syncs activeTab from browser history state", () => {
    const { result } = renderHook(() => useUIState(t));

    act(() => {
      result.current.setActiveTab(5);
    });
    act(() => {
      window.history.replaceState({ chromalumActiveTab: 2 }, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate", { state: { chromalumActiveTab: 2 } }));
    });

    expect(result.current.activeTab).toBe(2);
    expect(result.current.activeTabId).toBe("source");
    expect(window.location.hash).toBe("");
    expect(localStorage.getItem("chromalum-active-tab-v3")).toBe("source");
  });

  it("ignores storage failures while restoring scroll position", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
      if (key === "chromalum-scroll-y") throw new DOMException("Storage blocked", "SecurityError");
      return null;
    });

    const { result } = renderHook(() => useUIState(t));

    expect(result.current.activeTab).toBe(2);
    expect(result.current.activeTabId).toBe("source");
  });

  it("ignores storage failures while saving scroll position", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key) => {
      if (key === "chromalum-scroll-y") throw new DOMException("Storage blocked", "SecurityError");
    });
    renderHook(() => useUIState(t));

    expect(() => window.dispatchEvent(new Event("beforeunload"))).not.toThrow();
  });

  it("showToast sets toast and auto-clears after TOAST_DURATION", () => {
    const { result } = renderHook(() => useUIState(t));

    act(() => {
      result.current.showToast("hello", "success");
    });
    expect(result.current.toast).toEqual({ message: "hello", type: "success" });

    // Advance time past TOAST_DURATION
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION + 100);
    });
    expect(result.current.toast).toBeNull();
  });

  it("showToast defaults to 'info' type", () => {
    const { result } = renderHook(() => useUIState(t));

    act(() => {
      result.current.showToast("msg");
    });
    expect(result.current.toast).toEqual({ message: "msg", type: "info" });
  });

  it("showToast replaces previous toast and resets timer", () => {
    const { result } = renderHook(() => useUIState(t));

    act(() => {
      result.current.showToast("first", "info");
    });
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION - 100);
    });
    // Still visible
    expect(result.current.toast).not.toBeNull();

    // Replace with second toast
    act(() => {
      result.current.showToast("second", "error");
    });
    expect(result.current.toast).toEqual({ message: "second", type: "error" });

    // Original timer should not clear the new toast
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.toast).not.toBeNull();

    // New timer clears it
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION);
    });
    expect(result.current.toast).toBeNull();
  });

  it("showHelp toggles", () => {
    const { result } = renderHook(() => useUIState(t));
    expect(result.current.showHelp).toBe(false);

    act(() => {
      result.current.setShowHelp(true);
    });
    expect(result.current.showHelp).toBe(true);

    act(() => {
      result.current.setShowHelp(false);
    });
    expect(result.current.showHelp).toBe(false);
  });

  it("mapMode changes", () => {
    const { result } = renderHook(() => useUIState(t));
    expect(result.current.mapMode).toBe("levelTone");

    act(() => {
      result.current.setMapMode("levelTone");
    });
    expect(result.current.mapMode).toBe("levelTone");
  });
});
