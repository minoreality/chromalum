import React, { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import {
  CANONICAL_CHROMATIC_LEVEL_CYCLE,
  CANONICAL_HUE_ANGLES_BY_LEVEL,
  CANONICAL_HUE_CYCLE,
  CANONICAL_HUE_EDGES,
  CHROMALUM_GRB_WEIGHTS,
  CHROMALUM_HUE_EDGE_LEVEL_DELTAS,
  CHROMALUM_HUE_TOGGLE_CYCLE,
  CHROMALUM_TONE_DENOMINATOR,
} from "../../chromalum-color-model";
import { THEORY_LEVELS, levelLabel } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { S_THEORY_BTN, S_THEORY_BTN_ACTIVE } from "../../styles/shared";
import { C, FONT, FS, FW, SP } from "../../styles/tokens";
import { hueCycleDeltaLabel, hueCycleStage } from "./hue-cycle-label";
import { usePinReset } from "./pin-reset";
import { hueStr } from "../../utils";

const ML = 69;
const MT = 34;
const PW = 660;
const PH = 200;
const MR = 41;
const MB = 44;
const VB_W = ML + PW + MR;
const LEVEL_COUNT = CHROMALUM_TONE_DENOMINATOR + 1;
const LEVELS = Array.from({ length: LEVEL_COUNT }, (_, level) => level);
const CHANNEL_COLORS = { G: "#00d848", R: "#ff4050", B: "#5470ff" } as const;
function circularHueDistance(a: number, b: number): number {
  const difference = Math.abs(a - b);
  return Math.min(difference, 360 - difference);
}

function hueFractionLabel(hueAngleDeg: number): string {
  const steps = Math.round(hueAngleDeg / 15);
  if (steps === 0) return "0";
  if (steps === 24) return "1";

  let numerator = steps;
  let denominator = 24;
  while (denominator !== 0) {
    const remainder = numerator % denominator;
    numerator = denominator;
    denominator = remainder;
  }
  const divisor = numerator;
  return `${steps / divisor}/${24 / divisor}`;
}

/**
 * Intersections of the affine pure-hue loop with a normalized tone T.
 * The result is derived from the canonical six hue edges and deduplicates
 * shared vertices, including the 0/360-degree seam.
 */
export function findToneIntersections(targetTone: number): { h: number; color: string }[] {
  if (!Number.isFinite(targetTone)) return [];

  const targetLevel = targetTone * CHROMALUM_TONE_DENOMINATOR;
  const epsilon = 1e-9;
  const intersections: { h: number; color: string }[] = [];

  for (const edge of CANONICAL_HUE_EDGES) {
    const low = Math.min(edge.fromLevel, edge.toLevel);
    const high = Math.max(edge.fromLevel, edge.toLevel);
    if (targetLevel < low - epsilon || targetLevel > high + epsilon) continue;

    const proportion = (targetLevel - edge.fromLevel) / (edge.toLevel - edge.fromLevel);
    const unwrappedHue = edge.fromHueAngleDeg + proportion * (edge.toHueAngleDeg - edge.fromHueAngleDeg);
    const h = ((unwrappedHue % 360) + 360) % 360;
    if (!intersections.some((hit) => circularHueDistance(hit.h, h) < epsilon)) {
      intersections.push({ h, color: hueStr(h) });
    }
  }

  return intersections.sort((a, b) => a.h - b.h);
}

interface Props {
  hlLevel: number | null;
  onHover: (level: number | null) => void;
  selectedEdge?: number | null;
  currentLevel?: number | null;
  direction?: 1 | -1;
  companion?: React.ReactNode;
  overviewCaption?: React.ReactNode;
  status?: React.ReactNode;
}

export const ToneZigzag = React.memo(function ToneZigzag({
  hlLevel,
  onHover,
  selectedEdge,
  currentLevel = null,
  direction = 1,
  companion,
  overviewCaption,
  status,
}: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const [viewBoxWidth, setViewBoxWidth] = useState(VB_W);
  const [plotHeight, setPlotHeight] = useState(PH);
  const [pinned, setPinned] = useState<number | null>(null);
  usePinReset(setPinned);
  const hasCompanion = Boolean(companion);

  // Spread the plot horizontally and compact its desktop scale without shrinking labels or points.
  useLayoutEffect(() => {
    const container = plotContainerRef.current;
    if (!container) return;
    const measure = () => {
      setViewBoxWidth(Math.max(VB_W, container.getBoundingClientRect().width));
      const desktopProgress = hasCompanion ? Math.max(0, Math.min(1, (window.innerWidth - 1024) / 160)) : 0;
      setPlotHeight(PH - 60 * desktopProgress);
    };
    measure();
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(container);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [hasCompanion]);

  const plotWidth = viewBoxWidth - ML - MR;
  const viewBoxHeight = MT + plotHeight + MB;
  const xHue = (hueAngleDeg: number) => ML + (hueAngleDeg / 360) * plotWidth;
  const yLevel = (level: number) => MT + plotHeight - (level / CHROMALUM_TONE_DENOMINATOR) * plotHeight;

  const enterLevel = useCallback((level: number) => onHover(level), [onHover]);
  const leaveLevel = useCallback(() => onHover(null), [onHover]);
  const clearPin = useCallback(() => {
    setPinned(null);
    onHover(null);
  }, [onHover]);
  const pinLevel = useCallback(
    (level: number) => {
      setPinned((previous) => {
        const next = previous === level ? null : level;
        queueMicrotask(() => onHover(next));
        return next;
      });
    },
    [onHover],
  );
  const activateLevelByKeyboard = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, level: number) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!event.repeat) pinLevel(level);
    },
    [pinLevel],
  );

  const externalLevel = hlLevel !== null && hlLevel >= 0 && hlLevel <= CHROMALUM_TONE_DENOMINATOR ? hlLevel : null;
  const activeLevel = externalLevel ?? pinned;
  const complementLevel = activeLevel === null ? null : CHROMALUM_TONE_DENOMINATOR - activeLevel;
  const intersectionSequence = CANONICAL_HUE_CYCLE.map(({ levelIndex }) => levelIndex).join(" ");
  const zigzagStage = hueCycleStage(currentLevel, selectedEdge);
  const edgeDeltaLabel = (index: number) =>
    hueCycleDeltaLabel(CHROMALUM_HUE_EDGE_LEVEL_DELTAS[index] * direction, zigzagStage, selectedEdge === index);
  const currentHueAngle =
    currentLevel === null
      ? null
      : selectedEdge == null
        ? CANONICAL_HUE_EDGES.find((edge) => edge.fromLevel === currentLevel)?.fromHueAngleDeg
        : direction === 1
          ? CANONICAL_HUE_EDGES[selectedEdge].toHueAngleDeg
          : CANONICAL_HUE_EDGES[selectedEdge].fromHueAngleDeg;

  return (
    <div
      className={`theory-zigzag-block${companion ? " theory-hue" : ""}`}
      style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: `var(--theory-hue-gap, ${SP["2xl"]}px)` }}
    >
      <div className={companion ? "theory-hue-overview" : undefined}>
        {companion}
        <div className="theory-zigzag-table-wrap" style={{ width: "100%", margin: "0 auto" }}>
          <table
            className="theory-zigzag-table"
            aria-label={t("theory_zigzag_table_aria")}
            // Reading or copying the reference table must not trigger the page's background reset.
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "collapse",
              color: C.textPrimary,
              fontFamily: FONT.mono,
            }}
          >
            <colgroup>
              <col style={{ width: "30%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "34%" }} />
            </colgroup>
            <thead>
              <tr>
                {[
                  t("theory_zigzag_table_transition"),
                  t("theory_zigzag_table_toggle"),
                  t("theory_zigzag_table_delta"),
                  t("theory_zigzag_table_inclusion"),
                ].map((heading, index) => (
                  <th
                    key={heading}
                    scope="col"
                    aria-label={heading}
                    title={heading}
                    style={{
                      padding: `${SP.md}px var(--theory-edge-cell-padding, ${SP.lg}px)`,
                      borderBottom: `1px solid ${C.borderAccent}`,
                      color: C.accentBright,
                      fontWeight: FW.bold,
                      textAlign: index === 1 || index === 2 ? "center" : "left",
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                    }}
                  >
                    <span className="theory-zigzag-heading-full">{heading}</span>
                    <span className="theory-zigzag-heading-short" aria-hidden="true">
                      {[t("theory_zigzag_table_transition_short"), t("theory_zigzag_table_toggle_short"), "ΔL", "⊂ / ⊃"][index]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CANONICAL_HUE_EDGES.map((edge, index) => {
                const channel = CHROMALUM_HUE_TOGGLE_CYCLE[index];
                const isCurrent = selectedEdge === index;
                const edgeDirection = isCurrent ? direction : 1;
                const delta = CHROMALUM_HUE_EDGE_LEVEL_DELTAS[index] * edgeDirection;
                const fromLevel = edgeDirection === 1 ? edge.fromLevel : edge.toLevel;
                const toLevel = edgeDirection === 1 ? edge.toLevel : edge.fromLevel;
                const relation = delta > 0 ? "⊂" : "⊃";
                return (
                  <tr
                    key={`row-${index}`}
                    data-edge-row={index}
                    data-hue-selected={isCurrent}
                    aria-current={isCurrent ? "step" : undefined}
                    style={{ "--theory-edge-color": CHANNEL_COLORS[channel] } as React.CSSProperties}
                  >
                    <td style={{ ...TABLE_CELL_STYLE, paddingLeft: `calc(var(--theory-edge-cell-padding, ${SP.lg}px) + 4px)` }}>
                      {levelLabel(fromLevel)}
                      {isCurrent ? "→" : "↔"}
                      {levelLabel(toLevel)}
                    </td>
                    <td
                      style={{ ...TABLE_CELL_STYLE, color: CHANNEL_COLORS[channel], textAlign: "center", fontWeight: FW.bold }}
                      title={`w${channel}=${CHROMALUM_GRB_WEIGHTS[channel]}`}
                    >
                      {channel}
                    </td>
                    <td
                      style={{
                        ...TABLE_CELL_STYLE,
                        color: isCurrent ? CHANNEL_COLORS[channel] : C.textMuted,
                        fontWeight: FW.bold,
                        textAlign: "center",
                      }}
                    >
                      {edgeDeltaLabel(index)}
                    </td>
                    <td style={TABLE_CELL_STYLE}>
                      {levelLabel(fromLevel)}
                      {relation}
                      {levelLabel(toLevel)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {overviewCaption}
      </div>
      {status}
      <div className="theory-hue-zigzag" ref={plotContainerRef}>
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="theory-zigzag-svg"
          style={{ display: "block", width: "100%", maxWidth: "100%", alignSelf: "center", cursor: "default" }}
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
          onClick={clearPin}
        >
          <title id={titleId}>{t("theory_zigzag_title")}</title>
          <desc id={descriptionId}>
            {t("theory_zigzag_intersection_sequence_aria")}: {intersectionSequence}
          </desc>

          {/* Integer-level intersections read once around h in [0,1). */}
          <g data-tone-sequence="true">
            {CANONICAL_HUE_CYCLE.map((point, index) => (
              <text
                key={`sequence-${index}`}
                x={xHue(point.hueAngleDeg)}
                y={14}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily={FONT.mono}
                fontSize={FS.xl}
                fontWeight={FW.bold}
                fill={hueStr(point.hueAngleDeg)}
                stroke={C.bgRoot}
                strokeWidth={0.8}
                paintOrder="stroke"
                data-sequence-index={index}
                data-sequence-hue={point.hueAngleDeg}
                data-sequence-level={point.levelIndex}
              >
                {point.levelIndex}
              </text>
            ))}
          </g>

          {/* The two four-preimage bands of the affine loop. */}
          {[
            [2, 3],
            [4, 5],
          ].map(([low, high]) => (
            <g key={`${low}-${high}`}>
              <rect x={ML} y={yLevel(high)} width={plotWidth} height={yLevel(low) - yLevel(high)} fill={C.accent} fillOpacity={0.035} />
              <text
                x={ML + plotWidth + 8}
                y={(yLevel(low) + yLevel(high)) / 2}
                dominantBaseline="central"
                fontFamily={FONT.mono}
                fontSize={FS.xs}
                fill={C.textDimmer}
              >
                N=4
              </text>
            </g>
          ))}

          {/* Integer tone levels and their complementary partner. */}
          {LEVELS.map((level) => {
            const isActive = activeLevel === level;
            const isComplement = complementLevel === level && activeLevel !== null && complementLevel !== activeLevel;
            return (
              <g key={`level-${level}`} data-tone-level={level}>
                <line
                  x1={ML}
                  y1={yLevel(level)}
                  x2={ML + plotWidth}
                  y2={yLevel(level)}
                  stroke={isActive || isComplement ? THEORY_LEVELS[level].color : C.textDimmer}
                  strokeWidth={isActive ? 1.8 : isComplement ? 1.2 : 0.6}
                  strokeDasharray={isComplement ? "5,4" : undefined}
                  opacity={isActive ? 0.9 : isComplement ? 0.65 : 0.22}
                />
                <text
                  x={ML - 8}
                  y={yLevel(level)}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontFamily={FONT.mono}
                  fontSize={FS.xs}
                  fontWeight={isActive ? FW.bold : FW.normal}
                  fill={isActive || isComplement ? THEORY_LEVELS[level].color : C.textDimmer}
                  opacity={isActive || isComplement ? 1 : 0.72}
                >
                  {level}/7
                </text>
                <rect x={ML} y={yLevel(level) - 8} width={plotWidth} height={16} fill="transparent" />
              </g>
            );
          })}

          {/* Complement fixed line T=1/2. */}
          <line
            x1={ML}
            y1={yLevel(CHROMALUM_TONE_DENOMINATOR / 2)}
            x2={ML + plotWidth}
            y2={yLevel(CHROMALUM_TONE_DENOMINATOR / 2)}
            stroke={C.textMuted}
            strokeWidth={0.8}
            strokeDasharray="7,5"
            opacity={0.45}
          />

          {/* Six canonical affine hue edges. */}
          {CANONICAL_HUE_EDGES.map((edge, index) => {
            const channel = CHROMALUM_HUE_TOGGLE_CYCLE[index];
            const midX = (xHue(edge.fromHueAngleDeg) + xHue(edge.toHueAngleDeg)) / 2;
            const midY = (yLevel(edge.fromLevel) + yLevel(edge.toLevel)) / 2;
            // Keep each label in place even when traversal reverses its sign.
            const labelOffset = CHROMALUM_HUE_EDGE_LEVEL_DELTAS[index] > 0 ? -10 : 13;
            const angle = Math.atan2(
              (yLevel(edge.toLevel) - yLevel(edge.fromLevel)) * direction,
              (xHue(edge.toHueAngleDeg) - xHue(edge.fromHueAngleDeg)) * direction,
            );
            return (
              <g key={`edge-${index}`} data-hue-edge={index} data-hue-selected={selectedEdge === index}>
                {selectedEdge === index && (
                  <line
                    x1={xHue(edge.fromHueAngleDeg)}
                    y1={yLevel(edge.fromLevel)}
                    x2={xHue(edge.toHueAngleDeg)}
                    y2={yLevel(edge.toLevel)}
                    stroke="#fff"
                    strokeWidth={8}
                    opacity={0.7}
                  />
                )}
                <line
                  x1={xHue(edge.fromHueAngleDeg)}
                  y1={yLevel(edge.fromLevel)}
                  x2={xHue(edge.toHueAngleDeg)}
                  y2={yLevel(edge.toLevel)}
                  stroke={CHANNEL_COLORS[channel]}
                  strokeWidth={selectedEdge === index ? 4 : 2.4}
                  opacity={0.82}
                />
                {selectedEdge === index && (
                  <polygon
                    points={`${midX + 9 * Math.cos(angle)},${midY + 9 * Math.sin(angle)} ${midX - 8 * Math.cos(angle) + 5 * Math.sin(angle)},${midY - 8 * Math.sin(angle) - 5 * Math.cos(angle)} ${midX - 8 * Math.cos(angle) - 5 * Math.sin(angle)},${midY - 8 * Math.sin(angle) + 5 * Math.cos(angle)}`}
                    fill="#fff"
                    pointerEvents="none"
                  />
                )}
                <text
                  data-zigzag-delta={index}
                  x={midX}
                  y={midY + labelOffset}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily={FONT.mono}
                  fontSize={FS.sm}
                  fontWeight={FW.bold}
                  fill={selectedEdge === index ? CHANNEL_COLORS[channel] : C.textMuted}
                >
                  {edgeDeltaLabel(index)}
                </text>
              </g>
            );
          })}

          {/* All fourteen exact integer-level intersections. */}
          {CANONICAL_HUE_CYCLE.map((point, index) => {
            const isVertex = point.hueAngleDeg % 60 === 0;
            const isActive = activeLevel === point.levelIndex;
            const isComplement = complementLevel === point.levelIndex && activeLevel !== null && complementLevel !== activeLevel;
            return (
              <g key={`intersection-${index}`} data-tone-intersection={point.levelIndex}>
                {(isActive || isComplement) && (
                  <circle
                    cx={xHue(point.hueAngleDeg)}
                    cy={yLevel(point.levelIndex)}
                    r={isActive ? 7 : 6}
                    fill="none"
                    stroke={isActive ? "#fff" : THEORY_LEVELS[point.levelIndex].color}
                    strokeWidth={isActive ? 1.8 : 1.2}
                    strokeDasharray={isComplement ? "2,2" : undefined}
                    opacity={0.82}
                  />
                )}
                <circle
                  cx={xHue(point.hueAngleDeg)}
                  cy={yLevel(point.levelIndex)}
                  r={isVertex ? 4.6 : 3}
                  fill={hueStr(point.hueAngleDeg)}
                  stroke={isVertex ? "#fff" : C.bgRoot}
                  strokeWidth={isVertex ? 1.2 : 0.9}
                />
                {isActive && (
                  <text
                    x={xHue(point.hueAngleDeg)}
                    y={yLevel(point.levelIndex) + 14}
                    textAnchor="middle"
                    fontFamily={FONT.mono}
                    fontSize={FS.xxs}
                    fill={C.textPrimary}
                  >
                    {hueFractionLabel(point.hueAngleDeg)}
                  </text>
                )}
              </g>
            );
          })}
          {currentLevel !== null && currentHueAngle != null && (
            <circle
              data-hue-current-node={currentLevel}
              cx={xHue(currentHueAngle % 360)}
              cy={yLevel(currentLevel)}
              r={8.5}
              fill="none"
              stroke={C.textWhite}
              strokeWidth={1.6}
              pointerEvents="none"
            />
          )}

          {/* Named chromatic vertices and hue-angle ticks. */}
          {CANONICAL_CHROMATIC_LEVEL_CYCLE.map((level, index) => (
            <text
              key={`vertex-${index}`}
              x={xHue(index * 60)}
              y={yLevel(level) - 9}
              textAnchor="middle"
              fontFamily={FONT.mono}
              fontSize={FS.sm}
              fontWeight={FW.bold}
              fill={THEORY_LEVELS[level].color}
            >
              {levelLabel(level)}
            </text>
          ))}
          {[0, 60, 120, 180, 240, 300, 360].map((hueAngleDeg) => (
            <g key={`hue-${hueAngleDeg}`}>
              <line
                x1={xHue(hueAngleDeg)}
                y1={MT + plotHeight}
                x2={xHue(hueAngleDeg)}
                y2={MT + plotHeight + 4}
                stroke={C.textDimmer}
                strokeWidth={0.7}
              />
              <text
                x={xHue(hueAngleDeg)}
                y={MT + plotHeight + 15}
                textAnchor="middle"
                fontFamily={FONT.mono}
                fontSize={FS.xxs}
                fill={C.textDimmer}
              >
                {hueFractionLabel(hueAngleDeg)}
              </text>
            </g>
          ))}

          <text
            x={ML - 42}
            y={MT + plotHeight / 2}
            textAnchor="middle"
            fontFamily={FONT.mono}
            fontSize={FS.sm}
            fill={C.textMuted}
            transform={`rotate(-90 ${ML - 42} ${MT + plotHeight / 2})`}
          >
            T=L/7
          </text>
          <text x={ML + plotWidth / 2} y={viewBoxHeight - 4} textAnchor="middle" fontFamily={FONT.mono} fontSize={FS.sm} fill={C.textMuted}>
            h ∈ ℝ/ℤ
          </text>

          {/* Keep hover targets above every plotted mark so interaction does not break at crossings. */}
          <g aria-hidden="true" data-tone-hover-layer="true" onMouseLeave={leaveLevel}>
            {LEVELS.map((level) => {
              const upperLevel = Math.min(CHROMALUM_TONE_DENOMINATOR, level + 0.5);
              const lowerLevel = Math.max(0, level - 0.5);
              const y = yLevel(upperLevel);
              return (
                <rect
                  key={`level-hover-${level}`}
                  x={ML}
                  y={y}
                  width={plotWidth}
                  height={yLevel(lowerLevel) - y}
                  fill="transparent"
                  data-tone-level-hover={level}
                  onMouseEnter={() => enterLevel(level)}
                />
              );
            })}
          </g>
        </svg>

        <div className="theory-zigzag-level-wrap" style={{ width: "100%" }}>
          <div
            className="theory-zigzag-level-controls"
            role="group"
            aria-label={t("theory_zigzag_level_controls_aria")}
            data-tone-level-controls="true"
          >
            {LEVELS.map((level) => {
              const active = activeLevel === level;
              const isPinned = pinned === level;
              const candidateCount = CANONICAL_HUE_ANGLES_BY_LEVEL[level].length;
              return (
                <button
                  key={`level-control-${level}`}
                  type="button"
                  className="theory-zigzag-level-button"
                  data-tone-level-control={level}
                  aria-pressed={isPinned}
                  aria-label={`${levelLabel(level)} · T=${level}/7 · N=${candidateCount}`}
                  onMouseEnter={() => enterLevel(level)}
                  onMouseLeave={leaveLevel}
                  onFocus={() => enterLevel(level)}
                  onBlur={leaveLevel}
                  onClick={() => pinLevel(level)}
                  onKeyDown={(event) => activateLevelByKeyboard(event, level)}
                  style={{
                    ...(active ? S_THEORY_BTN_ACTIVE : S_THEORY_BTN),
                    minWidth: 0,
                    minHeight: 28,
                    padding: "2px var(--theory-level-padding, 4px)",
                    whiteSpace: "nowrap",
                    borderColor: active ? (level === 0 ? C.textMuted : THEORY_LEVELS[level].color) : C.border,
                    color: active ? C.textPrimary : C.textMuted,
                    fontFamily: FONT.mono,
                    fontSize: "var(--theory-level-font-size, 13px)",
                  }}
                >
                  <span className="theory-zigzag-level-name">
                    <span
                      aria-hidden="true"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: THEORY_LEVELS[level].color,
                        border: level === 0 ? `1px solid ${C.textDimmer}` : "none",
                        boxSizing: "border-box",
                        flex: "0 0 auto",
                      }}
                    />
                    {levelLabel(level)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="theory-zigzag-summary">
          <span>T(h + 1/2) = 1 − T(h)</span>
          <span data-active-fiber={activeLevel ?? undefined} aria-hidden={activeLevel === null}>
            {activeLevel !== null && (
              <>
                N<sub>{activeLevel}</sub> = {CANONICAL_HUE_ANGLES_BY_LEVEL[activeLevel].length}
                {complementLevel !== activeLevel && (
                  <>
                    {" "}
                    · N<sub>{complementLevel}</sub> = {CANONICAL_HUE_ANGLES_BY_LEVEL[complementLevel!].length}
                  </>
                )}
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
});

const TABLE_CELL_STYLE: React.CSSProperties = {
  padding: `var(--theory-edge-row-padding, ${SP.xs}px) var(--theory-edge-cell-padding, ${SP.lg}px)`,
  borderBottom: `1px solid ${C.border}`,
  textAlign: "left",
  whiteSpace: "nowrap",
  lineHeight: 1.45,
};
