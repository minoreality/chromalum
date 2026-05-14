import React, { useCallback } from "react";
import { THEORY_LEVELS } from "../../data/theory-data";
import { C, FS, FW } from "../../styles/tokens";
import { S_CURSOR_POINTER } from "../../styles/shared";
import { useTranslation } from "../../i18n";

/* ── Zigzag geometry ── */

const ML = 40; // left margin
const MT = 12; // top margin
const PW = 420; // plot width
const PH = 200; // plot height (maps 0-255)
const MB = 36; // bottom margin
const MR = 10;
const VB_W = ML + PW + MR;
const VB_H = MT + PH + MB;

const xH = (h: number) => ML + (h / 360) * PW;
const yL = (y: number) => MT + PH - (y / 255) * PH;

const LEVELS = Array.from({ length: 8 }, (_, lv) => (255 * lv) / 7);

// 7 vertices (6 segments + wrap)
const VERTS = [
  { h: 0, tone8: LEVELS[2], lv: 2, name: "R" },
  { h: 60, tone8: LEVELS[6], lv: 6, name: "Y" },
  { h: 120, tone8: LEVELS[4], lv: 4, name: "G" },
  { h: 180, tone8: LEVELS[5], lv: 5, name: "C" },
  { h: 240, tone8: LEVELS[1], lv: 1, name: "B" },
  { h: 300, tone8: LEVELS[3], lv: 3, name: "M" },
  { h: 360, tone8: LEVELS[2], lv: 2, name: "R" },
];

// Segment colors (by changing channel)
const SEG_COLORS = ["#00cc00", "#cc0000", "#4466ff", "#00cc00", "#cc0000", "#4466ff"];
const SEG_LABELS = ["G\u2191", "R\u2193", "B\u2191", "G\u2193", "R\u2191", "B\u2193"];

// Find intersections of tone8=target with the zigzag
function circularHueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

export function findToneIntersections(target: number): { h: number; color: string }[] {
  const hits: { h: number; color: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const y0 = VERTS[i].tone8;
    const y1 = VERTS[i + 1].tone8;
    const lo = Math.min(y0, y1);
    const hi = Math.max(y0, y1);
    if (target >= lo && target <= hi) {
      const t = y1 === y0 ? 0 : (target - y0) / (y1 - y0);
      const h = (VERTS[i].h + t * 60) % 360;
      // Approximate hue to RGB for dot color
      const hNorm = h / 360;
      const r = Math.round(255 * Math.max(0, Math.min(1, Math.abs(hNorm * 6 - 3) - 1)));
      const g = Math.round(255 * Math.max(0, Math.min(1, 2 - Math.abs(hNorm * 6 - 2))));
      const b = Math.round(255 * Math.max(0, Math.min(1, 2 - Math.abs(hNorm * 6 - 4))));
      hits.push({ h, color: `rgb(${r},${g},${b})` });
    }
  }
  // Deduplicate vertices shared by two segments, including the 0°/360° seam.
  const unique: typeof hits = [];
  for (const hit of hits) {
    if (!unique.some((u) => circularHueDistance(u.h, hit.h) < 0.5)) unique.push(hit);
  }
  return unique;
}

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

