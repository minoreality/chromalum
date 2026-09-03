import React, { useCallback, useId, useState } from "react";
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
import { THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { S_BTN, S_BTN_ACTIVE, S_CURSOR_POINTER } from "../../styles/shared";
import { C, FONT, FS, FW, SP } from "../../styles/tokens";
import { usePinReset } from "./pin-reset";

const ML = 54;
const MT = 34;
const PW = 660;
const PH = 250;
const MR = 56;
const MB = 44;
const VB_W = ML + PW + MR;
const VB_H = MT + PH + MB;
const LEVEL_COUNT = CHROMALUM_TONE_DENOMINATOR + 1;
const LEVELS = Array.from({ length: LEVEL_COUNT }, (_, level) => level);
const CHANNEL_COLORS = { G: "#00d848", R: "#ff4050", B: "#5470ff" } as const;
const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

function xHue(hueAngleDeg: number): number {
  return ML + (hueAngleDeg / 360) * PW;
}

function yLevel(level: number): number {
  return MT + PH - (level / CHROMALUM_TONE_DENOMINATOR) * PH;
}

function levelLabel(level: number): string {
  return `${THEORY_LEVELS[level].short}${SUBSCRIPT_DIGITS[level]}`;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`.replace("-", "−");
}

function hueColor(hueAngleDeg: number): string {
  return `hsl(${hueAngleDeg}deg 100% 50%)`;
}

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
      intersections.push({ h, color: hueColor(h) });
    }
  }

  return intersections.sort((a, b) => a.h - b.h);
}

interface Props {
  hlLevel: number | null;
  onHover: (level: number | null) => void;
}

export const ToneZigzag = React.memo(function ToneZigzag({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const [pinned, setPinned] = useState<number | null>(null);
  usePinReset(setPinned);

  const enterLevel = useCallback((level: number) => onHover(level), [onHover]);
  const leaveLevel = useCallback(() => onHover(null), [onHover]);
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

  return (
    <div className="theory-zigzag-block" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: SP["2xl"] }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="theory-zigzag-svg"
        style={{ display: "block", width: "100%", maxWidth: 780, alignSelf: "center" }}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
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
              fill={hueColor(point.hueAngleDeg)}
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
            <rect x={ML} y={yLevel(high)} width={PW} height={yLevel(low) - yLevel(high)} fill={C.accent} fillOpacity={0.035} />
            <text
              x={ML + PW + 8}
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
                x2={ML + PW}
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
              <rect x={ML} y={yLevel(level) - 8} width={PW} height={16} fill="transparent" />
            </g>
          );
        })}

        {/* Complement fixed line T=1/2. */}
        <line
          x1={ML}
          y1={yLevel(CHROMALUM_TONE_DENOMINATOR / 2)}
          x2={ML + PW}
          y2={yLevel(CHROMALUM_TONE_DENOMINATOR / 2)}
          stroke={C.textMuted}
          strokeWidth={0.8}
          strokeDasharray="7,5"
          opacity={0.45}
        />

        {/* Six canonical affine hue edges. */}
        {CANONICAL_HUE_EDGES.map((edge, index) => {
          const channel = CHROMALUM_HUE_TOGGLE_CYCLE[index];
          const delta = CHROMALUM_HUE_EDGE_LEVEL_DELTAS[index];
          const midX = (xHue(edge.fromHueAngleDeg) + xHue(edge.toHueAngleDeg)) / 2;
          const midY = (yLevel(edge.fromLevel) + yLevel(edge.toLevel)) / 2;
          const labelOffset = delta > 0 ? -10 : 13;
          return (
            <g key={`edge-${index}`} data-hue-edge={index}>
              <line
                x1={xHue(edge.fromHueAngleDeg)}
                y1={yLevel(edge.fromLevel)}
                x2={xHue(edge.toHueAngleDeg)}
                y2={yLevel(edge.toLevel)}
                stroke={CHANNEL_COLORS[channel]}
                strokeWidth={2.4}
                opacity={0.82}
              />
              <text
                x={midX}
                y={midY + labelOffset}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily={FONT.mono}
                fontSize={FS.sm}
                fontWeight={FW.bold}
                fill={CHANNEL_COLORS[channel]}
              >
                {signed(delta)}
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
                fill={hueColor(point.hueAngleDeg)}
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
        <circle
          cx={xHue(360)}
          cy={yLevel(CANONICAL_CHROMATIC_LEVEL_CYCLE[0])}
          r={4.6}
          fill={hueColor(360)}
          stroke="#fff"
          strokeWidth={1.2}
          data-seam-copy="true"
        />

        {/* Named chromatic vertices and hue-angle ticks. */}
        {[...CANONICAL_CHROMATIC_LEVEL_CYCLE, CANONICAL_CHROMATIC_LEVEL_CYCLE[0]].map((level, index) => (
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
            <line x1={xHue(hueAngleDeg)} y1={MT + PH} x2={xHue(hueAngleDeg)} y2={MT + PH + 4} stroke={C.textDimmer} strokeWidth={0.7} />
            <text x={xHue(hueAngleDeg)} y={MT + PH + 15} textAnchor="middle" fontFamily={FONT.mono} fontSize={FS.xxs} fill={C.textDimmer}>
              {hueFractionLabel(hueAngleDeg)}
            </text>
          </g>
        ))}

        <text
          x={12}
          y={MT + PH / 2}
          textAnchor="middle"
          fontFamily={FONT.mono}
          fontSize={FS.sm}
          fill={C.textMuted}
          transform={`rotate(-90 12 ${MT + PH / 2})`}
        >
          T=L/7
        </text>
        <text x={ML + PW / 2} y={VB_H - 4} textAnchor="middle" fontFamily={FONT.mono} fontSize={FS.sm} fill={C.textMuted}>
          h ∈ ℝ/ℤ
        </text>

        {/* Keep hover targets above every plotted mark so interaction does not break at crossings. */}
        <g aria-hidden="true" data-tone-hover-layer="true" onMouseLeave={leaveLevel} style={S_CURSOR_POINTER}>
          {LEVELS.map((level) => {
            const upperLevel = Math.min(CHROMALUM_TONE_DENOMINATOR, level + 0.5);
            const lowerLevel = Math.max(0, level - 0.5);
            const y = yLevel(upperLevel);
            return (
              <rect
                key={`level-hover-${level}`}
                x={ML}
                y={y}
                width={PW}
                height={yLevel(lowerLevel) - y}
                fill="transparent"
                data-tone-level-hover={level}
                onMouseEnter={() => enterLevel(level)}
              />
            );
          })}
        </g>
      </svg>

      <div
        className="theory-zigzag-level-scroll"
        style={{ width: "100%", overflowX: "auto", overscrollBehaviorInline: "contain", scrollbarWidth: "thin" }}
      >
        <div
          role="group"
          aria-label={t("theory_zigzag_level_controls_aria")}
          data-tone-level-controls="true"
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "nowrap",
            gap: SP.sm,
            width: "max-content",
            minWidth: "100%",
            padding: `${SP.xs}px 0`,
            boxSizing: "border-box",
          }}
        >
          {LEVELS.map((level) => {
            const active = activeLevel === level;
            const isPinned = pinned === level;
            const candidateCount = CANONICAL_HUE_ANGLES_BY_LEVEL[level].length;
            return (
              <button
                key={`level-control-${level}`}
                type="button"
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
                  ...(active ? S_BTN_ACTIVE : S_BTN),
                  minWidth: 0,
                  minHeight: 36,
                  flex: "0 0 auto",
                  gap: SP.xs,
                  padding: `${SP.xs}px ${SP.md}px`,
                  whiteSpace: "nowrap",
                  borderColor: active ? THEORY_LEVELS[level].color : C.border,
                  color: active ? THEORY_LEVELS[level].color : C.textMuted,
                  fontFamily: FONT.mono,
                  fontSize: FS.xs,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: THEORY_LEVELS[level].color,
                    border: level === 0 ? `1px solid ${C.textDimmer}` : "none",
                    boxSizing: "border-box",
                    flex: "0 0 auto",
                  }}
                />
                <span>
                  {levelLabel(level)} · N={candidateCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          columnGap: SP["3xl"],
          rowGap: SP.md,
          color: C.textMuted,
          fontFamily: FONT.mono,
          fontSize: FS.lg,
        }}
      >
        <span>T(h + 1/2) = 1 − T(h)</span>
        {activeLevel !== null && (
          <span data-active-fiber={activeLevel}>
            N<sub>{activeLevel}</sub> = {CANONICAL_HUE_ANGLES_BY_LEVEL[activeLevel].length}
            {complementLevel !== activeLevel && (
              <>
                {" "}
                · N<sub>{complementLevel}</sub> = {CANONICAL_HUE_ANGLES_BY_LEVEL[complementLevel!].length}
              </>
            )}
          </span>
        )}
      </div>

      <div className="theory-zigzag-table-wrap" style={{ width: "100%", paddingBottom: SP.sm }}>
        <table
          aria-label={t("theory_zigzag_table_aria")}
          style={{
            width: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
            color: C.textPrimary,
            fontFamily: FONT.mono,
            fontSize: FS.md,
          }}
        >
          <colgroup>
            <col style={{ width: "28%" }} />
            <col style={{ width: "38%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr>
              {[
                t("theory_zigzag_table_transition"),
                t("theory_zigzag_table_toggle"),
                t("theory_zigzag_table_delta"),
                t("theory_zigzag_table_inclusion"),
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  style={{
                    padding: `${SP.xl}px ${SP.lg}px`,
                    borderBottom: `1px solid ${C.borderAccent}`,
                    color: C.accentBright,
                    fontWeight: FW.bold,
                    textAlign: "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CANONICAL_HUE_EDGES.map((edge, index) => {
              const channel = CHROMALUM_HUE_TOGGLE_CYCLE[index];
              const delta = CHROMALUM_HUE_EDGE_LEVEL_DELTAS[index];
              const relation = delta > 0 ? "⊂" : "⊃";
              return (
                <tr key={`row-${index}`} data-edge-row={index}>
                  <td style={TABLE_CELL_STYLE}>
                    {levelLabel(edge.fromLevel)} → {levelLabel(edge.toLevel)}
                  </td>
                  <td style={{ ...TABLE_CELL_STYLE, color: CHANNEL_COLORS[channel] }}>
                    τ<sub>{channel}</sub> · w<sub>{channel}</sub>={CHROMALUM_GRB_WEIGHTS[channel]}
                  </td>
                  <td style={{ ...TABLE_CELL_STYLE, color: CHANNEL_COLORS[channel], fontWeight: FW.bold }}>{signed(delta)}</td>
                  <td style={TABLE_CELL_STYLE}>
                    {levelLabel(edge.fromLevel)} {relation} {levelLabel(edge.toLevel)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const TABLE_CELL_STYLE: React.CSSProperties = {
  padding: `${SP.xl}px ${SP.lg}px`,
  borderBottom: `1px solid ${C.border}`,
  textAlign: "left",
  whiteSpace: "nowrap",
  lineHeight: 1.45,
};
