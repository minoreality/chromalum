import React, { useState, useCallback, useEffect, useRef } from "react";
import { THEORY_LEVELS, FANO_LINES, FANO_LINE_CATEGORIES, FANO_LINE_ENDPOINTS, FANO_POINTS, FANO_CIRCLE } from "../../data/theory-data";
import { C, FS, FW, SP, FONT } from "../../styles/tokens";
import { usePinReset } from "./pin-reset";
import { S_BTN, S_CURSOR_POINTER, S_THEORY_BTN, S_THEORY_BTN_ACTIVE } from "../../styles/shared";
import { useTranslation } from "../../i18n";

const W = 300,
  H = 245,
  VB_Y = 10;
const DOT_R = 14;
const CX = 150,
  CY = 160;

type LineFilter = "all" | "primary" | "complement" | "secondary";
type CompletionPair = [] | [number] | [number, number];

function linesThrough(point: number): number[] {
  return FANO_LINES.map((line, i) => (line.includes(point) ? i : -1)).filter((i) => i >= 0);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function toggleMaskLabel(level: number): string {
  return `τ${["G", "R", "B"].filter((_, index) => THEORY_LEVELS[level].bits[index] === 1).join("")}`;
}

// Collapsed line positions (all on one horizontal line — the CMY line)
const CMY_LINE_TARGETS: Record<number, { x: number; y: number }> = {
  3: { x: CX - 80, y: CY }, // M
  5: { x: CX, y: CY }, // C
  6: { x: CX + 80, y: CY }, // Y
};

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

export const FanoPlane = React.memo(function FanoPlane({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const [pinned, setPinned] = useState<number | null>(null);
  const [lineFilter, setLineFilter] = useState<LineFilter>("all");
  const [cmyMode, setCmyMode] = useState(false);
  const [completionMode, setCompletionMode] = useState(false);
  const [completionPair, setCompletionPair] = useState<CompletionPair>([]);
  const [animT, setAnimT] = useState(0); // 0=normal Fano, 1=CMY collapsed to line
  const animTRef = useRef(0);
  const reducedMotion = useRef(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const resetSelection = useCallback((_value: null) => {
    setPinned(null);
    setCompletionPair([]);
  }, []);
  usePinReset(resetSelection);

  useEffect(() => {
    if (reducedMotion.current) {
      const target = cmyMode ? 1 : 0;
      animTRef.current = target;
      setAnimT(target);
      return;
    }
    let raf = 0;
    const step = cmyMode ? 0.02 : -0.03;
    const animate = () => {
      const prev = animTRef.current;
      const next = Math.max(0, Math.min(1, prev + step));
      animTRef.current = next;
      setAnimT(next);
      if ((cmyMode && next < 1) || (!cmyMode && next > 0)) {
        raf = requestAnimationFrame(animate);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [cmyMode]);

  const completionA = completionPair[0] ?? null;
  const completionB = completionPair[1] ?? null;
  const completionC = completionA !== null && completionB !== null ? completionA ^ completionB : null;
  const completedLine =
    completionA !== null && completionB !== null && completionC !== null
      ? FANO_LINES.findIndex((line) => line.includes(completionA) && line.includes(completionB) && line.includes(completionC))
      : -1;

  // A persistent two-point construction takes priority over the shared one-point highlight.
  const externalHl = hlLevel !== null && hlLevel >= 1 && hlLevel <= 7 ? hlLevel : null;
  const hl = completionMode ? (completionA ?? externalHl) : (externalHl ?? pinned);
  const hlLines = completedLine >= 0 ? [completedLine] : hl !== null ? linesThrough(hl) : [];
  const hlPoints = new Set<number>();
  if (completedLine >= 0) {
    for (const point of FANO_LINES[completedLine]) hlPoints.add(point);
  } else if (hl !== null) {
    hlPoints.add(hl);
    for (const li of hlLines) for (const p of FANO_LINES[li]) hlPoints.add(p);
  }

  const onEnter = useCallback((lv: number) => onHover(lv), [onHover]);
  const onLeave = useCallback(() => onHover(null), [onHover]);
  const onTap = useCallback(
    (lv: number) => {
      setPinned((prev) => {
        const next = prev === lv ? null : lv;
        queueMicrotask(() => onHover(next));
        return next;
      });
    },
    [onHover],
  );

  const onCompletionTap = useCallback((lv: number) => {
    setCompletionPair((current) => {
      if (current.length === 0) return [lv];
      if (current.length === 1) return current[0] === lv ? [] : [current[0], lv];
      if (current[0] === lv) return [];
      if (current[1] === lv) return [current[0]];
      return [current[0], lv];
    });
  }, []);

  const onPointTap = useCallback(
    (lv: number) => {
      if (completionMode) {
        onCompletionTap(lv);
        return;
      }
      onTap(lv);
    },
    [completionMode, onCompletionTap, onTap],
  );

  const toggleCompletionMode = useCallback(() => {
    const next = !completionMode;
    setCompletionMode(next);
    setCompletionPair([]);
    setPinned(null);
    onHover(null);
    if (next) setCmyMode(false);
  }, [completionMode, onHover]);

  const isLineVisible = (li: number) => {
    if (lineFilter === "all") return true;
    return FANO_LINE_CATEGORIES[li] === lineFilter;
  };

  // Compute animated positions for CMY points: direct lerp from Fano midpoints to collapsed line
  const getPos = (lv: number): { x: number; y: number } => {
    if (animT <= 0 || ![3, 5, 6].includes(lv)) return FANO_POINTS[lv];
    const orig = FANO_POINTS[lv];
    const lineTarget = CMY_LINE_TARGETS[lv];
    return { x: lerp(orig.x, lineTarget.x, animT), y: lerp(orig.y, lineTarget.y, animT) };
  };

  const isCmyAnimating = animT > 0;
  // RGB points fade out during CMY animation
  const rgbOpacity = 1 - animT * 0.8;
  // Non-CMY lines fade out
  const lineOpacityMul = isCmyAnimating ? 1 - animT * 0.7 : 1;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SP.md }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && completionPair.length > 0) {
          resetSelection(null);
          onHover(null);
        }
      }}
    >
      <svg viewBox={`0 ${VB_Y} ${W} ${H}`} style={{ width: "100%", maxWidth: W }} role="group" aria-label={t("theory_fano_title")}>
        {/* Lines (fade during CMY animation) */}
        {FANO_LINES.map((_, li) => {
          if (!isLineVisible(li) && completedLine !== li) return null;
          const active = hlLines.includes(li);
          const dim = hl !== null && !active;
          const cat = FANO_LINE_CATEGORIES[li];
          const baseOpacity = dim ? 0.12 : active ? (completedLine === li ? 1 : 0.72) : 0.3;
          const strokeColor = cat === "primary" ? "#80a0ff" : cat === "complement" ? "#ffa060" : "#60ffa0";
          const strokeDash = "none";
          const isCmyLine = li === 6; // The CMY circle/line
          const finalOpacity = isCmyLine ? baseOpacity : baseOpacity * lineOpacityMul;

          if (isCmyLine) {
            if (isCmyAnimating) {
              const p3 = getPos(3),
                p6 = getPos(6);
              // Crossfade circle → straight line over second half of animation,
              // once points are near-collinear
              const collapseT = Math.max(0, (animT - 0.5) / 0.5);
              const circleOpacity = baseOpacity * (1 - collapseT);
              const lineOp = baseOpacity * collapseT;
              // Extend the line 30% beyond p3 and p6 on each side
              const dx = p6.x - p3.x,
                dy = p6.y - p3.y;
              return (
                <g key={"fl" + li}>
                  {circleOpacity > 0.01 && (
                    <circle
                      cx={FANO_CIRCLE.cx}
                      cy={FANO_CIRCLE.cy}
                      r={FANO_CIRCLE.r}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={1.2}
                      opacity={circleOpacity}
                    />
                  )}
                  {lineOp > 0.01 && (
                    <line
                      x1={p3.x - dx * 0.3}
                      y1={p3.y - dy * 0.3}
                      x2={p6.x + dx * 0.3}
                      y2={p6.y + dy * 0.3}
                      stroke="#ff4444"
                      strokeWidth={2.5}
                      opacity={lineOp * 0.8}
                    />
                  )}
                </g>
              );
            }
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
                strokeWidth={completedLine === li ? 3 : active ? 2 : 1.2}
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
              strokeWidth={completedLine === li ? 3 : active ? 2 : 1.2}
              strokeDasharray={strokeDash}
              opacity={finalOpacity}
            />
          );
        })}

        {/* Bit cancellation + toggle-composition closure for highlighted lines */}
        {!isCmyAnimating &&
          !completionMode &&
          hlLines
            .filter((li) => isLineVisible(li) || completedLine === li)
            .map((li) => {
              const line = FANO_LINES[li];
              const mid = {
                x: (FANO_POINTS[line[0]].x + FANO_POINTS[line[1]].x + FANO_POINTS[line[2]].x) / 3,
                y: (FANO_POINTS[line[0]].y + FANO_POINTS[line[1]].y + FANO_POINTS[line[2]].y) / 3,
              };
              // For complement lines (through center 7), use midpoint of the two non-7 endpoints
              const cat = FANO_LINE_CATEGORIES[li];
              const isComplement = cat === "complement";
              const nonCenter = line.filter((p) => p !== 7);
              const anchor =
                isComplement && nonCenter.length === 2
                  ? {
                      x: (FANO_POINTS[nonCenter[0]].x + FANO_POINTS[nonCenter[1]].x) / 2,
                      y: (FANO_POINTS[nonCenter[0]].y + FANO_POINTS[nonCenter[1]].y) / 2,
                    }
                  : mid;
              const dx = anchor.x - FANO_CIRCLE.cx,
                dy = anchor.y - FANO_CIRCLE.cy;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const push = 32;
              const ox = anchor.x + (dx / dist) * push,
                oy = anchor.y + (dy / dist) * push;
              const labelColor = cat === "primary" ? "#80a0ff" : cat === "complement" ? "#ffa060" : "#60ffa0";
              const algebraLabel = `${line.map((lv) => THEORY_LEVELS[lv].bits.join("")).join("\u2295")}=000`;
              const closureLabel = `${line.map(toggleMaskLabel).join("·")}=id`;
              return (
                <g key={"eq" + li}>
                  <text
                    x={ox}
                    y={oy - 6}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={FS.sm}
                    fontFamily="var(--font-mono)"
                    fill={labelColor}
                    fontWeight={FW.bold}
                  >
                    {algebraLabel}
                  </text>
                  <text
                    x={ox}
                    y={oy + 6}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={FS.xs}
                    fontFamily="var(--font-mono)"
                    fill={labelColor}
                    opacity={0.8}
                  >
                    {closureLabel}
                  </text>
                </g>
              );
            })}

        {/* CMY collapse equation label */}
        {isCmyAnimating && animT > 0.6 && (
          <g opacity={Math.min(1, (animT - 0.6) * 3)}>
            <text x={CX} y={CY - 60} textAnchor="middle" fontSize={FS.md} fontFamily="var(--font-mono)" fontWeight={FW.bold} fill="#ff6644">
              {t("theory_fano_cmy_eq")}
            </text>
            {animT > 0.85 && (
              <text
                x={CX}
                y={CY - 46}
                textAnchor="middle"
                fontSize={FS.xs}
                fontFamily="var(--font-mono)"
                fill={C.textDimmer}
                opacity={Math.min(1, (animT - 0.85) * 6)}
              >
                {t("theory_fano_cmy_why")}
              </text>
            )}
          </g>
        )}

        {/* Points */}
        {[1, 2, 3, 4, 5, 6, 7].map((lv) => {
          const p = getPos(lv);
          const info = THEORY_LEVELS[lv];
          const active = hlPoints.has(lv);
          const dim = hl !== null && !active;
          const isCmy = [3, 5, 6].includes(lv);
          const isRgbOrW = [1, 2, 4, 7].includes(lv);
          // Dim node 7 when CMY closure line (li=6) is highlighted, so equation label is readable
          const cmyLineActive = hlLines.includes(6) && isLineVisible(6);
          const pointOpacity = isCmyAnimating && isRgbOrW ? rgbOpacity : lv === 7 && cmyLineActive ? 0.25 : 1;
          const pointR = DOT_R;
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
              data-fano-selection-role={completionRole ?? undefined}
              role="button"
              tabIndex={0}
              aria-label={pointAriaLabel}
              aria-pressed={completionMode ? isCompletionInput : pinned === lv}
              onMouseEnter={() => onEnter(lv)}
              onMouseLeave={onLeave}
              onFocus={() => onEnter(lv)}
              onBlur={onLeave}
              onClick={() => onPointTap(lv)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPointTap(lv);
                }
              }}
              style={S_CURSOR_POINTER}
              opacity={pointOpacity}
            >
              <circle cx={p.x} cy={p.y} r={DOT_R + 6} fill="transparent" />
              {active && <circle cx={p.x} cy={p.y} r={DOT_R + 4} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />}
              {completionRole && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={DOT_R + (completionRole === "b" ? 7 : 5)}
                  fill="none"
                  stroke={completionRole === "c" ? C.accentBright : "#fff"}
                  strokeWidth={completionRole === "c" ? 2 : 1.5}
                  strokeDasharray={completionRole === "c" ? "3 2" : "none"}
                />
              )}
              {/* Red border for CMY during animation */}
              {isCmyAnimating && isCmy && animT > 0.4 && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={pointR + 4}
                  fill="none"
                  stroke="#ff4444"
                  strokeWidth={1.5}
                  opacity={Math.min(1, (animT - 0.4) * 2)}
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={pointR}
                fill={info.color}
                fillOpacity={dim ? 0.2 : 0.85}
                stroke={dim ? info.color : "#fff"}
                strokeWidth={active ? 2.5 : 1.5}
                strokeOpacity={dim ? 0.3 : 0.8}
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={FS.lg}
                fontWeight={900}
                fontFamily="var(--font-mono)"
                fill={lv >= 4 ? "#000" : "#fff"}
                opacity={dim ? 0.3 : 1}
              >
                {lv}
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

        {/* Bit labels under CMY points during animation */}
        {isCmyAnimating &&
          animT > 0.3 &&
          [3, 5, 6].map((lv) => {
            const p = getPos(lv);
            const info = THEORY_LEVELS[lv];
            return (
              <text
                key={"bl" + lv}
                x={p.x}
                y={Math.min(p.y + DOT_R + 14, 244)}
                textAnchor="middle"
                fontSize={FS.xs}
                fontFamily="var(--font-mono)"
                fill={info.color}
                opacity={Math.min(1, (animT - 0.3) * 3)}
              >
                {info.bits.join("")}
              </text>
            );
          })}
      </svg>

      {completionMode && (
        <div
          data-testid="fano-completion-status"
          role="status"
          aria-live="polite"
          style={{ minHeight: 42, textAlign: "center", fontFamily: FONT.mono, fontSize: FS.sm, color: C.textMuted }}
        >
          {completionA === null ? (
            t("theory_fano_completion_select_first")
          ) : completionB === null || completionC === null ? (
            t("theory_fano_completion_select_second", THEORY_LEVELS[completionA].short)
          ) : (
            <>
              <div style={{ color: C.textPrimary }}>
                {THEORY_LEVELS[completionA].short}
                <sub>{completionA}</sub> ⊕ {THEORY_LEVELS[completionB].short}
                <sub>{completionB}</sub> = {THEORY_LEVELS[completionC].short}
                <sub>{completionC}</sub>
              </div>
              <div style={{ marginTop: SP.xs }}>
                {THEORY_LEVELS[completionA].bits.join("")} ⊕ {THEORY_LEVELS[completionB].bits.join("")} ⊕{" "}
                {THEORY_LEVELS[completionC].bits.join("")} = 000
              </div>
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: SP.xl,
          justifyContent: "center",
          flexWrap: "wrap",
          visibility: isCmyAnimating ? "hidden" : "visible",
        }}
        aria-hidden={isCmyAnimating || undefined}
      >
        {[
          { label: t("theory_fano_primary"), color: "#80a0ff", dash: "none" },
          { label: t("theory_fano_complement"), color: "#ffa060", dash: "none" },
          { label: t("theory_fano_secondary"), color: "#60ffa0", dash: "none" },
        ].map((item, i) => (
          <span
            key={"lg" + i}
            className="theory-annotation"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: FS.xs, fontFamily: FONT.mono, color: item.color }}
          >
            <svg width={18} height={2} aria-hidden="true" focusable="false">
              <line x1={0} y1={1} x2={18} y2={1} stroke={item.color} strokeWidth={2} strokeDasharray={item.dash} />
            </svg>
            {item.label}
          </span>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap", justifyContent: "center" }}>
        {(["all", "primary", "complement", "secondary"] as const).map((f) => {
          const label =
            f === "all"
              ? t("theory_fano_show_all")
              : f === "primary"
                ? t("theory_fano_show_primary")
                : f === "complement"
                  ? t("theory_fano_show_complement")
                  : t("theory_fano_show_secondary");
          return (
            <button
              key={f}
              className="theory-annotation theory-diagram-button"
              style={{
                ...(lineFilter === f ? S_THEORY_BTN_ACTIVE : S_THEORY_BTN),
                visibility: cmyMode ? "hidden" : "visible",
                marginLeft: f === "primary" ? SP.xl : undefined,
              }}
              onClick={() => setLineFilter(f)}
              disabled={cmyMode}
              aria-hidden={cmyMode || undefined}
              aria-pressed={lineFilter === f}
              tabIndex={cmyMode ? -1 : undefined}
            >
              {label}
            </button>
          );
        })}
        <button
          className="theory-annotation theory-diagram-button"
          style={{
            ...S_BTN,
            background: cmyMode ? S_BTN.background : "rgba(15,15,26,0.5)",
            borderColor: cmyMode ? "rgba(255,100,100,0.6)" : C.border,
            color: cmyMode ? "#ff6644" : C.textMuted,
            marginLeft: SP.xl,
          }}
          onClick={() => setCmyMode((v) => !v)}
          disabled={completionMode}
          aria-disabled={completionMode}
        >
          {t("theory_fano_cmy_collapse")} <span aria-hidden="true">{cmyMode ? "\u25c0" : "\u25b6"}</span>
        </button>
        <button
          type="button"
          className="theory-annotation theory-diagram-button"
          style={{
            ...(completionMode ? S_THEORY_BTN_ACTIVE : S_THEORY_BTN),
            marginLeft: SP.xl,
          }}
          aria-pressed={completionMode}
          onClick={toggleCompletionMode}
        >
          {t("theory_fano_completion_mode")}
        </button>
      </div>
    </div>
  );
});
