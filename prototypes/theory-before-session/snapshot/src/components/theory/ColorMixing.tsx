import React, { useId, useState } from "react";
import { THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { C, FONT } from "../../styles/tokens";
import { levelLabelColor } from "../../color-engine";

type MixingFamily = "rgb" | "cmy";

// Complementary inputs occupy the same positions in both diagrams.
const GRB_INPUTS = [4, 2, 1] as const;
const MCY_INPUTS = GRB_INPUTS.map((level) => level ^ 7);
const INPUT_X = 36;
const INPUT_YS = [44, 102, 160];
const OPERATOR_X = 152;
const RESULT_X = 276;
const CENTER_Y = 102;
const NODE_R = 13;
const GATE_HALF = 19;
// Both gates fit the former 38 × 38 operator box.
const OR_GATE = "M -19 -19 Q 6 -19 19 0 Q 6 19 -19 19 Q -7 0 -19 -19 Z";
const AND_GATE = "M -19 -19 H 0 A 19 19 0 0 1 0 19 H -19 Z";

export const ColorMixing = React.memo(function ColorMixing() {
  const { t } = useTranslation();
  return (
    <div id="theory-mixing" className="theory-mixing-pair">
      <MixingFigure family="rgb" inputs={GRB_INPUTS} />
      <MixingFigure family="cmy" inputs={MCY_INPUTS} />
      <p className="theory-mixing-hint">
        <span>{t("theory_mixing_input_hint")}</span>
        <span>{t("theory_mixing_bus_legend")}</span>
      </p>
    </div>
  );
});

function MixingFigure({ family, inputs }: { family: MixingFamily; inputs: readonly number[] }) {
  const { t } = useTranslation();
  const id = useId();
  const headingId = `mixing-heading-${id}`;
  const [selected, setSelected] = useState<readonly number[]>(inputs);
  const operands = inputs.filter((level) => selected.includes(level));
  const result =
    operands.length === 0
      ? null
      : family === "rgb"
        ? operands.reduce((join, level) => join | level, 0)
        : operands.reduce((meet, level) => meet & level, 7);
  const symbol = family === "rgb" ? "∨" : "∧";
  const title = t(family === "rgb" ? "theory_mixing_grb" : "theory_mixing_mcy");
  const equation =
    result === null
      ? t("theory_mixing_choose_inputs")
      : `${operands.map((level) => THEORY_LEVELS[level].short).join(` ${symbol} `)} = ${THEORY_LEVELS[result].short}`;

  const toggleInput = (level: number) => {
    setSelected((current) => (current.includes(level) ? current.filter((input) => input !== level) : [...current, level]));
  };

  return (
    <figure className="theory-mixing-figure" aria-labelledby={headingId} data-mixing-family={family}>
      <figcaption>
        <div id={headingId} className="theory-diagram-label">
          {title}
        </div>
        <p>{t(family === "rgb" ? "theory_mixing_join_rule" : "theory_mixing_meet_rule")}</p>
      </figcaption>
      <svg
        viewBox="0 0 312 192"
        role="group"
        aria-label={t("theory_mixing_graph_aria", title, equation)}
        className="theory-mixing-svg"
        fontFamily={FONT.mono}
        fontSize={11}
        fill={C.textMuted}
        textAnchor="middle"
      >
        <text x={INPUT_X} y={14}>
          {t("theory_mixing_input")}
        </text>
        <text x={OPERATOR_X} y={CENTER_Y - GATE_HALF - 12} fontSize={10} fill={C.textPrimary}>
          {family === "rgb" ? "OR" : "AND"}
        </text>
        <text x={RESULT_X} y={14}>
          {t("theory_mixing_result")}
        </text>
        {inputs.map((level, index) => {
          const active = selected.includes(level);
          const portY = (index - 1) * 10;
          // Follow the OR gate's concave input boundary; AND has a flat input side.
          const inputInset = family === "rgb" ? 6 * (1 - (portY / GATE_HALF) ** 2) : 0;
          const target = { x: OPERATOR_X - GATE_HALF + inputInset, y: CENTER_Y + portY };
          const sourceY = INPUT_YS[index];
          // Separate right-angle routes enter all three pins horizontally without crossings.
          const wire =
            index === 1
              ? `${INPUT_X + NODE_R},${sourceY} ${target.x},${target.y}`
              : `${INPUT_X + NODE_R},${sourceY} 96,${sourceY} 96,${target.y} ${target.x},${target.y}`;
          return (
            <g key={level} data-mixing-input={level} data-selected={active}>
              <SignalBus points={wire} active={active} markerX={72} markerY={sourceY} />
              <g
                className="theory-mixing-input-node"
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={t("theory_mixing_input_aria", THEORY_LEVELS[level].short, THEORY_LEVELS[level].bits.join(""))}
                onClick={() => toggleInput(level)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (!event.repeat) toggleInput(level);
                  }
                }}
              >
                <circle data-mixing-hit cx={INPUT_X} cy={INPUT_YS[index]} r={28.5} fill="transparent" />
                <circle className="theory-mixing-focus-ring" cx={INPUT_X} cy={INPUT_YS[index]} r={NODE_R + 4} />
                <ColorNode level={level} x={INPUT_X} y={INPUT_YS[index]} />
              </g>
            </g>
          );
        })}
        <path
          data-mixing-gate={family === "rgb" ? "or" : "and"}
          role="img"
          aria-label={t("theory_mixing_gate_aria", family === "rgb" ? "OR" : "AND")}
          d={family === "rgb" ? OR_GATE : AND_GATE}
          transform={`translate(${OPERATOR_X} ${CENTER_Y})`}
          fill={C.bgPanel}
          stroke={C.textPrimary}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        <text x={OPERATOR_X - 1} y={CENTER_Y} dominantBaseline="central" fontSize={17} fill={C.textPrimary} data-mixing-operator={symbol}>
          {symbol}
        </text>
        <text x={OPERATOR_X} y={CENTER_Y + 36}>
          {family === "rgb" ? "join" : "meet"}
        </text>
        <SignalBus
          points={`${OPERATOR_X + GATE_HALF},${CENTER_Y} ${RESULT_X - NODE_R},${CENTER_Y}`}
          active={result !== null}
          markerX={218}
          markerY={CENTER_Y}
        />
        <g data-mixing-result={result ?? "pending"}>
          {result === null ? (
            <text x={RESULT_X} y={CENTER_Y} dominantBaseline="central">
              —
            </text>
          ) : (
            <ColorNode level={result} x={RESULT_X} y={CENTER_Y} />
          )}
        </g>
      </svg>
      <p className="theory-mixing-equation" data-mixing-pending={result === null} role="status" aria-live="polite">
        {equation}
      </p>
      <table className="theory-mixing-bits" aria-label={t("theory_mixing_bits_aria", title)}>
        <thead>
          <tr>
            <th scope="col">{t("theory_mixing_input")}</th>
            {["G", "R", "B"].map((channel) => (
              <th scope="col" key={channel}>
                {channel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inputs.map((level) => {
            const info = THEORY_LEVELS[level];
            const active = selected.includes(level);
            return (
              <tr key={level} data-mixing-bit-input={level} data-selected={active}>
                <th scope="row">{info.short}</th>
                {info.bits.map((bit, index) => (
                  <td key={index}>{active ? bit : "—"}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">
              {t("theory_mixing_result")} {result === null ? "—" : THEORY_LEVELS[result].short}
            </th>
            {[0, 1, 2].map((index) => (
              <td key={index}>{result === null ? "—" : THEORY_LEVELS[result].bits[index]}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </figure>
  );
}

function SignalBus({ points, active, markerX, markerY }: { points: string; active: boolean; markerX: number; markerY: number }) {
  const color = active ? C.textPrimary : C.borderHover;
  return (
    <g opacity={active ? 1 : 0.38} pointerEvents="none" aria-hidden="true">
      <polyline data-mixing-wire points={points} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="miter" />
      <line x1={markerX - 3} y1={markerY + 4} x2={markerX + 3} y2={markerY - 4} stroke={color} strokeWidth={1.2} />
      <text x={markerX} y={markerY - 8} fontSize={9} fill={color}>
        3
      </text>
    </g>
  );
}

function ColorNode({ level, x, y }: { level: number; x: number; y: number }) {
  const info = THEORY_LEVELS[level];
  const channels = ["G", "R", "B"].filter((_, index) => info.bits[index] === 1);
  return (
    <g data-mixing-color={level}>
      <circle cx={x} cy={y} r={NODE_R} fill={info.color} stroke={C.textPrimary} strokeWidth={1} />
      <text x={x} y={y} dominantBaseline="central" fontSize={10} fill={levelLabelColor(level)}>
        {info.bits.join("")}
      </text>
      <text x={x} y={y + 26}>
        {channels.length === 0 ? "∅" : `{${channels.join(",")}}`}
      </text>
    </g>
  );
}
