import React, { useState, useMemo, useCallback, useRef, memo } from "react";
import randomDiceUrl from "../assets/random-dice.png";
import { LEVEL_CANDIDATES, levelLabelColor } from "../color-engine";
import { NUM_VERTICES } from "../constants";
import {
  HEX_VERTICES,
  HEX_EDGES,
  HEX_EDGE_COLORS,
  HEX_VERTEX_CANDIDATE_INDICES,
  HEX_EDGE_CANDIDATE_INDICES,
  HEX_DOTS,
  HEX_CX,
  HEX_CY,
  HEX_R,
  HEX_VERTEX_POSITIONS,
} from "../data/hex-data";
import type { ColorAction } from "../state/color-reducer";
import { useTranslation } from "../i18n";
import { C, FS, FW, O } from "../styles/tokens";

interface Props {
  candidateIndexByLevel: readonly number[];
  dispatch: React.Dispatch<ColorAction>;
  levelHistogram: number[];
  total: number;
  lockedLevels: boolean[];
  onToggleLock: (levelIndex: number) => void;
  onRandomize: () => void;
  canRandomize: boolean;
}

/** Dot radius at rest, kept apart so an unselected candidate reads by kind. */
const DOT_MIN_VERTEX = 12;
const DOT_MIN_EDGE = 8;
/**
 * Floor for the one candidate per level that is selected. Shared by vertex and
 * edge: levels 2 to 5 each offer three candidates, one on a vertex and two on
 * edges, and cycling a level between them is the same level holding the same
 * pixels. A floor that differed by kind would have moved the dot that stands
 * for that share, by 4px at the low end where the dots are smallest.
 */
const DOT_MIN_ACTIVE = DOT_MIN_VERTEX;
/**
 * Radius of a level that fills the canvas. A regular hexagon's side equals its
 * circumradius, so each edge is HEX_R long and carries a candidate every
 * HEX_R / span; the widest span is 4, so HEX_R / 4 is the closest two candidate
 * positions ever sit. A dot stops there: at its largest it reaches the nearest
 * position another dot could occupy, and never past it.
 */
const DOT_MAX = HEX_R / 4;
/**
 * Whether this focus is one the browser would have outlined itself. A mouse
 * press focuses the die as well as activating it, and a ring left sitting
 * there afterwards is exactly what :focus-visible exists to spare the reader;
 * the ring is drawn by hand only because an svg outline is clipped by the
 * viewBox. An engine without the selector shows the ring, the safer side.
 */
function wantsVisibleFocus(element: Element): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

const DICE_CX = HEX_CX;
const DICE_CY = HEX_CY + 6;
const DICE_HIT_RADIUS = 40;
const DICE_SIZE = 60;
const DICE_ROLL_MS = 280;
const DICE_ROLL_TRANSFORM = "rotate(360deg) scale(1.06)";

