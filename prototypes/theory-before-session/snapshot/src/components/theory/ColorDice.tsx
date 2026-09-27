import React, { useCallback, useState } from "react";
import { DICE_NET_FACES, THEORY_LEVELS } from "../../data/theory-data";
import { C, FONT } from "../../styles/tokens";
import { S_CURSOR_POINTER } from "../../styles/shared";
import { usePinReset } from "./pin-reset";
import { useTranslation } from "../../i18n";

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

interface SelectionProps extends Props {
  pinnedLevel: number | null;
  onSelect: (level: number | null) => void;
}

const PAIRS: [number, number][] = [
  [1, 6],
  [2, 5],
  [4, 3],
];

/* ── Hue-order 2-2-2 net ─────────────── */

const NET_CELL = 54;
const NET_PAD = 6;
const NET_DIAMOND_HALF = NET_CELL / Math.SQRT2;
const NET_W = NET_PAD * 2 + NET_DIAMOND_HALF * 7;
const NET_H = NET_PAD * 2 + NET_DIAMOND_HALF * 3;
const NET_Y_OFFSET = NET_PAD + NET_DIAMOND_HALF * 2;
const PIP_SPACING = NET_CELL / 4;
const PIP_LAYOUTS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

function rotateNetPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: NET_PAD + (x + y) / Math.SQRT2,
    y: NET_Y_OFFSET + (-x + y) / Math.SQRT2,
  };
}

const NET_FACES = DICE_NET_FACES.map(({ lv, col, row }) => {
  const center = rotateNetPoint((col + 0.5) * NET_CELL, (row + 0.5) * NET_CELL);
  const points = [
    `${center.x},${center.y - NET_DIAMOND_HALF}`,
    `${center.x + NET_DIAMOND_HALF},${center.y}`,
    `${center.x},${center.y + NET_DIAMOND_HALF}`,
    `${center.x - NET_DIAMOND_HALF},${center.y}`,
  ].join(" ");
  const pips = PIP_LAYOUTS[lv].map(([x, y]) =>
    rotateNetPoint((col + 0.5) * NET_CELL + x * PIP_SPACING, (row + 0.5) * NET_CELL + y * PIP_SPACING),
  );
  return { lv, points, pips };
});

// Color abbreviations
const ABBR: Record<number, string> = { 0: "K", 1: "B", 2: "R", 3: "M", 4: "G", 5: "C", 6: "Y", 7: "W" };
const RANKED_ABBR: Record<number, string> = { 0: "K₀", 1: "B₁", 2: "R₂", 3: "M₃", 4: "G₄", 5: "C₅", 6: "Y₆", 7: "W₇" };

function bitsOf(lv: number): string {
  return lv.toString(2).padStart(3, "0");
}

function onFaceKeyDown(event: React.KeyboardEvent<SVGGElement>, lv: number, onTap: (level: number) => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onTap(lv);
}

