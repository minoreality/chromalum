import React from "react";
import { CHROMALUM_GRB_WEIGHTS } from "../../chromalum-color-model";
import { THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { C, FS, FW, SP, FONT, R } from "../../styles/tokens";

const G = CHROMALUM_GRB_WEIGHTS.G;
const R_WEIGHT = CHROMALUM_GRB_WEIGHTS.R;
const B = CHROMALUM_GRB_WEIGHTS.B;

const PATTERN_LAYERS = [
  { count: 1, levels: [G, R_WEIGHT, B] },
  { count: 2, levels: [G | R_WEIGHT, G | B, R_WEIGHT | B] },
  { count: 3, levels: [G | R_WEIGHT | B] },
] as const;

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

export const TogglePatternBridge = React.memo(function TogglePatternBridge({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("theory_toggle_patterns_aria")}
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
        gap: SP["2xl"],
      }}
    >
      <div style={{ color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.sm, textAlign: "center" }}>
        τ<sub>c</sub>²=id&nbsp;&nbsp;·&nbsp;&nbsp;τ<sub>c</sub>τ<sub>d</sub>=τ<sub>d</sub>τ<sub>c</sub>
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: SP.xl,
        }}
      >
        {PATTERN_LAYERS.map(({ count, levels }) => (
          <div
            key={count}
            data-testid={`toggle-pattern-layer-${count}`}
            style={{
              flex: "1 1 150px",
              maxWidth: 190,
              minWidth: 0,
              border: `1px solid ${C.border}`,
              borderRadius: R.xl,
              background: C.bgCode,
              padding: SP.xl,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: SP.lg,
            }}
          >
            <div style={{ color: C.textDimmer, fontFamily: FONT.mono, fontSize: FS.xs, textAlign: "center" }}>
              {t(`theory_toggle_patterns_layer_${count}`)}
            </div>
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                gap: SP.md,
                flexWrap: "nowrap",
              }}
            >
              {levels.map((level) => (
                <PatternChip key={level} level={level} highlighted={hlLevel === level} onHover={onHover} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          alignItems: "center",
          gap: SP.xl,
          fontFamily: FONT.mono,
          fontSize: FS.sm,
          textAlign: "center",
        }}
      >
        <div style={{ color: C.textMuted, border: `1px solid ${C.borderAccent}`, borderRadius: R.lg, padding: SP.xl }}>
          {t("theory_toggle_patterns_fano")}
        </div>
        <span aria-hidden="true" style={{ color: C.accentBright }}>
          ⇄
        </span>
        <div style={{ color: C.textMuted, border: `1px solid ${C.borderAccent}`, borderRadius: R.lg, padding: SP.xl }}>
          {t("theory_toggle_patterns_hamming")}
        </div>
      </div>
    </div>
  );
});

function PatternChip({ level, highlighted, onHover }: { level: number; highlighted: boolean; onHover: (lv: number | null) => void }) {
  const { t } = useTranslation();
  const info = THEORY_LEVELS[level];
  const factors = ["G", "R", "B"].filter((_, index) => info.bits[index] === 1);
  const factorText = factors.map((channel) => `τ${channel}`).join("");

  return (
    <div
      data-testid={`toggle-pattern-${level}`}
      aria-label={t("theory_toggle_pattern_aria", info.name, info.bits.join(""), factors.join("+"))}
      onMouseEnter={() => onHover(level)}
      onMouseLeave={() => onHover(null)}
      style={{
        minWidth: 0,
        flex: "1 1 0",
        maxWidth: 64,
        border: highlighted ? "2px solid #fff" : `1px solid ${info.color}`,
        borderRadius: R.lg,
        background: C.bgInput,
        padding: `${SP.md}px ${SP.md}px`,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: SP.xs,
        fontFamily: FONT.mono,
      }}
    >
      <span style={{ color: info.color, fontWeight: FW.bold, fontSize: FS.sm, whiteSpace: "nowrap" }}>
        {info.short} · {info.bits.join("")}
      </span>
      <span style={{ color: C.textDimmer, fontSize: FS.xs, whiteSpace: "nowrap" }}>{factorText}</span>
    </div>
  );
}
