import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  THEORY_LEVELS,
  CUBE_EDGES,
  CUBE_POINTS,
  GRAY_PATH,
  edgeChannel,
  isBackEdge,
  STELLA_EDGES,
  COMPLEMENT_EDGES,
} from "../../data/theory-data";
import { C, FS, SP, FONT } from "../../styles/tokens";
import { usePinReset } from "./pin-reset";
import { S_CURSOR_POINTER, S_THEORY_BTN, S_THEORY_BTN_ACTIVE } from "../../styles/shared";
import { useTranslation } from "../../i18n";
import {
  canonicalColorCubeMixOperands,
  colorCubeMixFamily,
  colorCubeMixResult,
  isColorCubeMixEligible,
  type ColorCubeMixFamily,
} from "./color-cube-mixing";

const DOT_R = 11;
const SUBSCRIPT = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇"] as const;

function edgesOf(v: number): number[] {
  return CUBE_EDGES.map((e, i) => (e[0] === v || e[1] === v ? i : -1)).filter((i) => i >= 0);
}

const CHANNEL_COLORS: Record<string, string> = { G: "#00ff00", R: "#ff0000", B: "#0000ff" };

function rankedLabel(level: number): string {
  return `${THEORY_LEVELS[level].short}${SUBSCRIPT[level]}`;
}

function bitLabel(level: number): string {
  return `${THEORY_LEVELS[level].bits.join("")}(${THEORY_LEVELS[level].short})`;
}

function shortenedLine(from: { x: number; y: number }, to: { x: number; y: number }, startGap: number, endGap: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  return {
    x1: from.x + ux * startGap,
    y1: from.y + uy * startGap,
    x2: to.x - ux * endGap,
    y2: to.y - uy * endGap,
  };
}

function isSubset(subset: number, superset: number): boolean {
  return (subset & superset) === subset;
}

function directedMixCoverEdges(
  operands: readonly number[],
  family: ColorCubeMixFamily | null,
  result: number | null,
): readonly (readonly [number, number])[] {
  if (family === null || result === null) return [];
  if (operands.length === 2) return operands.map((operand) => [operand, result] as const);
  if (operands.length !== 3) return [];

  return CUBE_EDGES.flatMap(([a, b]) => {
    const [lower, upper] = isSubset(a, b) ? [a, b] : [b, a];
    const liesOnMixPath =
      family === "rgb"
        ? operands.some((operand) => isSubset(operand, lower)) && isSubset(upper, result)
        : operands.some((operand) => isSubset(upper, operand)) && isSubset(result, lower);
    if (!liesOnMixPath) return [];
    return [family === "rgb" ? ([lower, upper] as const) : ([upper, lower] as const)];
  });
}

// Hasse diagram target positions = pure linear projection of the cube onto a
// body-diagonal-vertical viewpoint. x-coordinates match the isometric cube exactly
// (so the transform is "camera rotation", no vertex crosses horizontally).
// y = 210 − 50·(g+r+b), putting rank-0 at y=210 and rank-3 at y=60.
const HASSE_POINTS: Record<number, { x: number; y: number }> = {
  0: { x: 150, y: 210 },
  1: { x: 89.37822173508928, y: 160 },
  2: { x: 150, y: 160 },
  3: { x: 89.37822173508928, y: 110 },
  4: { x: 210.62177826491072, y: 160 },
  5: { x: 150, y: 110 },
  6: { x: 210.62177826491072, y: 110 },
  7: { x: 150, y: 60 },
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Smoothstep easing for camera-rotation feel.
function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

// Set notation labels shown when Hasse mode is active.
const SET_LABELS: Record<number, string> = {
  0: "\u2205",
  1: "{B}",
  2: "{R}",
  3: "{R, B}",
  4: "{G}",
  5: "{G, B}",
  6: "{G, R}",
  7: "{G, R, B}",
};

// Placement relative to each vertex in Hasse layout.
const SET_LABEL_OFFSETS: Record<number, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  0: { dx: 0, dy: 18, anchor: "middle" },
  1: { dx: -14, dy: 0, anchor: "end" },
  2: { dx: 0, dy: -16, anchor: "middle" },
  3: { dx: -13, dy: 0, anchor: "end" },
  4: { dx: 14, dy: 0, anchor: "start" },
  5: { dx: 0, dy: 16, anchor: "middle" },
  6: { dx: 13, dy: 0, anchor: "start" },
  7: { dx: 0, dy: -16, anchor: "middle" },
};

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