const HueOrderNet = React.memo(function HueOrderNet({ hlLevel, onHover, pinnedLevel, onSelect }: SelectionProps) {
  const { t } = useTranslation();

  const enter = useCallback((lv: number) => onHover(lv), [onHover]);
  const leave = useCallback(() => onHover(null), [onHover]);
  const onTap = useCallback(
    (lv: number) => {
      onSelect(pinnedLevel === lv ? null : lv);
    },
    [pinnedLevel, onSelect],
  );

  const hl = hlLevel;

  return (
    <div data-testid="hue-order-net" className="theory-die-net">
      <div className="theory-diagram-label">{t("theory_dice_title")}</div>
      <p
        className="theory-annotation theory-die-net-sequence"
        style={{
          margin: 0,
          fontFamily: FONT.mono,
          fontSize: "var(--theory-net-caption-size, 11px)",
          color: C.textMuted,
          textAlign: "center",
        }}
      >
        {t("theory_dice_net_cut")}
      </p>
      <svg
        viewBox={`0 0 ${NET_W} ${NET_H}`}
        role="group"
        aria-label={t("theory_dice_net_aria")}
        onClick={(event) => {
          if (!(event.target as Element).closest("[data-hue-net-face]")) onSelect(null);
        }}
      >
        {NET_FACES.map(({ lv, points, pips }, index) => {
          const info = THEORY_LEVELS[lv];
          const isComplement = hl !== null && (hl ^ 7) === lv;
          const active = hl === lv;
          const dim = hl !== null && !active && !isComplement;
          return (
            <g
              key={`hue-net-face-${lv}`}
              role="button"
              tabIndex={0}
              aria-label={`${ABBR[lv]} · ${lv} · ${bitsOf(lv)}`}
              aria-pressed={pinnedLevel === lv}
              data-hue-net-face={lv}
              data-hue-net-active={active}
              data-hue-net-highlighted={active || isComplement}
              data-hue-order={index + 1}
              onMouseEnter={() => enter(lv)}
              onMouseLeave={leave}
              onFocus={() => enter(lv)}
              onBlur={leave}
              onClick={() => onTap(lv)}
              onKeyDown={(event) => onFaceKeyDown(event, lv, onTap)}
              style={S_CURSOR_POINTER}
            >
              <title>{`${ABBR[lv]} · L${lv} · ${bitsOf(lv)}`}</title>
              <polygon
                points={points}
                fill="#e4e4e4"
                fillOpacity={dim ? 0.45 : 1}
                stroke="#151522"
                strokeWidth={1.2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <g aria-hidden="true" pointerEvents="none">
                {pips.map(({ x, y }, pip) => (
                  <circle
                    key={pip}
                    data-hue-net-pip={lv}
                    cx={x}
                    cy={y}
                    r={4.5}
                    fill={info.color}
                    stroke="#000000"
                    strokeOpacity={0.22}
                    strokeWidth={0.6}
                    vectorEffect="non-scaling-stroke"
                    opacity={dim ? 0.45 : 1}
                  />
                ))}
              </g>
            </g>
          );
        })}
        <g aria-hidden="true" pointerEvents="none">
          {NET_FACES.filter(({ lv }) => hl !== null && (lv === hl || lv === (hl ^ 7))).map(({ lv, points }) => (
            <polygon
              key={`hue-net-outline-${lv}`}
              points={points}
              fill="none"
              stroke={lv === hl ? C.accent : C.accentBright}
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </svg>
      <p
        className="theory-annotation theory-die-net-cut"
        data-hue-net-cut="3-2"
        data-from-level="3"
        data-to-level="2"
        data-edge-kind="cut"
        style={{
          margin: 0,
          fontFamily: FONT.mono,
          fontSize: "var(--theory-net-caption-size, 10px)",
          color: C.textDimmer,
          textAlign: "center",
        }}
      >
        {t("theory_dice_net_cut_edge")}
      </p>
    </div>
  );
});

const ColorDieRanks = React.memo(function ColorDieRanks({ hlLevel, onHover, pinnedLevel, onSelect }: SelectionProps) {
  const { t } = useTranslation();

  return (
    <div role="group" aria-label={t("theory_dice_desc2")} data-testid="color-die-rank-structure" className="theory-die-ranks">
      <div className="theory-diagram-label">{t("theory_dice_pairs_title")}</div>
      <div className="theory-die-numbering">L(c) = 1…6 ↔ ⚀⚁⚂⚃⚄⚅</div>
      <div className="theory-die-pairs">
        {PAIRS.map(([a, b]) => (
          <button
            key={a}
            type="button"
            data-complement-pair={ABBR[a] + a + "-" + ABBR[b] + b}
            data-highlighted={hlLevel === a || hlLevel === b}
            aria-pressed={pinnedLevel === a || pinnedLevel === b}
            className="theory-die-pair"
            onMouseEnter={() => onHover(a)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(a)}
            onBlur={() => onHover(null)}
            onClick={() => onSelect(pinnedLevel === a || pinnedLevel === b ? null : a)}
          >
            <span className="theory-die-face-label">
              <span aria-hidden="true" className="theory-die-swatch" style={{ background: THEORY_LEVELS[a].color }} />
              {RANKED_ABBR[a]}
            </span>
            <span>↔</span>
            <span className="theory-die-face-label">
              <span aria-hidden="true" className="theory-die-swatch" style={{ background: THEORY_LEVELS[b].color }} />
              {RANKED_ABBR[b]}
            </span>
            <span className="theory-die-pair-sum">
              {a} + {b} = 7
            </span>
          </button>
        ))}
      </div>
      <div className="theory-die-law">
        <span>L(c̄) = 7 − L(c)</span>
        <span>⇒ L(c) + L(c̄) = 7</span>
      </div>
    </div>
  );
});

export const ColorDice = React.memo(function ColorDice({ hlLevel, onHover }: Props) {
  const [pinnedLevel, setPinnedLevel] = useState<number | null>(null);
  usePinReset(setPinnedLevel);
  const onSelect = useCallback(
    (level: number | null) => {
      setPinnedLevel(level);
      onHover(level);
    },
    [onHover],
  );
  const highlighted = hlLevel !== null && hlLevel >= 1 && hlLevel <= 6 ? hlLevel : pinnedLevel;
  const selection = { hlLevel: highlighted, onHover, pinnedLevel, onSelect };

  return (
    <div className="theory-die-figure">
      <HueOrderNet {...selection} />
      <ColorDieRanks {...selection} />
    </div>
  );
});
