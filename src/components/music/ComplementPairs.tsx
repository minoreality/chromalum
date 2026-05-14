import React from "react";
import { C, FS } from "../../styles/tokens";
import { COMPLEMENT_PAIRS } from "../../data/music-data";

// Complement tone sums to 1 in normalized 4:2:1 tone units; keep colors canonical
// (hue-invariant) so the visual matches the tone-based sonification.
const LV_COLORS = ["#000", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", "#fff"];
const W = 180,
  H = 100;
const CX = W / 2;
const BAR_H = 14,
  ROW_GAP = 6,
  TOP = 18;
const MAX_BAR = 70; // full normalized pair width

const toneFractionLabel = (level: number) => `${level}/7`;

interface Props {
  activePair: number;
}

export const ComplementPairs = React.memo(function ComplementPairs({ activePair }: Props) {
  return (
    <svg viewBox={`8 0 ${W - 16} ${H}`} style={{ width: "100%" }}>
      <defs>
        <filter id="cp-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Center line: 1/2 → 550Hz constant */}
      <line
        x1={CX}
        y1={TOP - 4}
        x2={CX}
        y2={TOP + 3 * (BAR_H + ROW_GAP)}
        stroke={C.accent}
        strokeWidth={1}
        strokeDasharray="3,2"
        opacity={0.6}
      />
      <text x={CX} y={TOP - 6} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)" fill={C.accent} opacity={0.8}>
        550Hz
      </text>
      {COMPLEMENT_PAIRS.map(([a, b], i) => {
        const y = TOP + i * (BAR_H + ROW_GAP);
        const wA = (a / 7) * MAX_BAR;
        const wB = (b / 7) * MAX_BAR;
        const isActive = activePair === i;
        return (
          <g key={i} filter={isActive ? "url(#cp-glow)" : undefined} opacity={activePair >= 0 && !isActive ? 0.25 : 1}>
            {/* Left bar (lower tone) */}
            <rect x={CX - wA} y={y} width={wA} height={BAR_H} rx={2} fill={LV_COLORS[a]} fillOpacity={0.8} />
            {/* Right bar (higher tone) */}
            <rect x={CX} y={y} width={wB} height={BAR_H} rx={2} fill={LV_COLORS[b]} fillOpacity={0.8} />
            {/* Labels */}
            <text
              x={CX - wA - 4}
              y={y + BAR_H / 2}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={FS.xxs}
              fontFamily="var(--font-mono)"
              fill={LV_COLORS[a]}
            >
              {a}
            </text>
            <text
              x={CX + wB + 4}
              y={y + BAR_H / 2}
              textAnchor="start"
              dominantBaseline="central"
              fontSize={FS.xxs}
              fontFamily="var(--font-mono)"
              fill={LV_COLORS[b]}
            >
              {b}
            </text>
            {/* Sum label — placed on the left to avoid overlapping the (longer) right bar */}
            {isActive && (
              <text
                x={8}
                y={y + BAR_H / 2}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={7}
                fontFamily="var(--font-mono)"
                fill={C.textMuted}
              >
                {toneFractionLabel(a)}+{toneFractionLabel(b)}=1
              </text>
            )}
          </g>
        );
      })}
      {/* Theorem label */}
      <text x={CX} y={H - 4} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)" fill={C.textDimmer}>
        T&#x2096; + T&#x2087;&#x208b;&#x2096; = 1
      </text>
    </svg>
  );
});
