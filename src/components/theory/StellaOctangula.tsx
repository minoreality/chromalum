import React, { useState, useCallback } from "react";
import {
  THEORY_LEVELS,
  CUBE_EDGES,
  STELLA_EDGES,
  STELLA_FACES,
  COMPLEMENT_EDGES,
  TETRA_T0,
  TETRA_T1,
  stellaEdgeChannels,
  vertexRadius,
  vertexDepth,
} from "../../data/theory-data";
import { C, FS, FW, SP, FONT } from "../../styles/tokens";
import { S_BTN, S_CURSOR_POINTER } from "../../styles/shared";
import { usePinReset } from "./pin-reset";
import { useTranslation } from "../../i18n";
import { VIEW_FRONT, type ViewData } from "./stella-geometry";

const VW = 320; // single-view width
const VR = 7;
const HIT_R = 14;

const CH_COLORS: Record<string, string> = { G: "#00ff00", R: "#ff0000", B: "#0000ff" };

/* ── K₈ edge color coding ── */
const K8_Q3_COLOR = "#60aaff";
const K8_STELLA_COLOR = "#ffaa60";
const K8_M4_COLOR = "#ff6080";

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

export const StellaOctangula = React.memo(function StellaOctangula({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const [pinned, setPinned] = useState<number | null>(null);
  usePinReset(setPinned);
  const [viewMode, setViewMode] = useState<"compound" | "k8">("compound");
  const [showSurface, setShowSurface] = useState(false);
  const [hlFace, setHlFace] = useState<number | null>(null);

  const hl = hlLevel !== null && hlLevel >= 0 && hlLevel <= 7 ? hlLevel : pinned;

  const hlStellaEdgeSet = new Set<number>();
  const hlFaceSet = new Set<number>();
  let complementLv: number | null = null;

  if (hl !== null) {
    STELLA_EDGES.forEach(([a, b], ei) => {
      if (a === hl || b === hl) hlStellaEdgeSet.add(ei);
    });
    STELLA_FACES.forEach((f, fi) => {
      if (f.verts.includes(hl as number)) hlFaceSet.add(fi);
    });
    complementLv = hl ^ 7;
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

  const anyHl = hl !== null || hlFace !== null;

  const hlFaceVertexSet = new Set<number>();
  const hlFaceBoundaryEdgeSet = new Set<number>();
  let hlFaceOppositeLv: number | null = null;
  if (hlFace !== null) {
    const activeFace = STELLA_FACES.find((f) => f.color === hlFace);
    if (activeFace) {
      for (const lv of activeFace.verts) hlFaceVertexSet.add(lv);
      hlFaceVertexSet.add(activeFace.color);
      hlFaceOppositeLv = activeFace.color;
      STELLA_EDGES.forEach(([a, b], ei) => {
        if (activeFace.verts.includes(a) && activeFace.verts.includes(b)) hlFaceBoundaryEdgeSet.add(ei);
      });
    }
  }

  const hlQ3 = new Set<number>();
  const hlStella = new Set<number>();
  const hlM4 = new Set<number>();
  if (hl !== null) {
    CUBE_EDGES.forEach(([a, b], i) => {
      if (a === hl || b === hl) hlQ3.add(i);
    });
    STELLA_EDGES.forEach(([a, b], i) => {
      if (a === hl || b === hl) hlStella.add(i);
    });
    COMPLEMENT_EDGES.forEach(([a, b], i) => {
      if (a === hl || b === hl) hlM4.add(i);
    });
  }

  /* ── Render helpers parameterized by view data ── */

  const renderVertices = (v: ViewData, viewId: string) =>
    [0, 1, 2, 3, 4, 5, 6, 7].map((lv) => {
      const p = v.pts[lv];
      const info = THEORY_LEVELS[lv];
      const faceRelated = hlFaceVertexSet.has(lv);
      const active = hl === lv || complementLv === lv || faceRelated;
      const dim = anyHl && !active;
      const isComplement = complementLv === lv;
      const isFaceOpposite = hlFaceOppositeLv === lv;
      const t0 = TETRA_T0 as readonly number[];
      const t1 = TETRA_T1 as readonly number[];
      const sameTetra = hl !== null && ((t0.includes(hl) && t0.includes(lv)) || (t1.includes(hl) && t1.includes(lv)));
      const neighbour = sameTetra && lv !== hl;

      const r = vertexRadius(lv, VR);
      const hitR = vertexRadius(lv, HIT_R);
      const vDepth = vertexDepth(lv) / 3; // 0..1
      const vOpacity = 0.25 + vDepth * 0.6; // [0.25, 0.85]

      return (
        <g
          key={`${viewId}-v-${lv}`}
          onMouseEnter={() => onEnter(lv)}
          onMouseLeave={onLeave}
          onClick={() => onTap(lv)}
          style={S_CURSOR_POINTER}
        >
          <circle cx={p.x} cy={p.y} r={hitR} fill="transparent" />
          {neighbour && <circle cx={p.x} cy={p.y} r={r + 4} fill="none" stroke="#fff" strokeWidth={0.8} strokeOpacity={0.3} />}
          <circle
            cx={p.x}
            cy={p.y}
            r={r}
            fill={lv === 0 ? C.bgRoot : info.color}
            fillOpacity={active ? 0.85 : dim ? 0.15 : vOpacity}
            stroke={isComplement ? "#fff" : active ? "#fff" : lv === 0 ? "#666" : info.color}
            strokeWidth={active ? 2 : 1}
            strokeOpacity={dim ? 0.2 : 0.3 + vDepth * 0.5}
            strokeDasharray={isComplement || isFaceOpposite ? "3 2" : "none"}
          />
          <text
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={FS.xs}
            fontFamily="var(--font-mono)"
            fontWeight={FW.bold}
            fill={lv === 6 || lv === 7 ? "#000" : "#fff"}
            opacity={dim ? 0.2 : 0.4 + vDepth * 0.5}
          >
            {lv}
          </text>
        </g>
      );
    });

  const renderCompound = (v: ViewData, viewId: string) => (
    <>
      {/* Depth-gradient defs for faces */}
      <defs>
        {v.sortedFaces.map((sf) => {
          const depths = sf.verts.map((vi) => ({ v: vi, d: vertexDepth(vi), p: v.pts[vi] }));
          const minD = depths.reduce((a, b) => (a.d < b.d ? a : b));
          const maxD = depths.reduce((a, b) => (a.d > b.d ? a : b));
          if (minD.d === maxD.d) return null;
          const info = THEORY_LEVELS[sf.color];
          const color = sf.color === 0 ? "#333" : info.color;
          const tetraScale = sf.tetra === 1 ? 0.5 : 1;
          const opMin = (0.03 + (minD.d / 3) * 0.22) * tetraScale;
          const opMax = (0.03 + (maxD.d / 3) * 0.22) * tetraScale;
          return (
            <linearGradient
              key={`${viewId}-fg-${sf.origIdx}`}
              id={`${viewId}-fg-${sf.origIdx}`}
              gradientUnits="userSpaceOnUse"
              x1={minD.p.x}
              y1={minD.p.y}
              x2={maxD.p.x}
              y2={maxD.p.y}
            >
              <stop offset="0%" stopColor={color} stopOpacity={opMin} />
              <stop offset="100%" stopColor={color} stopOpacity={opMax} />
            </linearGradient>
          );
        })}
      </defs>
      {v.sortedFaces.map((sf) => {
        const lighting = v.faceLighting[sf.origIdx];
        const faceActive = hlFace === sf.color || hlFaceSet.has(sf.origIdx);
        const faceDim = anyHl && !faceActive;
        const info = THEORY_LEVELS[sf.color];
        const pts = sf.verts.map((vi) => `${v.pts[vi].x},${v.pts[vi].y}`).join(" ");
        const p0 = v.pts[sf.verts[0]],
          p1 = v.pts[sf.verts[1]],
          p2 = v.pts[sf.verts[2]];
        const ctr = { x: (p0.x + p1.x + p2.x) / 3, y: (p0.y + p1.y + p2.y) / 3 };
        const depths = sf.verts.map((vi) => vertexDepth(vi));
        const hasDepthDiff = Math.max(...depths) !== Math.min(...depths);
        const tetraScale = sf.tetra === 1 ? 0.5 : 1;
        const baseOpacity = (0.04 + lighting.diffuse * 0.16) * tetraScale;
        const baseStrokeOpacity = (0.1 + lighting.diffuse * 0.3) * tetraScale;
        return (
          <g
            key={`${viewId}-f-${sf.origIdx}`}
            onMouseEnter={() => setHlFace(sf.color)}
            onMouseLeave={() => setHlFace(null)}
            style={{ cursor: "default" }}
          >
            <polygon points={pts} fill="transparent" />
            <polygon
              points={pts}
              fill={faceActive || faceDim || !hasDepthDiff ? (sf.color === 0 ? "#333" : info.color) : `url(#${viewId}-fg-${sf.origIdx})`}
              fillOpacity={faceActive ? 0.4 : faceDim ? 0.03 : hasDepthDiff ? 1 : baseOpacity}
              stroke={sf.color === 0 ? "#666" : info.color}
              strokeWidth={faceActive ? 1.5 : 0.5}
              strokeOpacity={faceActive ? 0.8 : faceDim ? 0.06 : baseStrokeOpacity}
              strokeLinejoin="round"
            />
            {/* Cross-body occlusion overlays */}
            {!faceActive &&
              !faceDim &&
              v.faceOcclusions[sf.origIdx].map((occ, oi) => (
                <polygon key={`occ-${oi}`} points={occ.clipPoints} fill="#000" fillOpacity={occ.dimAmount} stroke="none" />
              ))}
            {hlFace === sf.color && (
              <text
                x={ctr.x}
                y={ctr.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={FS.xxs}
                fontFamily="var(--font-mono)"
                fontWeight={FW.bold}
                fill={sf.color === 0 || sf.color === 1 ? "#fff" : info.color}
                opacity={0.9}
              >
                {sf.tetra === 0 ? "T0" : "T1"}: {info.lv}
              </text>
            )}
          </g>
        );
      })}

      {/* Stella edges — segment-based with cross-body occlusion */}
      {STELLA_EDGES.map(([a, b], ei) => {
        const active = hlStellaEdgeSet.has(ei) || hlFaceBoundaryEdgeSet.has(ei);
        const dim = anyHl && !active;
        const da = vertexDepth(a) / 3;
        const db = vertexDepth(b) / 3;
        const pa = v.pts[a],
          pb = v.pts[b];
        const edgeDx = pb.x - pa.x,
          edgeDy = pb.y - pa.y;
        const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1;
        const nx = -edgeDy / edgeLen,
          ny = edgeDx / edgeLen;
        const mx = (pa.x + pb.x) / 2,
          my = (pa.y + pb.y) / 2;
        const segments = v.edgeSegments[ei];

        return (
          <g key={`${viewId}-e-${ei}`}>
            {segments.map((seg, si) => {
              const sx = pa.x + seg.t0 * edgeDx;
              const sy = pa.y + seg.t0 * edgeDy;
              const ex = pa.x + seg.t1 * edgeDx;
              const ey = pa.y + seg.t1 * edgeDy;
              const segDa = da + seg.t0 * (db - da);
              const segDb = da + seg.t1 * (db - da);
              const segAvgDepth = (segDa + segDb) / 2;

              if (active) {
                return (
                  <line
                    key={si}
                    x1={sx}
                    y1={sy}
                    x2={ex}
                    y2={ey}
                    stroke="#fff"
                    strokeWidth={1.8}
                    strokeDasharray={seg.hidden ? "2,3" : undefined}
                    opacity={seg.hidden ? 0.3 : 0.85}
                  />
                );
              }

              if (seg.hidden) {
                return (
                  <line
                    key={si}
                    x1={sx}
                    y1={sy}
                    x2={ex}
                    y2={ey}
                    stroke={C.textDimmer}
                    strokeWidth={0.4 + segAvgDepth * 0.6}
                    strokeDasharray="4,4"
                    opacity={dim ? 0.05 : 0.12}
                  />
                );
              }

              // Visible segment with taper
              const hwS = 0.2 + segDa * 0.7;
              const hwE = 0.2 + segDb * 0.7;
              const opS = 0.05 + segDa * 0.4;
              const opE = 0.05 + segDb * 0.4;
              const opAvg = (opS + opE) / 2;

              if (Math.abs(segDa - segDb) > 0.01) {
                return (
                  <polygon
                    key={si}
                    points={`${sx + nx * hwS},${sy + ny * hwS} ${ex + nx * hwE},${ey + ny * hwE} ${ex - nx * hwE},${ey - ny * hwE} ${sx - nx * hwS},${sy - ny * hwS}`}
                    fill={C.textDimmer}
                    fillOpacity={dim ? 0.05 : opAvg}
                  />
                );
              }
              return (
                <line
                  key={si}
                  x1={sx}
                  y1={sy}
                  x2={ex}
                  y2={ey}
                  stroke={C.textDimmer}
                  strokeWidth={0.4 + segAvgDepth * 1.4}
                  opacity={dim ? 0.05 : opAvg}
                />
              );
            })}
            {active &&
              hl !== null &&
              (() => {
                const chs = stellaEdgeChannels(a, b);
                const ox = nx * 10,
                  oy = ny * 10;
                return (
                  <text
                    x={mx + ox}
                    y={my + oy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={FS.xxs}
                    fontFamily="var(--font-mono)"
                    fontWeight={FW.bold}
                    opacity={0.85}
                  >
                    <tspan fill={CH_COLORS[chs[0]]}>{chs[0]}</tspan>
                    <tspan fill="rgba(255,255,255,0.5)">+</tspan>
                    <tspan fill={CH_COLORS[chs[1]]}>{chs[1]}</tspan>
                  </text>
                );
              })()}
          </g>
        );
      })}

      {/* Surface overlay (24 spike faces) */}
      {showSurface &&
        v.surfaceFaces.map((sf, si) => {
          if (!sf.isFront) return null;
          const info = THEORY_LEVELS[sf.color];
          const pts = sf.verts2D.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
          const depthNorm = sf.depth / 3;
          const tetraScale = sf.tetra === 1 ? 0.5 : 1;
          const fillOp = (0.08 + depthNorm * 0.22) * tetraScale;
          const strokeOp = (0.15 + depthNorm * 0.35) * tetraScale;
          const tipActive = hl === sf.tipVertex;
          const dim = anyHl && !tipActive;
          return (
            <polygon
              key={`${viewId}-sf-${si}`}
              points={pts}
              fill={sf.color === 0 ? "#333" : info.color}
              fillOpacity={dim ? 0.02 : tipActive ? 0.35 : fillOp}
              stroke={sf.color === 0 ? "#666" : info.color}
              strokeWidth={tipActive ? 1.2 : 0.6}
              strokeOpacity={dim ? 0.05 : tipActive ? 0.7 : strokeOp}
              strokeLinejoin="round"
            />
          );
        })}

      {showSurface &&
        v.surfaceRidgeEdges.map((edge, i) => {
          const depthNorm = edge.depth / 3;
          return (
            <line
              key={`${viewId}-ridge-${i}`}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={0.45 + depthNorm * 0.9}
              opacity={edge.isFront ? 0.42 + depthNorm * 0.22 : 0.16}
            />
          );
        })}

      {showSurface &&
        v.silhouetteEdges.map((edge, i) => (
          <line
            key={`${viewId}-sil-${i}`}
            x1={edge.from.x}
            y1={edge.from.y}
            x2={edge.to.x}
            y2={edge.to.y}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={1}
            opacity={0.3}
          />
        ))}

      {renderVertices(v, viewId)}
    </>
  );

  const renderK8 = (v: ViewData, viewId: string) => (
    <>
      {CUBE_EDGES.map(([a, b], i) => {
        const active = hlQ3.has(i);
        const dim = hl !== null && !active;
        return (
          <line
            key={`${viewId}-q3-${i}`}
            x1={v.pts[a].x}
            y1={v.pts[a].y}
            x2={v.pts[b].x}
            y2={v.pts[b].y}
            stroke={K8_Q3_COLOR}
            strokeWidth={active ? 2 : 1}
            opacity={dim ? 0.1 : active ? 0.9 : 0.4}
          />
        );
      })}
      {STELLA_EDGES.map(([a, b], i) => {
        const active = hlStella.has(i);
        const dim = hl !== null && !active;
        return (
          <line
            key={`${viewId}-st-${i}`}
            x1={v.pts[a].x}
            y1={v.pts[a].y}
            x2={v.pts[b].x}
            y2={v.pts[b].y}
            stroke={K8_STELLA_COLOR}
            strokeWidth={active ? 2.2 : 1.2}
            strokeDasharray="5,3"
            opacity={dim ? 0.1 : active ? 0.9 : 0.35}
          />
        );
      })}
      {COMPLEMENT_EDGES.map(([a, b], i) => {
        const active = hlM4.has(i);
        const dim = hl !== null && !active;
        return (
          <line
            key={`${viewId}-m4-${i}`}
            x1={v.pts[a].x}
            y1={v.pts[a].y}
            x2={v.pts[b].x}
            y2={v.pts[b].y}
            stroke={K8_M4_COLOR}
            strokeWidth={active ? 2.5 : 1.5}
            strokeDasharray="2,4"
            opacity={dim ? 0.1 : active ? 0.9 : 0.3}
          />
        );
      })}
      {renderVertices(v, viewId)}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SP.lg, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg viewBox="40 45 220 180" style={{ width: "100%", maxWidth: VW }} role="img" aria-label={t("theory_stella_title")}>
          {viewMode === "compound" ? renderCompound(VIEW_FRONT, "f") : renderK8(VIEW_FRONT, "f")}
        </svg>
      </div>

      {/* Annotation below SVG — fixed height to prevent layout shift on mode toggle */}
      <div style={{ minHeight: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {viewMode === "compound" ? (
          <p style={{ fontSize: FS.xs, fontFamily: FONT.mono, color: C.textDimmer, margin: 0, textAlign: "center" }}>
            {showSurface ? t("theory_stella_surface_annotation") : t("theory_stella_annotation")}
          </p>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: FS.xxs, fontFamily: FONT.mono, margin: 0 }}>
              <span style={{ color: K8_Q3_COLOR }}>Q&#x2083;(12)</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}> + </span>
              <span style={{ color: K8_STELLA_COLOR }}>&#x2606;(12)</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}> + </span>
              <span style={{ color: K8_M4_COLOR }}>M&#x2084;(4)</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}> = 28</span>
            </p>
            <p style={{ fontSize: FS.xxs, fontFamily: FONT.mono, color: C.textDimmer, margin: 0 }}>{t("theory_stella_k8_degree")}</p>
          </div>
        )}
      </div>

      {/* Toggle buttons */}
      <div style={{ display: "flex", gap: SP.md }}>
        <button
          className="theory-annotation theory-diagram-button"
          style={{
            ...S_BTN,
            borderColor: viewMode === "compound" && !showSurface ? C.accentBright : C.border,
            color: viewMode === "compound" && !showSurface ? C.accentBright : C.textMuted,
          }}
          type="button"
          aria-pressed={viewMode === "compound" && !showSurface}
          onClick={() => {
            setViewMode("compound");
            setShowSurface(false);
          }}
        >
          {t("theory_stella_compound")}
        </button>
        <button
          className="theory-annotation theory-diagram-button"
          style={{
            ...S_BTN,
            borderColor: showSurface && viewMode === "compound" ? C.accentBright : C.border,
            color: showSurface && viewMode === "compound" ? C.accentBright : C.textMuted,
            opacity: viewMode === "compound" ? 1 : 0.4,
          }}
          type="button"
          aria-pressed={viewMode === "compound" && showSurface}
          onClick={() => {
            setViewMode("compound");
            if (viewMode !== "compound") {
              setShowSurface(true);
            } else {
              setShowSurface((v) => !v);
            }
          }}
        >
          {t("theory_stella_surface")}
        </button>
        <button
          className="theory-annotation theory-diagram-button"
          style={{
            ...S_BTN,
            borderColor: viewMode === "k8" ? C.accentBright : C.border,
            color: viewMode === "k8" ? C.accentBright : C.textMuted,
          }}
          type="button"
          aria-pressed={viewMode === "k8"}
          onClick={() => {
            setViewMode("k8");
            setShowSurface(false);
          }}
        >
          {t("theory_stella_k8")}
        </button>
      </div>
    </div>
  );
});
