import React, { useCallback, useState } from "react";
import { CUBE_EDGES, CUBE_POINTS, OCTA_COMPLEMENT_AXES, OCTA_EDGES, OCTA_FACES, THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { S_CURSOR_POINTER } from "../../styles/shared";
import { C, FONT, FS, FW, SP } from "../../styles/tokens";
import { usePinReset } from "./pin-reset";

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

interface Point2D {
  readonly x: number;
  readonly y: number;
}

interface DieFace {
  readonly lv: number;
  readonly complement: number;
  readonly vertices: readonly number[];
  readonly hidden: boolean;
}

const VIEW_W = 660;
const VIEW_H = 350;
const CUBE_OFFSET = { x: 0, y: 22 };
const OCTA_OFFSET = { x: 360, y: 24 };
const OCTA_CENTER = { x: 150, y: 128 };
const OCTA_RADIUS = 98;
const OCTA_ORDER = [2, 6, 4, 5, 1, 3] as const;
const SUBSCRIPT = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇"] as const;

const OCTA_POINTS: Readonly<Record<number, Point2D>> = Object.fromEntries(
  OCTA_ORDER.map((lv, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 3;
    return [
      lv,
      {
        x: OCTA_CENTER.x + OCTA_RADIUS * Math.cos(angle),
        y: OCTA_CENTER.y + OCTA_RADIUS * Math.sin(angle),
      },
    ];
  }),
);

function faceVertices(channel: number, bit: number): number[] {
  return THEORY_LEVELS.filter((level) => level.bits[channel] === bit).map((level) => level.lv);
}

function cyclicPolygon(vertices: readonly number[], points: Readonly<Record<number, Point2D>>): string {
  const center = vertices.reduce((sum, lv) => ({ x: sum.x + points[lv].x / vertices.length, y: sum.y + points[lv].y / vertices.length }), {
    x: 0,
    y: 0,
  });
  return [...vertices]
    .sort((a, b) => Math.atan2(points[a].y - center.y, points[a].x - center.x) - Math.atan2(points[b].y - center.y, points[b].x - center.x))
    .map((lv) => `${points[lv].x},${points[lv].y}`)
    .join(" ");
}

const DIE_FACES: readonly DieFace[] = OCTA_COMPLEMENT_AXES.flatMap(([primary, secondary]) => {
  const channel = THEORY_LEVELS[primary].bits.findIndex((bit) => bit === 1);
  return [
    {
      lv: primary,
      complement: secondary,
      vertices: faceVertices(channel, 1),
      hidden: false,
    },
    {
      lv: secondary,
      complement: primary,
      vertices: faceVertices(channel, 0),
      hidden: true,
    },
  ];
});

const OCTA_FACE_ADJACENCIES: readonly (readonly [number, number])[] = OCTA_FACES.flatMap((face, index) =>
  OCTA_FACES.slice(index + 1)
    .filter((other) => face.verts.filter((vertex) => other.verts.includes(vertex)).length === 2)
    .map((other) => [face.color, other.color] as const),
);

function isAdjacentFace(a: number, b: number): boolean {
  return OCTA_FACE_ADJACENCIES.some(([left, right]) => (left === a && right === b) || (left === b && right === a));
}

function bitsOf(lv: number): string {
  return THEORY_LEVELS[lv].bits.join("");
}

function rankedLabel(lv: number): string {
  return `${THEORY_LEVELS[lv].short}${SUBSCRIPT[lv]}`;
}

function labelColor(lv: number): string {
  return lv >= 4 ? "#000" : "#fff";
}

function handleKeyDown(event: React.KeyboardEvent<SVGGElement>, lv: number, onTap: (level: number) => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onTap(lv);
}

export const OctahedronDual = React.memo(function OctahedronDual({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const [pinned, setPinned] = useState<number | null>(null);
  usePinReset(setPinned);

  const hl = hlLevel !== null && hlLevel >= 0 && hlLevel <= 7 ? hlLevel : pinned;
  const complement = hl !== null && hl >= 1 && hl <= 6 ? hl ^ 7 : null;

  const enter = useCallback((lv: number) => onHover(lv), [onHover]);
  const leave = useCallback(() => onHover(null), [onHover]);
  const tap = useCallback(
    (lv: number) => {
      setPinned((previous) => {
        const next = previous === lv ? null : lv;
        queueMicrotask(() => onHover(next));
        return next;
      });
    },
    [onHover],
  );

  const interactionProps = (lv: number, ariaLabel: string) => ({
    role: "button" as const,
    tabIndex: 0,
    "aria-label": ariaLabel,
    "aria-pressed": hl === lv,
    onMouseEnter: () => enter(lv),
    onMouseLeave: leave,
    onFocus: () => enter(lv),
    onBlur: leave,
    onClick: () => tap(lv),
    onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => handleKeyDown(event, lv, tap),
    style: S_CURSOR_POINTER,
  });

  return (
    <div
      data-testid="octahedron-dual"
      style={{ display: "flex", width: "100%", flexDirection: "column", alignItems: "center", gap: SP.lg }}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="group"
        aria-label={t("theory_octa_dual_aria")}
        style={{ width: "100%", maxWidth: VIEW_W, overflow: "visible" }}
      >
        <text x={150} y={16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={FS.lg} fontWeight={FW.bold} fill={C.textPrimary}>
          {t("theory_octa_dual_die")}
        </text>
        <text x={510} y={16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={FS.lg} fontWeight={FW.bold} fill={C.textPrimary}>
          {t("theory_octa_dual_octa")}
        </text>

        {/* A fixed isometric cube: its eight vertices are the eight Boolean states. */}
        <g transform={`translate(${CUBE_OFFSET.x} ${CUBE_OFFSET.y})`} data-dual-object="die">
          {[...DIE_FACES]
            .sort((a, b) => Number(b.hidden) - Number(a.hidden))
            .map((face) => {
              const active = hl === face.lv;
              const opposite = hl === face.complement;
              const dim = hl !== null && !active && !opposite;
              return (
                <polygon
                  key={`die-surface-${face.lv}`}
                  data-die-surface-face={face.lv}
                  data-complement-face={face.complement}
                  points={cyclicPolygon(face.vertices, CUBE_POINTS)}
                  fill={THEORY_LEVELS[face.lv].color}
                  fillOpacity={active ? 0.38 : opposite ? 0.12 : face.hidden ? 0.025 : dim ? 0.025 : 0.09}
                  stroke={active ? "#fff" : opposite ? C.accentBright : THEORY_LEVELS[face.lv].color}
                  strokeWidth={active ? 2.2 : opposite ? 1.4 : 0.7}
                  strokeOpacity={active ? 0.95 : opposite ? 0.65 : face.hidden ? 0.2 : dim ? 0.16 : 0.35}
                  strokeDasharray={face.hidden || opposite ? "4 3" : undefined}
                  pointerEvents="none"
                />
              );
            })}

          {CUBE_EDGES.map(([a, b]) => {
            const incident = hl !== null && (a === hl || b === hl);
            const dim = hl !== null && !incident;
            return (
              <line
                key={`cube-edge-${a}-${b}`}
                data-cube-edge={`${a}-${b}`}
                data-highlighted-incident={incident || undefined}
                x1={CUBE_POINTS[a].x}
                y1={CUBE_POINTS[a].y}
                x2={CUBE_POINTS[b].x}
                y2={CUBE_POINTS[b].y}
                stroke={incident ? "#fff" : C.textDimmer}
                strokeWidth={incident ? 2 : 1}
                opacity={dim ? 0.13 : incident ? 0.88 : 0.38}
              />
            );
          })}

          {THEORY_LEVELS.map((info) => {
            const point = CUBE_POINTS[info.lv];
            const active = hl === info.lv;
            const dim = hl !== null && !active;
            return (
              <g
                key={`die-vertex-${info.lv}`}
                {...interactionProps(info.lv, t("theory_octa_dual_die_vertex_aria", info.name, info.lv, bitsOf(info.lv)))}
                data-die-vertex={info.lv}
              >
                <title>{`${rankedLabel(info.lv)} · ${bitsOf(info.lv)}`}</title>
                <circle cx={point.x} cy={point.y} r={13} fill="transparent" />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={7}
                  fill={info.lv === 0 ? C.bgRoot : info.color}
                  fillOpacity={dim ? 0.2 : 0.92}
                  stroke={active ? "#fff" : info.lv === 0 ? C.textDimmer : info.color}
                  strokeWidth={active ? 2.2 : 1}
                  strokeOpacity={dim ? 0.25 : 0.9}
                />
                <text
                  x={point.x}
                  y={point.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="var(--font-mono)"
                  fontSize={FS.xs}
                  fontWeight={FW.bold}
                  fill={labelColor(info.lv)}
                  opacity={dim ? 0.25 : 1}
                  pointerEvents="none"
                >
                  {info.lv}
                </text>
              </g>
            );
          })}
        </g>

        {/* Combinatorial duality, rather than a geometric deformation. */}
        <g aria-hidden="true" data-dual-correspondence="true">
          <path d="M 304 104 C 323 92, 337 92, 356 104" fill="none" stroke={C.accentBright} strokeWidth={1.2} opacity={0.65} />
          <path d="M 304 160 C 323 172, 337 172, 356 160" fill="none" stroke={C.accentBright} strokeWidth={1.2} opacity={0.65} />
          <path d="M 350 100 L 357 104 L 350 108" fill="none" stroke={C.accentBright} strokeWidth={1.2} opacity={0.65} />
          <path d="M 310 156 L 303 160 L 310 164" fill="none" stroke={C.accentBright} strokeWidth={1.2} opacity={0.65} />
          <text
            x={330}
            y={136}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize={FS.xs}
            fontWeight={FW.bold}
            fill={C.accentBright}
          >
            D ↔ D*
          </text>
        </g>

        {/* Fixed hexagonal projection of the octahedron. No rotation or lighting model is required. */}
        <g transform={`translate(${OCTA_OFFSET.x} ${OCTA_OFFSET.y})`} data-dual-object="octahedron">
          {OCTA_FACES.map((face) => {
            const active = hl === face.color;
            const adjacent = hl !== null && isAdjacentFace(hl, face.color);
            const dim = hl !== null && !active && !adjacent;
            return (
              <polygon
                key={`octa-surface-face-${face.color}`}
                data-octa-surface-face={face.color}
                data-face-verts={face.verts.join("-")}
                data-face-adjacent={adjacent || undefined}
                points={face.verts.map((lv) => `${OCTA_POINTS[lv].x},${OCTA_POINTS[lv].y}`).join(" ")}
                fill={THEORY_LEVELS[face.color].color}
                fillOpacity={active ? 0.32 : adjacent ? 0.075 : dim ? 0.012 : 0.035}
                stroke={active ? "#fff" : adjacent ? C.accentBright : THEORY_LEVELS[face.color].color}
                strokeWidth={active ? 2.1 : adjacent ? 1 : 0.45}
                strokeOpacity={active ? 0.9 : adjacent ? 0.42 : dim ? 0.08 : 0.22}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            );
          })}

          {OCTA_COMPLEMENT_AXES.map(([a, b]) => {
            const active = hl === a || hl === b;
            return (
              <g key={`axis-${a}-${b}`} data-complement-axis={`${a}-${b}`} data-axis-active={active || undefined}>
                <line
                  x1={OCTA_POINTS[a].x}
                  y1={OCTA_POINTS[a].y}
                  x2={OCTA_POINTS[b].x}
                  y2={OCTA_POINTS[b].y}
                  stroke={active ? "#fff" : C.textDimmer}
                  strokeWidth={active ? 1.8 : 1}
                  strokeDasharray="4 3"
                  opacity={active ? 0.78 : 0.25}
                />
                <circle cx={OCTA_CENTER.x} cy={OCTA_CENTER.y} r={2} fill={active ? "#fff" : C.textDimmer} opacity={active ? 0.8 : 0.35} />
              </g>
            );
          })}

          {OCTA_EDGES.map(([a, b]) => {
            const incident = hl !== null && (a === hl || b === hl);
            const dim = hl !== null && !incident;
            return (
              <line
                key={`octa-edge-${a}-${b}`}
                data-octa-edge={`${a}-${b}`}
                x1={OCTA_POINTS[a].x}
                y1={OCTA_POINTS[a].y}
                x2={OCTA_POINTS[b].x}
                y2={OCTA_POINTS[b].y}
                stroke={incident ? "#fff" : C.textDimmer}
                strokeWidth={incident ? 2.1 : 1}
                opacity={dim ? 0.12 : incident ? 0.88 : 0.42}
              />
            );
          })}

          {OCTA_ORDER.map((lv) => {
            const info = THEORY_LEVELS[lv];
            const point = OCTA_POINTS[lv];
            const active = hl === lv;
            const isComplement = complement === lv;
            const dim = hl !== null && !active && !isComplement;
            return (
              <g
                key={`octa-vertex-${lv}`}
                {...interactionProps(lv, t("theory_octa_dual_octa_vertex_aria", info.name, info.lv, bitsOf(info.lv)))}
                data-octa-vertex={lv}
              >
                <title>{`${rankedLabel(lv)} · ${bitsOf(lv)}`}</title>
                <circle cx={point.x} cy={point.y} r={16} fill="transparent" />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={11}
                  fill={info.color}
                  fillOpacity={dim ? 0.2 : 0.88}
                  stroke={active ? "#fff" : isComplement ? C.accentBright : info.color}
                  strokeWidth={active ? 2.5 : isComplement ? 1.8 : 1.2}
                  strokeOpacity={dim ? 0.24 : 0.95}
                  strokeDasharray={isComplement ? "3 2" : undefined}
                />
                <text
                  x={point.x}
                  y={point.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="var(--font-mono)"
                  fontSize={FS.md}
                  fontWeight={FW.bold}
                  fill={labelColor(lv)}
                  opacity={dim ? 0.25 : 1}
                  pointerEvents="none"
                >
                  {rankedLabel(lv)}
                </text>
              </g>
            );
          })}
        </g>

        {/* Six face controls make hidden die faces explicit and keyboard operable. */}
        <g transform="translate(28 280)" role="group" aria-label={t("theory_octa_dual_die_faces_aria")} data-dual-set="six-die-faces">
          {DIE_FACES.map((face, index) => {
            const info = THEORY_LEVELS[face.lv];
            const x = index * 43;
            const active = hl === face.lv;
            return (
              <g
                key={`die-face-control-${face.lv}`}
                transform={`translate(${x} 0)`}
                {...interactionProps(face.lv, t("theory_octa_dual_die_face_aria", info.name, info.lv, bitsOf(info.lv)))}
                data-die-face={face.lv}
                data-dual-octa-vertex={face.lv}
              >
                <title>{`${rankedLabel(face.lv)} · ${bitsOf(face.lv)}`}</title>
                <rect x={0} y={0} width={34} height={34} rx={3} fill="transparent" />
                <rect
                  x={4}
                  y={4}
                  width={26}
                  height={26}
                  rx={2}
                  fill={info.color}
                  fillOpacity={active ? 0.95 : 0.66}
                  stroke={active ? "#fff" : info.color}
                  strokeWidth={active ? 2 : 1}
                />
                <text
                  x={17}
                  y={17}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="var(--font-mono)"
                  fontSize={FS.sm}
                  fontWeight={FW.bold}
                  fill={labelColor(face.lv)}
                  pointerEvents="none"
                >
                  {rankedLabel(face.lv)}
                </text>
              </g>
            );
          })}
        </g>

        {/* Eight separate face controls expose every octahedral face despite projection overlap. */}
        <g
          transform="translate(373 268)"
          role="group"
          aria-label={t("theory_octa_dual_octa_faces_aria")}
          data-dual-set="eight-octa-faces"
          data-face-adjacency-count={OCTA_FACE_ADJACENCIES.length}
          data-face-adjacency-is-q3={OCTA_FACE_ADJACENCIES.every(([a, b]) => (a ^ b) === 1 || (a ^ b) === 2 || (a ^ b) === 4)}
        >
          {OCTA_FACES.map((face, index) => {
            const info = THEORY_LEVELS[face.color];
            const col = index % 4;
            const row = Math.floor(index / 4);
            const x = col * 65;
            const y = row * 38;
            const active = hl === face.color;
            const adjacent = hl !== null && isAdjacentFace(hl, face.color);
            return (
              <g
                key={`octa-face-control-${face.color}`}
                transform={`translate(${x} ${y})`}
                {...interactionProps(face.color, t("theory_octa_dual_octa_face_aria", info.name, info.lv, bitsOf(info.lv)))}
                data-octa-face={face.color}
                data-face-verts={face.verts.join("-")}
                data-dual-die-vertex={face.color}
              >
                <title>{`${rankedLabel(face.color)} · {${face.verts.map(rankedLabel).join(", ")}}`}</title>
                <rect x={0} y={0} width={58} height={34} fill="transparent" />
                <polygon
                  points="5,29 18,5 31,29"
                  fill={info.lv === 0 ? C.bgRoot : info.color}
                  fillOpacity={active ? 0.9 : adjacent ? 0.55 : 0.32}
                  stroke={active ? "#fff" : adjacent ? C.accentBright : info.lv === 0 ? C.textDimmer : info.color}
                  strokeWidth={active ? 2 : adjacent ? 1.5 : 1}
                />
                {face.verts.map((vertex, vertexIndex) => {
                  const positions = [
                    { x: 5, y: 29 },
                    { x: 18, y: 5 },
                    { x: 31, y: 29 },
                  ] as const;
                  return (
                    <circle
                      key={`face-${face.color}-vertex-${vertex}`}
                      cx={positions[vertexIndex].x}
                      cy={positions[vertexIndex].y}
                      r={2.6}
                      fill={THEORY_LEVELS[vertex].color}
                      stroke="#000"
                      strokeWidth={0.6}
                    />
                  );
                })}
                <text
                  x={44}
                  y={18}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="var(--font-mono)"
                  fontSize={FS.sm}
                  fontWeight={FW.bold}
                  fill={active ? "#fff" : C.textMuted}
                  pointerEvents="none"
                >
                  {rankedLabel(face.color)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div
        data-testid="octahedron-dual-relations"
        style={{
          display: "grid",
          width: "min(100%, 620px)",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: `${SP.sm}px ${SP["2xl"]}px`,
          fontFamily: FONT.mono,
          fontSize: FS.sm,
          color: C.textDimmer,
          textAlign: "center",
          lineHeight: 1.45,
        }}
      >
        <span data-dual-relation="faces-to-vertices">{t("theory_octa_dual_face_vertex")}</span>
        <span data-dual-relation="vertices-to-faces">{t("theory_octa_dual_vertex_face")}</span>
        <span data-dual-relation="edges-to-edges" style={{ gridColumn: "1 / -1" }}>
          {t("theory_octa_dual_edge_edge")}
        </span>
        <span data-dual-relation="opposites-to-axes">{t("theory_octa_dual_axis")}</span>
        <span data-dual-relation="face-adjacency-q3">{t("theory_octa_dual_q3")}</span>
      </div>
    </div>
  );
});
