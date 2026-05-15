import React, { useCallback } from "react";
import { THEORY_LEVELS } from "../../data/theory-data";
import { C, FS, FW } from "../../styles/tokens";
import { S_CURSOR_POINTER } from "../../styles/shared";
import { useTranslation } from "../../i18n";

/* ── Zigzag geometry ── */

const ML = 40; // left margin
const MT = 28; // top margin
const PW = 420; // plot width
const PH = 200; // plot height (maps normalized tone 0-1)
const MB = 28; // bottom margin
const MR = 44;
const VB_W = ML + PW + MR;
const VB_H = MT + PH + MB;
const TONE_CYCLE_LABEL_Y = MT - 14;
const HUE_AXIS_LABEL_Y = MT + PH + 12;
const TONE_AXIS_LABEL_X = ML - 10;
const SIDE_LABEL_GAP = 10;
const RIGHT_AXIS_LABEL_X = ML + PW + SIDE_LABEL_GAP;

const xH = (h: number) => ML + (h / 360) * PW;
const yT = (tone: number) => MT + PH - tone * PH;

const LEVELS = Array.from({ length: 8 }, (_, lv) => lv / 7);
const TONE_LABELS = Array.from({ length: 8 }, (_, lv) => `${lv}/7`);

// 7 vertices (6 segments + wrap)
const VERTS = [
  { h: 0, tone: LEVELS[2], lv: 2, name: "R" },
  { h: 60, tone: LEVELS[6], lv: 6, name: "Y" },
  { h: 120, tone: LEVELS[4], lv: 4, name: "G" },
  { h: 180, tone: LEVELS[5], lv: 5, name: "C" },
  { h: 240, tone: LEVELS[1], lv: 1, name: "B" },
  { h: 300, tone: LEVELS[3], lv: 3, name: "M" },
  { h: 360, tone: LEVELS[2], lv: 2, name: "R" },
];

const TONE_CYCLE_TICKS = [
  { h: 0, lv: 2 },
  { h: 15, lv: 3 },
  { h: 30, lv: 4 },
  { h: 45, lv: 5 },
  { h: 60, lv: 6 },
  { h: 90, lv: 5 },
  { h: 120, lv: 4 },
  { h: 180, lv: 5 },
  { h: 195, lv: 4 },
  { h: 210, lv: 3 },
  { h: 225, lv: 2 },
  { h: 240, lv: 1 },
  { h: 270, lv: 2 },
  { h: 300, lv: 3 },
] as const;

const HUE_AXIS_TICKS = [0, 60, 120, 180, 240, 300, 360] as const;

// Segment colors (by changing channel)
const SEG_COLORS = ["#00cc00", "#cc0000", "#4466ff", "#00cc00", "#cc0000", "#4466ff"];
const SEG_LABELS = ["+4", "-2", "+1", "-4", "+2", "-1"];
const SEG_LABEL_FONT_SIZE = 9;
const SEG_LABEL_OFFSET = 13;

function segmentLabelPoint(v: { h: number; tone: number }, v2: { h: number; tone: number }): { x: number; y: number } {
  const x1 = xH(v.h);
  const y1 = yT(v.tone);
  const x2 = xH(v2.h);
  const y2 = yT(v2.tone);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const side = dy < 0 ? -1 : 1;
  return {
    x: (x1 + x2) / 2 + side * (-dy / len) * SEG_LABEL_OFFSET,
    y: (y1 + y2) / 2 + side * (dx / len) * SEG_LABEL_OFFSET,
  };
}

function hueToRgbString(h: number): string {
  const hNorm = (((h % 360) + 360) % 360) / 360;
  const r = Math.round(255 * Math.max(0, Math.min(1, Math.abs(hNorm * 6 - 3) - 1)));
  const g = Math.round(255 * Math.max(0, Math.min(1, 2 - Math.abs(hNorm * 6 - 2))));
  const b = Math.round(255 * Math.max(0, Math.min(1, 2 - Math.abs(hNorm * 6 - 4))));
  return `rgb(${r},${g},${b})`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x;
}

function hueToTurnLabel(h: number): string {
  const roundedHue = Math.round(h);
  if (roundedHue <= 0) return "0turn";
  if (roundedHue >= 360) return "1turn";

  const divisor = gcd(roundedHue, 360);
  return `${roundedHue / divisor}/${360 / divisor}turn`;
}

// Find intersections of normalized tone=target with the zigzag
function circularHueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

