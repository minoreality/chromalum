import { useEffect } from "react";
import { BRUSH_MIN, BRUSH_MAX, BRUSH_STEP, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from "../constants";
import type { GlazeToolId, ToolId } from "../constants";
import { LEVEL_INFO } from "../color-engine";
import type { CanvasAction } from "../types";
import type { TranslationFn } from "../i18n";
import { tabIdFromIndex, type MainTabId } from "../tabs";
import { controlOwnsKey, hasDrawingShortcuts } from "../shortcuts";

export interface KeyboardShortcutDeps {
  setTool: React.Dispatch<React.SetStateAction<ToolId>>;
  setGlazeTool: React.Dispatch<React.SetStateAction<GlazeToolId>>;
  setBrushLevel: React.Dispatch<React.SetStateAction<number>>;
  setBrushSize: React.Dispatch<React.SetStateAction<number>>;
  dispatch: React.Dispatch<CanvasAction>;
  announce: (msg: string) => void;
  endPan: () => void;
  showHelp: boolean;
  setShowHelp: React.Dispatch<React.SetStateAction<boolean>>;
  /** True while a brush, shape, or glaze stroke is still being drawn. */
  isStrokeActive: () => boolean;
  setCursorMode: React.Dispatch<React.SetStateAction<null | "grab" | "grabbing">>;
  spaceRef: React.MutableRefObject<boolean>;
  panningRef: React.MutableRefObject<boolean>;
  brushSizeRef: React.MutableRefObject<number>;
  setShowNewCanvas: React.Dispatch<React.SetStateAction<boolean>>;
  t: TranslationFn;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  activeTabId: MainTabId;
  setActiveTabId: (id: MainTabId) => void;
  toggleLanguage: () => void;
}

interface KeyCommand {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  action: () => void;
}

export function useKeyboardShortcuts(deps: KeyboardShortcutDeps) {
  const {
    setTool,
    setGlazeTool,
    setBrushLevel,
    setBrushSize,
    dispatch,
    announce,
    endPan,
    showHelp,
    setShowHelp,
    isStrokeActive,
    setCursorMode,
    spaceRef,
    panningRef,
    brushSizeRef,
    setShowNewCanvas,
    t,
    setZoom,
    activeTabId,
    setActiveTabId,
    toggleLanguage,
  } = deps;

  useEffect(() => {
    const commands: KeyCommand[] = [
      {
        key: "n",
        ctrl: true,
        action: () => {
          setShowNewCanvas(true);
        },
      },
      // History waits for the pointer to come up: a stroke commits its own diff
      // on release, and rewriting the canvas underneath it would leave the two
      // disagreeing about what the stroke changed.
      {
        key: "z",
        ctrl: true,
        shift: true,
        action: () => {
          if (!isStrokeActive()) dispatch({ type: "redo" });
        },
      },
      {
        key: "z",
        ctrl: true,
        action: () => {
          if (!isStrokeActive()) dispatch({ type: "undo" });
        },
      },
      {
        key: "y",
        ctrl: true,
        action: () => {
          if (!isStrokeActive()) dispatch({ type: "redo" });
        },
      },
      {
        key: "b",
        action: () => {
          if (activeTabId === "glaze") setGlazeTool("glaze_brush");
          else setTool("brush");
          announce(t(activeTabId === "glaze" ? "announce_glaze_brush" : "announce_brush"));
        },
      },
      {
        key: "e",
        action: () => {
          if (activeTabId === "glaze") setGlazeTool("glaze_eraser");
          else setTool("eraser");
          announce(t(activeTabId === "glaze" ? "announce_glaze_eraser" : "announce_eraser"));
        },
      },
      {
        key: "f",
        action: () => {
          if (activeTabId === "glaze") setGlazeTool("glaze_fill");
          else setTool("fill");
          announce(t(activeTabId === "glaze" ? "announce_glaze_fill" : "announce_fill"));
        },
      },
      {
        key: "l",
        action: () => {
          setTool("line");
          announce(t("announce_line"));
        },
      },
      {
        key: "r",
        action: () => {
          setTool("rect");
          announce(t("announce_rect"));
        },
      },
      {
        key: "o",
        action: () => {
          setTool("ellipse");
          announce(t("announce_ellipse"));
        },
      },
    ];

    const down = (e: KeyboardEvent) => {
      // A panel or focused control may already have handled this bubbling key.
      if (e.defaultPrevented) return;
      // Global chords work from any focus: Alt+1..8 switch tabs in tab-bar
      // order and Alt+L switches the language. Matched on e.code because
      // Option+digit types a symbol on macOS.
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const digit = /^Digit([1-8])$/.exec(e.code);
        if (digit) {
          const tab = tabIdFromIndex(Number(digit[1]) - 1);
          if (tab === null) return;
          e.preventDefault();
          setActiveTabId(tab);
          return;
        }
        if (e.code === "KeyL") {
          e.preventDefault();
          toggleLanguage();
          return;
        }
        // Other Alt chords belong to the browser or the OS, not to the canvas.
        return;
      }

      // A focused control keeps only the keys it uses itself (see controlOwnsKey):
      // Space still activates a focused button instead of arming canvas pan, but
      // a tool button that kept focus after a click does not silence the keys.
      if (controlOwnsKey(e.target, e)) return;

      // An open dialog owns the keyboard: its focus trap handles Escape, and the
      // canvas behind it must not change tool, level, or history. Help is the
      // one dialog these shortcuts open, so it stays closable from here.
      const dialogOpen = document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
      if (dialogOpen && !showHelp) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      // Help is reachable from every tab. "?" always arrives with Shift held.
      if (e.key === "F1" || (key === "?" && !isCtrl)) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }
      if (key === "Escape" && !isCtrl) {
        setShowHelp(false);
        return;
      }
      if (dialogOpen) return;

      // Only the drawing tabs own the canvas shortcuts. Elsewhere Space scrolls,
      // digits stay with Hex and Music, and history cannot change a hidden canvas.
      if (!hasDrawingShortcuts(activeTabId)) return;
      if (e.altKey) return;

      // Match the produced character: Shift creates '+' on both US and JIS
      // layouts. Local canvas handlers preventDefault before this bubbles here.
      if (key === "+" || (!isShift && key === "=")) {
        e.preventDefault();
        setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP));
        return;
      }
      if (!isShift && key === "-") {
        e.preventDefault();
        setZoom((z) => Math.max(ZOOM_MIN, z / ZOOM_STEP));
        return;
      }

      // Glaze has no shape tools; never change the hidden Source selection.
      if (activeTabId === "glaze" && (key === "l" || key === "r" || key === "o")) return;

      // Space key for pan (stateful, handle separately). The repeats a held key
      // sends have to be prevented too: holding Space is the gesture, and letting
      // one repeat through hands the key back to the browser, which scrolls the
      // page out from under the drag. Only the first arms the pan.
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) {
          spaceRef.current = true;
          setCursorMode("grab");
        }
        return;
      }

      // Try command registry
      for (const cmd of commands) {
        if (cmd.key === key && !!cmd.ctrl === isCtrl && !!cmd.shift === isShift) {
          e.preventDefault();
          cmd.action();
          return;
        }
      }

      // Level keys 0-7 (no ctrl)
      if (!isCtrl && key >= "0" && key <= "7") {
        setBrushLevel(+key);
        announce(t("announce_level", key, LEVEL_INFO[+key].name));
        return;
      }
      // Brush size
      if (!isCtrl && e.key === "[") {
        const nv = Math.max(BRUSH_MIN, brushSizeRef.current - BRUSH_STEP);
        setBrushSize(nv);
        announce(t("announce_size", nv));
        return;
      }
      if (!isCtrl && e.key === "]") {
        const nv = Math.min(BRUSH_MAX, brushSizeRef.current + BRUSH_STEP);
        setBrushSize(nv);
        announce(t("announce_size", nv));
        return;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceRef.current = false;
        setCursorMode(null);
        if (panningRef.current) endPan();
      }
    };
    const blur = () => {
      if (spaceRef.current) {
        spaceRef.current = false;
        setCursorMode(null);
        if (panningRef.current) endPan();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- spaceRef, panningRef, brushSizeRef are stable refs
  }, [
    setTool,
    setGlazeTool,
    setBrushLevel,
    setBrushSize,
    dispatch,
    announce,
    endPan,
    showHelp,
    setShowHelp,
    isStrokeActive,
    setCursorMode,
    setShowNewCanvas,
    t,
    setZoom,
    activeTabId,
    setActiveTabId,
    toggleLanguage,
  ]);
}