export const HexDiagram = memo(
  function HexDiagram({
    candidateIndexByLevel,
    dispatch,
    levelHistogram,
    total,
    lockedLevels,
    onToggleLock,
    onRandomize,
    canRandomize,
  }: Props) {
    const { t } = useTranslation();
    const [hl, setHl] = useState<number | null>(null);
    const [focusedLv, setFocusedLv] = useState<number | null>(null);
    const [diceFocused, setDiceFocused] = useState(false);
    const [diceRolling, setDiceRolling] = useState(false);
    const diceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const handleRandomize = useCallback(() => {
      onRandomize();
      setDiceRolling(true);
      clearTimeout(diceTimer.current);
      diceTimer.current = setTimeout(() => setDiceRolling(false), DICE_ROLL_MS);
    }, [onRandomize]);
    const vp = HEX_VERTEX_POSITIONS;
    const sel = (levelIndex: number, ai: number) => dispatch({ type: "set_color", levelIndex, candidateIndex: ai });
    const isA = (levelIndex: number, ai: number) => candidateIndexByLevel[levelIndex] % LEVEL_CANDIDATES[levelIndex].length === ai;

    // Event delegation for mouse enter/leave on SVG groups with data-lv attribute
    const onSvgMouseOver = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
      const g = (e.target as SVGElement).closest<SVGElement>("g[data-lv]");
      if (g) setHl(Number(g.dataset.lv));
    }, []);
    const onSvgMouseOut = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
      const g = (e.target as SVGElement).closest<SVGElement>("g[data-lv]");
      if (g) setHl(null);
    }, []);
    const dR = (levelIndex: number, vertex: boolean, active: boolean) => {
      if (!active) return vertex ? DOT_MIN_VERTEX : DOT_MIN_EDGE;
      const share = total > 0 ? levelHistogram[levelIndex] / total : 0;
      // A circle is read by its area, so the radius follows the square root of
      // the share, on one scale from one floor. Where the selected candidate
      // sits says nothing about how much of the canvas its level holds, so it
      // must not enter the size: separate scales had the dominant level drawn
      // smaller than a level a quarter its size.
      return DOT_MIN_ACTIVE + (DOT_MAX - DOT_MIN_ACTIVE) * Math.sqrt(share);
    };
    const { cp } = useMemo(() => {
      // Only levels the canvas actually uses close the ring. An unused level is
      // already a factor of 1 in the pattern count, skipped by randomize and hollow
      // in the swatch row; letting it pull a corner of the outline would overstate
      // the palette that is on the canvas. Below three the ring has no shape to
      // draw, so none is drawn.
      const points = HEX_DOTS.filter((d) => isA(d.level, d.candidateIndex) && levelHistogram[d.level] > 0)
        .map((d) => {
          let pos: { x: number; y: number };
          if (d.vertexIndex >= 0) pos = vp[d.vertexIndex];
          else {
            const e = HEX_EDGES[d.edgeIndex],
              p0 = vp[e.fromVertexIndex],
              p1 = vp[e.toVertexIndex % NUM_VERTICES];
            const levelSpan = Math.abs(HEX_VERTICES[e.fromVertexIndex].level - HEX_VERTICES[e.toVertexIndex % NUM_VERTICES].level);
            if (levelSpan === 0) return null;
            const frac = (d.segmentIndex + 1) / levelSpan;
            pos = { x: p0.x + (p1.x - p0.x) * frac, y: p0.y + (p1.y - p0.y) * frac };
          }
          return { ...pos, ang: Math.atan2(pos.y - HEX_CY, pos.x - HEX_CX) };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort((a, b) => a.ang - b.ang);
      const path =
        points.length > 2 ? points.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ") + "Z" : "";
      return { actP: points, cp: path };
    }, [candidateIndexByLevel, levelHistogram, vp, isA]); // eslint-disable-line react-hooks/exhaustive-deps -- isA depends on candidateIndexByLevel

    return (
      <div className="hex-diag-wrap" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
        <svg
          viewBox="-10 -25 420 445"
          style={{ width: "100%", maxWidth: 462 }}
          role="group"
          aria-label={t("hex_diagram_label")}
          onMouseOver={onSvgMouseOver}
          onMouseOut={onSvgMouseOut}
        >
          <g transform="translate(0, 16)">
            {/* Angle labels at 15° intervals on circular outline */}
            {(() => {
              const nodeAngles = new Set([15, 30, 45, 90, 195, 210, 225, 270]);
              const labelCircleR = HEX_R + 62;
              return Array.from({ length: 24 }, (_, i) => {
                const deg = i * 15;
                const svgAng = deg - 90;
                const rad = (svgAng * Math.PI) / 180;
                const lx = HEX_CX + labelCircleR * Math.cos(rad),
                  ly = HEX_CY + labelCircleR * Math.sin(rad);
                const isVertex = deg % 60 === 0;
                const isNode = nodeAngles.has(deg);
                return (
                  <text
                    key={"a" + i}
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={isVertex ? 13 : isNode ? 11 : FS.xs}
                    fontFamily="var(--font-mono)"
                    fill={isVertex ? C.textPrimary : isNode ? C.textMuted : C.textSubtle}
                    fontWeight={isVertex || isNode ? FW.bold : 400}
                  >
                    {deg}°
                  </text>
                );
              });
            })()}
            {HEX_VERTICES.map((_, i) => {
              const j = (i + 1) % NUM_VERTICES;
              return <line key={"e" + i} x1={vp[i].x} y1={vp[i].y} x2={vp[j].x} y2={vp[j].y} stroke={C.borderAlt} strokeWidth={1.5} />;
            })}
            {/* RGB triangle (vertices 0,2,4) and CMY triangle (vertices 1,3,5) */}
            <polygon
              points={`${vp[0].x},${vp[0].y} ${vp[2].x},${vp[2].y} ${vp[4].x},${vp[4].y}`}
              fill="rgba(255,255,255,.06)"
              stroke="rgba(255,255,255,.18)"
              strokeWidth={1}
            />
            <polygon
              points={`${vp[1].x},${vp[1].y} ${vp[3].x},${vp[3].y} ${vp[5].x},${vp[5].y}`}
              fill="rgba(255,255,255,.06)"
              stroke="rgba(255,255,255,.18)"
              strokeWidth={1}
            />
            {cp && <path d={cp} fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.5)" strokeWidth={1.5} strokeDasharray="4,3" />}
            {/* Collect all circles (edges + vertices), sort by radius descending so smaller circles render on top */}
            {(() => {
              type CircleItem = {
                key: string;
                levelIndex: number;
                ai: number;
                x: number;
                y: number;
                r: number;
                color: string;
                vertex: boolean;
                vertexIdx?: number;
              };
              const allCircles: CircleItem[] = [];
              // Edge circles
              HEX_EDGES.forEach((e, ei) => {
                const p0 = vp[e.fromVertexIndex],
                  p1 = vp[e.toVertexIndex % NUM_VERTICES];
                const levelSpan = Math.abs(HEX_VERTICES[e.fromVertexIndex].level - HEX_VERTICES[e.toVertexIndex % NUM_VERTICES].level);
                if (levelSpan === 0) return;
                e.levels.forEach((lv, li) => {
                  const frac = (li + 1) / levelSpan;
                  const x = p0.x + (p1.x - p0.x) * frac,
                    y = p0.y + (p1.y - p0.y) * frac;
                  const dc = HEX_EDGE_COLORS[ei][li].hex,
                    ai = HEX_EDGE_CANDIDATE_INDICES[ei][li];
                  const act = isA(lv, ai),
                    r = dR(lv, false, act);
                  allCircles.push({ key: "m" + ei + li, levelIndex: lv, ai, x, y, r, color: dc, vertex: false });
                });
              });
              // Vertex circles
              HEX_VERTICES.forEach((v, i) => {
                const p = vp[i],
                  ai = HEX_VERTEX_CANDIDATE_INDICES[i];
                const act = isA(v.level, ai),
                  r = dR(v.level, true, act);
                allCircles.push({ key: "v" + i, levelIndex: v.level, ai, x: p.x, y: p.y, r, color: v.rgb, vertex: true, vertexIdx: i });
              });
              // Sort: inactive first (large behind), then active on top
              allCircles.sort((a, b) => {
                const aAct = isA(a.levelIndex, a.ai) ? 1 : 0;
                const bAct = isA(b.levelIndex, b.ai) ? 1 : 0;
                if (aAct !== bAct) return aAct - bAct; // inactive before active
                return b.r - a.r; // within same group, large behind
              });
              return allCircles.map((item) => {
                const { key, levelIndex: lv, ai, x, y, r, color, vertex, vertexIdx } = item;
                const act = isA(lv, ai),
                  hov = hl === lv;
                // A level the canvas does not use contributes a factor of 1 to
                // the pattern count, is skipped by randomize, and shows hollow
                // in the swatch row. Its dot says the same here: still
                // selectable, so a palette can be set before anything is
                // painted, but not filled in, because choosing it changes
                // nothing that is on the canvas yet.
                const used = levelHistogram[lv] > 0;
                if (vertex && vertexIdx !== undefined) {
                  const v = HEX_VERTICES[vertexIdx];
                  const la = (v.angleDeg * Math.PI) / 180,
                    lx = HEX_CX + (HEX_R + 28) * Math.cos(la),
                    ly = HEX_CY + (HEX_R + 28) * Math.sin(la);
                  return (
                    <g
                      key={key}
                      data-lv={lv}
                      onFocus={
                        act
                          ? undefined
                          : () => {
                              setHl(lv);
                              setFocusedLv(lv);
                            }
                      }
                      onBlur={
                        act
                          ? undefined
                          : () => {
                              setHl(null);
                              setFocusedLv(null);
                            }
                      }
                      onClick={
                        act
                          ? undefined
                          : () => {
                              if (!lockedLevels[lv]) sel(lv, ai);
                            }
                      }
                      onContextMenu={
                        act
                          ? undefined
                          : (e) => {
                              e.preventDefault();
                              onToggleLock(lv);
                            }
                      }
                      style={{ cursor: act ? "default" : "pointer", pointerEvents: act ? "none" : "auto" }}
                      tabIndex={act ? -1 : 0}
                      onKeyDown={
                        act
                          ? undefined
                          : (ev) => {
                              if (ev.key === "Enter" || ev.key === " ") {
                                ev.preventDefault();
                                sel(lv, ai);
                              }
                            }
                      }
                      role="button"
                      aria-pressed={act}
                      aria-label={t("hex_vertex_label", v.label, lv)}
                    >
                      {r < 24 && <circle cx={x} cy={y} r={24} fill="transparent" />}
                      {focusedLv === lv && <circle cx={x} cy={y} r={r + 8} fill="none" stroke={C.accent} strokeWidth={2} />}
                      {act && (
                        <circle
                          cx={x}
                          cy={y}
                          r={r + 5}
                          fill="none"
                          stroke={C.textWhite}
                          strokeWidth={1.5}
                          strokeDasharray="4,3"
                          opacity={O.soft}
                        />
                      )}
                      {hov && !act && <circle cx={x} cy={y} r={r + 4} fill="none" stroke={C.svgStrokeHover} strokeWidth={1} />}
                      <circle
                        cx={x}
                        cy={y}
                        r={r}
                        fill={act && used ? color : "none"}
                        stroke={act && used ? C.textWhite : color}
                        strokeWidth={act ? 3 : 1.5}
                        fillOpacity={act && used ? O.soft : 1}
                      />
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={Math.max(FS.sm, r * 0.7)}
                        fontWeight={900}
                        fontFamily="var(--font-mono)"
                        fill={act && used ? levelLabelColor(lv) : color}
                      >
                        {lv}
                      </text>
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={14}
                        fontWeight={FW.bold}
                        fontFamily="var(--font-mono)"
                        fill={color}
                        opacity={O.strong}
                      >
                        {v.label}
                      </text>
                      {lockedLevels[lv] && <circle cx={x} cy={y} r={r + 5} fill="none" stroke={C.warning} strokeWidth={2.5} />}
                    </g>
                  );
                }
                return (
                  <g
                    key={key}
                    data-lv={lv}
                    onFocus={
                      act
                        ? undefined
                        : () => {
                            setHl(lv);
                            setFocusedLv(lv);
                          }
                    }
                    onBlur={
                      act
                        ? undefined
                        : () => {
                            setHl(null);
                            setFocusedLv(null);
                          }
                    }
                    onClick={
                      act
                        ? undefined
                        : () => {
                            if (!lockedLevels[lv]) sel(lv, ai);
                          }
                    }
                    onContextMenu={
                      act
                        ? undefined
                        : (e) => {
                            e.preventDefault();
                            onToggleLock(lv);
                          }
                    }
                    style={{ cursor: act ? "default" : "pointer", pointerEvents: act ? "none" : "auto" }}
                    tabIndex={act ? -1 : 0}
                    onKeyDown={
                      act
                        ? undefined
                        : (ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              sel(lv, ai);
                            }
                          }
                    }
                    role="button"
                    aria-pressed={act}
                    aria-label={t("hex_edge_label", lv, color)}
                  >
                    {focusedLv === lv && <circle cx={x} cy={y} r={r + 8} fill="none" stroke={C.accent} strokeWidth={2} />}
                    {act && (
                      <circle
                        cx={x}
                        cy={y}
                        r={r + 5}
                        fill="none"
                        stroke={C.textWhite}
                        strokeWidth={1.5}
                        strokeDasharray="3,2"
                        opacity={O.soft}
                      />
                    )}
                    {hov && !act && <circle cx={x} cy={y} r={r + 4} fill="none" stroke={C.svgStrokeHover} strokeWidth={1} />}
                    {r < 22 && <circle cx={x} cy={y} r={22} fill="transparent" />}
                    <circle
                      cx={x}
                      cy={y}
                      r={r}
                      fill={act && used ? color : "none"}
                      stroke={act && used ? C.textWhite : color}
                      strokeWidth={act ? 2.5 : 1.5}
                      fillOpacity={act && used ? O.soft : 1}
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={Math.max(FS.xxs, r * 0.9)}
                      fontWeight={FW.bold}
                      fontFamily="var(--font-mono)"
                      fill={act && used ? levelLabelColor(lv) : color}
                    >
                      {lv}
                    </text>
                    {lockedLevels[lv] && <circle cx={x} cy={y} r={r + 4} fill="none" stroke={C.warning} strokeWidth={2.5} />}
                  </g>
                );
              });
            })()}
            {/* Dice button at center */}
            <g
              className="hex-dice-button"
              onClick={canRandomize ? handleRandomize : undefined}
              style={{
                cursor: canRandomize ? "pointer" : "default",
                opacity: canRandomize ? 1 : 0.3,
                pointerEvents: canRandomize ? "auto" : "none",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                userSelect: "none",
                outline: "none",
              }}
              tabIndex={canRandomize ? 0 : -1}
              role="button"
              aria-pressed={false}
              aria-disabled={!canRandomize}
              aria-label={t("btn_random_color")}
              onFocus={canRandomize ? (event) => setDiceFocused(wantsVisibleFocus(event.currentTarget)) : undefined}
              onBlur={() => setDiceFocused(false)}
              onKeyDown={
                canRandomize
                  ? (ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        handleRandomize();
                      }
                    }
                  : undefined
              }
            >
              {/* The outline every focusable g in the app loses to global.css is
                  drawn back as geometry, the way the level dots above do it: an
                  svg outline is clipped by the viewBox, a circle is not. */}
              {diceFocused && (
                <circle cx={DICE_CX} cy={DICE_CY + 2} r={DICE_HIT_RADIUS - 6} fill="none" stroke={C.accent} strokeWidth={2} />
              )}
              <circle cx={DICE_CX} cy={DICE_CY + 2} r={DICE_HIT_RADIUS} fill="transparent" />
              <g
                aria-hidden="true"
                style={{
                  transformOrigin: `${DICE_CX}px ${DICE_CY}px`,
                  transition: diceRolling ? `transform ${DICE_ROLL_MS}ms cubic-bezier(.2,.8,.3,1)` : "none",
                  transform: diceRolling ? DICE_ROLL_TRANSFORM : "rotate(0deg) scale(1)",
                }}
              >
                <image
                  href={randomDiceUrl}
                  x={DICE_CX - DICE_SIZE / 2}
                  y={DICE_CY - DICE_SIZE / 2}
                  width={DICE_SIZE}
                  height={DICE_SIZE}
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            </g>
          </g>
        </svg>
      </div>
    );
  },
  (prev, next) => {
    if (prev.total !== next.total) return false;
    for (let i = 0; i < 8; i++) {
      if (prev.candidateIndexByLevel[i] !== next.candidateIndexByLevel[i]) return false;
      if (prev.levelHistogram[i] !== next.levelHistogram[i]) return false;
      if (prev.lockedLevels[i] !== next.lockedLevels[i]) return false;
    }
    return true;
  },
);
