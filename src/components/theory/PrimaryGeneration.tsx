import React, { useCallback, useId, useState } from "react";
import { CHROMALUM_GRB_WEIGHTS, type ChromalumChannel } from "../../chromalum-color-model";
import { THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { C, FS, FW, SP, FONT, R } from "../../styles/tokens";
import { levelLabelColor } from "../../color-engine";

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
  diagram?: (selection: { selectedLevel: number; onSelect: (level: number) => void }) => React.ReactNode;
}

export const PrimaryGeneration = React.memo(function PrimaryGeneration({ hlLevel, onHover, mode = "all", diagram }: Props) {
  const { t } = useTranslation();
  const resultId = useId();
  const [selected, setSelected] = useState(0);
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

  const selectState = useCallback((level: number) => setSelected(level), []);
  const toggleGenerator = (channel: ChromalumChannel) => {
    const weight = CHROMALUM_GRB_WEIGHTS[channel];
    const next = (selected & weight) !== 0 ? selected & ~weight : selected | weight;
    selectState(next);
    onHover(next);
  };

  return (
    <div
      className="theory-generation-surface"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: SP.xl,
      }}
    >
      {mode !== "toggle" && (
        <div className={`theory-generation${diagram ? " theory-generation-with-diagram" : ""}`} data-testid="primary-generation">
          <div className="theory-generation-builder">
            <div className="theory-generation-heading">
              <span className="theory-generation-heading-long">{t("theory_generation_select")}</span>
              <span className="theory-generation-heading-short">{t("theory_generation_select_short")}</span>
            </div>
            <div role="group" aria-label={t("theory_generation_select_aria")} className="theory-generation-inputs">
              {CHANNELS.map(({ channel }) => {
                const level = CHROMALUM_GRB_WEIGHTS[channel];
                const info = THEORY_LEVELS[level];
                const active = (selected & level) !== 0;
                return (
                  <button
                    key={channel}
                    type="button"
                    className="theory-generation-primary"
                    data-highlighted={hlLevel === level}
                    aria-pressed={active}
                    aria-controls={resultId}
                    aria-label={t("theory_generation_primary_aria", channel, info.bits.join(""))}
                    onClick={() => toggleGenerator(channel)}
                    onMouseEnter={() => onHover(level)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(level)}
                    onBlur={() => onHover(null)}
                  >
                    <span className="theory-generation-primary-label">
                      <span className="theory-generation-swatch" style={{ background: info.color }} aria-hidden="true" />
                      {channel}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              id={resultId}
              data-testid="generation-equation"
              className="theory-generation-result"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              onMouseEnter={() => onHover(selected)}
              onMouseLeave={() => onHover(null)}
            >
              <span className="theory-generation-preview" style={{ background: selectedInfo.color }} aria-hidden="true" />
              <div>
                <div className="theory-generation-result-label">{t("theory_generation_result")}</div>
                <div className="theory-generation-result-value" data-generation-result={selected}>
                  <strong>{selectedInfo.short}</strong>
                  <span>{selectedInfo.bits.join("")}</span>
                </div>
              </div>
              <div className="theory-generation-formula">
                <span>
                  {`{${selectedChannels.map(({ channel }) => channel).join(",")}}`} → {selectedInfo.short}
                </span>
              </div>
            </div>
          </div>
          {diagram && (
            <div
              className="theory-generation-diagram"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("svg, button")) return;
                selectState(0);
                onHover(null);
              }}
            >
              {diagram({ selectedLevel: selected, onSelect: selectState })}
            </div>
          )}
          <div className="theory-generation-states">
            <div className="theory-generation-heading">
              <span className="theory-generation-heading-long">{t("theory_generation_states_title")}</span>
              <span className="theory-generation-heading-short">{t("theory_generation_states_short")}</span>
            </div>
            <div
              data-testid="generation-layers"
              role="group"
              aria-label={t("theory_generation_layers_aria")}
              className="theory-generation-layers"
            >
              {GENERATION_LAYERS.map(({ count, levels }) => (
                <div key={count} className="theory-generation-layer" role="group" aria-label={t(`theory_generation_layer_${count}`)}>
                  <div className="theory-generation-layer-states">
                    {levels.map((level) => {
                      const info = THEORY_LEVELS[level];
                      return (
                        <button
                          key={level}
                          type="button"
                          className="theory-generation-state"
                          data-level={level}
                          data-highlighted={hlLevel === level}
                          aria-pressed={selected === level}
                          aria-controls={resultId}
                          aria-label={t("theory_generation_state_aria", info.short, info.bits.join(""))}
                          style={{ gridColumn: levels.length === 1 ? 2 : undefined }}
                          onClick={() => {
                            selectState(level);
                            onHover(level);
                          }}
                          onMouseEnter={() => onHover(level)}
                          onMouseLeave={() => onHover(null)}
                          onFocus={() => onHover(level)}
                          onBlur={() => onHover(null)}
                        >
                          <span className="theory-generation-state-name">
                            <span className="theory-generation-swatch" style={{ background: info.color }} aria-hidden="true" />
                            {info.short}
                          </span>
                          <span>{info.bits.join("")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode !== "generation" && (
        <div style={S_CARD}>
          <div style={S_LABEL}>{t("theory_toggle_title")}</div>

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
        color: levelLabelColor(level),
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
        color: levelLabelColor(level),
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
