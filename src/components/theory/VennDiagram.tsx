import React, { useCallback, useId, useState } from "react";
import { usePinReset } from "./pin-reset";
import { useTranslation } from "../../i18n";
import { levelLabelColor, CHANNEL_HEX } from "../../color-engine";

const VIEWBOX = { x: 26, y: 22, width: 248, height: 196 };
const RAD = 60;

// 3 circles in equilateral arrangement: R on top, G bottom-right, B bottom-left.
// Hue-wheel consistent: clockwise R → (R∩G=Y) → G → (G∩B=C) → B → (R∩B=M) → R.
const R_CENTER = { x: 150, y: 93 };
const G_CENTER = { x: 182, y: 148 };
const B_CENTER = { x: 118, y: 148 };
const CIRCLES = [
  { channel: "R", bit: 2, center: R_CENTER, color: CHANNEL_HEX.R },
  { channel: "G", bit: 4, center: G_CENTER, color: CHANNEL_HEX.G },
  { channel: "B", bit: 1, center: B_CENTER, color: CHANNEL_HEX.B },
] as const;

interface RegionInfo {
  lv: number;
  x: number;
  y: number;
  setLabel: string;
}

// Label positions pre-computed to fall within the corresponding region's interior.
const REGIONS: RegionInfo[] = [
  { lv: 0, x: 52, y: 44, setLabel: "\u2205" },
  { lv: 2, x: 150, y: 62, setLabel: "{R}" },
  { lv: 4, x: 212, y: 165, setLabel: "{G}" },
  { lv: 1, x: 88, y: 165, setLabel: "{B}" },
  { lv: 6, x: 186, y: 108, setLabel: "{G,R}" },
  { lv: 3, x: 114, y: 108, setLabel: "{R,B}" },
  { lv: 5, x: 150, y: 170, setLabel: "{G,B}" },
  { lv: 7, x: 150, y: 135, setLabel: "{G,R,B}" },
];

function regionOf(x: number, y: number): number {
  const r2 = RAD * RAD;
  const inR = (x - R_CENTER.x) ** 2 + (y - R_CENTER.y) ** 2 < r2 ? 2 : 0;
  const inG = (x - G_CENTER.x) ** 2 + (y - G_CENTER.y) ** 2 < r2 ? 4 : 0;
  const inB = (x - B_CENTER.x) ** 2 + (y - B_CENTER.y) ** 2 < r2 ? 1 : 0;
  return inG + inR + inB;
}

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
  selectedLevel?: number;
  onSelect?: (level: number) => void;
}

