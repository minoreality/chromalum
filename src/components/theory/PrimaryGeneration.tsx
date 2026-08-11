import React, { useState } from "react";
import { CHROMALUM_GRB_WEIGHTS, type ChromalumChannel } from "../../chromalum-color-model";
import { THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { C, FS, FW, SP, FONT, R } from "../../styles/tokens";

const CHANNELS = [
  { channel: "G", bitIndex: 0 },
  { channel: "R", bitIndex: 1 },
  { channel: "B", bitIndex: 2 },
] as const satisfies readonly { channel: ChromalumChannel; bitIndex: number }[];

const G = CHROMALUM_GRB_WEIGHTS.G;
const R_WEIGHT = CHROMALUM_GRB_WEIGHTS.R;
const B = CHROMALUM_GRB_WEIGHTS.B;

const GENERATION_LAYERS = [
  { count: 0, levels: [0] },
  { count: 1, levels: [G, R_WEIGHT, B] },
  { count: 2, levels: [G | R_WEIGHT, G | B, R_WEIGHT | B] },
  { count: 3, levels: [G | R_WEIGHT | B] },
] as const;

const S_CARD: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${C.border}`,
  borderRadius: R["2xl"],
  background: C.bgPanelAlt,
  padding: SP["3xl"],
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: SP.xl,
};

const S_LABEL: React.CSSProperties = {
  margin: 0,
  color: C.textMuted,
  fontFamily: FONT.mono,
  fontSize: FS.sm,
  fontWeight: FW.bold,
  textAlign: "center",
};

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
  mode?: "all" | "generation" | "toggle";
}

export const PrimaryGeneration = React.memo(function PrimaryGeneration({ hlLevel, onHover, mode = "all" }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(G | R_WEIGHT);
  const [state, setState] = useState(R_WEIGHT);
  const [toggleChannel, setToggleChannel] = useState<ChromalumChannel>("G");

  const selectedChannels = CHANNELS.filter(({ channel }) => (selected & CHROMALUM_GRB_WEIGHTS[channel]) !== 0);
  const selectedInfo = THEORY_LEVELS[selected];
  const toggle = CHANNELS.find(({ channel }) => channel === toggleChannel)!;
  const toggleWeight = CHROMALUM_GRB_WEIGHTS[toggleChannel];
  const stateInfo = THEORY_LEVELS[state];
  const result = state ^ toggleWeight;
  const fromBit = stateInfo.bits[toggle.bitIndex];
  const delta = result - state;

  const toggleGenerator = (channel: ChromalumChannel) => {
    const weight = CHROMALUM_GRB_WEIGHTS[channel];
    setSelected((current) => ((current & weight) !== 0 ? current & ~weight : current | weight));
  };

  return (
    <div style={{ width: "100%", maxWidth: 620, display: "flex", flexDirection: "column", alignItems: "center", gap: SP.xl }}>
      {mode !== "toggle" && (
        <div style={S_CARD}>
          <h4 style={S_LABEL}>{t("theory_generation_select")}</h4>

          <div
            role="group"
            aria-label={t("theory_generation_select_aria")}
            style={{ display: "flex", justifyContent: "center", gap: SP["2xl"], flexWrap: "wrap" }}
          >
            {CHANNELS.map(({ channel }) => {
              const level = CHROMALUM_GRB_WEIGHTS[channel];
              const info = THEORY_LEVELS[level];
              const active = (selected & level) !== 0;
              return (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={active}
                  aria-label={t("theory_generation_primary_aria", channel, info.bits.join(""), level)}
                  onClick={() => toggleGenerator(channel)}
                  onMouseEnter={() => onHover(level)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(level)}
                  onBlur={() => onHover(null)}
                  style={{
                    width: 76,
                    minHeight: 52,
                    borderRadius: R.xl,
                    border: active ? "2px solid #fff" : `1px solid ${C.borderHover}`,
                    background: active ? info.color : C.bgInput,
                    color: active && level >= G ? "#000" : active ? "#fff" : info.color,
                    opacity: active ? 1 : 0.68,
                    cursor: "pointer",
                    fontFamily: FONT.mono,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: SP.xs,
                  }}
                >
                  <span style={{ fontSize: FS["2xl"], fontWeight: FW.bold }}>{channel}</span>
                  <span style={{ fontSize: FS.xs }}>
                    {info.bits.join("")} · {level}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            data-testid="generation-equation"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: SP.xl, flexWrap: "wrap", fontFamily: FONT.mono }}
          >
            <span style={{ color: C.textMuted, fontSize: FS.xl }}>
              {selectedChannels.length === 0 ? "∅" : selectedChannels.map(({ channel }) => channel).join(" ∨ ")}
            </span>
            <span style={{ color: C.textDimmer, fontSize: FS.xl }}>→</span>
            <ColorBadge level={selected} highlighted={hlLevel === selected} onHover={onHover} />
            <span style={{ color: C.textMuted, fontSize: FS.sm }}>
              {selectedChannels.length === 0 ? "0" : selectedChannels.map(({ channel }) => CHROMALUM_GRB_WEIGHTS[channel]).join("+")}=
              {selectedInfo.lv}
            </span>
          </div>

          <div
            data-testid="generation-layers"
            aria-label={t("theory_generation_layers_aria")}
            style={{ width: "100%", maxWidth: 460, display: "grid", gridTemplateColumns: "88px minmax(0, 1fr)", gap: SP.md }}
          >
            {GENERATION_LAYERS.map(({ count, levels }) => (
              <React.Fragment key={count}>
                <div style={{ color: C.textDimmer, fontFamily: FONT.mono, fontSize: FS.xs, alignSelf: "center", textAlign: "right" }}>
                  {t(`theory_generation_layer_${count}`)}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: SP.lg, flexWrap: "wrap" }}>
                  {levels.map((level) => (
                    <ColorBadge key={level} level={level} compact highlighted={hlLevel === level} onHover={onHover} />
                  ))}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {mode !== "generation" && (
        <div style={S_CARD}>
          <h4 style={S_LABEL}>{t("theory_toggle_title")}</h4>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: SP.md }}>
            <div style={{ color: C.textDimmer, fontFamily: FONT.mono, fontSize: FS.xs }}>{t("theory_toggle_state")}</div>
            <div
              role="group"
              aria-label={t("theory_toggle_state_aria")}
              style={{ display: "flex", gap: SP.sm, justifyContent: "center", flexWrap: "wrap" }}
            >
              {THEORY_LEVELS.map((level) => (
                <LevelButton key={level.lv} level={level.lv} active={state === level.lv} onSelect={setState} onHover={onHover} />
              ))}
            </div>
          </div>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: SP.md }}>
            <div style={{ color: C.textDimmer, fontFamily: FONT.mono, fontSize: FS.xs }}>{t("theory_toggle_channel")}</div>
            <div
              role="group"
              aria-label={t("theory_toggle_channel_aria")}
              style={{ display: "flex", gap: SP["2xl"], justifyContent: "center", flexWrap: "wrap" }}
            >
              {CHANNELS.map(({ channel }) => {
                const weight = CHROMALUM_GRB_WEIGHTS[channel];
                const active = toggleChannel === channel;
                return (
                  <button
                    key={channel}
                    type="button"
                    aria-pressed={active}
                    aria-label={t("theory_toggle_channel_button_aria", channel, weight)}
                    onClick={() => setToggleChannel(channel)}
                    style={{
                      minWidth: 72,
                      padding: `${SP.lg}px ${SP.xl}px`,
                      borderRadius: R.xl,
                      border: active ? `1px solid ${C.accentBright}` : `1px solid ${C.border}`,
                      background: active ? C.activeBg : C.bgInput,
                      color: active ? C.accentBright : C.textMuted,
                      cursor: "pointer",
                      fontFamily: FONT.mono,
                      fontSize: FS.sm,
                    }}
                  >
                    e_{channel} · {THEORY_LEVELS[weight].bits.join("")} · w={weight}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            data-testid="primary-toggle-transition"
            role="group"
            aria-label={t("theory_toggle_transition_aria")}
            style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: SP.lg }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: SP.xl, flexWrap: "wrap" }}>
              <ColorBadge level={state} highlighted={hlLevel === state} onHover={onHover} />
              <div style={{ minWidth: 96, textAlign: "center", color: C.accentBright, fontFamily: FONT.mono, fontSize: FS.sm }}>
                {toggleChannel}: {fromBit}→{1 - fromBit}
                <div style={{ color: C.textDimmer, fontSize: FS.xs, marginTop: SP.xs }}>x′=x⊕e_{toggleChannel}</div>
              </div>
              <span aria-hidden="true" style={{ color: C.textDimmer, fontSize: FS.xl }}>
                →
              </span>
              <ColorBadge level={result} highlighted={hlLevel === result} onHover={onHover} />
            </div>

            <div
              style={{
                width: "100%",
                maxWidth: 430,
                fontFamily: FONT.mono,
                textAlign: "center",
                color: C.textMuted,
                fontSize: FS.sm,
              }}
            >
              L: {state}→{result}
              <span aria-hidden="true" style={{ color: C.textDimmer, margin: `0 ${SP.md}px` }}>
                ·
              </span>
              <span style={{ color: C.accentBright }}>ΔL: {formatSigned(delta)}</span>
              <span aria-hidden="true" style={{ color: C.textDimmer, margin: `0 ${SP.md}px` }}>
                ·
              </span>
              |ΔL|: w_{toggleChannel}={toggleWeight}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

function ColorBadge({
  level,
  compact = false,
  highlighted = false,
  onHover,
}: {
  level: number;
  compact?: boolean;
  highlighted?: boolean;
  onHover?: (lv: number | null) => void;
}) {
  const info = THEORY_LEVELS[level];
  return (
    <span
      data-level={level}
      onMouseEnter={() => onHover?.(level)}
      onMouseLeave={() => onHover?.(null)}
      style={{
        minWidth: compact ? 54 : 76,
        minHeight: compact ? 26 : 38,
        boxSizing: "border-box",
        padding: compact ? `${SP.xs}px ${SP.md}px` : `${SP.md}px ${SP.lg}px`,
        borderRadius: R.xl,
        border: highlighted ? "2px solid #fff" : `1px solid ${level === 0 ? C.borderHover : info.color}`,
        background: level === 0 ? C.bgRoot : info.color,
        color: level >= G ? "#000" : "#fff",
        display: "inline-flex",
        flexDirection: compact ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? SP.md : 0,
        fontFamily: FONT.mono,
        fontWeight: FW.bold,
        fontSize: compact ? FS.xs : FS.sm,
      }}
    >
      <span>{info.short}</span>
      <span style={{ fontSize: FS.xs, opacity: 0.78 }}>{info.bits.join("")}</span>
    </span>
  );
}

function LevelButton({
  level,
  active,
  onSelect,
  onHover,
}: {
  level: number;
  active: boolean;
  onSelect: (level: number) => void;
  onHover: (lv: number | null) => void;
}) {
  const { t } = useTranslation();
  const info = THEORY_LEVELS[level];
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={t("theory_toggle_state_button_aria", info.name, info.bits.join(""), level)}
      onClick={() => onSelect(level)}
      onMouseEnter={() => onHover(level)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(level)}
      onBlur={() => onHover(null)}
      style={{
        minWidth: 48,
        minHeight: 40,
        padding: 0,
        borderRadius: R.lg,
        border: active ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)",
        background: level === 0 ? C.bgRoot : info.color,
        color: level >= G ? "#000" : "#fff",
        opacity: active ? 1 : 0.52,
        cursor: "pointer",
        fontFamily: FONT.mono,
        fontWeight: FW.bold,
        fontSize: FS.xs,
      }}
    >
      <span style={{ display: "block" }}>{info.bits.join("")}</span>
      <span style={{ display: "block", fontSize: FS.xxs, opacity: 0.75 }}>
        {info.short}·L{level}
      </span>
    </button>
  );
}

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value).replace("-", "−");
}
