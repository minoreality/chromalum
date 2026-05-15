import React from "react";
import { C, FS, FW } from "../../styles/tokens";
import { useTranslation } from "../../i18n";
import { OCTA_EDGES } from "../../data/theory-data";

/* Regular hexagon: width 92, height ≈ 92·2/√3 ≈ 106, centered at (90, 79) */
const PTS: Record<number, [number, number]> = {
  2: [90, 26],
  6: [136, 52.5],
  4: [136, 105.5],
  5: [90, 132],
  1: [44, 105.5],
  3: [44, 52.5],
};

const LV_COLORS = ["#000", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", "#fff"];
const OUTER_HEX_EDGES: readonly (readonly [number, number])[] = [
  [2, 6],
  [6, 4],
  [4, 5],
  [5, 1],
  [1, 3],
  [3, 2],
];

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

const OUTER_HEX_EDGE_KEYS = new Set(OUTER_HEX_EDGES.map(([a, b]) => edgeKey(a, b)));
const STAR_EDGES = OCTA_EDGES.filter(([a, b]) => !OUTER_HEX_EDGE_KEYS.has(edgeKey(a, b)));

function pointColor(lv: number, activeLevels: { levelIndex: number; rgb: readonly [number, number, number] }[]): string {
  const found = activeLevels.find((level) => level.levelIndex === lv);
  if (found) return `rgb(${found.rgb.join(",")})`;
  return LV_COLORS[lv] ?? "#888";
}

function textColor(lv: number): string {
  return lv >= 4 ? "#000" : "#fff";
}

interface Props {
  lvA: number | null;
  lvB: number | null;
  phase: "pair" | "result" | null;
  activeLevels: { levelIndex: number; rgb: readonly [number, number, number] }[];
}

export const OctahedronMix = React.memo(function OctahedronMix({ lvA, lvB, phase, activeLevels }: Props) {
  const { t } = useTranslation();
  const xorResult = lvA != null && lvB != null ? lvA ^ lvB : null;
  const valid = lvA != null && lvB != null && lvA !== lvB && xorResult !== null && xorResult >= 1 && xorResult <= 6;

  return (
    <svg viewBox="12 10 156 141" style={{ width: "100%" }}>
      <defs>
        <filter id="octa-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {STAR_EDGES.map(([a, b], i) => (
        <line
          key={`${a}-${b}-${i}`}
          x1={PTS[a][0]}
          y1={PTS[a][1]}
          x2={PTS[b][0]}
          y2={PTS[b][1]}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
          opacity={0.6}
        />
      ))}
      {valid && lvA != null && lvB != null && xorResult !== null ? (
        <line
          x1={PTS[lvA][0]}
          y1={PTS[lvA][1]}
          x2={PTS[lvB][0]}
          y2={PTS[lvB][1]}
          stroke={pointColor(xorResult, activeLevels)}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={1}
        />
      ) : null}

      {[1, 2, 3, 4, 5, 6].map((lv) => {
        const [x, y] = PTS[lv];
        const isOperand = valid && (lv === lvA || lv === lvB);
        const isResult = valid && phase === "result" && lv === xorResult;

        return (
          <g key={lv} filter={isOperand || isResult ? "url(#octa-glow)" : undefined}>
            {isResult && <circle cx={x} cy={y} r={10} fill="none" stroke={pointColor(lv, activeLevels)} strokeWidth={2} opacity={0.8} />}
            <circle
              cx={x}
              cy={y}
              r={isOperand || isResult ? 7 : 6}
              fill={pointColor(lv, activeLevels)}
              stroke="#fff"
              strokeWidth={isOperand || isResult ? 1.8 : 1}
            />
            <text x={x} y={y + 3.5} fontSize={FS.xs} fontWeight={FW.bold} fill={textColor(lv)} textAnchor="middle">
              {lv}
            </text>
          </g>
        );
      })}

      {valid && xorResult !== null ? (
        <text x={90} y={79} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill={C.textDimmer}>
          {`${lvA}⊕${lvB}=${xorResult}`}
        </text>
      ) : (
        <text x={90} y={146} textAnchor="middle" fontSize={8.5} fontFamily="var(--font-mono)" fill={C.textDimmer}>
          {t("music_octa_hint_invalid")}
        </text>
      )}
    </svg>
  );
});