export const VennDiagram = React.memo(function VennDiagram({ hlLevel, onHover, selectedLevel, onSelect }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [pinned, setPinned] = useState<number | null>(null);
  usePinReset(setPinned);

  const enter = useCallback((lv: number) => onHover(lv), [onHover]);
  const leave = useCallback(() => onHover(null), [onHover]);

  const svgCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: VIEWBOX.x, y: VIEWBOX.y };
    return {
      x: VIEWBOX.x + ((e.clientX - rect.left) / rect.width) * VIEWBOX.width,
      y: VIEWBOX.y + ((e.clientY - rect.top) / rect.height) * VIEWBOX.height,
    };
  };

  const onMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const { x, y } = svgCoords(e);
      enter(regionOf(x, y));
    },
    [enter],
  );

  const onTap = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const { x, y } = svgCoords(e);
      const lv = regionOf(x, y);
      if (onSelect) {
        const current = selectedLevel ?? 0;
        const allEnabled = (current & lv) === lv;
        const next = lv === 0 ? 0 : allEnabled ? current & ~lv : current | lv;
        onSelect(next);
        onHover(next);
      } else {
        const next = pinned === lv ? null : lv;
        setPinned(next);
        onHover(next);
      }
    },
    [onHover, onSelect, pinned, selectedLevel],
  );

  const hl = hlLevel !== null && hlLevel >= 0 && hlLevel <= 7 ? hlLevel : pinned;
  const activePrimaries = selectedLevel ?? 7;

  const regionOutline = (level: number, color: string, className: string) => (
    <g className={className} data-level={level} pointerEvents="none">
      <g mask={`url(#${id}-region-${level})`}>
        {CIRCLES.map(({ bit, center }) => (
          <g key={bit}>
            <circle cx={center.x} cy={center.y} r={RAD} fill="none" stroke="#0a0a12" strokeWidth={5} />
            <circle cx={center.x} cy={center.y} r={RAD} fill="none" stroke={color} strokeWidth={2.4} />
          </g>
        ))}
      </g>
    </g>
  );

  return (
    <div className="theory-venn">
      <svg
        className="theory-venn-svg"
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
        data-selected-level={selectedLevel}
        data-highlighted-level={hl ?? undefined}
        role="img"
        aria-label={t("theory_venn_title")}
        onMouseMove={onMove}
        onMouseLeave={leave}
        onClick={onTap}
      >
        <defs>
          {CIRCLES.map(({ bit, center }) => (
            <clipPath key={bit} id={`${id}-circle-${bit}`}>
              <circle cx={center.x} cy={center.y} r={RAD} />
            </clipPath>
          ))}
          {REGIONS.map(({ lv }) => (
            <mask key={lv} id={`${id}-region-${lv}`} maskUnits="userSpaceOnUse" {...VIEWBOX}>
              {CIRCLES.filter(({ bit }) => (lv & bit) !== 0).reduce<React.ReactNode>(
                (content, { bit }) => (
                  <g clipPath={`url(#${id}-circle-${bit})`}>{content}</g>
                ),
                <g>
                  <rect {...VIEWBOX} fill="#fff" />
                  {CIRCLES.filter(({ bit }) => (lv & bit) === 0).map(({ bit, center }) => (
                    <circle key={bit} cx={center.x} cy={center.y} r={RAD} fill="#000" />
                  ))}
                </g>,
              )}
            </mask>
          ))}
          {hl !== null && (
            <mask id={`${id}-outside-highlight`} maskUnits="userSpaceOnUse" {...VIEWBOX}>
              <rect {...VIEWBOX} fill="#fff" />
              <rect {...VIEWBOX} fill="#000" mask={`url(#${id}-region-${hl})`} />
            </mask>
          )}
        </defs>
        {/* Only enabled primaries emit color; their screen blend gives the binary RGB overlaps. */}
        <g style={{ isolation: "isolate" }} pointerEvents="none">
          {CIRCLES.map(({ channel, bit, center, color }) => {
            const active = (activePrimaries & bit) !== 0;
            return (
              <circle
                key={bit}
                data-venn-primary={channel}
                data-active={active}
                cx={center.x}
                cy={center.y}
                r={RAD}
                fill={active ? color : "none"}
                style={{ mixBlendMode: "screen" }}
              />
            );
          })}
        </g>
        {hl !== null && <rect {...VIEWBOX} fill="#0a0a12" opacity={0.55} mask={`url(#${id}-outside-highlight)`} pointerEvents="none" />}
        {selectedLevel !== undefined && selectedLevel !== 0 && regionOutline(selectedLevel, "#80a0ff", "theory-venn-selection")}
        {hl !== null && regionOutline(hl, "#fff", "theory-venn-highlight")}
        {CIRCLES.filter(({ bit }) => (activePrimaries & bit) === 0).map(({ channel, bit, center, color }) => (
          <circle
            key={bit}
            data-venn-outline={channel}
            cx={center.x}
            cy={center.y}
            r={RAD}
            fill="none"
            stroke={color}
            strokeWidth={1.4}
            strokeOpacity={0.85}
            pointerEvents="none"
          />
        ))}

        {/* Region labels (set notation) */}
        {REGIONS.map(({ lv, x, y, setLabel }) => {
          const dim = hl !== null && hl !== lv;
          const visibleLevel = lv & activePrimaries;
          // Tone 0 is the region outside every circle, sitting on the panel
          // background rather than on a fill, so it keeps its own muted label.
          const textColor = dim ? "#e1e7f5" : visibleLevel === 0 ? "#aeb7ca" : levelLabelColor(visibleLevel);
          return (
            <g key={`r${lv}`} opacity={dim ? 0.8 : 1} pointerEvents="none" data-testid={`venn-region-${lv}`}>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={lv === 0 ? 12.5 : 10.5}
                fontWeight={700}
                fontFamily="var(--font-mono)"
                fill={textColor}
              >
                {setLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});