export const ToneZigzag = React.memo(function ToneZigzag({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const enter = useCallback((lv: number) => onHover(lv), [onHover]);
  const leave = useCallback(() => onHover(null), [onHover]);

  const hlTone8 = hlLevel !== null && hlLevel >= 0 && hlLevel <= 7 ? LEVELS[hlLevel] : null;
  const compLevel = hlLevel !== null ? 7 - hlLevel : null;
  const compTone8 = compLevel !== null && compLevel >= 0 && compLevel <= 7 ? LEVELS[compLevel] : null;
  const hits = hlTone8 !== null ? findToneIntersections(hlTone8) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%" }}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="theory-zigzag-svg" role="img" aria-label={t("theory_zigzag_title")}>
        {/* Complement midline Y=127.5 */}
        <line
          x1={ML}
          y1={yL(127.5)}
          x2={ML + PW}
          y2={yL(127.5)}
          stroke={C.textDimmer}
          strokeWidth={0.5}
          strokeDasharray="6,4"
          opacity={0.4}
        />
        <text
          x={ML - 4}
          y={yL(127.5)}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={FS.xxs}
          fill={C.textDimmer}
          fontFamily="var(--font-mono)"
        >
          127.5
        </text>

        {/* N-region shading: N=4 bands */}
        <rect x={ML} y={yL(LEVELS[3])} width={PW} height={yL(LEVELS[2]) - yL(LEVELS[3])} fill="#ffffff" fillOpacity={0.03} />
        <rect x={ML} y={yL(LEVELS[5])} width={PW} height={yL(LEVELS[4]) - yL(LEVELS[5])} fill="#ffffff" fillOpacity={0.03} />
        {/* N=4 labels */}
        <text
          x={ML + PW + 2}
          y={(yL(LEVELS[2]) + yL(LEVELS[3])) / 2}
          dominantBaseline="central"
          fontSize={FS.xxs}
          fill={C.textDimmer}
          fontFamily="var(--font-mono)"
        >
          N=4
        </text>
        <text
          x={ML + PW + 2}
          y={(yL(LEVELS[4]) + yL(LEVELS[5])) / 2}
          dominantBaseline="central"
          fontSize={FS.xxs}
          fill={C.textDimmer}
          fontFamily="var(--font-mono)"
        >
          N=4
        </text>

        {/* Level lines */}
        {LEVELS.map((y, i) => {
          const isHl = hlLevel === i;
          const isComp = compLevel === i && hlLevel !== null && hlLevel !== compLevel;
          const info = THEORY_LEVELS[i];
          const n = i === 0 || i === 7 || i === 1 || i === 6 ? 1 : 3;
          return (
            <g key={`lv${i}`}>
              <line
                x1={ML}
                y1={yL(y)}
                x2={ML + PW}
                y2={yL(y)}
                stroke={isHl ? info.color : isComp ? info.color : C.textDimmer}
                strokeWidth={isHl ? 1.5 : isComp ? 1 : 0.5}
                strokeDasharray={n === 1 ? "2,4" : undefined}
                opacity={isHl ? 0.8 : isComp ? 0.5 : 0.2}
              />
              {/* Tone-axis label */}
              <text
                x={ML - 4}
                y={yL(y)}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={FS.xxs}
                fill={isHl ? info.color : C.textDimmer}
                fontFamily="var(--font-mono)"
                opacity={isHl ? 1 : 0.6}
              >
                {Math.round(y)}
              </text>
              {/* Hit zone for hover */}
              <rect
                x={ML}
                y={yL(y) - 8}
                width={PW}
                height={16}
                fill="transparent"
                onMouseEnter={() => enter(i)}
                onMouseLeave={leave}
                style={S_CURSOR_POINTER}
              />
            </g>
          );
        })}

        {/* Complement pair bracket when hovering */}
        {hlTone8 !== null && compTone8 !== null && hlLevel !== compLevel && (
          <g>
            <line x1={ML - 8} y1={yL(hlTone8)} x2={ML - 8} y2={yL(compTone8)} stroke={C.textMuted} strokeWidth={1} opacity={0.5} />
            <text
              x={ML - 10}
              y={(yL(hlTone8) + yL(compTone8!)) / 2}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={FS.xxs}
              fill={C.textMuted}
              fontFamily="var(--font-mono)"
            >
              =255
            </text>
          </g>
        )}

        {/* Zigzag segments */}
        {VERTS.slice(0, 6).map((v, i) => {
          const v2 = VERTS[i + 1];
          return (
            <line
              key={`seg${i}`}
              x1={xH(v.h)}
              y1={yL(v.tone8)}
              x2={xH(v2.h)}
              y2={yL(v2.tone8)}
              stroke={SEG_COLORS[i]}
              strokeWidth={2}
              opacity={0.7}
            />
          );
        })}

        {/* Segment channel labels */}
        {VERTS.slice(0, 6).map((v, i) => {
          const v2 = VERTS[i + 1];
          const mx = (xH(v.h) + xH(v2.h)) / 2;
          const my = (yL(v.tone8) + yL(v2.tone8)) / 2;
          const rising = v2.tone8 > v.tone8;
          return (
            <text
              key={`sl${i}`}
              x={mx}
              y={my + (rising ? -6 : 8)}
              textAnchor="middle"
              fontSize={FS.xxs}
              fontFamily="var(--font-mono)"
              fontWeight={FW.bold}
              fill={SEG_COLORS[i]}
              opacity={0.6}
            >
              {SEG_LABELS[i]}
            </text>
          );
        })}

        {/* Vertex dots */}
        {VERTS.slice(0, 6).map((v) => {
          const info = THEORY_LEVELS[v.lv];
          const isHl = hlLevel === v.lv;
          return (
            <g key={`vd${v.h}`}>
              {isHl && <circle cx={xH(v.h)} cy={yL(v.tone8)} r={6} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.5} />}
              <circle cx={xH(v.h)} cy={yL(v.tone8)} r={4} fill={info.color} fillOpacity={0.85} stroke="#222" strokeWidth={0.8} />
            </g>
          );
        })}

        {/* Intersection dots (when hovering a level) */}
        {hits.map((hit, i) => (
          <g key={`hit${i}`}>
            <circle cx={xH(hit.h)} cy={yL(hlTone8!)} r={4} fill={hit.color} stroke="#fff" strokeWidth={1.5} />
            <text
              x={xH(hit.h)}
              y={yL(hlTone8!) + 12}
              textAnchor="middle"
              fontSize={FS.xxs}
              fill={C.textMuted}
              fontFamily="var(--font-mono)"
            >
              {Math.round(hit.h)}°
            </text>
          </g>
        ))}

        {/* X-axis: vertex color labels */}
        {VERTS.slice(0, 6).map((v) => {
          const info = THEORY_LEVELS[v.lv];
          return (
            <text
              key={`xl${v.h}`}
              x={xH(v.h)}
              y={MT + PH + 12}
              textAnchor="middle"
              fontSize={FS.xs}
              fontFamily="var(--font-mono)"
              fontWeight={FW.bold}
              fill={info.color}
              opacity={0.8}
            >
              {v.name}
            </text>
          );
        })}
        {/* Hue gradient bar */}
        <defs>
          <linearGradient id="hueGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff0000" />
            <stop offset="16.67%" stopColor="#ffff00" />
            <stop offset="33.33%" stopColor="#00ff00" />
            <stop offset="50%" stopColor="#00ffff" />
            <stop offset="66.67%" stopColor="#0000ff" />
            <stop offset="83.33%" stopColor="#ff00ff" />
            <stop offset="100%" stopColor="#ff0000" />
          </linearGradient>
        </defs>
        <rect x={ML} y={MT + PH + 18} width={PW} height={4} rx={2} fill="url(#hueGrad)" opacity={0.5} />

        {/* N count on hover */}
        {hlLevel !== null && hits.length > 0 && (
          <text x={ML + PW / 2} y={MT + PH + MB - 4} textAnchor="middle" fontSize={FS.xs} fontFamily="var(--font-mono)" fill={C.textMuted}>
            N = {hits.length} candidate{hits.length > 1 ? "s" : ""}
          </text>
        )}
      </svg>
    </div>
  );
});