export const ColorCube = React.memo(function ColorCube({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const [pinned, setPinned] = useState<number | null>(null);
  const [equatorMode, setEquatorMode] = useState(false);
  const [showComplements, setShowComplements] = useState(false);
  const [showK8, setShowK8] = useState(false);
  const [hasseMode, setHasseMode] = useState(false);
  const [mixActive, setMixActive] = useState(false);
  const [mixOperands, setMixOperands] = useState<number[]>([]);
  const [animT, setAnimT] = useState(0);
  const animTRef = useRef(0);
  const reducedMotion = useRef(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const clearMixOperands = useCallback((_value: null) => setMixOperands([]), []);
  usePinReset(setPinned);
  usePinReset(clearMixOperands);

  useEffect(() => {
    if (reducedMotion.current) {
      const target = hasseMode ? 1 : 0;
      animTRef.current = target;
      setAnimT(target);
      return;
    }
    let raf = 0;
    const step = hasseMode ? 0.03 : -0.04;
    const animate = () => {
      const prev = animTRef.current;
      const next = Math.max(0, Math.min(1, prev + step));
      animTRef.current = next;
      setAnimT(next);
      if ((hasseMode && next < 1) || (!hasseMode && next > 0)) {
        raf = requestAnimationFrame(animate);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [hasseMode]);

  useEffect(() => {
    if (!mixActive) return;
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMixOperands([]);
    };
    window.addEventListener("keydown", clearOnEscape);
    return () => window.removeEventListener("keydown", clearOnEscape);
  }, [mixActive]);

  const mixFamily = mixOperands.length > 0 ? colorCubeMixFamily(mixOperands[0]) : null;
  const mixResult = mixFamily === null ? null : colorCubeMixResult(mixOperands, mixFamily);
  const orderedMixOperands = mixFamily === null ? mixOperands : canonicalColorCubeMixOperands(mixOperands, mixFamily);
  const mixOperator = mixFamily === "cmy" ? "∧" : "∨";
  const mixFormula =
    mixResult === null ? null : `${orderedMixOperands.map(rankedLabel).join(` ${mixOperator} `)} = ${rankedLabel(mixResult)}`;
  const mixBitFormula = mixResult === null ? null : `${orderedMixOperands.map(bitLabel).join(` ${mixOperator} `)} = ${bitLabel(mixResult)}`;
  const mixOperandSet = new Set(mixOperands);
  const mixCoverEdges = directedMixCoverEdges(mixOperands, mixFamily, mixResult);
  const mixIntermediateSet = new Set(
    mixCoverEdges.flatMap(([from, to]) => [from, to]).filter((level) => !mixOperandSet.has(level) && level !== mixResult),
  );

  const hl = mixActive ? null : hlLevel !== null && hlLevel >= 0 && hlLevel <= 7 ? hlLevel : pinned;
  const hlEdges = hl !== null ? edgesOf(hl) : [];
  const hlVerts = new Set<number>();
  if (hl !== null) {
    hlVerts.add(hl);
    for (const ei of hlEdges) {
      hlVerts.add(CUBE_EDGES[ei][0]);
      hlVerts.add(CUBE_EDGES[ei][1]);
    }
  }

  const onEnter = useCallback(
    (lv: number) => {
      if (!mixActive) onHover(lv);
    },
    [mixActive, onHover],
  );
  const onLeave = useCallback(() => {
    if (!mixActive) onHover(null);
  }, [mixActive, onHover]);
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
  const onMixTap = useCallback((lv: number) => {
    setMixOperands((previous) => {
      if (previous.includes(lv)) return previous.filter((operand) => operand !== lv);
      const family = previous.length > 0 ? colorCubeMixFamily(previous[0]) : null;
      if (!isColorCubeMixEligible(lv, family) || previous.length >= 3) return previous;
      return [...previous, lv];
    });
  }, []);
  const onMixModeToggle = useCallback(() => {
    setPinned(null);
    setMixOperands([]);
    onHover(null);
    setMixActive((active) => !active);
  }, [onHover]);

  const getPos = (lv: number) => {
    const cube = CUBE_POINTS[lv];
    if (animT <= 0) return cube;
    const hasse = HASSE_POINTS[lv];
    const t = smoothstep(animT);
    return { x: lerp(cube.x, hasse.x, t), y: lerp(cube.y, hasse.y, t) };
  };

  const isEquator = (lv: number) => lv !== 0 && lv !== 7;

  // Equator path (hexagonal outline connecting the 6 chromatic vertices on the cube)
  const equatorPath =
    GRAY_PATH.map((lv, i) => {
      const p = getPos(lv);
      return (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1);
    }).join(" ") + "Z";

  const highlightedEdgeDetails =
    hl === null
      ? []
      : hlEdges.map((edgeIndex) => {
          const [a, b] = CUBE_EDGES[edgeIndex];
          const other = a === hl ? b : a;
          const mask = hl ^ other;
          const channel = edgeChannel(hl, other);
          return { other, mask, channel };
        });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SP.md }}>
      <svg
        viewBox="30 35 240 195"
        style={{ width: "100%", maxWidth: 360 }}
        role={mixActive ? "group" : "img"}
        aria-label={mixActive ? t("theory_cube_mix_aria") : t("theory_cube_title")}
        onClick={(event) => {
          if (mixActive && event.target === event.currentTarget) setMixOperands([]);
        }}
      >
        {mixActive && mixCoverEdges.length > 0 && (
          <defs>
            <marker
              id="cube-mix-arrow"
              viewBox="0 0 6 6"
              refX={5}
              refY={3}
              markerWidth={mixOperands.length === 2 ? 5 : 4}
              markerHeight={mixOperands.length === 2 ? 5 : 4}
              orient="auto"
            >
              <path d="M 0 0 L 6 3 L 0 6 Z" fill={C.textWhite} />
            </marker>
          </defs>
        )}

        {/* Equator path (toggle overlay) */}
        {!mixActive && equatorMode && (
          <path d={equatorPath} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.40)" strokeWidth={1.5} strokeDasharray="4,3" />
        )}

        {/* Complement diagonals (all 4 body diagonals) */}
        {!mixActive &&
          showComplements &&
          COMPLEMENT_EDGES.map(([a, b]) => {
            const pa = getPos(a),
              pb = getPos(b);
            const la = THEORY_LEVELS[a],
              lb = THEORY_LEVELS[b];
            const grad = `url(#compGrad${a}${b})`;
            return (
              <g key={"comp" + a + b}>
                <defs>
                  <linearGradient id={`compGrad${a}${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={la.color} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={lb.color} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <line
                  data-testid={`cube-complement-${a}-${b}`}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke={grad}
                  strokeWidth={1.5}
                  strokeDasharray="6,4"
                  opacity={0.7}
                />
              </g>
            );
          })}

        {/* K₈ distance-2 edges (stella octangula) */}
        {!mixActive &&
          showK8 &&
          STELLA_EDGES.map(([a, b], i) => {
            const pa = getPos(a),
              pb = getPos(b);
            return (
              <line
                key={"stella" + i}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1}
                strokeDasharray="5,3"
              />
            );
          })}

        {/* K₈ distance-3 edges (complement matching) */}
        {!mixActive &&
          showK8 &&
          COMPLEMENT_EDGES.map(([a, b], i) => {
            const pa = getPos(a),
              pb = getPos(b);
            const la = THEORY_LEVELS[a],
              lb = THEORY_LEVELS[b];
            const gradId = `k8Comp${a}${b}`;
            return (
              <g key={"k8c" + i}>
                <defs>
                  <linearGradient id={gradId} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={la.color} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={lb.color} stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={`url(#${gradId})`} strokeWidth={1.5} strokeDasharray="2,3" />
              </g>
            );
          })}

        {/* Edges */}
        {CUBE_EDGES.map((e, ei) => {
          const p0 = getPos(e[0]),
            p1 = getPos(e[1]);
          const back = isBackEdge(e[0], e[1]);
          const active = hlEdges.includes(ei);
          const dim = hl !== null && !active;
          const ch = edgeChannel(e[0], e[1]);
          const chColor = CHANNEL_COLORS[ch];
          const isEqEdge = isEquator(e[0]) && isEquator(e[1]);
          const edgeOpacity = mixActive ? 0.12 : dim ? 0.15 : active ? 0.9 : isEqEdge && equatorMode ? 0.6 : animT > 0.5 ? 0.55 : 0.4;
          return (
            <g key={"ce" + ei}>
              <line
                x1={p0.x}
                y1={p0.y}
                x2={p1.x}
                y2={p1.y}
                stroke={active || animT > 0.5 ? chColor : C.textDimmer}
                strokeWidth={active ? 2 : 1}
                strokeDasharray={back && !active && animT < 0.5 ? "3,3" : undefined}
                opacity={edgeOpacity}
              />
            </g>
          );
        })}

        {/* Directed cover edges show the pair result or every symmetric two-stage route to a triple result. */}
        {mixActive &&
          mixCoverEdges.map(([fromLevel, toLevel]) => {
            const from = getPos(fromLevel);
            const to = getPos(toLevel);
            const line = shortenedLine(from, to, DOT_R + 2, DOT_R + 5);
            return (
              <line
                key={`mix-arrow-${fromLevel}-${toLevel}`}
                data-testid={`cube-mix-edge-${fromLevel}-${toLevel}`}
                {...line}
                stroke={C.textWhite}
                strokeWidth={mixOperands.length === 2 ? 2 : 1.4}
                opacity={mixOperands.length === 2 ? 0.95 : 0.7}
                strokeDasharray={animT < 0.5 && isBackEdge(fromLevel, toLevel) ? "3,3" : undefined}
                markerEnd="url(#cube-mix-arrow)"
                pointerEvents="none"
              />
            );
          })}

        {/* Rank labels + Pascal counts with column headers (Hasse mode) */}
        {animT > 0 && (
          <g opacity={animT} pointerEvents="none">
            {/* Column headers */}
            <text
              x={42}
              y={40}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={FS.xxs}
              fontFamily="var(--font-mono)"
              fill={C.textPrimary}
            >
              rank
            </text>
            <text
              x={258}
              y={40}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={FS.xxs}
              fontFamily="var(--font-mono)"
              fill={C.textPrimary}
            >
              Pascal
            </text>
            {/* Rank + Pascal values per row */}
            {[
              { rank: 0, y: 210, count: 1 },
              { rank: 1, y: 160, count: 3 },
              { rank: 2, y: 110, count: 3 },
              { rank: 3, y: 60, count: 1 },
            ].map(({ rank, y, count }) => (
              <React.Fragment key={"rank" + rank}>
                <text
                  x={42}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={FS.xxs}
                  fontFamily="var(--font-mono)"
                  fill={C.textPrimary}
                >
                  {rank}
                </text>
                <text
                  x={258}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={FS.xxs}
                  fontFamily="var(--font-mono)"
                  fill={C.textPrimary}
                >
                  {count}
                </text>
              </React.Fragment>
            ))}
          </g>
        )}

        {/* Set notation labels (fade in with Hasse mode) */}
        {animT > 0 &&
          [0, 1, 2, 3, 4, 5, 6, 7].map((lv) => {
            const p = getPos(lv);
            const { dx, dy, anchor } = SET_LABEL_OFFSETS[lv];
            const active = hlVerts.has(lv);
            const dim = hl !== null && !active;
            const mixSelected = mixOperandSet.has(lv);
            const mixIsResult = mixResult === lv;
            const mixIntermediate = mixIntermediateSet.has(lv);
            const mixEligible = isColorCubeMixEligible(lv, mixFamily);
            const opacity = mixActive
              ? mixSelected || mixIsResult
                ? 1
                : mixIntermediate
                  ? 0.72
                  : mixEligible
                    ? 0.65
                    : 0.18
              : dim
                ? 0.3
                : active
                  ? 1
                  : 0.85;
            return (
              <text
                key={"setlabel" + lv}
                x={p.x + dx}
                y={p.y + dy}
                textAnchor={anchor}
                dominantBaseline="central"
                fontSize={FS.xxs}
                fontFamily="var(--font-mono)"
                fill={C.textMuted}
                opacity={animT * opacity}
                pointerEvents="none"
              >
                {SET_LABELS[lv]}
              </text>
            );
          })}

        {/* Vertices */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((lv) => {
          const p = getPos(lv);
          const info = THEORY_LEVELS[lv];
          const active = hlVerts.has(lv);
          const dim = hl !== null && !active;
          const mixInput = colorCubeMixFamily(lv) !== null;
          const mixSelected = mixOperandSet.has(lv);
          const mixIsResult = mixResult === lv;
          const mixIntermediate = mixIntermediateSet.has(lv);
          const mixEligible = isColorCubeMixEligible(lv, mixFamily);
          const mixDim = mixActive && !mixSelected && !mixIsResult && !mixIntermediate;
          const fillOpacity = mixActive
            ? mixSelected || mixIsResult
              ? 0.95
              : mixIntermediate
                ? 0.48
                : mixEligible
                  ? 0.62
                  : 0.12
            : dim
              ? 0.2
              : 0.85;
          const labelOpacity = mixActive
            ? mixSelected || mixIsResult
              ? 1
              : mixIntermediate
                ? 0.78
                : mixEligible
                  ? 0.72
                  : 0.2
            : dim
              ? 0.3
              : 1;
          const mixVertexLabel = !mixInput
            ? undefined
            : mixSelected
              ? t("theory_cube_mix_vertex_selected", rankedLabel(lv))
              : mixIntermediate
                ? t("theory_cube_mix_vertex_intermediate", rankedLabel(lv))
                : mixEligible
                  ? t("theory_cube_mix_vertex_selectable", rankedLabel(lv))
                  : t("theory_cube_mix_vertex_unavailable", rankedLabel(lv));
          return (
            <g
              key={"cv" + lv}
              data-level={lv}
              data-mix-state={
                mixActive
                  ? mixSelected
                    ? "operand"
                    : mixIsResult
                      ? "result"
                      : mixIntermediate
                        ? "intermediate"
                        : mixEligible
                          ? "eligible"
                          : "unavailable"
                  : undefined
              }
              role={mixActive && mixInput ? "button" : undefined}
              tabIndex={mixActive && mixInput && mixEligible ? 0 : undefined}
              aria-label={mixActive ? mixVertexLabel : undefined}
              aria-pressed={mixActive && mixInput ? mixSelected : undefined}
              aria-disabled={mixActive && mixInput ? !mixEligible : undefined}
              onMouseEnter={() => onEnter(lv)}
              onMouseLeave={onLeave}
              onClick={() => {
                if (mixActive) {
                  if (mixEligible) onMixTap(lv);
                } else {
                  onTap(lv);
                }
              }}
              onKeyDown={(event) => {
                if (!mixActive || !mixInput || !mixEligible) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onMixTap(lv);
                }
              }}
              style={mixActive ? (mixInput ? (mixEligible ? S_CURSOR_POINTER : { cursor: "not-allowed" }) : undefined) : S_CURSOR_POINTER}
            >
              <circle cx={p.x} cy={p.y} r={DOT_R + 6} fill="transparent" />
              {!mixActive && active && (
                <circle cx={p.x} cy={p.y} r={DOT_R + 4} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              )}
              {mixActive && mixSelected && (
                <circle data-mix-operand={lv} cx={p.x} cy={p.y} r={DOT_R + 4} fill="none" stroke={C.accentBright} strokeWidth={2} />
              )}
              {mixActive && mixIsResult && (
                <circle data-mix-result={lv} cx={p.x} cy={p.y} r={DOT_R + 5} fill="none" stroke={C.textWhite} strokeWidth={2.5} />
              )}
              {mixActive && mixIntermediate && (
                <circle
                  data-mix-intermediate={lv}
                  cx={p.x}
                  cy={p.y}
                  r={DOT_R + 3}
                  fill="none"
                  stroke={C.textWhite}
                  strokeWidth={1.25}
                  strokeOpacity={0.55}
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={DOT_R}
                fill={lv === 0 ? C.bgRoot : info.color}
                fillOpacity={fillOpacity}
                stroke={
                  mixActive && mixIsResult
                    ? C.textWhite
                    : mixActive && mixSelected
                      ? C.accentBright
                      : mixActive && mixIntermediate
                        ? C.textWhite
                        : mixDim || dim
                          ? lv === 0
                            ? C.textDimmer
                            : info.color
                          : "#fff"
                }
                strokeWidth={lv === 0 ? 1 : mixIsResult || mixSelected || active ? 2.5 : mixIntermediate ? 1.75 : 1.5}
                strokeOpacity={mixDim || dim ? 0.3 : mixIntermediate ? 0.65 : 0.8}
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={FS.md}
                fontWeight={900}
                fontFamily="var(--font-mono)"
                fill={lv >= 4 ? "#000" : "#fff"}
                opacity={labelOpacity * (1 - animT)}
              >
                {lv}
              </text>
              {animT > 0 && (
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={FS.sm}
                  fontWeight={900}
                  fontFamily="var(--font-mono)"
                  fill={lv >= 4 ? "#000" : "#fff"}
                  opacity={labelOpacity * animT}
                >
                  {THEORY_LEVELS[lv].bits.join("")}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div
        role={mixActive ? "status" : hl !== null ? "group" : undefined}
        aria-label={mixActive ? t("theory_cube_mix_status_aria") : hl !== null ? t("theory_cube_xor_edge_aria") : undefined}
        aria-live={mixActive ? "polite" : undefined}
        data-testid={mixActive ? "cube-mix-status" : undefined}
        style={{
          minHeight: mixActive ? 38 : 28,
          display: "flex",
          flexDirection: mixActive ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: mixActive ? SP.xs : SP.lg,
          flexWrap: "wrap",
          fontFamily: FONT.mono,
          fontSize: FS.xs,
          textAlign: "center",
        }}
      >
        {mixActive ? (
          mixFormula !== null && mixBitFormula !== null ? (
            <>
              <span style={{ color: C.textPrimary }}>
                <span style={{ color: C.textMuted }}>
                  {mixFamily === "rgb" ? t("theory_cube_mix_join") : t("theory_cube_mix_meet")}
                  {" · "}
                </span>
                <strong>{mixFormula}</strong>
              </span>
              <span style={{ color: C.textDimmer }}>{mixBitFormula}</span>
            </>
          ) : mixFamily === "rgb" ? (
            <span style={{ color: C.textDimmer }}>{t("theory_cube_mix_rgb_hint", rankedLabel(mixOperands[0]))}</span>
          ) : mixFamily === "cmy" ? (
            <span style={{ color: C.textDimmer }}>{t("theory_cube_mix_cmy_hint", rankedLabel(mixOperands[0]))}</span>
          ) : (
            <span style={{ color: C.textDimmer }}>{t("theory_cube_mix_hint")}</span>
          )
        ) : hl === null ? (
          <span style={{ color: C.textDimmer }}>{t("theory_cube_xor_edge_hint")}</span>
        ) : (
          highlightedEdgeDetails.map(({ other, mask, channel }) => (
            <span
              key={other}
              data-edge-mask={mask}
              style={{
                color: CHANNEL_COLORS[channel],
                border: `1px solid ${CHANNEL_COLORS[channel]}`,
                borderRadius: 3,
                padding: "2px 4px",
              }}
            >
              {THEORY_LEVELS[hl].bits.join("")}⊕{THEORY_LEVELS[other].bits.join("")}={THEORY_LEVELS[mask].bits.join("")} · {channel}
            </span>
          ))
        )}
      </div>

      <div
        style={{
          fontSize: FS.xs,
          color: C.textDimmer,
          textAlign: "center",
          fontFamily: FONT.mono,
          visibility: !mixActive && showK8 ? "visible" : "hidden",
        }}
      >
        {"K\u2088 = Q\u2083 \u222A (K\u2084\u2294K\u2084) \u222A M\u2084"}
      </div>

      <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap", justifyContent: "center" }}>
        {mixActive ? (
          <>
            <button
              className="theory-annotation theory-diagram-button"
              style={hasseMode ? S_THEORY_BTN_ACTIVE : S_THEORY_BTN}
              onClick={() => setHasseMode((v) => !v)}
              aria-pressed={hasseMode}
            >
              {t("theory_cube_hasse")}
            </button>
            <button className="theory-annotation theory-diagram-button" style={S_THEORY_BTN_ACTIVE} onClick={onMixModeToggle} aria-pressed>
              {t("theory_cube_mix_exit")}
            </button>
          </>
        ) : (
          <>
            <button
              className="theory-annotation theory-diagram-button"
              style={equatorMode ? S_THEORY_BTN_ACTIVE : S_THEORY_BTN}
              onClick={() => setEquatorMode((v) => !v)}
              aria-pressed={equatorMode}
            >
              {t("theory_cube_equator")}
            </button>
            <button
              className="theory-annotation theory-diagram-button"
              style={showComplements ? S_THEORY_BTN_ACTIVE : S_THEORY_BTN}
              onClick={() => setShowComplements((v) => !v)}
              aria-pressed={showComplements}
            >
              {t("theory_cube_complements")}
            </button>
            <button
              className="theory-annotation theory-diagram-button"
              style={showK8 ? S_THEORY_BTN_ACTIVE : S_THEORY_BTN}
              onClick={() => setShowK8((v) => !v)}
              aria-pressed={showK8}
            >
              {"K\u2088"}
            </button>
            <button
              className="theory-annotation theory-diagram-button"
              style={hasseMode ? S_THEORY_BTN_ACTIVE : S_THEORY_BTN}
              onClick={() => setHasseMode((v) => !v)}
              aria-pressed={hasseMode}
            >
              {t("theory_cube_hasse")}
            </button>
            <button className="theory-annotation theory-diagram-button" style={S_THEORY_BTN} onClick={onMixModeToggle} aria-pressed={false}>
              {t("theory_cube_mix")}
            </button>
          </>
        )}
      </div>
    </div>
  );
});
