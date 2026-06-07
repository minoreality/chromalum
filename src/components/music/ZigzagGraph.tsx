import React from "react";
import { C, FS, FW } from "../../styles/tokens";
import { TONE_CROSSING_SEQUENCE, ZIGZAG_CHANNELS, ZIGZAG_PATH } from "../../data/music-data";

// Zigzag path is a tone sequence (hue-invariant); colors stay canonical to match
// the tone-based sonification (`triggerToneValueBurst`).
const LV_COLORS = ["#000", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", "#fff"];
const NAMES = ["", "B", "R", "M", "G", "C", "Y"];
const CH_COLORS: Record<string, string> = { G: "#00cc00", R: "#cc0000", B: "#4466ff" };
const CROSSING_GRAPH_POINTS = TONE_CROSSING_SEQUENCE.slice(0, -1);
const CROSSING_TERMINAL_INDEX = TONE_CROSSING_SEQUENCE.length - 1;
const CROSSING_TERMINAL_POINT = TONE_CROSSING_SEQUENCE[CROSSING_TERMINAL_INDEX];
const CROSSING_FINAL_GRAPH_POINT = CROSSING_GRAPH_POINTS[CROSSING_GRAPH_POINTS.length - 1];

const W = 180,
  H = 100;
const ML = 24,
  MR = 8,
  MT = 12,
  MB = 16;
const PW = W - ML - MR,
  PH = H - MT - MB;

const xPos = (i: number) => ML + (i / (ZIGZAG_PATH.length - 1)) * PW;
const xAngle = (angleDeg: number) => ML + (angleDeg / 360) * PW;
const yPos = (level: number) => MT + PH - (level / 7) * PH;

type ZigzagGraphMode = "vertices" | "crossings";

interface Props {
  currentStep: number | null;
  mode?: ZigzagGraphMode;
}

function hueColor(angleDeg: number): string {
  const hue = ((angleDeg % 360) + 360) % 360;
  return `hsl(${hue} 100% 48%)`;
}

export const ZigzagGraph = React.memo(function ZigzagGraph({ currentStep, mode = "vertices" }: Props) {
  const isCrossingMode = mode === "crossings";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", aspectRatio: `${W} / ${H}`, display: "block", flex: "0 0 auto" }}>
      <defs>
        <filter id="zg-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="zg-crossing-terminal-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={hueColor(CROSSING_FINAL_GRAPH_POINT.angleDeg)} />
          <stop offset="100%" stopColor={hueColor(CROSSING_TERMINAL_POINT.angleDeg)} />
        </linearGradient>
      </defs>
      {/* Y-axis midline (1/2) */}
      <line x1={ML} y1={yPos(3.5)} x2={W - MR} y2={yPos(3.5)} stroke={C.textDimmer} strokeWidth={0.5} strokeDasharray="3,2" opacity={0.4} />
      {isCrossingMode ? (
        <>
          {/* Crossing sequence: pure-color tone intersections mapped to fixed 12-TET semitone steps. */}
          {CROSSING_GRAPH_POINTS.slice(0, -1).map((point, i) => {
            const next = CROSSING_GRAPH_POINTS[i + 1];
            const x0 = xAngle(point.angleDeg),
              y0 = yPos(point.lv);
            const x1 = xAngle(next.angleDeg),
              y1 = yPos(next.lv);
            const isActive = currentStep === i || currentStep === i + 1;
            return (
              <line
                key={`${point.angleDeg}-${next.angleDeg}`}
                x1={x0}
                y1={y0}
                x2={x1}
                y2={y1}
                stroke={hueColor(point.angleDeg)}
                strokeWidth={isActive ? 2.3 : 1.3}
                opacity={isActive ? 0.9 : 0.42}
              />
            );
          })}
          {(() => {
            const x0 = xAngle(CROSSING_FINAL_GRAPH_POINT.angleDeg),
              y0 = yPos(CROSSING_FINAL_GRAPH_POINT.lv);
            const x1 = xAngle(CROSSING_TERMINAL_POINT.angleDeg),
              y1 = yPos(CROSSING_TERMINAL_POINT.lv);
            const isActive = currentStep === CROSSING_GRAPH_POINTS.length - 1 || currentStep === CROSSING_TERMINAL_INDEX;
            return (
              <line
                x1={x0}
                y1={y0}
                x2={x1}
                y2={y1}
                stroke="url(#zg-crossing-terminal-grad)"
                strokeWidth={isActive ? 2.3 : 1.3}
                opacity={isActive ? 0.9 : 0.42}
              />
            );
          })()}
          {CROSSING_GRAPH_POINTS.map((point, i) => {
            const x = xAngle(point.angleDeg),
              y = yPos(point.lv);
            const isTerminalResolve = i === 0 && currentStep === CROSSING_TERMINAL_INDEX;
            const isActive = currentStep === i || isTerminalResolve;
            const semitoneLabel = isTerminalResolve ? TONE_CROSSING_SEQUENCE[CROSSING_TERMINAL_INDEX].semitone : point.semitone;
            return (
              <g key={`${point.angleDeg}-${point.semitone}`} filter={isActive ? "url(#zg-glow)" : undefined}>
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 5.5 : 3.2}
                  fill={hueColor(point.angleDeg)}
                  fillOpacity={0.9}
                  stroke="#fff"
                  strokeWidth={isActive ? 1.8 : 0.7}
                />
                {isActive ? (
                  <text
                    x={x}
                    y={y + (point.lv >= 5 ? 10 : -8)}
                    textAnchor="middle"
                    fontSize={7}
                    fontFamily="var(--font-mono)"
                    fontWeight={FW.bold}
                    fill={hueColor(point.angleDeg)}
                  >
                    {semitoneLabel}
                  </text>
                ) : null}
              </g>
            );
          })}
        </>
      ) : (
        <>
          {/* Segments with channel-colored lines */}
          {ZIGZAG_PATH.slice(0, -1).map((lv, i) => {
            const nextLv = ZIGZAG_PATH[i + 1];
            const x0 = xPos(i),
              y0 = yPos(lv);
            const x1 = xPos(i + 1),
              y1 = yPos(nextLv);
            const ch = ZIGZAG_CHANNELS[i];
            const delta = nextLv - lv;
            const isActive = currentStep === i || currentStep === i + 1;
            return (
              <g key={i}>
                <line
                  x1={x0}
                  y1={y0}
                  x2={x1}
                  y2={y1}
                  stroke={CH_COLORS[ch]}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  opacity={isActive ? 0.9 : 0.5}
                />
                <text
                  x={(x0 + x1) / 2}
                  y={(y0 + y1) / 2 + (delta > 0 ? -5 : 8)}
                  textAnchor="middle"
                  fontSize={7}
                  fontFamily="var(--font-mono)"
                  fontWeight={FW.bold}
                  fill={CH_COLORS[ch]}
                  opacity={isActive ? 1 : 0.5}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}
                </text>
              </g>
            );
          })}
          {/* Vertices */}
          {ZIGZAG_PATH.map((lv, i) => {
            const x = xPos(i),
              y = yPos(lv);
            const isActive = currentStep === i;
            return (
              <g key={lv} filter={isActive ? "url(#zg-glow)" : undefined}>
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 6 : 4}
                  fill={LV_COLORS[lv]}
                  fillOpacity={0.85}
                  stroke="#fff"
                  strokeWidth={isActive ? 2 : 1}
                />
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize={FS.xxs}
                  fontFamily="var(--font-mono)"
                  fill={LV_COLORS[lv]}
                  opacity={0.8}
                >
                  {NAMES[lv]}
                </text>
              </g>
            );
          })}
        </>
      )}
      {/* Y-axis tone labels */}
      <text
        x={ML - 3}
        y={yPos(0)}
        textAnchor="end"
        dominantBaseline="central"
        fontSize={6}
        fontFamily="var(--font-mono)"
        fill={C.textDimmer}
      >
        0/7
      </text>
      <text
        x={ML - 3}
        y={yPos(7)}
        textAnchor="end"
        dominantBaseline="central"
        fontSize={6}
        fontFamily="var(--font-mono)"
        fill={C.textDimmer}
      >
        7/7
      </text>
    </svg>
  );
});
