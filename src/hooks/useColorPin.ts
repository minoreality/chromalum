import { useCallback, useEffect, useRef } from "react";
import type React from "react";
import { LEVEL_CANDIDATES } from "../color-engine";
import type { ColorAction } from "../state/color-reducer";

interface Options {
  candidateIndexByLevel: readonly number[];
  lockedLevels: readonly boolean[];
  levelHistogram: readonly number[];
  dispatch: React.Dispatch<ColorAction>;
  onSetLock: (level: number, locked: boolean) => void;
  active?: boolean;
}

// The list follows the established Hex-dot hold and scroll tolerance.
const HOLD_MS = 500;
const SLOP_PX = 10;

export function useColorPin({ candidateIndexByLevel, lockedLevels, levelHistogram, dispatch, onSetLock, active = true }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const pinnedByHold = useRef(false);
  const endPress = useCallback(() => {
    clearTimeout(timer.current);
    origin.current = null;
  }, []);

  useEffect(() => {
    if (!active) {
      endPress();
      return;
    }
    const cancelSecondTouch = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && !event.isPrimary) endPress();
    };
    document.addEventListener("pointerdown", cancelSecondTouch, true);
    return () => {
      endPress();
      document.removeEventListener("pointerdown", cancelSecondTouch, true);
    };
  }, [active, endPress]);

  return (level: number, candidate: number) => {
    const selected = candidateIndexByLevel[level] % LEVEL_CANDIDATES[level].length === candidate;
    const choose = () => {
      if (active && !lockedLevels[level] && !selected) dispatch({ type: "set_color", levelIndex: level, candidateIndex: candidate });
    };
    const pin = () => {
      if (!active || LEVEL_CANDIDATES[level].length < 2 || levelHistogram[level] === 0) return;
      if (lockedLevels[level] && selected) onSetLock(level, false);
      else {
        if (!selected) dispatch({ type: "set_color", levelIndex: level, candidateIndex: candidate });
        onSetLock(level, true);
      }
    };
    return {
      onClick: choose,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        choose();
      },
      onContextMenu: (event: React.MouseEvent) => {
        event.preventDefault();
        endPress();
        // Android can send contextmenu for the hold already handled by the timer.
        if (pinnedByHold.current) pinnedByHold.current = false;
        else pin();
      },
      onPointerDown: (event: React.PointerEvent) => {
        if (event.pointerType === "mouse") return;
        endPress();
        pinnedByHold.current = false;
        if (!active || !event.isPrimary) return;
        origin.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
        timer.current = setTimeout(() => {
          pinnedByHold.current = true;
          pin();
        }, HOLD_MS);
      },
      onPointerMove: (event: React.PointerEvent) => {
        const start = origin.current;
        if (start && (event.pointerId !== start.id || Math.hypot(event.clientX - start.x, event.clientY - start.y) > SLOP_PX)) endPress();
      },
      onPointerUp: endPress,
      onPointerCancel: endPress,
      onPointerLeave: endPress,
      "aria-pressed": selected,
    };
  };
}
