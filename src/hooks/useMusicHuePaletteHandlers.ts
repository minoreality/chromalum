import { useCallback, useEffect, useRef } from "react";
import type { ChangeEvent } from "react";

import { LEVEL_CANDIDATES, findClosestCandidate } from "../color-engine";
import { MUSIC_ACTIVE_LEVELS } from "../music/types";
import type { MusicEngineReturn } from "./useMusicEngine";
import type { useMusicBurstHighlightState, useMusicPaletteState, useMusicTransportState } from "./useMusicPanelState";

type MusicPaletteState = ReturnType<typeof useMusicPaletteState>;
type MusicTransportState = ReturnType<typeof useMusicTransportState>;
type MusicBurstHighlightState = ReturnType<typeof useMusicBurstHighlightState>;
type MusicSonificationLevel = { lv: number; angle: number };

function useMusicKeyboardShortcuts(
  sonificationLevels: MusicSonificationLevel[],
  onLevelTrigger: (lv: number, angle: number) => void,
): void {
  const sonificationLevelsRef = useRef(sonificationLevels);
  useEffect(() => {
    sonificationLevelsRef.current = sonificationLevels;
  }, [sonificationLevels]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k >= "1" && k <= "6") {
        const lv = +k;
        const entry = sonificationLevelsRef.current.find((s) => s.lv === lv);
        if (entry) onLevelTrigger(lv, entry.angle);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onLevelTrigger]);
}

interface UseMusicHuePaletteHandlersOptions {
  engine: MusicEngineReturn;
  activeAlpha: number;
  resumeDrone: () => void;
  ensureAudio: () => void;
  sonificationLevels: MusicSonificationLevel[];
  palette: Pick<MusicPaletteState, "setHueAngle" | "setDirectCandidates" | "setSelectedLevels" | "prevCandidatesRef">;
  transport: Pick<MusicTransportState, "setAlpha0" | "setAlpha7" | "setOriginMode">;
  burst: Pick<MusicBurstHighlightState, "setBurstHighlight" | "burstTimersRef">;
}

export function useMusicHuePaletteHandlers({
  engine,
  activeAlpha,
  resumeDrone,
  ensureAudio,
  sonificationLevels,
  palette,
  transport,
  burst,
}: UseMusicHuePaletteHandlersOptions) {
  const { setHueAngle, setDirectCandidates, setSelectedLevels, prevCandidatesRef } = palette;
  const { setAlpha0, setAlpha7, setOriginMode } = transport;
  const { setBurstHighlight, burstTimersRef } = burst;

  const triggerToneBurstAtActiveAlpha = useCallback(
    (lv: number, angle: number) => {
      engine.triggerToneBurst(lv, angle >= 0 ? angle + activeAlpha : angle);
    },
    [activeAlpha, engine],
  );

  const handleHueChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      engine.initAudio();
      resumeDrone();
      setHueAngle(Number(e.target.value));
      setDirectCandidates(new Map());
      setSelectedLevels(new Set());
    },
    [engine, resumeDrone, setDirectCandidates, setHueAngle, setSelectedLevels],
  );

  const handleAlphaBarChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      engine.initAudio();
      resumeDrone();
      const v = Number(e.target.value);
      setAlpha0(v);
      setAlpha7(v);
    },
    [engine, resumeDrone, setAlpha0, setAlpha7],
  );

  const handleBlockClick = useCallback(
    (lv: number, angle: number) => {
      ensureAudio();
      engine.initAudio();
      triggerToneBurstAtActiveAlpha(lv, angle);
      const prev = burstTimersRef.current.get(lv);
      if (prev) clearTimeout(prev);
      setBurstHighlight((s) => {
        const n = new Set(s);
        n.delete(lv);
        return n;
      });
      requestAnimationFrame(() => {
        setBurstHighlight((s) => new Set(s).add(lv));
        burstTimersRef.current.set(
          lv,
          setTimeout(() => {
            setBurstHighlight((s) => {
              const n = new Set(s);
              n.delete(lv);
              return n;
            });
            burstTimersRef.current.delete(lv);
          }, 20),
        );
      });
    },
    [burstTimersRef, engine, ensureAudio, setBurstHighlight, triggerToneBurstAtActiveAlpha],
  );

  useMusicKeyboardShortcuts(sonificationLevels, handleBlockClick);

  const handleLinkedHueAngleChange = useCallback(
    (a: number) => {
      engine.initAudio();
      resumeDrone();
      for (const lv of MUSIC_ACTIVE_LEVELS) {
        const ci = findClosestCandidate(lv, a);
        const prev = prevCandidatesRef.current.get(lv);
        if (prev !== undefined && prev !== ci) {
          const cand = LEVEL_CANDIDATES[lv][ci];
          if (cand && cand.angle >= 0) triggerToneBurstAtActiveAlpha(lv, cand.angle);
        }
        prevCandidatesRef.current.set(lv, ci);
      }
      setHueAngle(a);
      setDirectCandidates(new Map());
      setSelectedLevels(new Set());
    },
    [engine, prevCandidatesRef, resumeDrone, setDirectCandidates, setHueAngle, setSelectedLevels, triggerToneBurstAtActiveAlpha],
  );

  const handleAlpha0Change = useCallback(
    (a: number) => {
      engine.initAudio();
      resumeDrone();
      setAlpha0(a);
    },
    [engine, resumeDrone, setAlpha0],
  );

  const handleAlpha7Change = useCallback(
    (a: number) => {
      engine.initAudio();
      resumeDrone();
      setAlpha7(a);
    },
    [engine, resumeDrone, setAlpha7],
  );

  const handleOriginModeChange = useCallback(
    (mode: 0 | 7) => {
      resumeDrone();
      setOriginMode(mode);
    },
    [resumeDrone, setOriginMode],
  );

  return {
    handleHueChange,
    handleAlphaBarChange,
    handleBlockClick,
    handleLinkedHueAngleChange,
    handleAlpha0Change,
    handleAlpha7Change,
    handleOriginModeChange,
  };
}
