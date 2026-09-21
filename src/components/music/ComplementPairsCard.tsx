import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSyncRef } from "../../hooks/useSyncRef";
import { useTranslation } from "../../i18n";
import { C, SP } from "../../styles/tokens";
import { ComplementPairs } from "./ComplementPairs";
import type { MusicEngineReturn } from "../../hooks/useMusicEngine";
import { S_CARD_CONTROL_BTN, S_CARD_CONTROL_BTN_ACTIVE } from "./music-panel-styles";

interface Props {
  engine: MusicEngineReturn;
  stopSignal: number;
}

const S_COL: React.CSSProperties = { display: "flex", flexDirection: "column", gap: SP.sm, alignItems: "center" };
const S_LABEL: React.CSSProperties = { fontSize: "var(--music-card-label-fs, 11px)", color: C.textDim, whiteSpace: "nowrap" };

type Direction = "forward" | "reverse" | null;

export const ComplementPairsCard = React.memo(function ComplementPairsCard({ engine, stopSignal }: Props) {
  const { t } = useTranslation();
  const [activePair, setActivePair] = useState(-1);
  const [playing, setPlaying] = useState<Direction>(null);

  const stopLoop = useCallback(() => {
    engine.stopAlgebra?.();
    setActivePair(-1);
    setPlaying(null);
  }, [engine]);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setActivePair(-1);
    setPlaying(null);
  }, [stopSignal]);

  // The canon's repeat lives on the engine's algebra timers now, so leaving
  // takes it with us only while we are the ones playing it.
  const playingRef = useSyncRef(playing);
  const stopAlgebra = engine.stopAlgebra;
  useEffect(
    () => () => {
      if (playingRef.current) stopAlgebra?.();
    },
    [playingRef, stopAlgebra],
  );

  const handleClick = useCallback(
    (reverse: boolean) => {
      const dir: Direction = reverse ? "reverse" : "forward";
      if (playing === dir) {
        stopLoop();
        return;
      }
      engine.initAudio();
      engine.playComplementCanon?.(
        (idx, phase) => {
          setActivePair(idx);
          if (!phase) setActivePair(-1);
        },
        reverse,
        true,
        () => setPlaying(null),
      );
      setPlaying(dir);
    },
    [engine, playing, stopLoop],
  );

  const fwdLabel = playing === "forward" ? t("music_complement_stop") : t("music_complement_play");
  const revLabel = playing === "reverse" ? t("music_complement_stop") : t("music_complement_play_reverse");

  return (
    <div
      data-testid="complement-pairs-card"
      style={{ display: "flex", flexDirection: "column", gap: "var(--music-card-gap, 4px)", width: "100%", flex: 1 }}
    >
      <div style={{ ...S_COL, gap: "var(--music-card-control-gap, 3px)" }}>
        <span style={S_LABEL}>{t("music_complement_title")}</span>
        <button
          type="button"
          style={playing === "forward" ? S_CARD_CONTROL_BTN_ACTIVE : S_CARD_CONTROL_BTN}
          onClick={() => handleClick(false)}
        >
          {fwdLabel}
        </button>
        <button
          type="button"
          style={playing === "reverse" ? S_CARD_CONTROL_BTN_ACTIVE : S_CARD_CONTROL_BTN}
          onClick={() => handleClick(true)}
        >
          {revLabel}
        </button>
      </div>
      <ComplementPairs activePair={activePair} />
    </div>
  );
});
