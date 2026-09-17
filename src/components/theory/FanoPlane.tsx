import React, { useState, useCallback, useRef } from "react";
import { THEORY_LEVELS, FANO_LINES, FANO_LINE_CATEGORIES, FANO_LINE_ENDPOINTS, FANO_POINTS, FANO_CIRCLE } from "../../data/theory-data";
import { C, FS, FW } from "../../styles/tokens";
import { usePinReset } from "./pin-reset";
import { S_CURSOR_POINTER } from "../../styles/shared";
import { useTranslation } from "../../i18n";
import { FanoHammingMatrix } from "./FanoHammingMatrix";
import { levelLabelColor } from "../../color-engine";

const W = 300,
  H = 232,
  VB_Y = 14;
const DOT_R = 12;

const LINE_CATEGORIES = ["primary", "complement", "secondary"] as const;
type LineCategory = (typeof LINE_CATEGORIES)[number];
type CompletionPair = [] | [number] | [number, number];
type FocusPreview = { kind: "point" | "line"; value: number } | null;

function linesThrough(point: number): number[] {
  return FANO_LINES.map((line, i) => (line.includes(point) ? i : -1)).filter((i) => i >= 0);
}

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

export const FanoPlane = React.memo(function FanoPlane({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const [visibleCategories, setVisibleCategories] = useState<Record<LineCategory, boolean>>({
    primary: true,
    complement: true,
    secondary: true,
  });
  const [completionPair, setCompletionPair] = useState<CompletionPair>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [previewLine, setPreviewLine] = useState<number | null>(null);
  const [previewPoint, setPreviewPoint] = useState<number | null>(null);
  const [focusPreview, setFocusPreview] = useState<FocusPreview>(null);
  const pointerPosition = useRef<{ x: number; y: number } | null>(null);

  const resetSelection = useCallback((_value: null) => {
    setCompletionPair([]);
    setSelectedLine(null);
    setPreviewLine(null);
    setPreviewPoint(null);
    setFocusPreview(null);
  }, []);
  usePinReset(resetSelection);

  const completionA = completionPair[0] ?? null;
  const completionB = completionPair[1] ?? null;
  const completionC = completionA !== null && completionB !== null ? completionA ^ completionB : null;
  const completedLine =
    completionA !== null && completionB !== null && completionC !== null
      ? FANO_LINES.findIndex((line) => line.includes(completionA) && line.includes(completionB) && line.includes(completionC))
      : -1;

  // A persistent two-point construction takes priority over the shared one-point highlight.
  const externalHl = hlLevel !== null && hlLevel >= 1 && hlLevel <= 7 ? hlLevel : null;
  const pointHighlight =
    completionA !== null ? completionA : focusPreview?.kind === "point" ? focusPreview.value : (previewPoint ?? externalHl);
  const linePreview = focusPreview === null ? previewLine : focusPreview.kind === "line" ? focusPreview.value : null;
  const activeLine =
    completionA !== null ? (completedLine >= 0 ? completedLine : null) : (linePreview ?? (pointHighlight === null ? selectedLine : null));
  const hl = activeLine === null ? pointHighlight : null;
  const hlLines = activeLine !== null ? [activeLine] : hl !== null ? linesThrough(hl) : [];
  const hlPoints = new Set<number>();
  if (activeLine !== null) {
    for (const point of FANO_LINES[activeLine]) hlPoints.add(point);
  } else if (hl !== null) {
    hlPoints.add(hl);
  }
  const selectedPoints: readonly number[] = completionPair;

  const onEnter = useCallback(
    (lv: number) => {
      setPreviewPoint(lv);
      setPreviewLine(null);
      onHover(lv);
    },
    [onHover],
  );
  const onLeave = useCallback(() => {
    setPreviewPoint(null);
    onHover(null);
  }, [onHover]);
  const onPointTap = useCallback(
    (lv: number, fromPointer = false) => {
      if (fromPointer) setFocusPreview(null);
      setPreviewLine(null);
      setPreviewPoint(null);
      setSelectedLine(null);
      setCompletionPair((current) => {
        if (current.length === 0) return [lv];
        if (current.length === 1) return current[0] === lv ? [] : [current[0], lv];
        if (current[0] === lv) return [];
        if (current[1] === lv) return [current[0]];
        return [current[0], lv];
      });
      onHover(null);
    },
    [onHover],
  );

  const selectLine = (line: number, fromPointer = false) => {
    if (fromPointer) setFocusPreview(null);
    setSelectedLine((previous) => (previous === line ? null : line));
    setCompletionPair([]);
    setPreviewPoint(null);
    onHover(null);
  };
  const enterLine = (line: number) => {
    setPreviewLine(line);
    setPreviewPoint(null);
    onHover(null);
  };
  const clearSelection = () => {
    resetSelection(null);
    onHover(null);
  };
  const focusPoint = (point: number) => setFocusPreview({ kind: "point", value: point });
  const blurSelection = () => setFocusPreview(null);

  const isLineVisible = (li: number) => visibleCategories[FANO_LINE_CATEGORIES[li]];

  return (
    <div
      className="theory-fano-correspondence"
      data-testid="fano-hamming-correspondence"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          clearSelection();
        } else if (event.key === "Enter" || event.key === " ") {
          const target = (event.target as Element).closest("[data-fano-point], [data-h-column], [data-fano-line-choice]");
          const point = target?.getAttribute("data-fano-point") ?? target?.getAttribute("data-h-column");
          const line = target?.getAttribute("data-fano-line-choice");
          if (point) focusPoint(Number(point));
          if (line) setFocusPreview({ kind: "line", value: FANO_LINES.findIndex((points) => points.join("-") === line) });
        }
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "touch") return;
        const previous = pointerPosition.current;
        if (!previous || previous.x !== event.clientX || previous.y !== event.clientY) setFocusPreview(null);
        pointerPosition.current = { x: event.clientX, y: event.clientY };
      }}
    >
      <div className="theory-fano-correspondence-layout">
        <div className="theory-fano-geometry">
          <div className="theory-fano-heading">
            <strong>PG(2,2)</strong>
            <span>{t("theory_fano_incidence")}</span>
          </div>
          <svg
            className="theory-fano-plot"
            viewBox={`0 ${VB_Y} ${W} ${H}`}
            role="group"
            aria-label={t("theory_fano_title")}
            onClick={(event) => {
              if (!(event.target as Element).closest("[data-fano-point], [data-fano-line-hit]")) clearSelection();
            }}
          >
            {/* Lines */}
            {FANO_LINES.map((_, li) => {
              if (!isLineVisible(li)) return null;
              const active = hlLines.includes(li);
              const dim = (hl !== null || activeLine !== null) && !active;
              const cat = FANO_LINE_CATEGORIES[li];
              const baseOpacity = dim ? 0.22 : active ? (activeLine === li ? 1 : 0.8) : 0.6;
              const strokeColor = cat === "primary" ? "#80a0ff" : cat === "complement" ? "#ffa060" : "#60ffa0";
              const strokeDash = "none";
              const isCmyLine = li === 6; // The CMY line is represented by a circle.

              if (isCmyLine) {
                return (
                  <circle
                    key={"fl" + li}
                    data-fano-line={FANO_LINES[li].join("-")}
                    data-fano-line-active={active}
                    cx={FANO_CIRCLE.cx}
                    cy={FANO_CIRCLE.cy}
                    r={FANO_CIRCLE.r}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={activeLine === li ? 3 : active ? 2 : 1.2}
                    strokeDasharray={strokeDash}
                    opacity={baseOpacity}
                  />
                );
              }
              const ep = FANO_LINE_ENDPOINTS[li];
              const p0 = FANO_POINTS[ep[0]],
                p1 = FANO_POINTS[ep[1]];
              return (
                <line
                  key={"fl" + li}
                  data-fano-line={FANO_LINES[li].join("-")}
                  data-fano-line-active={active}
                  x1={p0.x}
                  y1={p0.y}
                  x2={p1.x}
                  y2={p1.y}
                  stroke={strokeColor}
                  strokeWidth={activeLine === li ? 3 : active ? 2 : 1.2}
                  strokeDasharray={strokeDash}
                  strokeLinecap="round"
                  opacity={baseOpacity}
                />
              );
            })}

            {FANO_LINES.map((line, index) => {
              if (!isLineVisible(index)) return null;
              const endpoints = FANO_LINE_ENDPOINTS[index]?.map((point) => FANO_POINTS[point]);
              return (
                <g
                  key={`hit-${index}`}
                  data-fano-line-hit={line.join("-")}
                  className="theory-fano-line-hit"
                  onPointerEnter={(event) => {
                    if (event.pointerType !== "touch") enterLine(index);
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== "touch") setPreviewLine(null);
                  }}
                  onClick={() => selectLine(index, true)}
                  aria-hidden="true"
                >
                  {endpoints ? (
                    <line x1={endpoints[0].x} y1={endpoints[0].y} x2={endpoints[1].x} y2={endpoints[1].y} />
                  ) : (
                    <circle cx={FANO_CIRCLE.cx} cy={FANO_CIRCLE.cy} r={FANO_CIRCLE.r} />
                  )}
                </g>
              );
            })}

            {/* Points */}
            {[1, 2, 3, 4, 5, 6, 7].map((lv) => {
              const p = FANO_POINTS[lv];
              const info = THEORY_LEVELS[lv];
              const active = hlPoints.has(lv);
              const dim = (hl !== null || activeLine !== null) && !active;
              const completionRole = completionA === lv ? "a" : completionB === lv ? "b" : completionC === lv ? "c" : null;
              const isCompletionInput = completionRole === "a" || completionRole === "b";
              const pointAriaLabel =
                completionRole === "a"
                  ? t("theory_fano_completion_input_a_aria", info.short, lv, info.bits.join(""))
                  : completionRole === "b"
                    ? t("theory_fano_completion_input_b_aria", info.short, lv, info.bits.join(""))
                    : completionRole === "c"
                      ? t("theory_fano_completion_result_aria", info.short, lv, info.bits.join(""))
                      : t("theory_fano_point_aria", info.short, lv, info.bits.join(""));
              return (
                <g
                  key={"fp" + lv}
                  data-fano-point={lv}
                  data-active={active}
                  data-pinned={selectedPoints.includes(lv)}
                  data-fano-selection-role={completionRole ?? undefined}
                  role="button"
                  tabIndex={0}
                  aria-label={pointAriaLabel}
                  aria-pressed={isCompletionInput}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== "touch") onEnter(lv);
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== "touch") onLeave();
                  }}
                  onFocus={() => focusPoint(lv)}
                  onBlur={blurSelection}
                  onClick={(event) => onPointTap(lv, event.detail > 0)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onPointTap(lv);
                    }
                  }}
                  style={S_CURSOR_POINTER}
                >
                  <circle cx={p.x} cy={p.y} r={DOT_R + 12} fill="transparent" />
                  <circle className="theory-fano-point-affordance" cx={p.x} cy={p.y} r={DOT_R + 7} />
                  {active && !completionRole && (
                    <circle cx={p.x} cy={p.y} r={DOT_R + 4} fill="none" stroke="#b4c4ff" strokeWidth={1.25} opacity={0.7} />
                  )}
                  {completionRole && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={DOT_R + 5}
                      fill="none"
                      stroke={completionRole === "c" ? C.accentBright : "#fff"}
                      strokeWidth={1.5}
                      strokeDasharray={completionRole === "c" ? "3 2" : "none"}
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={DOT_R}
                    fill={info.color}
                    fillOpacity={dim ? 0.3 : 1}
                    stroke={dim ? info.color : "#fff"}
                    strokeWidth={active ? 1.5 : 1}
                    strokeOpacity={dim ? 0.5 : 0.8}
                  />
                  <text
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={900}
                    fontFamily="var(--font-mono)"
                    fill={dim ? "#aaaac4" : levelLabelColor(lv)}
                  >
                    {info.bits.join("")}
                  </text>
                  {completionRole && (
                    <text
                      x={p.x + DOT_R + 4}
                      y={p.y - DOT_R - 4}
                      textAnchor="middle"
                      fontSize={FS.xs}
                      fontFamily="var(--font-mono)"
                      fontWeight={FW.bold}
                      fill={completionRole === "c" ? C.accentBright : "#fff"}
                    >
                      {completionRole}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="theory-fano-completion-slot">
            <div data-testid="fano-completion-status" role="status" aria-live="polite" className="theory-fano-completion-status">
              {completionA === null ? (
                t("theory_fano_completion_select_first")
              ) : completionB === null || completionC === null ? (
                t("theory_fano_completion_select_second", THEORY_LEVELS[completionA].short)
              ) : (
                <>
                  <div className="theory-fano-completion-equation">
                    {THEORY_LEVELS[completionA].short}
                    <sub>{completionA}</sub> ⊕ {THEORY_LEVELS[completionB].short}
                    <sub>{completionB}</sub> = {THEORY_LEVELS[completionC].short}
                    <sub>{completionC}</sub>
                  </div>
                  <div className="theory-fano-completion-bits">
                    {THEORY_LEVELS[completionA].bits.join("")} ⊕ {THEORY_LEVELS[completionB].bits.join("")} ⊕{" "}
                    {THEORY_LEVELS[completionC].bits.join("")} = 000
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="theory-fano-controls" role="group" aria-label={t("theory_fano_filter_label")}>
            {LINE_CATEGORIES.map((filter) => {
              const label =
                filter === "primary"
                  ? t("theory_fano_show_primary")
                  : filter === "complement"
                    ? t("theory_fano_show_complement")
                    : t("theory_fano_show_secondary");
              const meaning =
                filter === "primary"
                  ? t("theory_fano_primary")
                  : filter === "complement"
                    ? t("theory_fano_complement")
                    : t("theory_fano_secondary");
              return (
                <button
                  key={filter}
                  type="button"
                  data-fano-filter={filter}
                  data-category={filter}
                  aria-label={meaning}
                  title={meaning}
                  aria-pressed={visibleCategories[filter]}
                  onClick={() => {
                    clearSelection();
                    setVisibleCategories((previous) => ({ ...previous, [filter]: !previous[filter] }));
                  }}
                >
                  <i aria-hidden="true" />
                  <span>{label}</span>
                  <small>{filter === "secondary" ? 1 : 3}</small>
                </button>
              );
            })}
          </div>
          <div className="theory-fano-line-choices" role="group" aria-label={t("theory_fano_lines_label")}>
            {FANO_LINES.map((line, index) => (
              <button
                key={index}
                type="button"
                data-fano-line-choice={line.join("-")}
                data-category={FANO_LINE_CATEGORIES[index]}
                data-active={activeLine === index}
                aria-label={t("theory_fano_select_line", line.map((point) => THEORY_LEVELS[point].short).join("–"))}
                aria-pressed={selectedLine === index || completedLine === index}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") enterLine(index);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== "touch") setPreviewLine(null);
                }}
                onFocus={() => setFocusPreview({ kind: "line", value: index })}
                onBlur={blurSelection}
                onClick={(event) => selectLine(index, event.detail > 0)}
              >
                {line.map((point) => (
                  <span key={point}>
                    <i style={{ background: THEORY_LEVELS[point].color }} aria-hidden="true" />
                  </span>
                ))}
              </button>
            ))}
          </div>
        </div>
        <FanoHammingMatrix
          activePoints={Array.from(hlPoints)}
          selectedPoints={selectedPoints}
          onPointEnter={onEnter}
          onPointLeave={onLeave}
          onPointSelect={onPointTap}
          onPointFocus={focusPoint}
          onPointBlur={blurSelection}
        />
      </div>
    </div>
  );
});
