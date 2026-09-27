import React from "react";
import { THEORY_LEVELS, GRAY_PATH, GRAY_TOGGLES, GRAY_POINTS } from "../../data/theory-data";
import { C } from "../../styles/tokens";
import { useTranslation } from "../../i18n";
import { levelLabelColor } from "../../color-engine";
import { HUE_CYCLE_NAME, hueCycleDeltaDescription, hueCycleDeltaLabel, hueCycleStage } from "./hue-cycle-label";

const W = 300,
  H = 300;
const VIEWBOX_INSET = 16;
const DOT_R = 16;
const NODE_HIT_R = 18;
const EDGE_LABEL_OFFSET = 22;
const CHANNEL_COLORS = { G: "#00d848", R: "#ff4050", B: "#5470ff" } as const;

interface Props {
  selectedEdge: number | null;
  currentLevel: number | null;
  onSelectStart: ((level: number) => void) | null;
  direction: 1 | -1;
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
  controls?: React.ReactNode;
}

export const GrayCodeHex = React.memo(function GrayCodeHex({
  selectedEdge,
  currentLevel,
  onSelectStart,
  direction,
  hlLevel,
  onHover,
  controls,
}: Props) {
  const { t } = useTranslation();
  const transition =
    selectedEdge === null
      ? null
      : {
          from: GRAY_PATH[direction === 1 ? selectedEdge : (selectedEdge + 1) % GRAY_PATH.length],
          to: GRAY_PATH[direction === 1 ? (selectedEdge + 1) % GRAY_PATH.length : selectedEdge],
          channel: GRAY_TOGGLES[selectedEdge],
        };
  const isAdding = transition !== null && transition.to > transition.from;
  const toggleIndex = transition?.channel === "G" ? 0 : transition?.channel === "R" ? 1 : 2;
  const stage = hueCycleStage(currentLevel, selectedEdge);
  const cycleName = HUE_CYCLE_NAME[stage];

  return (
    <div className="theory-hue-cycle">
      <div className="theory-diagram-label" data-hue-cycle-name={cycleName} lang="en" title={t("theory_gray_title")}>
        {cycleName}
      </div>
      <div className="theory-hue-cycle-plot">
        <svg
          viewBox={`${VIEWBOX_INSET} ${VIEWBOX_INSET} ${W - 2 * VIEWBOX_INSET} ${H - 2 * VIEWBOX_INSET}`}
          className="theory-hue-cycle-svg"
          role="group"
          aria-label={t("theory_gray_title")}
          onClick={(event) => event.stopPropagation()}
          style={{ cursor: "default" }}
        >
          {/* Edges */}
          {GRAY_PATH.map((lv, i) => {
            const nLv = GRAY_PATH[(i + 1) % 6];
            const p0 = GRAY_POINTS[lv],
              p1 = GRAY_POINTS[nLv];
            const tg = GRAY_TOGGLES[i];
            const tgColor = CHANNEL_COLORS[tg];
            const isCurrentEdge = i === selectedEdge;
            const delta = (nLv - lv) * direction;
            const deltaLabel = hueCycleDeltaLabel(delta, stage, isCurrentEdge);
            const midpointX = (p0.x + p1.x) / 2;
            const midpointY = (p0.y + p1.y) / 2;
            const outwardAngle = Math.atan2(midpointY - H / 2, midpointX - W / 2);
            return (
              <g
                key={"ge" + i}
                data-cycle-edge={i}
                data-hue-selected={isCurrentEdge}
                role="img"
                aria-current={isCurrentEdge ? "step" : undefined}
                aria-label={THEORY_LEVELS[lv].short + "–" + THEORY_LEVELS[nLv].short}
                aria-description={hueCycleDeltaDescription(delta, stage, isCurrentEdge)}
              >
                <line
                  x1={p0.x}
                  y1={p0.y}
                  x2={p1.x}
                  y2={p1.y}
                  stroke={isCurrentEdge ? tgColor : C.textDimmer}
                  strokeWidth={isCurrentEdge ? 3 : 1.5}
                  opacity={isCurrentEdge ? 1 : 0.45}
                />
                <text
                  data-cycle-delta={i}
                  x={midpointX + EDGE_LABEL_OFFSET * Math.cos(outwardAngle)}
                  y={midpointY + EDGE_LABEL_OFFSET * Math.sin(outwardAngle)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={16}
                  fontWeight={700}
                  fontFamily="var(--font-mono)"
                  fill={isCurrentEdge ? tgColor : C.textDimmer}
                  aria-hidden="true"
                >
                  {deltaLabel}
                </text>
              </g>
            );
          })}

          {/* Direction arrow */}
          {(() => {
            if (!transition) return null;
            const p0 = GRAY_POINTS[transition.from],
              p1 = GRAY_POINTS[transition.to];
            const mx = (p0.x + p1.x) / 2,
              my = (p0.y + p1.y) / 2;
            const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            const s = 8;
            return (
              <polygon
                points={`${mx},${my} ${mx - s * Math.cos(angle - 0.5)},${my - s * Math.sin(angle - 0.5)} ${mx - s * Math.cos(angle + 0.5)},${my - s * Math.sin(angle + 0.5)}`}
                fill={CHANNEL_COLORS[transition.channel]}
                pointerEvents="none"
              />
            );
          })()}

          {/* Vertices */}
          {GRAY_PATH.map((lv) => {
            const p = GRAY_POINTS[lv];
            const info = THEORY_LEVELS[lv];
            const isCurrent = lv === currentLevel;
            const isHl = hlLevel === lv;
            return (
              <g
                key={"gv" + lv}
                data-cycle-node={lv}
                role={onSelectStart ? "button" : "img"}
                tabIndex={onSelectStart ? 0 : undefined}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={onSelectStart ? t("theory_hue_choose_start", `${info.short} ${lv}`) : `${info.short} ${lv}`}
                onMouseEnter={() => onHover(lv)}
                onMouseLeave={() => onHover(null)}
                onClick={onSelectStart ? () => onSelectStart(lv) : undefined}
                onKeyDown={
                  onSelectStart
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          if (!event.repeat) onSelectStart(lv);
                        }
                      }
                    : undefined
                }
                style={onSelectStart ? { cursor: "pointer" } : undefined}
              >
                <title>{info.bits.join("")}</title>
                <circle cx={p.x} cy={p.y} r={NODE_HIT_R} fill="transparent" aria-hidden="true" />
                {onSelectStart && (
                  <circle
                    className="theory-hue-start-focus"
                    cx={p.x}
                    cy={p.y}
                    r={DOT_R + 6}
                    fill="none"
                    stroke={C.accentBright}
                    strokeWidth={2}
                  />
                )}
                {(isCurrent || isHl) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={DOT_R + 5}
                    fill="none"
                    stroke={isCurrent ? C.textWhite : "rgba(255,255,255,0.4)"}
                    strokeWidth={2}
                    opacity={0.7}
                  />
                )}
                <circle
                  data-cycle-node-dot
                  cx={p.x}
                  cy={p.y}
                  r={DOT_R}
                  fill={info.color}
                  fillOpacity={0.85}
                  stroke="#fff"
                  strokeWidth={isCurrent ? 2.5 : 1.5}
                  strokeOpacity={0.8}
                />
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={15}
                  fontWeight={900}
                  fontFamily="var(--font-mono)"
                  fill={levelLabelColor(lv)}
                >
                  {lv}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="theory-hue-center">
          <div
            className="theory-hue-readout"
            lang="en"
            data-hue-phase={transition ? "transition" : currentLevel === null ? "choose-start" : "ready"}
            data-hue-action={transition ? (isAdding ? "add" : "remove") : undefined}
            data-hue-channel={transition?.channel}
            title={
              transition
                ? `${THEORY_LEVELS[transition.from].bits.join("")} → ${THEORY_LEVELS[transition.to].bits.join("")} · ${transition.channel}: ${THEORY_LEVELS[transition.from].bits[toggleIndex]} → ${THEORY_LEVELS[transition.to].bits[toggleIndex]}`
                : undefined
            }
          >
            {!transition && currentLevel !== null ? (
              <div className="theory-hue-direction-hint">{t("theory_hue_direction_hint")}</div>
            ) : (
              <>
                <div className="theory-hue-transition">
                  {transition ? `${THEORY_LEVELS[transition.from].short} → ${THEORY_LEVELS[transition.to].short}` : ""}
                </div>
                <div className="theory-hue-action">
                  {transition
                    ? t(isAdding ? "theory_gray_add" : "theory_gray_remove", t(`theory_gray_channel_${transition.channel}`))
                    : t("theory_hue_start_hint")}
                </div>
              </>
            )}
          </div>
          {controls}
        </div>
      </div>
    </div>
  );
});
