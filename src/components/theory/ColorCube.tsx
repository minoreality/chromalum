import React, { useState, useCallback, useEffect, useId, useRef } from "react";
import { THEORY_LEVELS, CUBE_EDGES, CUBE_FACES, edgeChannel, COMPLEMENT_EDGES } from "../../data/theory-data";
import { C, FS } from "../../styles/tokens";
import { S_CURSOR_POINTER } from "../../styles/shared";
import { useTranslation } from "../../i18n";
import { usePinReset } from "./pin-reset";
import { CubeFaceGrid } from "./CubeFaceGrid";
import { levelLabelColor } from "../../color-engine";
import { CHROMALUM_CHANNEL_HEX } from "../../chromalum-color-model";
import { colorCubeView, hasseRankY } from "./color-cube-geometry";

const DOT_R = 9;
const HIT_R = 17;

function edgesOf(v: number): number[] {
  return CUBE_EDGES.map((e, i) => (e[0] === v || e[1] === v ? i : -1)).filter((i) => i >= 0);
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
  0: { dx: 0, dy: 16, anchor: "middle" },
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
  const hitId = useId();
  const [pinned, setPinned] = useState<number | null>(null);
  const [selectedFace, setSelectedFace] = useState<number | null>(null);
  const [previewFace, setPreviewFace] = useState<number | null>(null);
  const [equatorMode, setEquatorMode] = useState(false);
  const [showComplements, setShowComplements] = useState(false);
  const [hasseMode, setHasseMode] = useState(false);
  const [animT, setAnimT] = useState(0);
  const animTRef = useRef(0);
  const resetSelection = useCallback((_value: null) => {
    setPinned(null);
    setSelectedFace(null);
    setPreviewFace(null);
  }, []);
  usePinReset(resetSelection);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const from = animTRef.current;
    const target = hasseMode ? 1 : 0;
    const duration = 550 * Math.abs(target - from);
    let start: number | null = null;
    let raf = 0;
    const update = (progress: number) => {
      animTRef.current = progress;
      setAnimT(progress);
    };
    const finish = () => {
      cancelAnimationFrame(raf);
      update(target);
    };
    const animate = (now: number) => {
      start ??= now;
      const elapsed = Math.max(0, Math.min(1, (now - start) / duration));
      if (elapsed === 1) {
        finish();
        return;
      }
      const eased = elapsed * elapsed * (3 - 2 * elapsed);
      update(from + (target - from) * eased);
      raf = requestAnimationFrame(animate);
    };
    const onMotionChange = () => {
      if (media.matches) finish();
    };
    if (media.matches || duration === 0) finish();
    else raf = requestAnimationFrame(animate);
    media.addEventListener("change", onMotionChange);
    return () => {
      cancelAnimationFrame(raf);
      media.removeEventListener("change", onMotionChange);
    };
  }, [hasseMode]);

  const preview = hlLevel !== null && hlLevel >= 0 && hlLevel <= 7 ? hlLevel : null;
  const hl = preview ?? pinned;
  const activeFace = previewFace ?? (preview === null ? selectedFace : null);
  const faceVertices = activeFace === null ? null : CUBE_FACES[activeFace].vertices;
  const hasHighlight = faceVertices !== null || hl !== null;
  const hlEdges = faceVertices
    ? CUBE_EDGES.flatMap(([a, b], i) => (faceVertices.includes(a) && faceVertices.includes(b) ? [i] : []))
    : hl === null
      ? []
      : edgesOf(hl);
  const hlVerts = new Set<number>(faceVertices ?? []);
  if (hl !== null && faceVertices === null) {
    hlVerts.add(hl);
    for (const ei of hlEdges) {
      hlVerts.add(CUBE_EDGES[ei][0]);
      hlVerts.add(CUBE_EDGES[ei][1]);
    }
  }

  const onEnter = useCallback(
    (lv: number) => {
      setPreviewFace(null);
      onHover(lv);
    },
    [onHover],
  );
  const onLeave = useCallback(() => onHover(null), [onHover]);
  const onTap = useCallback(
    (lv: number) => {
      setSelectedFace(null);
      setPreviewFace(null);
      setPinned((previous) => (previous === lv ? null : lv));
      onHover(null);
    },
    [onHover],
  );
  const onFaceEnter = useCallback(
    (index: number) => {
      setPreviewFace(index);
      onHover(null);
    },
    [onHover],
  );
  const onFaceLeave = useCallback(() => setPreviewFace(null), []);
  const onFaceTap = useCallback(
    (index: number) => {
      setPinned(null);
      setSelectedFace((previous) => (previous === index ? null : index));
      setPreviewFace(null);
      onHover(null);
    },
    [onHover],
  );
  const { points, orderedEdges } = colorCubeView(animT);
  const getPos = (lv: number) => points[lv];

  const isEquator = (lv: number) => lv !== 0 && lv !== 7;
  // Vertex and face interaction takes precedence over the idle cycle emphasis.
  const emphasizeEquator = equatorMode && !hasHighlight;
  const centralHitBoundary = (getPos(0).y + getPos(7).y) / 2;

  return (
    <div
      className="theory-cube"
      data-selected-level={pinned ?? undefined}
      data-selected-face={selectedFace === null ? undefined : CUBE_FACES[selectedFace].id}
      data-active-face={activeFace === null ? undefined : CUBE_FACES[activeFace].id}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          resetSelection(null);
          onHover(null);
          event.stopPropagation();
        }
      }}
    >
      <div className="theory-cube-layout">
        <figure className="theory-figure theory-cube-geometry">
          <figcaption>{t("theory_cube_title")}</figcaption>
          <svg
            className="theory-cube-svg"
            viewBox="30 35 240 195"
            preserveAspectRatio="xMidYMid slice"
            role="group"
            aria-label={t("theory_cube_title")}
            onClick={(event) => {
              if (!(event.target as Element).closest("[data-level]")) {
                resetSelection(null);
                onHover(null);
              }
            }}
          >
            <defs>
              {/* K and W project close together; divide their hit areas at the midpoint. */}
              <clipPath id={`${hitId}-hit-0`}>
                <rect x={30} y={centralHitBoundary} width={240} height={230 - centralHitBoundary} />
              </clipPath>
              <clipPath id={`${hitId}-hit-7`}>
                <rect x={30} y={35} width={240} height={centralHitBoundary - 35} />
              </clipPath>
            </defs>
            {/* Complement diagonals (all 4 body diagonals) */}
            {showComplements &&
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
                      opacity={emphasizeEquator && (!isEquator(a) || !isEquator(b)) ? 0.15 : 0.7}
                    />
                  </g>
                );
              })}

            {faceVertices && (
              <polygon
                data-cube-face-fill={CUBE_FACES[activeFace!].id}
                points={faceVertices
                  .map((lv) => {
                    const p = getPos(lv);
                    return `${p.x},${p.y}`;
                  })
                  .join(" ")}
                fill="rgba(128,160,255,0.12)"
                pointerEvents="none"
              />
            )}

            {/* Edges */}
            {orderedEdges.map(({ edge: e, index: ei, dashWeight }) => {
              const p0 = getPos(e[0]),
                p1 = getPos(e[1]);
              const active = hlEdges.includes(ei);
              const ch = edgeChannel(e[0], e[1]);
              const chColor = CHROMALUM_CHANNEL_HEX[ch];
              const isEqEdge = isEquator(e[0]) && isEquator(e[1]);
              const emphasized = active || (emphasizeEquator && isEqEdge);
              const dim = (hasHighlight && !active) || (emphasizeEquator && !isEqEdge);
              const edgeOpacity = dim ? 0.15 : emphasized ? 0.9 : 0.55;
              const dash = emphasized ? 0 : dashWeight;
              return (
                <g key={"ce" + ei} opacity={edgeOpacity}>
                  <line
                    data-cube-edge={`${e[0]}-${e[1]}`}
                    data-cube-active={active}
                    x1={p0.x}
                    y1={p0.y}
                    x2={p1.x}
                    y2={p1.y}
                    stroke={chColor}
                    strokeWidth={emphasized ? 2 : 1}
                    strokeDasharray={dash > 0 ? "3,3" : undefined}
                  />
                  {/* Keep the dash strokes unchanged and fade only their gaps.
                      Group opacity prevents overlap from brightening the edge. */}
                  {dash > 0 && dash < 1 && (
                    <line
                      className="theory-cube-edge-fill"
                      x1={p0.x}
                      y1={p0.y}
                      x2={p1.x}
                      y2={p1.y}
                      stroke={chColor}
                      strokeWidth={1}
                      opacity={1 - dash}
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}

            {/* Rank labels + Pascal counts with column headers (Hasse mode) */}
            {animT > 0 && (
              <g className="theory-cube-ranks" opacity={animT} pointerEvents="none">
                {/* Column headers */}
                <text
                  className="theory-cube-rank-label"
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
                  className="theory-cube-pascal-label"
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
                  { rank: 0, count: 1 },
                  { rank: 1, count: 3 },
                  { rank: 2, count: 3 },
                  { rank: 3, count: 1 },
                ].map(({ rank, count }) => (
                  <React.Fragment key={"rank" + rank}>
                    <text
                      className="theory-cube-rank-label"
                      x={42}
                      y={hasseRankY(rank)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={FS.xxs}
                      fontFamily="var(--font-mono)"
                      fill={C.textPrimary}
                    >
                      {rank}
                    </text>
                    <text
                      className="theory-cube-pascal-label"
                      x={258}
                      y={hasseRankY(rank)}
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
                const dim = (hasHighlight && !active) || (emphasizeEquator && !isEquator(lv));
                const opacity = dim ? 0.3 : active ? 1 : 0.85;
                return (
                  <text
                    key={"setlabel" + lv}
                    data-cube-set-label={lv}
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
              const onEquator = emphasizeEquator && isEquator(lv);
              const dim = (hasHighlight && !active) || (emphasizeEquator && !isEquator(lv));
              const fillOpacity = dim ? 0.2 : onEquator ? 1 : 0.85;
              const labelOpacity = dim ? 0.3 : 1;
              return (
                <g
                  key={"cv" + lv}
                  data-level={lv}
                  data-cube-vertex-active={active}
                  role="button"
                  tabIndex={0}
                  aria-label={t("theory_toggle_state_button_aria", info.short, info.bits.join(""), String(lv))}
                  aria-pressed={pinned === lv}
                  pointerEvents="none"
                  onMouseEnter={() => onEnter(lv)}
                  onMouseLeave={onLeave}
                  onClick={() => onTap(lv)}
                  onFocus={() => onEnter(lv)}
                  onBlur={onLeave}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (!event.repeat) onTap(lv);
                    }
                  }}
                  style={S_CURSOR_POINTER}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={HIT_R}
                    fill="transparent"
                    pointerEvents="all"
                    clipPath={lv === 0 || lv === 7 ? `url(#${hitId}-hit-${lv})` : undefined}
                  />
                  <circle
                    className="theory-cube-focus-ring"
                    cx={p.x}
                    cy={p.y}
                    r={DOT_R + 3}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={1}
                    strokeDasharray={pinned === lv ? undefined : "2 2"}
                    opacity={pinned === lv || (faceVertices === null && hl === lv) ? 1 : 0}
                    pointerEvents="none"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={DOT_R}
                    fill={lv === 0 ? C.bgRoot : info.color}
                    fillOpacity={fillOpacity}
                    stroke={lv === 0 ? "#808080" : info.color}
                    strokeWidth={0.8}
                    strokeOpacity={dim ? 0.3 : 0.9}
                  />
                  <text
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={8}
                    fontWeight={900}
                    fontFamily="var(--font-mono)"
                    fill={levelLabelColor(lv)}
                    opacity={labelOpacity}
                  >
                    {info.bits.join("")}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="theory-cube-controls">
            <button type="button" onClick={() => setEquatorMode((v) => !v)} aria-pressed={equatorMode}>
              {t("theory_cube_equator")}
            </button>
            <button type="button" onClick={() => setShowComplements((v) => !v)} aria-pressed={showComplements}>
              {t("theory_cube_complements")}
            </button>
            <button type="button" onClick={() => setHasseMode((v) => !v)} aria-pressed={hasseMode}>
              {t("theory_cube_hasse")}
            </button>
          </div>
        </figure>
        <CubeFaceGrid
          activeFace={activeFace}
          selectedFace={selectedFace}
          vertex={activeFace === null ? hl : null}
          onEnter={onFaceEnter}
          onLeave={onFaceLeave}
          onSelect={onFaceTap}
        />
      </div>
    </div>
  );
});