export function findToneIntersections(target: number): { h: number; color: string }[] {
  const hits: { h: number; color: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const y0 = VERTS[i].tone;
    const y1 = VERTS[i + 1].tone;
    const lo = Math.min(y0, y1);
    const hi = Math.max(y0, y1);
    if (target >= lo && target <= hi) {
      const t = y1 === y0 ? 0 : (target - y0) / (y1 - y0);
      const h = (VERTS[i].h + t * 60) % 360;
      hits.push({ h, color: hueToRgbString(h) });
    }
  }
  // Deduplicate vertices shared by two segments, including the 0turn/1turn seam.
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

  const hlTone = hlLevel !== null && hlLevel >= 0 && hlLevel <= 7 ? LEVELS[hlLevel] : null;
  const compLevel = hlLevel !== null ? 7 - hlLevel : null;
  const compTone = compLevel !== null && compLevel >= 0 && compLevel <= 7 ? LEVELS[compLevel] : null;
  const hits = hlTone !== null ? findToneIntersections(hlTone) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%" }}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="theory-zigzag-svg" role="img" aria-label={t("theory_zigzag_title")}>
        {/* Complement midline T=1/2 */}
        <line x1={ML} y1={yT(0.5)} x2={ML + PW} y2={yT(0.5)} stroke={C.textDimmer} strokeWidth={0.5} strokeDasharray="6,4" opacity={0.4} />
        <text
          x={TONE_AXIS_LABEL_X}
          y={yT(0.5)}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={FS.xxs}
          fill={C.textDimmer}
          fontFamily="var(--font-mono)"
        >
          1/2
        </text>

        {/* N-region shading: N=4 candidate zones */}
        <rect x={ML} y={yT(LEVELS[3])} width={PW} height={yT(LEVELS[2]) - yT(LEVELS[3])} fill="#ffffff" fillOpacity={0.03} />
        <rect x={ML} y={yT(LEVELS[5])} width={PW} height={yT(LEVELS[4]) - yT(LEVELS[5])} fill="#ffffff" fillOpacity={0.03} />
        {/* N=4 labels */}
        <text
          x={RIGHT_AXIS_LABEL_X}
          y={(yT(LEVELS[2]) + yT(LEVELS[3])) / 2}
          textAnchor="start"
          dominantBaseline="central"
          fontSize={FS.xxs}
          fill={C.textDimmer}
          fontFamily="var(--font-mono)"
        >
          N=4
        </text>
        <text
          x={RIGHT_AXIS_LABEL_X}
          y={(yT(LEVELS[4]) + yT(LEVELS[5])) / 2}
          textAnchor="start"
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
            <g key={`lv${i}`} onMouseEnter={() => enter(i)} onMouseLeave={leave} style={S_CURSOR_POINTER}>
              <line
                x1={ML}
                y1={yT(y)}
                x2={ML + PW}
                y2={yT(y)}
                stroke={isHl ? info.color : isComp ? info.color : C.textDimmer}
                strokeWidth={isHl ? 1.5 : isComp ? 1 : 0.5}
                strokeDasharray={n === 1 ? "2,4" : undefined}
                opacity={isHl ? 0.8 : isComp ? 0.5 : 0.2}
              />
              {/* Tone-axis label */}
              <text
                x={TONE_AXIS_LABEL_X}
                y={yT(y)}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={FS.xxs}
                fill={isHl ? info.color : C.textDimmer}
                fontFamily="var(--font-mono)"
                opacity={isHl ? 1 : 0.6}
              >
                {TONE_LABELS[i]}
              </text>
              {/* Hit zone for hover */}
              <rect x={ML} y={yT(y) - 8} width={PW} height={16} fill="transparent" />
            </g>
          );
        })}

        {/* Complement sum when hovering */}
        {hlTone !== null && compTone !== null && hlLevel !== compLevel && (
          <g>
            <text
              x={RIGHT_AXIS_LABEL_X}
              y={(yT(hlTone) + yT(compTone)) / 2}
              textAnchor="start"
              dominantBaseline="central"
              fontSize={FS.xxs}
              fill={C.textMuted}
              fontFamily="var(--font-mono)"
            >
              =1
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
              y1={yT(v.tone)}
              x2={xH(v2.h)}
              y2={yT(v2.tone)}
              stroke={SEG_COLORS[i]}
              strokeWidth={2}
              opacity={0.7}
              pointerEvents="none"
            />
          );
        })}

        {/* Segment channel labels */}
        {VERTS.slice(0, 6).map((v, i) => {
          const v2 = VERTS[i + 1];
          const labelPoint = segmentLabelPoint(v, v2);
          return (
            <text
              key={`sl${i}`}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={SEG_LABEL_FONT_SIZE}
              fontFamily="var(--font-mono)"
              fontWeight={FW.bold}
              fill={SEG_COLORS[i]}
              opacity={0.6}
              pointerEvents="none"
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
            <g key={`vd${v.h}`} onMouseEnter={() => enter(v.lv)} onMouseLeave={leave} style={S_CURSOR_POINTER} data-tone-level={v.lv}>
              {isHl && <circle cx={xH(v.h)} cy={yT(v.tone)} r={6} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.5} />}
              <circle cx={xH(v.h)} cy={yT(v.tone)} r={4} fill={info.color} fillOpacity={0.85} stroke="#222" strokeWidth={0.8} />
            </g>
          );
        })}

        {/* Intersection dots (when hovering a level) */}
        {hits.map((hit, i) => (
          <g key={`hit${i}`} pointerEvents="none">
            <circle cx={xH(hit.h)} cy={yT(hlTone!)} r={4} fill={hit.color} stroke="#fff" strokeWidth={1.5} />
            <text x={xH(hit.h)} y={yT(hlTone!) + 12} textAnchor="middle" fontSize={FS.xxs} fill={C.textMuted} fontFamily="var(--font-mono)">
              {hueToTurnLabel(hit.h)}
            </text>
          </g>
        ))}

        {/* Tone-cycle labels at hue intersections */}
        {TONE_CYCLE_TICKS.map((tick) => (
          <text
            key={`xl${tick.h}-${tick.lv}`}
            x={xH(tick.h)}
            y={TONE_CYCLE_LABEL_Y}
            textAnchor="middle"
            fontSize={FS.xs}
            fontFamily="var(--font-mono)"
            fontWeight={FW.bold}
            fill={hueToRgbString(tick.h)}
            opacity={0.8}
            pointerEvents="none"
            data-tone-cycle-label="true"
          >
            {tick.lv}
          </text>
        ))}

        {/* Hue-axis labels at major vertices */}
        {HUE_AXIS_TICKS.map((h) => (
          <text
            key={`hx${h}`}
            x={xH(h)}
            y={HUE_AXIS_LABEL_Y}
            textAnchor="middle"
            fontSize={FS.xxs}
            fontFamily="var(--font-mono)"
            fill={C.textDimmer}
            opacity={0.7}
            pointerEvents="none"
            data-hue-axis-label="true"
          >
            {hueToTurnLabel(h)}
          </text>
        ))}

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
