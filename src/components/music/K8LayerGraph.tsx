import React from "react";
import { C, FS, FW } from "../../styles/tokens";
import { useTranslation } from "../../i18n";
import { COMPLEMENT_EDGES, CUBE_EDGES, K8_EXPLORER_POINTS, STELLA_EDGES, TETRA_T0_EDGES } from "../../data/theory-data";
import { levelLabelColor } from "../../color-engine";

const COLOR_T0 = "#ffd36e";
const COLOR_T1 = "#90c8ff";

const LV_COLORS = ["#000", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", "#fff"];

const LAYERS = {
  1: { edges: CUBE_EDGES, labelKey: "music_k8_d1", color: "#6ea4ff" },
  2: { edges: STELLA_EDGES, labelKey: "music_k8_d2", color: "#ffd36e" },
  3: { edges: COMPLEMENT_EDGES, labelKey: "music_k8_d3", color: "#ff8f8f" },
} as const;

function pointColor(lv: number, activeLevels: { levelIndex: number; rgb: readonly [number, number, number] }[]): string {
  const found = activeLevels.find((level) => level.levelIndex === lv);
  if (found) return `rgb(${found.rgb.join(",")})`;
  return LV_COLORS[lv] ?? "#888";
}

const textColor = levelLabelColor;

interface Props {
  /** `null` = no layer playing → render nodes only, no edges. */
  layer: 1 | 2 | 3 | null;
  activeEdgeIndex: number;
  activeLevels: { levelIndex: number; rgb: readonly [number, number, number] }[];
}

export const K8LayerGraph = React.memo(function K8LayerGraph({ layer, activeEdgeIndex, activeLevels }: Props) {
  const { t } = useTranslation();
  const layerInfo = layer !== null ? LAYERS[layer] : null;
  const t0Split = TETRA_T0_EDGES.length; // 6

  return (
    <svg viewBox="12 0 156 134" style={{ width: "100%" }}>
      <defs>
        <filter id="k8-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {layerInfo && (
        <text x={135} y={128} textAnchor="end" fontSize={8} fill={C.textDimmer}>
          {t(layerInfo.labelKey)}
        </text>
      )}

      {layerInfo?.edges.map(([a, b], i) => {
        const active = activeEdgeIndex === i;
        const isT0Edge = layer === 2 && i < t0Split;
        const isT1Edge = layer === 2 && i >= t0Split;
        const edgeColor = isT0Edge ? COLOR_T0 : isT1Edge ? COLOR_T1 : layerInfo.color;
        return (
          <line
            key={`${a}-${b}-${i}`}
            x1={K8_EXPLORER_POINTS[a].x}
            y1={K8_EXPLORER_POINTS[a].y}
            x2={K8_EXPLORER_POINTS[b].x}
            y2={K8_EXPLORER_POINTS[b].y}
            stroke={edgeColor}
            strokeWidth={active ? 2.5 : 1.2}
            opacity={active ? 1 : 0.4}
            strokeDasharray={layer === 3 ? "4,2" : undefined}
            filter={active ? "url(#k8-glow)" : undefined}
          />
        );
      })}

      {[0, 1, 2, 3, 4, 5, 6, 7].map((lv) => {
        const { x, y } = K8_EXPLORER_POINTS[lv];
        const active = activeEdgeIndex >= 0 && layerInfo?.edges[activeEdgeIndex]?.includes(lv);
        return (
          <g key={lv} filter={active ? "url(#k8-glow)" : undefined}>
            <circle cx={x} cy={y} r={active ? 8 : 5} fill={pointColor(lv, activeLevels)} stroke="#fff" strokeWidth={active ? 1.5 : 0.8} />
            <text x={x} y={y + 3} textAnchor="middle" fontSize={FS.xxs} fontWeight={FW.bold} fill={textColor(lv)}>
              {lv}
            </text>
          </g>
        );
      })}
    </svg>
  );
});
