import React from "react";
import { CUBE_FACES, THEORY_LEVELS, edgeChannel } from "../../data/theory-data";
import { CHROMALUM_CHANNEL_HEX } from "../../chromalum-color-model";
import { useTranslation } from "../../i18n";
import { C } from "../../styles/tokens";

const POINTS = [
  { x: 46, y: 70 },
  { x: 46, y: 18 },
  { x: 98, y: 18 },
  { x: 98, y: 70 },
] as const;

interface Props {
  activeFace: number | null;
  selectedFace: number | null;
  vertex: number | null;
  onEnter: (index: number) => void;
  onLeave: () => void;
  onSelect: (index: number) => void;
}

export const CubeFaceGrid = React.memo(function CubeFaceGrid({ activeFace, selectedFace, vertex, onEnter, onLeave, onSelect }: Props) {
  const { t } = useTranslation();
  return (
    <div className="theory-cube-faces" role="group" aria-label={t("theory_cube_faces_title")}>
      <div className="theory-cube-faces-heading">
        <span className="theory-cube-faces-heading-full">{t("theory_cube_faces_title")}</span>
        <span className="theory-cube-faces-heading-short">{t("theory_cube_faces_title_short")}</span>
      </div>
      <div className="theory-cube-face-grid">
        {CUBE_FACES.map((face, faceIndex) => {
          const highlighted = activeFace === faceIndex || (vertex !== null && face.vertices.includes(vertex));
          const dim = (activeFace !== null || vertex !== null) && !highlighted;
          const selected = selectedFace === faceIndex;
          return (
            <button
              key={face.id}
              type="button"
              className="theory-cube-face"
              data-cube-face={face.id}
              data-highlighted={highlighted}
              data-dimmed={dim}
              aria-pressed={selected}
              aria-label={t(
                "theory_cube_face_aria",
                face.channel,
                String(face.fixed),
                face.vertices.map((lv) => THEORY_LEVELS[lv].bits.join("")).join(", "),
              )}
              onMouseEnter={() => onEnter(faceIndex)}
              onMouseLeave={onLeave}
              onFocus={() => onEnter(faceIndex)}
              onBlur={onLeave}
              onClick={() => onSelect(faceIndex)}
            >
              <span className="theory-cube-face-title">
                {face.channel} = {face.fixed}
              </span>
              <svg viewBox="0 0 144 88" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
                {face.vertices.map((level, i) => {
                  const next = (i + 1) % 4;
                  const from = POINTS[i];
                  const to = POINTS[next];
                  return (
                    <line
                      key={`${level}-${face.vertices[next]}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={CHROMALUM_CHANNEL_HEX[edgeChannel(level, face.vertices[next])]}
                      strokeWidth={highlighted ? 2.3 : 1.5}
                      opacity={dim ? 0.3 : highlighted ? 1 : 0.75}
                    />
                  );
                })}
                {face.vertices.map((level, i) => {
                  const { x, y } = POINTS[i];
                  const info = THEORY_LEVELS[level];
                  const marked = vertex === level;
                  const left = i < 2;
                  return (
                    <g key={level} data-face-vertex={level} data-highlighted={marked}>
                      {(marked || selected) && (
                        <circle cx={x} cy={y} r={9} fill="none" stroke={marked ? "#fff" : C.accentBright} strokeWidth={1.5} />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={6}
                        fill={level === 0 ? C.bgRoot : info.color}
                        stroke={highlighted ? "#fff" : level === 0 ? C.textMuted : "#ffffff60"}
                        strokeWidth={highlighted ? 1.5 : 1}
                        opacity={dim ? 0.4 : 1}
                      />
                      <text
                        x={left ? x - 12 : x + 12}
                        y={y}
                        textAnchor={left ? "end" : "start"}
                        dominantBaseline="central"
                        fontSize={14}
                        fontFamily="var(--font-mono)"
                        fill={marked ? "#fff" : C.textMuted}
                      >
                        {info.bits.map((bit, index) => (
                          <tspan
                            key={index}
                            fill={index === face.bitIndex ? "#b8caff" : undefined}
                            fontWeight={index === face.bitIndex ? 700 : 400}
                          >
                            {bit}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
});
