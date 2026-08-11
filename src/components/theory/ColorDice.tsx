import React, { useCallback, useState } from "react";
import { DICE_NET_FACES, THEORY_LEVELS } from "../../data/theory-data";
import { C, FS, SP, FONT } from "../../styles/tokens";
import { S_CURSOR_POINTER } from "../../styles/shared";
import { usePinReset } from "./pin-reset";
import { useTranslation } from "../../i18n";

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

const PAIRS: [number, number][] = [
  [1, 6],
  [2, 5],
  [4, 3],
];

const S_COLUMN_HEADER: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  padding: "4px 2px 6px",
  fontSize: FS.sm,
  fontFamily: FONT.mono,
  color: C.textDimmer,
  textAlign: "center",
  whiteSpace: "nowrap",
};

/* ── Hue-order 2-2-2 net ─────────────── */

const NET_CELL = 54;
const NET_PAD = 6;
const NET_DIAMOND_HALF = NET_CELL / Math.SQRT2;
const NET_W = NET_PAD * 2 + NET_DIAMOND_HALF * 7;
const NET_H = NET_PAD * 2 + NET_DIAMOND_HALF * 3;
const NET_Y_OFFSET = NET_PAD + NET_DIAMOND_HALF * 2;

function rotateNetPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: NET_PAD + (x + y) / Math.SQRT2,
    y: NET_Y_OFFSET + (-x + y) / Math.SQRT2,
  };
}

/* ── Mini isometric cube geometry ──────── */

const M_EDGE = 24;
const M_COS30 = Math.cos(Math.PI / 6);
const M_SIN30 = 0.5;

// Standard isometric projection: front vertex at bottom, 3 edges go upward.
// A = vertical edge (up), B = back-right (up-right), C = back-left (up-left)
const M_A = { dx: 0, dy: -M_EDGE };
const M_B = { dx: M_COS30 * M_EDGE, dy: -M_SIN30 * M_EDGE };
const M_C = { dx: -M_COS30 * M_EDGE, dy: -M_SIN30 * M_EDGE };

const M_VW = 72;
const M_VH = 82;
const M_OX = M_VW / 2;
const M_OY = 58; // front vertex, leaving room for the in-diagram result

const fp = (dx: number, dy: number) => `${(M_OX + dx).toFixed(1)},${(M_OY + dy).toFixed(1)}`;

// Top face (lid): O+A, O+A+B, O+A+B+C, O+A+C — diamond at the top
const FACE_T = [
  fp(M_A.dx, M_A.dy),
  fp(M_A.dx + M_B.dx, M_A.dy + M_B.dy),
  fp(M_A.dx + M_B.dx + M_C.dx, M_A.dy + M_B.dy + M_C.dy),
  fp(M_A.dx + M_C.dx, M_A.dy + M_C.dy),
].join(" ");
// Left face: O, O+A, O+A+C, O+C — parallelogram on the left
const FACE_L = [fp(0, 0), fp(M_A.dx, M_A.dy), fp(M_A.dx + M_C.dx, M_A.dy + M_C.dy), fp(M_C.dx, M_C.dy)].join(" ");
// Right face: O, O+B, O+A+B, O+A — parallelogram on the right
const FACE_R = [fp(0, 0), fp(M_B.dx, M_B.dy), fp(M_A.dx + M_B.dx, M_A.dy + M_B.dy), fp(M_A.dx, M_A.dy)].join(" ");

// Color abbreviations
const ABBR: Record<number, string> = { 0: "K", 1: "B", 2: "R", 3: "M", 4: "G", 5: "C", 6: "Y", 7: "W" };
const RANKED_ABBR: Record<number, string> = { 0: "K₀", 1: "B₁", 2: "R₂", 3: "M₃", 4: "G₄", 5: "C₅", 6: "Y₆", 7: "W₇" };

function bitsOf(lv: number): string {
  return lv.toString(2).padStart(3, "0");
}

function faceTextColor(lv: number): string {
  return lv === 1 ? "#fff" : "#000";
}

function signedLevelDelta(delta: number): string {
  return delta >= 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}

// 8 die views: [left column = RGB-primary pairs, right column = CMY-primary pairs]
interface DieView {
  id: string;
  top: number;
  left: number;
  right: number;
  type: "rgbTriple" | "cmyTriple" | "rgbPair" | "cmyPair";
}

