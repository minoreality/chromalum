import React, { useState, useCallback, useEffect, useRef } from "react";
import { CHROMALUM_CHANNEL_HEX } from "../../chromalum-color-model";
import { HAMMING_PARITY_GROUPS, positionBits } from "../../data/hamming-data";
import { useTranslation } from "../../i18n";
import { C, FS, FONT } from "../../styles/tokens";
import { ParityGrid } from "./ParityGrid";
import type { MusicEngineReturn } from "../../hooks/useMusicEngine";
import type { ActiveMusicLevel, DecoderPhase } from "../../music/types";
import { S_CARD_CONTROL_BTN, S_CARD_CONTROL_BTN_ACTIVE } from "./music-panel-styles";

interface ParityChordCardProps {
  engine: MusicEngineReturn;
  activeLevels: ActiveMusicLevel[];
  stopSignal: number;
  /** Syndrome-phase parity groups from ErrorCorrectionCard */
  errorPos: number;
  errorPhase: DecoderPhase;
}

const S_LABEL: React.CSSProperties = {
  fontSize: "var(--music-card-label-fs, 11px)",
  color: C.textDim,
  whiteSpace: "nowrap",
};

function parityGroupsFor(errorPos: number, errorPhase: DecoderPhase, activeParityGroup: 0 | 1 | 2 | null): (0 | 1 | 2)[] {
  if (errorPhase === "syndrome") {
    return ([0, 1, 2] as const).filter((bit) => (errorPos & (1 << bit)) !== 0);
  }
  return activeParityGroup !== null ? [activeParityGroup] : [];
}

const PARITY_ROWS = HAMMING_PARITY_GROUPS.map((group, index) => ({
  name: `P${group.parity}`,
  bit: index,
  set: `{${group.checks.map(positionBits).join(",")}}`,
  color: CHROMALUM_CHANNEL_HEX[group.channel],
  group: index as 0 | 1 | 2,
}));

export const ParityChordCard = React.memo(function ParityChordCard({
  engine,
  activeLevels,
  stopSignal,
  errorPos,
  errorPhase,
}: ParityChordCardProps) {
  const { t } = useTranslation();
  const [activeParityGroup, setActiveParityGroup] = useState<0 | 1 | 2 | null>(null);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setActiveParityGroup(null);
  }, [stopSignal]);

  const activeGroups = parityGroupsFor(errorPos, errorPhase, activeParityGroup);

  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handlePlay = useCallback(
    (group: 0 | 1 | 2) => {
      setActiveParityGroup(group);
      engine.initAudio();
      engine.playParityChord?.(group);
      // Each press lights its own full window; an earlier press's timer would
      // otherwise put this one out early.
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setActiveParityGroup(null), 500);
    },
    [engine],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--music-card-gap, 4px)", width: "100%", flex: 1 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--music-card-control-gap, 3px)", alignItems: "center" }}>
        <span style={S_LABEL}>{t("music_parity_title")}</span>
        <div style={{ display: "flex", gap: "var(--music-card-control-gap, 3px)", alignItems: "center" }}>
          {([0, 1, 2] as const).map((group) => (
            <button
              key={group}
              type="button"
              style={activeGroups.includes(group) ? S_CARD_CONTROL_BTN_ACTIVE : S_CARD_CONTROL_BTN}
              onClick={() => handlePlay(group)}
            >
              {t(group === 0 ? "music_parity_p1" : group === 1 ? "music_parity_p2" : "music_parity_p4")}
            </button>
          ))}
        </div>
      </div>
      <ParityGrid activeGroups={activeGroups} activeLevels={activeLevels} />
      <div style={{ fontSize: FS.xs, fontFamily: FONT.mono, color: C.textDim, lineHeight: 1.5, textAlign: "center" }}>
        {PARITY_ROWS.map((r) => {
          const active = activeGroups.includes(r.group);
          return (
            <div key={r.name} style={{ opacity: activeGroups.length === 0 || active ? 1 : 0.4 }}>
              <span style={{ color: r.color, fontWeight: active ? 700 : 400 }}>{r.name}</span>
              {`: bit${r.bit} = ${r.set}`}
            </div>
          );
        })}
      </div>
    </div>
  );
});
