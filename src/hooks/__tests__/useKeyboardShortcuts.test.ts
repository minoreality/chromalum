// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";
import type { KeyboardShortcutDeps } from "../useKeyboardShortcuts";
import type { ToolId } from "../../constants";

function makeArgs() {
  // Use simple vi.fn() and cast via the args tuple to avoid Mock generics issues
  const setTool = vi.fn() as unknown as React.Dispatch<React.SetStateAction<ToolId>>;
  const setBrushLevel = vi.fn() as unknown as React.Dispatch<React.SetStateAction<number>>;
  const setBrushSize = vi.fn() as unknown as React.Dispatch<React.SetStateAction<number>>;
  const dispatch = vi.fn() as unknown as React.Dispatch<import("../../types").CanvasAction>;
  const announce = vi.fn() as (msg: string) => void;
  const endPan = vi.fn() as () => void;
  const setShowHelp = vi.fn() as unknown as React.Dispatch<React.SetStateAction<boolean>>;
  const isStrokeActive = vi.fn(() => false);
  const setCursorMode = vi.fn() as unknown as React.Dispatch<React.SetStateAction<null | "grab" | "grabbing">>;
  const spaceRef = { current: false };
  const panningRef = { current: false };
  const brushSizeRef = { current: 12 };
  const setShowNewCanvas = vi.fn() as unknown as React.Dispatch<React.SetStateAction<boolean>>;
  const t = ((key: string) => key) as import("../../i18n").TranslationFn;
  const setZoom = vi.fn() as unknown as React.Dispatch<React.SetStateAction<number>>;
  const setActiveTabId = vi.fn() as (id: KeyboardShortcutDeps["activeTabId"]) => void;
  const toggleLanguage = vi.fn() as () => void;

  const deps: KeyboardShortcutDeps = {
    setTool,
    setBrushLevel,
    setBrushSize,
    dispatch,
    announce,
    endPan,
    showHelp: false,
    setShowHelp,
    isStrokeActive,
    setCursorMode,
    spaceRef,
    panningRef,
    brushSizeRef,
    setShowNewCanvas,
    t,
    setZoom,
    activeTabId: "source",
    setActiveTabId,
    toggleLanguage,
  };

  return {
    deps,
    setTool,
    setBrushLevel,
    setBrushSize,
    dispatch,
    announce,
    endPan,
    setShowHelp,
    isStrokeActive,
    setCursorMode,
    spaceRef,
    panningRef,
    brushSizeRef,
    setShowNewCanvas,
    setZoom,
    setActiveTabId,
    toggleLanguage,
  };
}

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...opts }));
}