// Rows: [left, right] pairs
const VIEW_ROWS: [DieView, DieView][] = [
  [
    { id: "rgb-triple", top: 4, left: 2, right: 1, type: "rgbTriple" }, // R∨B∨G = R⊕B⊕G = W
    { id: "cmy-triple", top: 6, left: 5, right: 3, type: "cmyTriple" }, // C∧M∧Y=K
  ],
  // Restricted complement-paired examples:
  // distinct RGB primaries have a ∧ b = 0, so OR and XOR coincide;
  // their distinct CMY complements have a ∨ b = W, so AND and XNOR coincide.
  // The dice display XOR/AND, the Boolean-ring addition and multiplication.
  [
    { id: "rgb-rg", top: 6, left: 2, right: 4, type: "rgbPair" }, // 010(R)∨100(G)=010(R)⊕100(G)=110(Y)
    { id: "cmy-mc", top: 1, left: 3, right: 5, type: "cmyPair" }, // 011(M)∧101(C)=XNOR(011,101)=001(B)
  ],
  [
    { id: "rgb-gb", top: 5, left: 4, right: 1, type: "rgbPair" }, // 100(G)∨001(B)=100(G)⊕001(B)=101(C)
    { id: "cmy-my", top: 2, left: 3, right: 6, type: "cmyPair" }, // 011(M)∧110(Y)=XNOR(011,110)=010(R)
  ],
  [
    { id: "rgb-br", top: 3, left: 1, right: 2, type: "rgbPair" }, // 001(B)∨010(R)=001(B)⊕010(R)=011(M)
    { id: "cmy-cy", top: 4, left: 5, right: 6, type: "cmyPair" }, // 101(C)∧110(Y)=XNOR(101,110)=100(G)
  ],
];

function onFaceKeyDown(event: React.KeyboardEvent<SVGGElement>, lv: number, onTap: (level: number) => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onTap(lv);
}

