import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "../../i18n";
import { C, SP } from "../../styles/tokens";
import { ZigzagGraph } from "./ZigzagGraph";
import type { MusicEngineReturn } from "../../hooks/useMusicEngine";
import { S_CARD_CONTROL_BTN, S_CARD_CONTROL_BTN_ACTIVE } from "./music-panel-styles";

interface Props {
  engine: MusicEngineReturn;
  stopSignal: number;
}

const S_COL: React.CSSProperties = { display: "flex", flexDirection: "column", gap: SP.sm, alignItems: "center" };
const S_LABEL: React.CSSProperties = { fontSize: "var(--music-card-label-fs, 11px)", color: C.textDim, whiteSpace: "nowrap" };
const S_HEADER: React.CSSProperties = {
  ...S_COL,
  gap: "var(--music-card-control-gap, 3px)",
  flex: "0 0 var(--music-card-header-size, 38px)",
  justifyContent: "flex-start",
};
const S_BUTTON_ROW: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "var(--music-card-control-gap, 3px)",
  width: "100%",
};
const S_TOGGLE_BTN: React.CSSProperties = {
  ...S_CARD_CONTROL_BTN,
  width: "var(--music-card-toggle-width, 70px)",
};
const S_TOGGLE_BTN_ACTIVE: React.CSSProperties = {
  ...S_CARD_CONTROL_BTN_ACTIVE,
  width: "var(--music-card-toggle-width, 70px)",
};

type ZigzagPlaybackMode = "vertices" | "crossings";

export const ZigzagCard = React.memo(function ZigzagCard({ engine, stopSignal }: Props) {
  const { t } = useTranslation();
  const [zigzagStep, setZigzagStep] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<ZigzagPlaybackMode | null>(null);
  const [graphMode, setGraphMode] = useState<ZigzagPlaybackMode>("vertices");

  const stopPlayback = useCallback(() => {
    engine.stopZigzagMelody?.();
    engine.stopToneCrossingMelody?.();
    setActiveMode(null);
    setZigzagStep(null);
  }, [engine]);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setActiveMode(null);
    setZigzagStep(null);
  }, [stopSignal]);

  const handleToggle = useCallback(
    (mode: ZigzagPlaybackMode) => {
      if (activeMode === mode) {
        stopPlayback();
        return;
      }

      if (activeMode !== null) {
        stopPlayback();
      }

      setGraphMode(mode);
      setZigzagStep(null);
      engine.initAudio();
      setActiveMode(mode);
      if (mode === "vertices") {
        engine.playZigzagMelody?.((step) => setZigzagStep(step));
      } else {
        engine.playToneCrossingMelody?.((step) => setZigzagStep(step));
      }
    },
    [activeMode, engine, stopPlayback],
  );

  return (
    <div
      data-testid="tone-zigzag-card"
      style={{ display: "flex", flexDirection: "column", gap: "var(--music-card-gap, 4px)", width: "100%", flex: 1 }}
    >
      <div style={S_HEADER}>
        <span style={S_LABEL}>{t("music_zigzag_title")}</span>
        <div style={S_BUTTON_ROW}>
          <button
            type="button"
            style={activeMode === "vertices" ? S_TOGGLE_BTN_ACTIVE : S_TOGGLE_BTN}
            onClick={() => handleToggle("vertices")}
          >
            {activeMode === "vertices" ? t("music_zigzag_stop") : t("music_zigzag_play")}
          </button>
          <button
            type="button"
            style={activeMode === "crossings" ? S_TOGGLE_BTN_ACTIVE : S_TOGGLE_BTN}
            onClick={() => handleToggle("crossings")}
          >
            {activeMode === "crossings" ? t("music_crossing_stop") : t("music_crossing_play")}
          </button>
        </div>
      </div>
      <ZigzagGraph currentStep={zigzagStep} mode={graphMode} />
    </div>
  );
});
