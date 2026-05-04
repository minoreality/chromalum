import {
  bottomProjectionY,
  C2_PAIR,
  CX,
  CY,
  lumR0,
  lumR7,
  rightProjectionX,
  wheelPoint,
  type LinkedVisualizationDot,
  type LinkedVisualizationHover,
} from "./linked-visualization-geometry";

interface LinkedVisualizationGuidesProps {
  dots: LinkedVisualizationDot[];
  activeDots: LinkedVisualizationDot[];
  hoveredDot: LinkedVisualizationHover | null;
  activeAlpha: number;
  activeRadiusFn: (lv: number) => number;
  alpha0: number;
  alpha7: number;
  mode: 0 | 7;
}

export function LinkedVisualizationGuides({
  dots,
  activeDots,
  hoveredDot,
  activeAlpha,
  activeRadiusFn,
  alpha0,
  alpha7,
  mode,
}: LinkedVisualizationGuidesProps) {
  return (
    <>
      {dots
        .filter((dot) => !dot.act)
        .map((dot) => {
          const wheel = wheelPoint(dot.a, dot.lv, activeAlpha, activeRadiusFn);
          const rad = ((dot.a - activeAlpha - 90) * Math.PI) / 180;
          const projectedY = CY + activeRadiusFn(dot.lv) * Math.sin(rad);
          const projectedX = CX + activeRadiusFn(dot.lv) * Math.cos(rad);
          const color = `rgb(${dot.rgb.join(",")})`;
          const hovered = hoveredDot !== null && hoveredDot.lv === dot.lv && hoveredDot.ci === dot.ci;

          return (
            <g key={`gli-${dot.lv}-${dot.ci}`} opacity={hovered ? 0.6 : 0.2}>
              <line
                x1={wheel.x}
                y1={wheel.y}
                x2={rightProjectionX(dot.a)}
                y2={projectedY}
                stroke={color}
                strokeWidth={hovered ? 0.7 : 0.4}
                strokeDasharray="2,3"
              />
              <line
                x1={wheel.x}
                y1={wheel.y}
                x2={projectedX}
                y2={bottomProjectionY(dot.a)}
                stroke={color}
                strokeWidth={hovered ? 0.7 : 0.4}
                strokeDasharray="2,3"
              />
            </g>
          );
        })}

      {activeDots.map((dot) => {
        const wheel = wheelPoint(dot.a, dot.lv, activeAlpha, activeRadiusFn);
        const rad = ((dot.a - activeAlpha - 90) * Math.PI) / 180;
        const projectedY = CY + activeRadiusFn(dot.lv) * Math.sin(rad);
        const projectedX = CX + activeRadiusFn(dot.lv) * Math.cos(rad);
        const color = `rgb(${dot.rgb.join(",")})`;
        const hovered = hoveredDot !== null && hoveredDot.lv === dot.lv && hoveredDot.ci === dot.ci;

        return (
          <g key={`gl-${dot.lv}-${dot.ci}`} opacity={hovered ? 0.7 : 0.4}>
            <line
              x1={wheel.x}
              y1={wheel.y}
              x2={rightProjectionX(dot.a)}
              y2={projectedY}
              stroke={color}
              strokeWidth={hovered ? 0.8 : 0.6}
              strokeDasharray="3,2"
            />
            <line
              x1={wheel.x}
              y1={wheel.y}
              x2={projectedX}
              y2={bottomProjectionY(dot.a)}
              stroke={color}
              strokeWidth={hovered ? 0.8 : 0.6}
              strokeDasharray="3,2"
            />
          </g>
        );
      })}

      {hoveredDot &&
        hoveredDot.lv >= 1 &&
        hoveredDot.lv <= 6 &&
        (() => {
          const pairLevel = C2_PAIR[hoveredDot.lv];
          const pairDot = activeDots.find((dot) => dot.lv === pairLevel);
          if (!pairDot) return null;

          const otherRadiusFn = mode === 0 ? lumR7 : lumR0;
          const otherAlpha = mode === 0 ? alpha7 : alpha0;
          const rad = ((pairDot.a - otherAlpha - 90) * Math.PI) / 180;
          const radius = otherRadiusFn(pairLevel);
          const x = CX + radius * Math.cos(rad);
          const y = CY + radius * Math.sin(rad);
          const color = `rgb(${pairDot.rgb.join(",")})`;

          return <circle cx={x} cy={y} r={4} fill="none" stroke={color} strokeWidth={1.2} opacity={0.5} strokeDasharray="2,2" />;
        })()}
    </>
  );
}