export const HueOrderNet = React.memo(function HueOrderNet({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const [pinned, setPinned] = useState<number | null>(null);
  usePinReset(setPinned);

  const enter = useCallback((lv: number) => onHover(lv), [onHover]);
  const leave = useCallback(() => onHover(null), [onHover]);
  const onTap = useCallback(
    (lv: number) => {
      setPinned((previous) => {
        const next = previous === lv ? null : lv;
        queueMicrotask(() => onHover(next));
        return next;
      });
    },
    [onHover],
  );

  const hl = hlLevel !== null && hlLevel >= 1 && hlLevel <= 6 ? hlLevel : pinned;
  const centers = DICE_NET_FACES.map(({ lv, col, row }) => {
    const center = rotateNetPoint((col + 0.5) * NET_CELL, (row + 0.5) * NET_CELL);
    return { lv, ...center };
  });

  return (
    <div data-testid="hue-order-net" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SP.md, width: "100%" }}>
      <p
        className="theory-annotation"
        style={{ margin: 0, fontFamily: FONT.mono, fontSize: FS.md, color: C.textMuted, textAlign: "center" }}
      >
        {t("theory_dice_net_cut")}
      </p>
      <svg
        viewBox={`0 0 ${NET_W} ${NET_H}`}
        role="group"
        aria-label={t("theory_dice_net_aria")}
        style={{ width: "min(100%, 360px)", overflow: "visible" }}
      >
        <defs>
          <marker id="hue-net-arrow" viewBox="0 0 6 6" refX="5.2" refY="3" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#fff" stroke="#000" strokeWidth={0.65} />
          </marker>
        </defs>

        {DICE_NET_FACES.map(({ lv, col, row }, index) => {
          const info = THEORY_LEVELS[lv];
          const center = rotateNetPoint((col + 0.5) * NET_CELL, (row + 0.5) * NET_CELL);
          const points = [
            `${center.x},${center.y - NET_DIAMOND_HALF}`,
            `${center.x + NET_DIAMOND_HALF},${center.y}`,
            `${center.x},${center.y + NET_DIAMOND_HALF}`,
            `${center.x - NET_DIAMOND_HALF},${center.y}`,
          ].join(" ");
          const isComplement = hl !== null && (hl ^ 7) === lv;
          const active = hl === lv;
          const dim = hl !== null && !active && !isComplement;
          return (
            <g
              key={`hue-net-face-${lv}`}
              role="button"
              tabIndex={0}
              aria-label={`${ABBR[lv]} · ${lv} · ${bitsOf(lv)}`}
              aria-pressed={active}
              data-hue-net-face={lv}
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
                fill={info.color}
                fillOpacity={dim ? 0.16 : active || isComplement ? 0.95 : 0.72}
                stroke={active ? "#fff" : isComplement ? C.accentBright : "#080810"}
                strokeWidth={active || isComplement ? 2 : 1.4}
              />
              <text
                x={center.x}
                y={center.y - 6}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="var(--font-mono)"
                fontSize={FS["2xl"]}
                fontWeight={900}
                fill={faceTextColor(lv)}
                opacity={dim ? 0.35 : 1}
                pointerEvents="none"
              >
                {RANKED_ABBR[lv]}
              </text>
              <text
                x={center.x}
                y={center.y + 10}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="var(--font-mono)"
                fontSize={FS.sm}
                fontWeight={700}
                fill={faceTextColor(lv)}
                opacity={dim ? 0.3 : 0.78}
                pointerEvents="none"
              >
                {bitsOf(lv)}
              </text>
            </g>
          );
        })}

        {centers.slice(0, -1).map((from, index) => {
          const to = centers[index + 1];
          const levelDelta = to.lv - from.lv;
          const linkLength = Math.hypot(to.x - from.x, to.y - from.y);
          const dx = (to.x - from.x) / linkLength;
          const dy = (to.y - from.y) / linkLength;
          const inset = NET_CELL / 2 - 7;
          const x1 = from.x + dx * inset;
          const y1 = from.y + dy * inset;
          const x2 = to.x - dx * inset;
          const y2 = to.y - dy * inset;
          const path = `M ${x1} ${y1} L ${x2} ${y2}`;
          const labelOffset = 14;
          const labelX = (x1 + x2) / 2 - Math.abs(dy) * labelOffset;
          const labelY = (y1 + y2) / 2 - Math.sign(levelDelta) * dx * labelOffset;
          return (
            <g
              key={`hue-net-link-${from.lv}-${to.lv}`}
              role="img"
              aria-label={t("theory_dice_net_edge_aria", RANKED_ABBR[from.lv], RANKED_ABBR[to.lv], signedLevelDelta(levelDelta))}
              data-hue-net-link={`${from.lv}-${to.lv}`}
              data-from-level={from.lv}
              data-to-level={to.lv}
              data-level-delta={levelDelta}
              data-edge-kind="shared"
            >
              <path d={path} fill="none" stroke="#000" strokeWidth={4.2} strokeLinecap="round" />
              <path d={path} fill="none" stroke="#fff" strokeWidth={1.65} strokeLinecap="round" markerEnd="url(#hue-net-arrow)" />
              <g data-level-delta-label={levelDelta} pointerEvents="none">
                <rect
                  x={labelX - 15}
                  y={labelY - 6.5}
                  width={30}
                  height={13}
                  rx={4}
                  fill="rgba(0,0,0,.9)"
                  stroke="#fff"
                  strokeWidth={0.6}
                />
                <text
                  x={labelX}
                  y={labelY + 0.2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="var(--font-mono)"
                  fontSize={FS.sm}
                  fontWeight={800}
                  fill="#fff"
                >
                  ΔL={signedLevelDelta(levelDelta)}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <div
        className="theory-annotation"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: SP.md,
          flexWrap: "wrap",
          margin: 0,
          fontFamily: FONT.mono,
          fontSize: FS.sm,
          color: C.textDimmer,
          textAlign: "center",
        }}
      >
        <span data-testid="hue-net-delta-definition">{t("theory_dice_net_delta_definition")}</span>
        <span
          data-hue-net-cut="3-2"
          data-from-level="3"
          data-to-level="2"
          data-level-delta="-1"
          data-edge-kind="cut"
          style={{ color: C.accentBright, fontWeight: 700 }}
        >
          {t("theory_dice_net_cut_edge")}
        </span>
      </div>
      <p
        className="theory-annotation"
        data-testid="hue-net-fold"
        style={{
          margin: 0,
          fontFamily: FONT.mono,
          fontSize: FS.md,
          fontWeight: 700,
          color: C.accentBright,
          textAlign: "center",
        }}
      >
        ↓ {t("theory_dice_net_fold")} ↓
      </p>
    </div>
  );
});

function MiniCube({
  view,
  hl,
  onEnter,
  onLeave,
  onTap,
}: {
  view: DieView;
  hl: number | null;
  onEnter: (lv: number) => void;
  onLeave: () => void;
  onTap: (lv: number) => void;
}) {
  // Draw order: top face first (furthest back), then side faces in front.
  // Note: viewing from above mirrors left/right, so FACE_L shows view.right and vice versa.
  const faces = [
    { pts: FACE_T, lv: view.top },
    { pts: FACE_L, lv: view.right },
    { pts: FACE_R, lv: view.left },
  ];

  const isPair = view.type === "rgbPair" || view.type === "cmyPair";
  const isRgb = view.type === "rgbTriple" || view.type === "rgbPair";
  const isOutput = (lv: number) => isPair && lv === view.top;
  const viewLevels = [view.top, view.left, view.right];
  const anyHl = hl !== null && viewLevels.includes(hl);
  const tripleResult = view.type === "rgbTriple" ? 7 : 0;
  const leftBits = bitsOf(view.left);
  const rightBits = bitsOf(view.right);
  const topBits = bitsOf(view.top);
  const arrowId = `dice-relation-arrow-${view.id}`;
  const topCenterY = M_OY + M_A.dy + (M_B.dy + M_C.dy) / 2;
  const sideCenterY = M_OY + (M_A.dy + M_B.dy) / 2;
  const leftFaceCenterX = M_OX + M_C.dx / 2;
  const rightFaceCenterX = M_OX + M_B.dx / 2;
  const tripleCenterY = M_OY + M_A.dy;
  const tripleStop = 5.5;
  const tripleSideStopX = M_COS30 * tripleStop;
  const tripleSideStopY = M_SIN30 * tripleStop;
  const relationPaths = isPair
    ? [
        `M ${leftFaceCenterX.toFixed(1)} ${sideCenterY.toFixed(1)} Q ${(M_OX - 10).toFixed(1)} ${(topCenterY + 8).toFixed(1)} ${(M_OX - 4).toFixed(1)} ${(topCenterY + 4).toFixed(1)}`,
        `M ${rightFaceCenterX.toFixed(1)} ${sideCenterY.toFixed(1)} Q ${(M_OX + 10).toFixed(1)} ${(topCenterY + 8).toFixed(1)} ${(M_OX + 4).toFixed(1)} ${(topCenterY + 4).toFixed(1)}`,
      ]
    : [
        `M ${M_OX.toFixed(1)} ${(topCenterY - 8).toFixed(1)} Q ${M_OX.toFixed(1)} ${topCenterY.toFixed(1)} ${M_OX.toFixed(1)} ${(tripleCenterY - tripleStop).toFixed(1)}`,
        `M ${(leftFaceCenterX - 8).toFixed(1)} ${(sideCenterY + 4).toFixed(1)} Q ${leftFaceCenterX.toFixed(1)} ${sideCenterY.toFixed(1)} ${(M_OX - tripleSideStopX).toFixed(1)} ${(tripleCenterY + tripleSideStopY).toFixed(1)}`,
        `M ${(rightFaceCenterX + 8).toFixed(1)} ${(sideCenterY + 4).toFixed(1)} Q ${rightFaceCenterX.toFixed(1)} ${sideCenterY.toFixed(1)} ${(M_OX + tripleSideStopX).toFixed(1)} ${(tripleCenterY + tripleSideStopY).toFixed(1)}`,
      ];

  const relationLabel = isPair
    ? isRgb
      ? `${leftBits}(${ABBR[view.left]}) ∧ ${rightBits}(${ABBR[view.right]}) = 000 ⇒ ${leftBits}(${ABBR[view.left]}) ∨ ${rightBits}(${ABBR[view.right]}) = ${leftBits}(${ABBR[view.left]}) ⊕ ${rightBits}(${ABBR[view.right]}) = ${topBits}(${ABBR[view.top]})`
      : `${leftBits}(${ABBR[view.left]}) ∨ ${rightBits}(${ABBR[view.right]}) = 111 ⇒ ${leftBits}(${ABBR[view.left]}) ∧ ${rightBits}(${ABBR[view.right]}) = XNOR(${leftBits},${rightBits}) = ${topBits}(${ABBR[view.top]})`
    : isRgb
      ? `RGB: ∀a≠b∈{R,G,B}, a∧b=000 ⇒ ${RANKED_ABBR[view.left]} ∨ ${RANKED_ABBR[view.right]} ∨ ${RANKED_ABBR[view.top]} = ${RANKED_ABBR[view.left]} ⊕ ${RANKED_ABBR[view.right]} ⊕ ${RANKED_ABBR[view.top]} = ${RANKED_ABBR[tripleResult]}`
      : `CMY: ${RANKED_ABBR[view.left]} ∧ ${RANKED_ABBR[view.right]} ∧ ${RANKED_ABBR[view.top]} = ${RANKED_ABBR[tripleResult]}`;

  return (
    <div
      role="group"
      aria-label={relationLabel}
      data-dice-view={view.id}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}
    >
      <svg viewBox={`0 0 ${M_VW} ${isPair ? 64 : M_VH}`} style={{ width: 112, height: isPair ? 100 : 128, overflow: "visible" }}>
        <defs>
          <marker id={arrowId} viewBox="0 0 6 6" refX="5.2" refY="3" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#fff" stroke="#000" strokeWidth={0.7} />
          </marker>
        </defs>
        {faces.map(({ pts, lv }) => {
          const info = THEORY_LEVELS[lv];
          const active = hl === lv;
          const dim = hl !== null && !active && !anyHl;
          const output = isOutput(lv);
          return (
            <g
              key={`f${lv}`}
              role="button"
              tabIndex={0}
              aria-label={`${ABBR[lv]} · ${lv} · ${bitsOf(lv)}`}
              aria-pressed={active}
              data-face-rank={`${ABBR[lv]}-${lv}`}
              onMouseEnter={() => onEnter(lv)}
              onMouseLeave={onLeave}
              onFocus={() => onEnter(lv)}
              onBlur={onLeave}
              onClick={() => onTap(lv)}
              onKeyDown={(event) => onFaceKeyDown(event, lv, onTap)}
              style={S_CURSOR_POINTER}
            >
              <title>{`${ABBR[lv]} · ${lv} = ${bitsOf(lv)}`}</title>
              <polygon
                points={pts}
                fill={info.color}
                fillOpacity={dim ? 0.15 : 1}
                stroke={dim ? C.textDimmer : "#000"}
                strokeWidth={output ? 1.5 : active ? 1.5 : 1.2}
                strokeOpacity={dim ? 0.2 : 1}
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {/* Inputs converge toward the result face (pairs) or the external K/W result (triples). */}
        <g
          aria-hidden="true"
          opacity={hl !== null && !anyHl ? 0.16 : 0.92}
          strokeDasharray={isRgb ? undefined : "3 2"}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {relationPaths.map((path, index) => (
            <React.Fragment key={`relation-${index}`}>
              <path d={path} fill="none" stroke="#000" strokeWidth={3.4} />
              <path
                d={path}
                fill="none"
                stroke="#fff"
                strokeWidth={1.35}
                markerEnd={`url(#${arrowId})`}
                data-relation-arrow={isPair ? "pair-input" : "triple-input"}
              />
            </React.Fragment>
          ))}
        </g>

        {/* Rank and color abbreviation are inseparable on every visible die face. */}
        {[
          { lv: view.top, x: M_OX, y: M_OY + M_A.dy + (M_B.dy + M_C.dy) / 2 },
          { lv: view.right, x: M_OX + M_C.dx / 2, y: M_OY + (M_A.dy + M_C.dy) / 2 },
          { lv: view.left, x: M_OX + M_B.dx / 2, y: M_OY + (M_A.dy + M_B.dy) / 2 },
        ].map(({ lv, x, y }) => {
          const isDim = hl !== null && !viewLevels.includes(hl);
          return (
            <text
              key={`n${lv}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={8}
              fontWeight={900}
              fontFamily="var(--font-mono)"
              fill={isDim ? C.textDimmer : faceTextColor(lv)}
              opacity={isDim ? 0.3 : 0.9}
              pointerEvents="none"
            >
              {lv}·{ABBR[lv]}
            </text>
          );
        })}

        {/* The operation stays attached to its arrows, so it cannot read as a global column rule. */}
        {isPair ? (
          <g aria-hidden="true" opacity={hl !== null && !anyHl ? 0.2 : 1}>
            <rect
              x={isRgb ? 24 : 17}
              y={49}
              width={isRgb ? 24 : 38}
              height={9}
              rx={4.5}
              fill="rgba(0,0,0,.82)"
              stroke="#fff"
              strokeWidth={0.55}
            />
            <text
              x={M_OX}
              y={53.7}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={isRgb ? 5.8 : 5.2}
              fontWeight={700}
              fontFamily="var(--font-mono)"
              fill="#fff"
            >
              {isRgb ? "∨ = ⊕" : "∧ = XNOR"}
            </text>
          </g>
        ) : (
          <g aria-hidden="true" opacity={hl !== null && !anyHl ? 0.2 : 1}>
            <circle
              cx={M_OX}
              cy={tripleCenterY}
              r={5}
              fill="rgba(0,0,0,.86)"
              stroke="#fff"
              strokeWidth={0.65}
              data-operation-node="triple-center"
            />
            <text
              x={M_OX}
              y={tripleCenterY + 0.2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={6.5}
              fontWeight={700}
              fontFamily="var(--font-mono)"
              fill="#fff"
            >
              {isRgb ? "∨" : "∧"}
            </text>
            <rect
              x={25}
              y={51}
              width={22}
              height={11}
              rx={5.5}
              fill="rgba(0,0,0,.76)"
              stroke={THEORY_LEVELS[tripleResult].color}
              strokeWidth={0.8}
            />
            <text
              x={M_OX}
              y={56.7}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={6.3}
              fontWeight={700}
              fontFamily="var(--font-mono)"
              fill={tripleResult === 0 ? C.textPrimary : THEORY_LEVELS[tripleResult].color}
            >
              = {RANKED_ABBR[tripleResult]}
            </text>
          </g>
        )}
      </svg>

      {/* Each binary coincidence is displayed with its actual operands and premise. */}
      <div
        data-relation-kind={view.type}
        style={{
          minHeight: isPair ? 50 : 36,
          fontSize: FS.md,
          fontFamily: FONT.mono,
          color: C.textDimmer,
          textAlign: "center",
          lineHeight: 1.35,
          whiteSpace: "nowrap",
        }}
      >
        {view.type === "rgbTriple" ? (
          <>
            <span>{`${RANKED_ABBR[view.left]} ∨ ${RANKED_ABBR[view.right]} ∨ ${RANKED_ABBR[view.top]} = ${RANKED_ABBR[tripleResult]}`}</span>
            <br />
            <span>{`${leftBits}(${ABBR[view.left]}) ⊕ ${rightBits}(${ABBR[view.right]})`}</span>
            <br />
            <span>{`⊕ ${topBits}(${ABBR[view.top]}) = 111(W)`}</span>
          </>
        ) : view.type === "cmyTriple" ? (
          <>
            <span>{`${RANKED_ABBR[view.left]} ∧ ${RANKED_ABBR[view.right]} ∧ ${RANKED_ABBR[view.top]} = ${RANKED_ABBR[tripleResult]}`}</span>
            <br />
            <span>{`${leftBits}(${ABBR[view.left]}) ∧ ${rightBits}(${ABBR[view.right]})`}</span>
            <br />
            <span>{`∧ ${topBits}(${ABBR[view.top]}) = 000(K)`}</span>
          </>
        ) : view.type === "rgbPair" ? (
          <>
            <span
              data-condition={`${leftBits}&${rightBits}=000`}
            >{`${leftBits}(${ABBR[view.left]}) ∧ ${rightBits}(${ABBR[view.right]}) = 000`}</span>
            <br />
            <span>⇒ {`${leftBits}(${ABBR[view.left]}) ∨ ${rightBits}(${ABBR[view.right]})`}</span>
            <br />
            <span>{`= ${leftBits}(${ABBR[view.left]}) ⊕ ${rightBits}(${ABBR[view.right]})`}</span>
            <br />
            <span>{`= ${topBits}(${ABBR[view.top]})`}</span>
          </>
        ) : (
          <>
            <span
              data-condition={`${leftBits}|${rightBits}=111`}
            >{`${leftBits}(${ABBR[view.left]}) ∨ ${rightBits}(${ABBR[view.right]}) = 111`}</span>
            <br />
            <span>⇒ {`${leftBits}(${ABBR[view.left]}) ∧ ${rightBits}(${ABBR[view.right]})`}</span>
            <br />
            <span>{`= XNOR(${leftBits},${rightBits})`}</span>
            <br />
            <span>{`= ${topBits}(${ABBR[view.top]})`}</span>
          </>
        )}
      </div>
    </div>
  );
}

export const ColorDice = React.memo(function ColorDice({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const [pinned, setPinned] = useState<number | null>(null);
  usePinReset(setPinned);

  const enter = useCallback((lv: number) => onHover(lv), [onHover]);
  const leave = useCallback(() => onHover(null), [onHover]);
  const onTap = useCallback(
    (lv: number) => {
      setPinned((prev) => {
        const next = prev === lv ? null : lv;
        queueMicrotask(() => onHover(next));
        return next;
      });
    },
    [onHover],
  );

  const hl = hlLevel !== null && hlLevel >= 0 && hlLevel <= 7 ? hlLevel : pinned;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SP.md }}>
      {/* The algebraic complement law is what makes the regular color placement
          coincide with the opposite-face convention of a standard die. */}
      <div
        role="group"
        aria-label={t("theory_dice_desc2")}
        data-testid="color-die-rank-structure"
        style={{
          width: "100%",
          maxWidth: 560,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: SP.md,
          padding: `${SP.sm}px 0`,
          fontFamily: FONT.mono,
          color: C.textMuted,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: FS.sm, color: C.textPrimary, letterSpacing: 0.25 }}>L(c) = 1…6 &nbsp;↔&nbsp; ⚀ ⚁ ⚂ ⚃ ⚄ ⚅</div>
        <div style={{ display: "flex", justifyContent: "center", gap: SP.xl, flexWrap: "wrap" }}>
          {PAIRS.map(([a, b]) => (
            <span
              key={`rank-pair-${a}-${b}`}
              data-complement-pair={`${ABBR[a]}${a}-${ABBR[b]}${b}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: FS.sm,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: THEORY_LEVELS[a].color,
                  border: "1px solid rgba(255,255,255,.45)",
                }}
              />
              {RANKED_ABBR[a]} ↔ {RANKED_ABBR[b]}
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: THEORY_LEVELS[b].color,
                  border: "1px solid rgba(255,255,255,.45)",
                }}
              />
            </span>
          ))}
        </div>
        <div style={{ fontSize: FS.sm, color: C.accentBright }}>L(c̄) = 7 − L(c) &nbsp;⇒&nbsp; L(c) + L(c̄) = 7</div>
      </div>

      {/* 8 isometric cube views: 2 columns × 4 rows */}
      <div
        data-testid="color-die-view-grid"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SP.sm, width: "100%", maxWidth: 560 }}
      >
        {/* The premises are part of the headings; XOR/AND are never presented as unconditional conversion rules. */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP["3xl"], width: "100%", marginTop: SP.sm }}>
          <div style={S_COLUMN_HEADER} data-testid="rgb-restricted-rule">
            <strong style={{ color: C.textPrimary }}>RGB (+) · a ≠ b</strong>
            <span>a ∧ b = 000</span>
            <span>⇒ a ∨ b = a ⊕ b</span>
          </div>
          <div style={S_COLUMN_HEADER} data-testid="cmy-restricted-rule">
            <strong style={{ color: C.textPrimary }}>CMY (−) · a ≠ b</strong>
            <span>a ∨ b = 111</span>
            <span>⇒ a ∧ b = XNOR(a,b)</span>
          </div>
        </div>
        {/* Grid rows */}
        {VIEW_ROWS.map(([left, right], ri) => (
          <div key={`vr${ri}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP["3xl"], width: "100%" }}>
            <MiniCube view={left} hl={hl} onEnter={enter} onLeave={leave} onTap={onTap} />
            <MiniCube view={right} hl={hl} onEnter={enter} onLeave={leave} onTap={onTap} />
          </div>
        ))}
        {/* Footer annotation */}
        <p
          className="theory-annotation"
          style={{
            maxWidth: 560,
            fontSize: FS.sm,
            fontFamily: FONT.mono,
            color: C.textDimmer,
            margin: 0,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          {t("theory_dice_footer_ops")}
          <br />
          {t("theory_dice_footer_demorgan")}
          <br />
          {t("theory_dice_footer_subtractive")}
        </p>
      </div>
    </div>
  );
});
