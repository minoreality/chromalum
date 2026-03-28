import React, { useState, useRef, useCallback, useMemo } from "react";
import { LEVEL_INFO, LEVEL_CANDIDATES, findClosestCandidate, hue2rgb } from "../color-engine";
import { SP, C, R } from "../tokens";

interface LinkedVizProps {
  hueAngle: number;
  brushLevel: number;
  onHueAngleChange?: (angle: number) => void;
}

/* ── Layout constants ── */
const WR = 62;
const WO = 10;
const WCX = 80;
const WCY = 80;
const GAP = 12;
const WD = 160;

// Single wheel center
const CX = WO + WCX; // 90
const CY = WO + WCY; // 90

// Right graph (sine: Y-projection)
const RX = WO + WD + GAP; // 182
const RW = 200;
const RYtop = CY - WR - 4; // 24
const RYbot = CY + WR + 4; // 156
const RH = RYbot - RYtop; // 132

// Bottom graph (cosine: X-projection)
const BY = WO + WD + GAP; // 182
const BXleft = CX - WR - 4; // 24
const BXright = CX + WR + 4; // 156
const BW = BXright - BXleft; // 132
const BH = 160;

// Total SVG
const TW = RX + RW + 4; // 386
const TH = BY + BH + 16; // 358

// Active levels (skip black=0, white=7)
const ACTIVE_LEVELS = [1, 2, 3, 4, 5, 6];
const HUE_LABELS = [0, 60, 120, 180, 240, 300];

// Level display colors
const LV_COLORS = ["", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", ""];

const lumR0 = (lv: number) => (LEVEL_INFO[lv].gray / 255) * WR;
const lumR7 = (lv: number) => (1 - LEVEL_INFO[lv].gray / 255) * WR;

/* ── Dot type ── */
interface Dot {
  lv: number;
  ci: number;
  a: number;
  rgb: [number, number, number];
  act: boolean;
}

/* ── Wheel rendering ── */
function renderWheel(cx: number, cy: number, alpha: number, radiusFn: (lv: number) => number, dots: Dot[], hueAngle: number) {
  const wP = (a: number, lv: number) => {
    const rad = ((a - alpha - 90) * Math.PI) / 180;
    const r = radiusFn(lv);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const sweepRad = ((hueAngle - alpha - 90) * Math.PI) / 180;

  return (
    <g>
      {/* Hue ring (rotates with wheel) */}
      {Array.from({ length: 360 }, (_, d) => {
        const r = ((d - alpha - 90) * Math.PI) / 180;
        const [cr, cg, cb] = hue2rgb(d);
        return (
          <line
            key={`h${d}`}
            x1={cx + 68 * Math.cos(r)}
            y1={cy + 68 * Math.sin(r)}
            x2={cx + 75 * Math.cos(r)}
            y2={cy + 75 * Math.sin(r)}
            stroke={`rgb(${cr},${cg},${cb})`}
            strokeWidth={1.5}
          />
        );
      })}
      {/* Level circles */}
      {LEVEL_INFO.map((_, lv) => {
        const r = radiusFn(lv);
        return r > 1 ? <circle key={`g${lv}`} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} /> : null;
      })}
      <circle cx={cx} cy={cy} r={3} fill="#000" stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
      <circle cx={cx} cy={cy} r={WR} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} strokeDasharray="2,2" />
      {/* Sweep line */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + 65 * Math.cos(sweepRad)}
        y2={cy + 65 * Math.sin(sweepRad)}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={0.5}
      />
      {/* C2 symmetry */}
      {(
        [
          [1, 6],
          [2, 5],
          [3, 4],
        ] as [number, number][]
      ).flatMap(([a, b]) =>
        LEVEL_CANDIDATES[a].map((ca, ci) => {
          if (ca.angle < 0) return null;
          const comp = (ca.angle + 180) % 360;
          const ciB = LEVEL_CANDIDATES[b].findIndex((cb) => Math.abs(((cb.angle - comp + 540) % 360) - 180) < 1);
          if (ciB < 0) return null;
          const pA = wP(ca.angle, a),
            pB = wP(LEVEL_CANDIDATES[b][ciB].angle, b);
          return (
            <line
              key={`s${a}${ci}`}
              x1={pA.x}
              y1={pA.y}
              x2={pB.x}
              y2={pB.y}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={0.5}
              strokeDasharray="3,2"
            />
          );
        }),
      )}
      {/* Active connections */}
      {(() => {
        const p = dots.filter((d) => d.act).map((d) => wP(d.a, d.lv));
        return p.map((pt, i) =>
          i > 0 ? (
            <line key={`wc${i}`} x1={p[i - 1].x} y1={p[i - 1].y} x2={pt.x} y2={pt.y} stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} />
          ) : null,
        );
      })()}
      {/* Dots */}
      {dots.map((d) => {
        const p = wP(d.a, d.lv);
        return (
          <circle
            key={`w${d.lv}${d.ci}`}
            cx={p.x}
            cy={p.y}
            r={d.act ? 5 : 2.5}
            fill={d.act ? `rgb(${d.rgb.join(",")})` : "#555"}
            stroke={d.act ? "#fff" : "none"}
            strokeWidth={d.act ? 1 : 0}
          />
        );
      })}
      {/* Angle marker */}
      {(() => {
        const x = cx + 75 * Math.cos(sweepRad),
          y = cy + 75 * Math.sin(sweepRad);
        return (
          <polygon
            points={`${x},${y} ${x + 4 * Math.cos(sweepRad + 2.5)},${y + 4 * Math.sin(sweepRad + 2.5)} ${x + 4 * Math.cos(sweepRad - 2.5)},${y + 4 * Math.sin(sweepRad - 2.5)}`}
            fill="#fff"
          />
        );
      })()}
    </g>
  );
}

