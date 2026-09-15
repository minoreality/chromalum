import { useEffect } from "react";
import { BRUSH_MIN, BRUSH_MAX, BRUSH_STEP, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from "../constants";
import type { ToolId } from "../constants";
import { LEVEL_INFO } from "../color-engine";
import type { CanvasAction } from "../types";
import type { TranslationFn } from "../i18n";
import { tabIdFromIndex, type MainTabId } from "../tabs";
import { controlOwnsKey, hasDrawingShortcuts } from "../shortcuts";

export interface KeyboardShortcutDeps {
  setTool: React.Dispatch<React.SetStateAction<ToolId>>;
  setBrushLevel: React.Dispatch<React.SetStateAction<number>>;
  setBrushSize: React.Dispatch<React.SetStateAction<number>>;
  dispatch: React.Dispatch<CanvasAction>;
  announce: (msg: string) => void;
  endPan: () => void;
  setShowHelp: React.Dispatch<React.SetStateAction<boolean>>;
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
    setBrushLevel,
    setBrushSize,
    dispatch,
    announce,
    endPan,
    setShowHelp,
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
      {
        key: "z",
        ctrl: true,
        shift: true,
        action: () => {
          dispatch({ type: "redo" });
        },
      },
      {
        key: "z",
        ctrl: true,
        action: () => {
          dispatch({ type: "undo" });
        },
      },
      {
        key: "y",
        ctrl: true,
        action: () => {
          dispatch({ type: "redo" });
        },
      },
      {
        key: "=",
        ctrl: true,
        action: () => {
          setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP));
        },
      },
      {
        key: "+",
        ctrl: true,
        action: () => {
          setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP));
        },
      },
      {
        key: "-",
        ctrl: true,
        action: () => {
          setZoom((z) => Math.max(ZOOM_MIN, z / ZOOM_STEP));
        },
      },
      {
        key: "b",
        action: () => {
          setTool("brush");
          announce(t("announce_brush"));
        },
      },
      {
        key: "e",
        action: () => {
          setTool("eraser");
          announce(t("announce_eraser"));
        },
      },
      {
        key: "f",
        action: () => {
          setTool("fill");
          announce(t("announce_fill"));
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

      // Only the drawing tabs own the canvas shortcuts. Elsewhere Space scrolls,
      // digits stay with Hex and Music, and history cannot change a hidden canvas.
      if (!hasDrawingShortcuts(activeTabId)) return;

      // Space key for pan (stateful, handle separately)
      if (e.code === "Space" && !e.repeat) {
        spaceRef.current = true;
        setCursorMode("grab");
        e.preventDefault();
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
    setBrushLevel,
    setBrushSize,
    dispatch,
    announce,
    endPan,
    setShowHelp,
    setCursorMode,
    setShowNewCanvas,
    t,
    setZoom,
    activeTabId,
    setActiveTabId,
    toggleLanguage,
  ]);
}
