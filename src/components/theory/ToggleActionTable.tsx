import React, { useState } from "react";
import { THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { C, FS, FW, SP, FONT, R } from "../../styles/tokens";
import { CayleyTable } from "./CayleyTable";

const MASK_GROUPS = [
  { count: 0, masks: [0] },
  { count: 1, masks: [1, 2, 4] },
  { count: 2, masks: [3, 5, 6] },
  { count: 3, masks: [7] },
] as const;

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

export const ToggleActionTable = React.memo(function ToggleActionTable({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState(6);
  const stateInfo = THEORY_LEVELS[state];

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: SP["3xl"] }}>
      <div
        role="group"
        aria-label={t("theory_toggle_table_guide_aria")}
        style={{
          width: "100%",
          maxWidth: 620,
          boxSizing: "border-box",
          border: `1px solid ${C.border}`,
          borderRadius: R["2xl"],
          background: C.bgPanelAlt,
          padding: SP["3xl"],
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: SP.xl,
        }}
      >
        <div style={{ color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.sm, fontWeight: FW.bold }}>
          {t("theory_toggle_table_guide")}
        </div>
        <div style={{ color: C.textDimmer, fontFamily: FONT.mono, fontSize: FS.xs }}>{t("theory_toggle_table_choose_state")}</div>

        <div style={{ display: "flex", gap: SP.sm, justifyContent: "center", flexWrap: "wrap" }}>
          {THEORY_LEVELS.map((level) => {
            const active = state === level.lv;
            return (
              <button
                key={level.lv}
                type="button"
                aria-pressed={active}
                aria-label={`${level.name} ${level.bits.join("")} L${level.lv}`}
                onClick={() => setState(level.lv)}
                onMouseEnter={() => onHover(level.lv)}
                onMouseLeave={() => onHover(null)}
                style={{
                  minWidth: 48,
                  padding: `${SP.md}px ${SP.lg}px`,
                  borderRadius: R.xl,
                  border: active || hlLevel === level.lv ? "2px solid #fff" : `1px solid ${C.borderHover}`,
                  background: level.lv === 0 ? C.bgRoot : level.color,
                  color: level.lv >= 4 ? "#000" : "#fff",
                  opacity: active ? 1 : 0.5,
                  cursor: "pointer",
                  fontFamily: FONT.mono,
                  fontSize: FS.xs,
                  fontWeight: FW.bold,
                }}
              >
                {level.bits.join("")}
                <span style={{ display: "block", fontSize: FS.xxs, opacity: 0.75 }}>
                  {level.short}·L{level.lv}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ color: C.textMuted, fontFamily: FONT.mono, fontSize: FS.sm }}>
          x={stateInfo.bits.join("")} · {stateInfo.short} · L{stateInfo.lv}
        </div>

        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: SP.lg }}>
          {MASK_GROUPS.map(({ count, masks }) => (
            <div
              key={count}
              style={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: SP.md,
                border: `1px solid ${C.border}`,
                borderRadius: R.xl,
                background: C.bgCode,
                padding: SP.lg,
              }}
            >
              <div style={{ color: C.textDimmer, fontFamily: FONT.mono, fontSize: FS.xxs, textAlign: "center" }}>
                {t(`theory_toggle_table_mask_group_${count}`)}
              </div>
              {masks.map((mask) => (
                <TransitionTile key={mask} state={state} mask={mask} onHover={onHover} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.sm, fontWeight: FW.bold, textAlign: "center" }}>
        {t("theory_toggle_table_complete")}
      </div>
      <CayleyTable hlLevel={hlLevel} onHover={onHover} />
    </div>
  );
});

function TransitionTile({ state, mask, onHover }: { state: number; mask: number; onHover: (lv: number | null) => void }) {
  const maskInfo = THEORY_LEVELS[mask];
  const result = state ^ mask;
  const resultInfo = THEORY_LEVELS[result];
  const factors =
    mask === 0
      ? "id"
      : ["G", "R", "B"]
          .filter((_, index) => maskInfo.bits[index] === 1)
          .map((c) => `τ${c}`)
          .join("");

  return (
    <div
      data-mask={mask}
      data-result={result}
      onMouseEnter={() => onHover(result)}
      onMouseLeave={() => onHover(null)}
      style={{
        border: `1px solid ${mask === 0 ? C.borderHover : maskInfo.color}`,
        borderRadius: R.lg,
        padding: SP.md,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: SP.xs,
        fontFamily: FONT.mono,
        textAlign: "center",
      }}
    >
      <span style={{ color: C.textDimmer, fontSize: FS.xxs }}>
        m={maskInfo.bits.join("")} · {factors}
      </span>
      <span style={{ color: C.textMuted, fontSize: FS.xs }}>
        {THEORY_LEVELS[state].bits.join("")}→{resultInfo.bits.join("")}
      </span>
      <span style={{ color: result === 0 ? C.textMuted : resultInfo.color, fontWeight: FW.bold, fontSize: FS.xs }}>
        {resultInfo.short} · L{result}
      </span>
    </div>
  );
}