describe("useKeyboardShortcuts", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("can be called without error", () => {
    const { deps } = makeArgs();
    const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
    cleanup = unmount;
  });

  describe("tool switching shortcuts", () => {
    const toolKeys: [string, ToolId][] = [
      ["b", "brush"],
      ["e", "eraser"],
      ["f", "fill"],
      ["l", "line"],
      ["r", "rect"],
      ["o", "ellipse"],
    ];

    toolKeys.forEach(([key, expectedTool]) => {
      it(`pressing '${key}' switches to ${expectedTool}`, () => {
        const { deps, setTool, announce } = makeArgs();
        const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
        cleanup = unmount;

        fireKey(key);

        expect(vi.mocked(setTool)).toHaveBeenCalledWith(expectedTool);
        expect(vi.mocked(announce)).toHaveBeenCalled();
      });
    });
  });

  describe("level shortcuts", () => {
    for (let level = 0; level <= 7; level++) {
      it(`pressing '${level}' sets brush level to ${level}`, () => {
        const { deps, setBrushLevel, announce } = makeArgs();
        const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
        cleanup = unmount;

        fireKey(String(level));

        expect(vi.mocked(setBrushLevel)).toHaveBeenCalledWith(level);
        expect(vi.mocked(announce)).toHaveBeenCalled();
      });
    }
  });

  it.each(["color", "glaze"] as const)("keeps the drawing shortcuts on the %s canvas", (activeTabId) => {
    const { deps, setTool, setBrushLevel } = makeArgs();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ ...deps, activeTabId }));
    cleanup = unmount;

    fireKey("b");
    fireKey("3");

    expect(vi.mocked(setTool)).toHaveBeenCalledWith("brush");
    expect(vi.mocked(setBrushLevel)).toHaveBeenCalledWith(3);
  });

  it("leaves Music number shortcuts available to the Music tab", () => {
    const { deps, setBrushLevel, announce } = makeArgs();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ ...deps, activeTabId: "music" }));
    cleanup = unmount;

    fireKey("3");

    expect(vi.mocked(setBrushLevel)).not.toHaveBeenCalled();
    expect(vi.mocked(announce)).not.toHaveBeenCalled();
  });

  it("leaves Hex number shortcuts available to the Hex tab", () => {
    const { deps, setBrushLevel, announce } = makeArgs();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ ...deps, activeTabId: "hex" }));
    cleanup = unmount;

    fireKey("3");

    expect(vi.mocked(setBrushLevel)).not.toHaveBeenCalled();
    expect(vi.mocked(announce)).not.toHaveBeenCalled();
  });

  it("updates number shortcut ownership after switching to the Music tab", () => {
    const { deps, setBrushLevel, announce } = makeArgs();
    let activeTabId: KeyboardShortcutDeps["activeTabId"] = "source";
    const { unmount, rerender } = renderHook(() => useKeyboardShortcuts({ ...deps, activeTabId }));
    cleanup = unmount;

    fireKey("3");
    expect(vi.mocked(setBrushLevel)).toHaveBeenCalledWith(3);

    vi.mocked(setBrushLevel).mockClear();
    vi.mocked(announce).mockClear();
    activeTabId = "music";
    rerender();
    fireKey("3");

    expect(vi.mocked(setBrushLevel)).not.toHaveBeenCalled();
    expect(vi.mocked(announce)).not.toHaveBeenCalled();
  });

  it("restores source number shortcuts after leaving the Music tab", () => {
    const { deps, setBrushLevel, announce } = makeArgs();
    let activeTabId: KeyboardShortcutDeps["activeTabId"] = "music";
    const { unmount, rerender } = renderHook(() => useKeyboardShortcuts({ ...deps, activeTabId }));
    cleanup = unmount;

    fireKey("3");
    expect(vi.mocked(setBrushLevel)).not.toHaveBeenCalled();

    activeTabId = "source";
    rerender();
    fireKey("3");

    expect(vi.mocked(setBrushLevel)).toHaveBeenCalledWith(3);
    expect(vi.mocked(announce)).toHaveBeenCalled();
  });

  describe("undo/redo shortcuts", () => {
    it("leaves Ctrl+S to the browser", () => {
      const { deps, dispatch, setShowNewCanvas } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
      cleanup = unmount;
      const event = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true });
      const preventDefault = vi.spyOn(event, "preventDefault");

      window.dispatchEvent(event);

      expect(preventDefault).not.toHaveBeenCalled();
      expect(vi.mocked(dispatch)).not.toHaveBeenCalled();
      expect(vi.mocked(setShowNewCanvas)).not.toHaveBeenCalled();
    });

    it("Ctrl+Z dispatches undo", () => {
      const { deps, dispatch } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
      cleanup = unmount;

      fireKey("z", { ctrlKey: true });

      expect(vi.mocked(dispatch)).toHaveBeenCalledWith({ type: "undo" });
    });

    it("Ctrl+Shift+Z dispatches redo", () => {
      const { deps, dispatch } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
      cleanup = unmount;

      fireKey("z", { ctrlKey: true, shiftKey: true });

      expect(vi.mocked(dispatch)).toHaveBeenCalledWith({ type: "redo" });
    });

    it("holds undo and redo while a stroke is still down, but keeps the tool keys", () => {
      const { deps, dispatch, setTool, isStrokeActive } = makeArgs();
      isStrokeActive.mockReturnValue(true);
      const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
      cleanup = unmount;

      fireKey("z", { ctrlKey: true });
      fireKey("z", { ctrlKey: true, shiftKey: true });
      fireKey("y", { ctrlKey: true });
      fireKey("e");

      expect(vi.mocked(dispatch)).not.toHaveBeenCalled();
      expect(vi.mocked(setTool)).toHaveBeenCalledWith("eraser");
    });
  });

  describe("while a dialog is open", () => {
    function openDialog() {
      const dialog = document.createElement("div");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      document.body.appendChild(dialog);
      return () => dialog.remove();
    }

    it("keeps tool, level, history, and help keys away from the canvas behind it", () => {
      const closeDialog = openDialog();
      const { deps, dispatch, setTool, setBrushLevel, setShowHelp, setShowNewCanvas } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
      cleanup = () => {
        unmount();
        closeDialog();
      };

      fireKey("b");
      fireKey("3");
      fireKey("z", { ctrlKey: true });
      fireKey("n", { ctrlKey: true });
      fireKey("?", { shiftKey: true });
      fireKey("F1");

      expect(vi.mocked(setTool)).not.toHaveBeenCalled();
      expect(vi.mocked(setBrushLevel)).not.toHaveBeenCalled();
      expect(vi.mocked(dispatch)).not.toHaveBeenCalled();
      expect(vi.mocked(setShowNewCanvas)).not.toHaveBeenCalled();
      expect(vi.mocked(setShowHelp)).not.toHaveBeenCalled();
    });

    it("still lets ? and Escape close the Help dialog itself", () => {
      const closeDialog = openDialog();
      const { deps, setShowHelp, setTool } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts({ ...deps, showHelp: true }));
      cleanup = () => {
        unmount();
        closeDialog();
      };

      fireKey("b");
      expect(vi.mocked(setTool)).not.toHaveBeenCalled();

      fireKey("?", { shiftKey: true });
      expect(vi.mocked(setShowHelp)).toHaveBeenCalledTimes(1);

      fireKey("Escape");
      expect(vi.mocked(setShowHelp)).toHaveBeenLastCalledWith(false);
    });

    it("leaves Alt+digit tab switching available", () => {
      const closeDialog = openDialog();
      const { deps, setActiveTabId } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
      cleanup = () => {
        unmount();
        closeDialog();
      };

      fireKey("2", { altKey: true, code: "Digit2" });

      expect(vi.mocked(setActiveTabId)).toHaveBeenCalled();
    });
  });

  describe("global chords", () => {
    it.each([
      [1, "gallery"],
      [3, "source"],
      [7, "theory"],
      [8, "music"],
    ] as const)("Alt+%i switches to the %s tab from any tab", (digit, tab) => {
      const { deps, setActiveTabId, setBrushLevel } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts({ ...deps, activeTabId: "theory" }));
      cleanup = unmount;
      const event = new KeyboardEvent("keydown", {
        key: String(digit),
        code: `Digit${digit}`,
        altKey: true,
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(event);

      expect(vi.mocked(setActiveTabId)).toHaveBeenCalledWith(tab);
      expect(vi.mocked(setBrushLevel)).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
    });

    it("switches tabs from Option+digit on macOS, where the key is a symbol", () => {
      const { deps, setActiveTabId } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
      cleanup = unmount;

      fireKey("¡", { code: "Digit1", altKey: true });

      expect(vi.mocked(setActiveTabId)).toHaveBeenCalledWith("gallery");
    });

    it("ignores Alt+9 and Alt+0, which have no tab", () => {
      const { deps, setActiveTabId, setBrushLevel } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
      cleanup = unmount;

      fireKey("9", { code: "Digit9", altKey: true });
      fireKey("0", { code: "Digit0", altKey: true });

      expect(vi.mocked(setActiveTabId)).not.toHaveBeenCalled();
      expect(vi.mocked(setBrushLevel)).not.toHaveBeenCalled();
    });

    it("Alt+L toggles the language even while a button has focus", () => {
      const { deps, toggleLanguage } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
      cleanup = unmount;
      const button = document.createElement("button");
      document.body.appendChild(button);

      button.dispatchEvent(new KeyboardEvent("keydown", { key: "l", code: "KeyL", altKey: true, bubbles: true }));
      button.remove();

      expect(vi.mocked(toggleLanguage)).toHaveBeenCalledTimes(1);
    });

    it("leaves plain and Ctrl+Alt digits to the drawing shortcuts and the browser", () => {
      const { deps, setActiveTabId, setBrushLevel } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
      cleanup = unmount;

      fireKey("3", { code: "Digit3" });
      fireKey("3", { code: "Digit3", altKey: true, ctrlKey: true });

      expect(vi.mocked(setActiveTabId)).not.toHaveBeenCalled();
      expect(vi.mocked(setBrushLevel)).toHaveBeenCalledTimes(1);
    });
  });

  describe("tabs without a drawing canvas", () => {
    it.each(["theory", "hex", "music", "gallery", "map"] as const)(
      "leaves tools, levels, brush size, and history alone on %s",
      (activeTabId) => {
        const { deps, setTool, setBrushLevel, setBrushSize, dispatch, setZoom, setShowNewCanvas, announce } = makeArgs();
        const { unmount } = renderHook(() => useKeyboardShortcuts({ ...deps, activeTabId }));
        cleanup = unmount;

        fireKey("b");
        fireKey("3");
        fireKey("0");
        fireKey("7");
        fireKey("]");
        fireKey("z", { ctrlKey: true });
        fireKey("=", { ctrlKey: true });
        fireKey("n", { ctrlKey: true });

        expect(vi.mocked(setTool)).not.toHaveBeenCalled();
        expect(vi.mocked(setBrushLevel)).not.toHaveBeenCalled();
        expect(vi.mocked(setBrushSize)).not.toHaveBeenCalled();
        expect(vi.mocked(dispatch)).not.toHaveBeenCalled();
        expect(vi.mocked(setZoom)).not.toHaveBeenCalled();
        expect(vi.mocked(setShowNewCanvas)).not.toHaveBeenCalled();
        expect(vi.mocked(announce)).not.toHaveBeenCalled();
      },
    );

    it("lets Space scroll Theory instead of arming canvas pan", () => {
      const { deps, spaceRef, setCursorMode } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts({ ...deps, activeTabId: "theory" }));
      cleanup = unmount;
      const event = new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true });

      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(spaceRef.current).toBe(false);
      expect(vi.mocked(setCursorMode)).not.toHaveBeenCalled();
    });

    it("keeps the page still for as long as Space is held", () => {
      const { deps, spaceRef, setCursorMode } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
      cleanup = unmount;
      const first = new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true });
      const repeat = new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true, repeat: true });

      window.dispatchEvent(first);
      window.dispatchEvent(repeat);

      // An unprevented repeat is the browser scrolling mid-drag, not a no-op.
      expect(first.defaultPrevented).toBe(true);
      expect(repeat.defaultPrevented).toBe(true);
      expect(spaceRef.current).toBe(true);
      expect(vi.mocked(setCursorMode)).toHaveBeenCalledTimes(1);
    });

    it("keeps F1, ?, and Escape for the help modal on Theory", () => {
      const { deps, setShowHelp } = makeArgs();
      const { unmount } = renderHook(() => useKeyboardShortcuts({ ...deps, activeTabId: "theory" }));
      cleanup = unmount;

      fireKey("F1");
      fireKey("?", { shiftKey: true });
      fireKey("Escape");

      expect(vi.mocked(setShowHelp)).toHaveBeenCalledTimes(3);
      expect(vi.mocked(setShowHelp)).toHaveBeenLastCalledWith(false);
    });
  });

  it("toggles help from ? even though the key arrives with Shift held", () => {
    const { deps, setShowHelp } = makeArgs();
    const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
    cleanup = unmount;

    fireKey("?", { shiftKey: true });

    expect(vi.mocked(setShowHelp)).toHaveBeenCalledTimes(1);
  });

  it("keeps tool, level, and history shortcuts while a button has focus", () => {
    const { deps, setTool, setBrushLevel, dispatch } = makeArgs();
    const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
    cleanup = unmount;
    const button = document.createElement("button");
    document.body.appendChild(button);

    for (const init of [{ key: "b" }, { key: "3" }, { key: "z", ctrlKey: true }]) {
      button.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ...init }));
    }
    button.remove();

    expect(vi.mocked(setTool)).toHaveBeenCalledWith("brush");
    expect(vi.mocked(setBrushLevel)).toHaveBeenCalledWith(3);
    expect(vi.mocked(dispatch)).toHaveBeenCalledWith({ type: "undo" });
  });

  it("leaves a focused range input its arrows but keeps the digit shortcuts", () => {
    const { deps, setBrushLevel } = makeArgs();
    const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
    cleanup = unmount;
    const range = document.createElement("input");
    range.type = "range";
    document.body.appendChild(range);

    range.dispatchEvent(new KeyboardEvent("keydown", { key: "3", bubbles: true }));
    range.remove();

    expect(vi.mocked(setBrushLevel)).toHaveBeenCalledWith(3);
  });

  it("ignores keys when target is an input element", () => {
    const { deps, setTool } = makeArgs();
    const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
    cleanup = unmount;

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
    document.body.removeChild(input);

    expect(vi.mocked(setTool)).not.toHaveBeenCalled();
  });

  it("leaves Space available to focused buttons", () => {
    const { deps, spaceRef, setCursorMode } = makeArgs();
    const { unmount } = renderHook(() => useKeyboardShortcuts(deps));
    cleanup = unmount;
    const button = document.createElement("button");
    document.body.appendChild(button);
    const event = new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true });
    const preventDefault = vi.spyOn(event, "preventDefault");

    button.dispatchEvent(event);
    button.remove();

    expect(preventDefault).not.toHaveBeenCalled();
    expect(spaceRef.current).toBe(false);
    expect(vi.mocked(setCursorMode)).not.toHaveBeenCalled();
  });
});
