import React, { useState } from "react";
import { THEORY_LEVELS } from "../../data/theory-data";
import { CHROMALUM_CHANNEL_HEX } from "../../chromalum-color-model";
import { C } from "../../styles/tokens";
import { useTranslation } from "../../i18n";
import { usePinReset } from "./pin-reset";

// Percentage coordinates let columns spread without scaling text, dots, or row height.
const COL = {
  lv: "3.5%",
  bin: "9.5%",
  dot: "16.5%",
  name: "24%",
  set: "35%",
  g: "46.5%",
  r: "51.5%",
  b: "56.5%",
  wt: "62.5%",
  parity: "68%",
  hamming: "77%",
  tone: "89.5%",
};
const CHANNEL_COLORS = [CHROMALUM_CHANNEL_HEX.G, CHROMALUM_CHANNEL_HEX.R, CHROMALUM_CHANNEL_HEX.B];
const yPercent = (value: number) => `${(value / 224) * 100}%`;

function setNotation(bits: readonly number[]): string {
  const elems: string[] = [];
  if (bits[0]) elems.push("G");
  if (bits[1]) elems.push("R");
  if (bits[2]) elems.push("B");
  return `{${elems.join(", ")}}`;
}

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

export const BinaryTable = React.memo(function BinaryTable({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const [pinned, setPinned] = useState<number | null>(null);
  const [tabStop, setTabStop] = useState(0);
  usePinReset(setPinned);

  const clear = () => {
    setPinned(null);
    onHover(null);
  };
  const select = (level: number) => {
    const next = pinned === level ? null : level;
    setPinned(next);
    setTabStop(level);
    onHover(next);
  };
  const onKeyDown = (event: React.KeyboardEvent<SVGGElement>, level: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(level);
      return;
    }
    const next =
      event.key === "ArrowDown"
        ? (level + 1) % 8
        : event.key === "ArrowUp"
          ? (level + 7) % 8
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 7
              : null;
    if (next === null) return;
    event.preventDefault();
    event.currentTarget.ownerSVGElement?.querySelector<SVGGElement>(`[data-binary-level="${next}"]`)?.focus();
  };

  const headers = [
    [COL.lv, "Lv"],
    [COL.bin, "GRB"],
    [COL.dot, t("theory_binary_color")],
    [COL.name, t("theory_binary_name")],
    [COL.set, "S"],
    [COL.g, "G", CHANNEL_COLORS[0]],
    [COL.r, "R", CHANNEL_COLORS[1]],
    [COL.b, "B", CHANNEL_COLORS[2]],
    [COL.wt, "Wt"],
    [COL.parity, "π"],
    [COL.hamming, "H(7,4)"],
    [COL.tone, "Tone"],
  ];

  return (
    <div className="theory-binary-table" data-selected-level={pinned ?? undefined}>
      <svg
        className="theory-binary-svg"
        role="group"
        aria-label={t("theory_binary_title")}
        onClick={(event) => {
          if (!(event.target as Element).closest("[data-binary-level]")) clear();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            clear();
          }
        }}
      >
        {headers.map(([x, label, color]) => (
          <text key={label} x={x} y={yPercent(18)} className="theory-binary-header" fill={color}>
            {label}
          </text>
        ))}
        <line x1="0.5%" x2="99.5%" y1={yPercent(29)} y2={yPercent(29)} className="theory-binary-rule" />

        {THEORY_LEVELS.map((level) => {
          const y = 42 + level.lv * 24;
          const bin = level.bits.join("");
          const weight = level.bits[0] + level.bits[1] + level.bits[2];
          const selected = pinned === level.lv;
          return (
            <g
              key={level.lv}
              className="theory-binary-row"
              data-binary-level={level.lv}
              data-highlighted={hlLevel === level.lv}
              role="button"
              tabIndex={tabStop === level.lv ? 0 : -1}
              aria-pressed={selected}
              aria-label={`${level.short} · Lv ${level.lv} · GRB ${bin} · S ${setNotation(level.bits)} · Wt ${weight} · π ${weight % 2} · H(7,4) ${level.hamming} · Tone ${level.lv}/7`}
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch") onHover(level.lv);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== "touch") onHover(null);
              }}
              onFocus={() => {
                setTabStop(level.lv);
                onHover(level.lv);
              }}
              onBlur={() => onHover(null)}
              onClick={() => select(level.lv)}
              onKeyDown={(event) => onKeyDown(event, level.lv)}
            >
              <rect x="0" y={yPercent(y - 12)} width="100%" height={yPercent(24)} fill="transparent" />
              <rect x="0.5%" y={yPercent(y - 11)} width="99%" height={yPercent(22)} rx="4" className="theory-binary-row-background" />
              <rect x="0.5%" y={yPercent(y - 11)} width="99%" height={yPercent(22)} rx="4" className="theory-binary-focus-ring" />
              <text x={COL.lv} y={yPercent(y)} className="theory-binary-level">
                {level.lv}
              </text>
              <text x={COL.bin} y={yPercent(y)}>
                {bin}
              </text>
              <circle
                cx={COL.dot}
                cy={yPercent(y)}
                className="theory-binary-color"
                fill={level.lv === 0 ? "none" : level.color}
                stroke={level.lv === 0 ? C.textDimmer : "none"}
              />
              <text x={COL.name} y={yPercent(y)} className="theory-binary-name">
                {level.short}
              </text>
              <text x={COL.set} y={yPercent(y)}>
                {setNotation(level.bits)}
              </text>
              {level.bits.map((bit, index) => (
                <circle
                  key={index}
                  cx={[COL.g, COL.r, COL.b][index]}
                  cy={yPercent(y)}
                  className="theory-binary-bit"
                  fill={bit ? CHANNEL_COLORS[index] : "none"}
                  stroke={bit ? "none" : CHANNEL_COLORS[index]}
                  fillOpacity={0.7}
                  strokeOpacity={0.35}
                />
              ))}
              <text x={COL.wt} y={yPercent(y)}>
                {weight}
              </text>
              <text x={COL.parity} y={yPercent(y)}>
                {weight % 2}
              </text>
              <text x={COL.hamming} y={yPercent(y)} fill={level.hamming.startsWith("P") ? C.accentBright : undefined}>
                {level.hamming}
              </text>
              <rect
                x="83%"
                y={yPercent(y)}
                width={`${(9.5 * level.lv) / 7}%`}
                rx="2"
                fill={level.color}
                fillOpacity={0.8}
                className="theory-binary-tone-bar"
              />
              <text x="96%" y={yPercent(y)} className="theory-binary-tone-value">
                {level.lv}/7
              </text>
            </g>
          );
        })}
      </svg>
      <div className="theory-binary-notes">
        <p className="theory-binary-key">
          <span>Wt = |S| · π = wt mod 2</span>
          <span>{t("theory_binary_hamming_roles")}</span>
        </p>
        <p className="theory-binary-formula">{t("theory_binary_tone_formula")}</p>
        <p className="theory-binary-formula">{t("theory_binary_tone_complement")}</p>
      </div>
    </div>
  );
});