/* ── Toggle button style ── */
const S_TOGGLE: React.CSSProperties = {
  padding: "3px 10px",
  fontSize: 11,
  borderRadius: R.md,
  border: `1px solid ${C.border}`,
  cursor: "pointer",
  background: "transparent",
  color: C.textSecondary,
  transition: "all 0.15s",
};
const S_TOGGLE_ACTIVE: React.CSSProperties = {
  padding: "3px 10px",
  fontSize: 11,
  borderRadius: R.md,
  border: `1px solid ${C.accent}`,
  cursor: "pointer",
  background: C.accent,
  color: "#fff",
  transition: "all 0.15s",
};

export const LinkedViz = React.memo(function LinkedViz({ hueAngle, brushLevel, onHueAngleChange }: LinkedVizProps) {
  const [mode, setMode] = useState<0 | 7>(0);
  const [alpha0, setAlpha0] = useState(0);
  const [alpha7, setAlpha7] = useState(0);
  const [hoveredDot, setHoveredDot] = useState<{ lv: number; ci: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ type: "wheel"; startAngle: number; startAlpha: number } | { type: "hue" } | null>(null);

  const activeAlpha = mode === 0 ? alpha0 : alpha7;
  const activeRadiusFn = mode === 0 ? lumR0 : lumR7;

  // Compute dots
  const dots = useMemo(() => {
    const result: Dot[] = [];
    for (let lv = 0; lv < LEVEL_CANDIDATES.length; lv++)
      for (let ci = 0; ci < LEVEL_CANDIDATES[lv].length; ci++) {
        const c = LEVEL_CANDIDATES[lv][ci];
        if (c.angle < 0) continue;
        result.push({ lv, ci, a: c.angle, rgb: c.rgb, act: findClosestCandidate(lv, hueAngle) === ci });
      }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- brushLevel triggers re-render for active dot updates
  }, [hueAngle, brushLevel]);

  // Wheel dot position (for guide lines)
  const wP = useCallback(
    (a: number, lv: number) => {
      const rad = ((a - activeAlpha - 90) * Math.PI) / 180;
      const r = activeRadiusFn(lv);
      return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
    },
    [activeAlpha, activeRadiusFn],
  );

  // Graph mapping
  const rPx = (a: number) => RX + 10 + (a / 360) * (RW - 14);
  const bPy = (a: number) => BY + 8 + (a / 360) * (BH - 16);

  // SVG coordinate conversion
  const svgCoord = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: (clientX - rect.left) * (TW / rect.width), y: (clientY - rect.top) * (TH / rect.height) };
  }, []);

  // Wheel rotation drag
  const onWheelPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const pt = svgCoord(e.clientX, e.clientY);
      const angle = (Math.atan2(pt.y - CY, pt.x - CX) * 180) / Math.PI;
      dragRef.current = { type: "wheel", startAngle: angle, startAlpha: activeAlpha };
      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [activeAlpha, svgCoord],
  );

  // Hue line drag (on right graph)
  const onHuePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      dragRef.current = { type: "hue" };
      svgRef.current?.setPointerCapture(e.pointerId);
      // Immediately update hue
      const pt = svgCoord(e.clientX, e.clientY);
      const hue = Math.max(0, Math.min(360, ((pt.x - RX - 10) / (RW - 14)) * 360));
      onHueAngleChange?.(Math.round(hue));
    },
    [svgCoord, onHueAngleChange],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const pt = svgCoord(e.clientX, e.clientY);
      if (drag.type === "wheel") {
        const angle = (Math.atan2(pt.y - CY, pt.x - CX) * 180) / Math.PI;
        const delta = angle - drag.startAngle;
        const newAlpha = (((drag.startAlpha - delta) % 360) + 360) % 360;
        if (mode === 0) setAlpha0(newAlpha);
        else setAlpha7(newAlpha);
      } else if (drag.type === "hue") {
        const hue = Math.max(0, Math.min(360, ((pt.x - RX - 10) / (RW - 14)) * 360));
        onHueAngleChange?.(Math.round(hue));
      }
    },
    [svgCoord, mode, onHueAngleChange],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Generate continuous sine path for right graph
  const sinePath = useCallback((lv: number, radiusFn: (lv: number) => number, alpha: number) => {
    const r = radiusFn(lv);
    if (r < 1) return "";
    const pts: string[] = [];
    for (let h = 0; h <= 360; h += 2) {
      const rad = ((h - alpha - 90) * Math.PI) / 180;
      const y = CY + r * Math.sin(rad);
      pts.push(`${h === 0 ? "M" : "L"}${rPx(h).toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(" ");
  }, []);

  // Generate continuous cosine path for bottom graph
  const cosinePath = useCallback((lv: number, radiusFn: (lv: number) => number, alpha: number) => {
    const r = radiusFn(lv);
    if (r < 1) return "";
    const pts: string[] = [];
    for (let h = 0; h <= 360; h += 2) {
      const rad = ((h - alpha - 90) * Math.PI) / 180;
      const x = CX + r * Math.cos(rad);
      pts.push(`${h === 0 ? "M" : "L"}${x.toFixed(1)},${bPy(h).toFixed(1)}`);
    }
    return pts.join(" ");
  }, []);

  // Hover helpers
  const isHovered = (d: Dot) => hoveredDot !== null && hoveredDot.lv === d.lv && hoveredDot.ci === d.ci;
  const dotHandlers = (d: Dot) => ({
    onPointerEnter: () => setHoveredDot({ lv: d.lv, ci: d.ci }),
    onPointerLeave: () => setHoveredDot(null),
    style: { cursor: "pointer" as const },
  });
  const dotOpacity = (d: Dot) => (hoveredDot === null ? 1 : isHovered(d) ? 1 : 0.25);

  // Main visualization content
  const vizContent = useMemo(() => {
    const activeDots = dots.filter((d) => d.act);

    return (
      <>
        {/* ═══ GUIDE LINES — hover only ═══ */}
        {hoveredDot &&
          activeDots
            .filter((d) => d.lv === hoveredDot.lv && d.ci === hoveredDot.ci)
            .map((d) => {
              const w = wP(d.a, d.lv);
              const rad = ((d.a - activeAlpha - 90) * Math.PI) / 180;
              const ry = CY + activeRadiusFn(d.lv) * Math.sin(rad);
              const bx = CX + activeRadiusFn(d.lv) * Math.cos(rad);
              const col = `rgb(${d.rgb.join(",")})`;
              return (
                <g key={`gl-${d.lv}-${d.ci}`} opacity={0.4}>
                  {/* Wheel → right graph (horizontal, constant Y) */}
                  <line x1={w.x} y1={w.y} x2={rPx(d.a)} y2={ry} stroke={col} strokeWidth={0.8} strokeDasharray="3,2" />
                  {/* Wheel → bottom graph (vertical, constant X) */}
                  <line x1={w.x} y1={w.y} x2={bx} y2={bPy(d.a)} stroke={col} strokeWidth={0.8} strokeDasharray="3,2" />
                  {/* Right graph dot → bottom graph dot (diagonal) */}
                  <line x1={rPx(d.a)} y1={ry} x2={rPx(d.a)} y2={RYbot + 2} stroke={col} strokeWidth={0.4} strokeDasharray="2,2" />
                  <line x1={BXleft - 2} y1={bPy(d.a)} x2={bx} y2={bPy(d.a)} stroke={col} strokeWidth={0.4} strokeDasharray="2,2" />
                </g>
              );
            })}

        {/* ═══ RIGHT GRAPH: Sine (Y-projection) ═══ */}
        <g>
          <rect x={RX} y={RYtop} width={RW} height={RH} fill="rgba(255,255,255,0.02)" rx={4} />
          <line x1={RX} y1={CY} x2={RX + RW} y2={CY} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
          {HUE_LABELS.map((a) => (
            <text key={`ra${a}`} x={rPx(a)} y={RYbot + 10} fontSize={4} fill="#555" textAnchor="middle">
              {a}°
            </text>
          ))}

          {/* L0 continuous sine curves */}
          {ACTIVE_LEVELS.map((lv) => (
            <path
              key={`rs0-${lv}`}
              d={sinePath(lv, lumR0, alpha0)}
              fill="none"
              stroke={LV_COLORS[lv]}
              strokeWidth={mode === 0 ? 1.2 : 0.6}
              opacity={hoveredDot ? (hoveredDot.lv === lv ? 0.7 : 0.1) : mode === 0 ? 0.5 : 0.2}
            />
          ))}
          {/* L7 continuous sine curves (dashed) */}
          {ACTIVE_LEVELS.map((lv) => (
            <path
              key={`rs7-${lv}`}
              d={sinePath(lv, lumR7, alpha7)}
              fill="none"
              stroke={LV_COLORS[lv]}
              strokeWidth={mode === 7 ? 1.2 : 0.6}
              opacity={hoveredDot ? (hoveredDot.lv === lv ? 0.7 : 0.1) : mode === 7 ? 0.5 : 0.2}
              strokeDasharray="4,3"
            />
          ))}

          {/* Hue angle line (draggable) */}
          <line x1={rPx(hueAngle)} y1={RYtop} x2={rPx(hueAngle)} y2={RYbot} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
          {/* Drag handle area for hue line */}
          <rect
            x={RX}
            y={RYtop}
            width={RW}
            height={RH}
            fill="transparent"
            style={{ cursor: "ew-resize" }}
            onPointerDown={onHuePointerDown}
          />

          {/* Active dots on current mode's curves */}
          {activeDots.map((d) => {
            const rad = ((d.a - activeAlpha - 90) * Math.PI) / 180;
            const y = CY + activeRadiusFn(d.lv) * Math.sin(rad);
            const hov = isHovered(d);
            return (
              <circle
                key={`rd-${d.lv}-${d.ci}`}
                cx={rPx(d.a)}
                cy={y}
                r={hov ? 6 : 4}
                fill={`rgb(${d.rgb.join(",")})`}
                stroke="#fff"
                strokeWidth={hov ? 1.2 : 0.8}
                opacity={dotOpacity(d)}
                {...dotHandlers(d)}
              />
            );
          })}
        </g>

        {/* ═══ BOTTOM GRAPH: Cosine (X-projection) ═══ */}
        <g>
          <rect x={BXleft} y={BY} width={BW} height={BH} fill="rgba(255,255,255,0.02)" rx={4} />
          <line x1={CX} y1={BY} x2={CX} y2={BY + BH} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
          {HUE_LABELS.map((a) => (
            <text key={`ba${a}`} x={BXleft - 6} y={bPy(a)} fontSize={4} fill="#555" textAnchor="end" dominantBaseline="middle">
              {a}°
            </text>
          ))}
          <line x1={BXleft} y1={bPy(hueAngle)} x2={BXright} y2={bPy(hueAngle)} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />

          {/* L0 continuous cosine curves */}
          {ACTIVE_LEVELS.map((lv) => (
            <path
              key={`bc0-${lv}`}
              d={cosinePath(lv, lumR0, alpha0)}
              fill="none"
              stroke={LV_COLORS[lv]}
              strokeWidth={mode === 0 ? 1.2 : 0.6}
              opacity={hoveredDot ? (hoveredDot.lv === lv ? 0.7 : 0.1) : mode === 0 ? 0.5 : 0.2}
            />
          ))}
          {/* L7 continuous cosine curves (dashed) */}
          {ACTIVE_LEVELS.map((lv) => (
            <path
              key={`bc7-${lv}`}
              d={cosinePath(lv, lumR7, alpha7)}
              fill="none"
              stroke={LV_COLORS[lv]}
              strokeWidth={mode === 7 ? 1.2 : 0.6}
              opacity={hoveredDot ? (hoveredDot.lv === lv ? 0.7 : 0.1) : mode === 7 ? 0.5 : 0.2}
              strokeDasharray="4,3"
            />
          ))}

          {/* Active dots on current mode's curves */}
          {activeDots.map((d) => {
            const rad = ((d.a - activeAlpha - 90) * Math.PI) / 180;
            const x = CX + activeRadiusFn(d.lv) * Math.cos(rad);
            const hov = isHovered(d);
            return (
              <circle
                key={`bd-${d.lv}-${d.ci}`}
                cx={x}
                cy={bPy(d.a)}
                r={hov ? 6 : 4}
                fill={`rgb(${d.rgb.join(",")})`}
                stroke="#fff"
                strokeWidth={hov ? 1.2 : 0.8}
                opacity={dotOpacity(d)}
                {...dotHandlers(d)}
              />
            );
          })}
        </g>

        {/* ═══ BOTTOM-RIGHT: Active color info ═══ */}
        <g>
          {activeDots.map((d, i) => {
            const col = `rgb(${d.rgb.join(",")})`;
            const y = BY + 8 + i * 14;
            const hov = isHovered(d);
            return (
              <g key={`info-${d.lv}-${d.ci}`} opacity={hoveredDot ? (hov ? 1 : 0.3) : 0.8} {...dotHandlers(d)}>
                <rect x={BXright + 12} y={y} width={10} height={10} rx={2} fill={col} stroke={hov ? "#fff" : "none"} strokeWidth={0.5} />
                <text x={BXright + 26} y={y + 8} fontSize={5} fill={hov ? "#fff" : "#888"}>
                  {LEVEL_INFO[d.lv].name} {d.a}°
                </text>
              </g>
            );
          })}
        </g>
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hoveredDot is intentionally reactive
  }, [dots, wP, hueAngle, alpha0, alpha7, mode, activeAlpha, activeRadiusFn, sinePath, cosinePath, hoveredDot, onHuePointerDown]);

  return (
    <div style={{ marginTop: SP.xl, textAlign: "center" }}>
      {/* L0/L7 Toggle */}
      <div style={{ marginBottom: SP.md, display: "flex", gap: SP.sm, justifyContent: "center" }}>
        <button type="button" style={mode === 0 ? S_TOGGLE_ACTIVE : S_TOGGLE} onClick={() => setMode(0)}>
          L0 (black=center)
        </button>
        <button type="button" style={mode === 7 ? S_TOGGLE_ACTIVE : S_TOGGLE} onClick={() => setMode(7)}>
          L7 (white=center)
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${TW} ${TH}`}
        width="100%"
        style={{ maxWidth: TW }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {vizContent}

        {/* ═══ WHEEL (single, toggleable) ═══ */}
        <g style={{ cursor: "grab" }} onPointerDown={onWheelPointerDown}>
          <circle cx={CX} cy={CY} r={WR + 14} fill="transparent" />
          {renderWheel(CX, CY, activeAlpha, activeRadiusFn, dots, hueAngle)}
        </g>

        {/* Label */}
        <text x={CX} y={WO - 2} fontSize={5} fill="#666" textAnchor="middle">
          {mode === 0 ? "L0 = center (black)" : "L7 = center (white)"}
        </text>
      </svg>
    </div>
  );
});
