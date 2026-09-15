import React, { useMemo } from "react";
import { THEORY_LEVELS, hammingDist } from "../../data/theory-data";
import { C, FW } from "../../styles/tokens";
import { S_CURSOR_POINTER } from "../../styles/shared";
import { useTranslation } from "../../i18n";
import { ToggleActionTable } from "./ToggleActionTable";
import { targetState, useK8Selection, type K8Target } from "./k8-selection";
import { stellaView } from "./stella-view";
import { useStellaView } from "./useStellaView";

const VR = 5.7;
const HIT_R = 14;

// Color identifies the XOR mask; all distances share the same solid line style.
const edgeColor = (mask: number) => THEORY_LEVELS[mask].color;

const DISTANCES = [1, 2, 3] as const;
const DISTANCE_TERMS = ["", "Q₃(12)", "2K₄(12)", "M₄(4)"];

interface Props {
  hlLevel: number | null;
  onHover: (lv: number | null) => void;
}

export const StellaOctangula = React.memo(function StellaOctangula({ hlLevel, onHover }: Props) {
  const { t } = useTranslation();
  const link = useK8Selection(onHover);
  const camera = useStellaView(link.selection, link.restoreSelection);
  const view = useMemo(() => stellaView(camera.orientation), [camera.orientation]);
  const turning = camera.progress < 1;
  const { visibleDistances, selectDistances } = link;
  const distances = DISTANCES.filter((distance) => visibleDistances.has(distance));
  const nodesOnly = distances.length === 0;
  const baseEdgeWidth = distances.length === 1 ? 1.25 : 1;
  const baseEdgeOpacity = distances.length === 1 ? 0.9 : 0.7;
  const edgeCount = distances.reduce((count, distance) => count + (distance === 3 ? 4 : 12), 0);

  const comparisonA = targetState(link.selection);
  const comparisonB = link.selection?.kind === "transition" ? link.selection.state ^ link.selection.mask : null;
  const comparisonComplete = comparisonB !== null;
  const selectedMask = link.selection?.kind === "mask" ? link.selection.mask : null;

  const externalHl = hlLevel !== null && hlLevel >= 0 && hlLevel <= 7 ? hlLevel : null;
  const hl = comparisonA ?? externalHl;
  const previewTarget = link.preview;
  const vertexPreview = (level: number): K8Target =>
    comparisonA !== null && comparisonA !== level
      ? { kind: "transition", state: comparisonA, mask: comparisonA ^ level }
      : { kind: "state", state: level };
  const hasEdgePreview = previewTarget !== null && previewTarget.kind !== "state";
  const hasEmphasis = comparisonComplete || hl !== null || selectedMask !== null || hasEdgePreview;

  const toggleDistance = (distance: number) => {
    const next = new Set(visibleDistances);
    if (next.has(distance)) next.delete(distance);
    else next.add(distance);
    selectDistances(next);
  };

  const renderVertices = () =>
    view.orderedLevels.map((info) => {
      const lv = info.lv;
      const p = view.points[lv];
      const comparisonRole = comparisonA === lv ? "a" : comparisonB === lv ? "b" : null;
      const disabled = nodesOnly || (comparisonA !== null && lv !== comparisonA && !visibleDistances.has(hammingDist(comparisonA, lv)));
      const previewVertex =
        previewTarget?.kind === "transition" && (previewTarget.state === lv || (previewTarget.state ^ previewTarget.mask) === lv);
      const matching = selectedMask !== null || previewTarget?.kind === "mask";
      const hovered = previewVertex || (!disabled && externalHl === lv);
      const neighbour = hl !== null && lv !== hl && visibleDistances.has(hammingDist(hl, lv));
      const active =
        comparisonRole !== null || previewVertex || matching || (!comparisonComplete && !hasEdgePreview && (hl === lv || neighbour));
      const dim = !nodesOnly && ((disabled && !previewVertex && !matching) || (hasEmphasis && !active));
      const vertexAriaLabel =
        comparisonRole === "a"
          ? t("theory_stella_compare_input_a_aria", info.short, lv, info.bits.join(""))
          : comparisonRole === "b"
            ? t("theory_stella_compare_input_b_aria", info.short, lv, info.bits.join(""))
            : `${info.short} · ${lv} · ${info.bits.join("")}`;

      const r = VR;

      return (
        <g
          key={`v-${lv}`}
          className="theory-stella-node"
          data-stella-vertex={lv}
          data-stella-depth={view.vertices[lv][2]}
          data-stella-dimmed={dim}
          data-stella-hovered={hovered}
          data-stella-preview={previewVertex}
          data-stella-comparison-role={comparisonRole ?? undefined}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={vertexAriaLabel}
          aria-pressed={comparisonRole !== null}
          aria-disabled={disabled || undefined}
          onPointerEnter={
            disabled
              ? undefined
              : (event) => {
                  // Vertices sweep under a resting pointer while the camera turns;
                  // only a hover on the settled view is a preview.
                  if (event.pointerType !== "touch" && !turning) link.onPreview(vertexPreview(lv), "graph", "hover");
                }
          }
          onPointerLeave={(event) => {
            if (event.pointerType !== "touch") link.onPreview(null, "graph", "hover");
          }}
          onFocus={disabled ? undefined : () => link.onPreview(vertexPreview(lv), "graph", "focus")}
          onBlur={() => link.onPreview(null, "graph", "focus")}
          onClick={() => link.selectVertex(lv)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              link.selectVertex(lv);
            }
          }}
          style={disabled ? undefined : S_CURSOR_POINTER}
        >
          <title>{`${info.short} · L${lv} · ${info.bits.join("")}`}</title>
          <circle data-stella-hit cx={p.x} cy={p.y} r={HIT_R} fill="transparent" />
          <circle cx={p.x} cy={p.y} r={r} fill={C.bgRoot} />
          <circle
            className="theory-stella-focus-ring"
            cx={p.x}
            cy={p.y}
            r={r + 2.6}
            fill="none"
            stroke="#fff"
            strokeWidth={0.8}
            opacity={comparisonRole ? 1 : hovered ? 0.6 : 0}
          />
          <circle
            cx={p.x}
            cy={p.y}
            r={r}
            fill={lv === 0 ? C.bgRoot : info.color}
            fillOpacity={dim ? 0.2 : 1}
            stroke={active ? "#fff" : lv === 0 ? "#808080" : info.color}
            strokeWidth={active ? 1 : 0.8}
            strokeOpacity={dim ? 0.2 : 0.9}
          />
          <text
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={5}
            fontFamily="var(--font-mono)"
            fontWeight={FW.bold}
            fill={dim ? C.textPrimary : lv >= 3 ? "#000" : "#fff"}
            opacity={dim ? 0.3 : 1}
          >
            {info.bits.join("")}
          </text>
          {comparisonRole && (
            <text
              x={Math.min(161, p.x + r + 4)}
              y={Math.max(-9, p.y - r - 3)}
              textAnchor="middle"
              fontSize={5.6}
              fontFamily="var(--font-mono)"
              fontWeight={FW.bold}
              fill="#fff"
              stroke={C.bgRoot}
              strokeWidth={1.6}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {comparisonRole}
            </text>
          )}
        </g>
      );
    });

  const isComparedEdge = (a: number, b: number) =>
    comparisonComplete &&
    comparisonA !== null &&
    comparisonB !== null &&
    ((a === comparisonA && b === comparisonB) || (a === comparisonB && b === comparisonA));

  const isPreviewEdge = (a: number, b: number) =>
    !isComparedEdge(a, b) &&
    selectedMask !== (a ^ b) &&
    (previewTarget?.kind === "mask"
      ? previewTarget.mask === (a ^ b)
      : previewTarget?.kind === "transition" && previewTarget.mask === (a ^ b) && (previewTarget.state === a || previewTarget.state === b));

  const renderGraph = () => (
    <>
      {view.orderedEdges
        .filter(({ distance }) => visibleDistances.has(distance))
        .map(({ a, b, distance }) => {
          const compared = isComparedEdge(a, b);
          const preview = isPreviewEdge(a, b);
          const active =
            compared ||
            preview ||
            selectedMask === (a ^ b) ||
            (!comparisonComplete && selectedMask === null && !hasEdgePreview && (a === hl || b === hl));
          const dim = hasEmphasis && !active;
          return (
            <line
              key={`k8-${a}-${b}`}
              data-k8-edge={`${a}-${b}`}
              data-k8-distance={distance}
              data-k8-mask={a ^ b}
              data-k8-tetra={distance === 2 ? (hammingDist(0, a) % 2 === 0 ? "T0" : "T1") : undefined}
              data-k8-edge-active={active}
              data-k8-edge-preview={preview}
              x1={view.points[a].x}
              y1={view.points[a].y}
              x2={view.points[b].x}
              y2={view.points[b].y}
              stroke={edgeColor(a ^ b)}
              strokeWidth={compared ? 2.4 : active ? 1.8 : baseEdgeWidth}
              strokeLinecap="round"
              opacity={dim ? 0.1 : active || distance === 3 ? 1 : baseEdgeOpacity}
            />
          );
        })}
      {renderVertices()}
    </>
  );

  return (
    <div
      className="theory-k8-explorer"
      onPointerMove={link.onPointerMove}
      onClick={(event) => {
        if (!(event.target as Element).closest("button, [data-stella-vertex]")) link.clear();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") link.clear();
      }}
    >
      <div className="theory-k8-overview">
        <div className="theory-k8-graph">
          <svg
            id="theory-stella-view"
            data-stella-distances={distances.join(" ") || "none"}
            data-stella-view={camera.frontLevel === null ? "default" : "symmetric"}
            data-stella-front={camera.frontLevel ?? undefined}
            data-stella-turn={camera.progress}
            viewBox="12 -15 156 156"
            role="group"
            aria-label={t("theory_stella_diagram")}
            {...camera.handlers}
          >
            {renderGraph()}
          </svg>
        </div>

        <div className="theory-k8-summary" role="status" aria-live="polite" aria-atomic="true">
          <div className="theory-k8-edge-legend">
            <span className="theory-k8-summary-label">{t("theory_stella_edge_colors")}</span>
            <div className="theory-k8-color-key">
              {[4, 2, 1, 6, 5, 3, 7].map((edgeMask) => (
                <span
                  key={edgeMask}
                  data-active={visibleDistances.has(hammingDist(0, edgeMask))}
                  aria-hidden={!visibleDistances.has(hammingDist(0, edgeMask))}
                  title={`${THEORY_LEVELS[edgeMask].short} ${THEORY_LEVELS[edgeMask].bits.join("")}`}
                >
                  <i style={{ background: edgeColor(edgeMask) }} aria-hidden="true" />
                  {THEORY_LEVELS[edgeMask].short}
                </span>
              ))}
            </div>
          </div>
          <div className="theory-k8-edge-count">
            <span className="theory-k8-summary-label">{t("theory_stella_edge_count")}</span>
            <code>
              <span>{nodesOnly ? "" : `${distances.map((distance) => DISTANCE_TERMS[distance]).join(" + ")} = `}</span>
              <strong>{edgeCount}</strong>
            </code>
          </div>
          <div className="theory-k8-summary-footer">
            <p className="theory-k8-degree" title={t("theory_stella_degree_description")}>
              <span className="theory-k8-summary-label">{t("theory_stella_degree")}</span>
              <code>
                {distances.length > 1 && <>{distances.map((distance) => (distance === 3 ? 1 : 3)).join(" + ")} = </>}
                {edgeCount / 4}
              </code>
            </p>
            <div
              className="theory-k8-tetra-key"
              role="img"
              data-active={visibleDistances.has(2)}
              aria-hidden={!visibleDistances.has(2)}
              title={t("theory_stella_tetra_lines")}
              aria-label={t("theory_stella_tetra_lines")}
            >
              <span className="theory-k8-summary-label">{t("theory_stella_distance_short", 2)}</span>
              <span aria-hidden="true">
                T<sub>0</sub> + T<sub>1</sub>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="theory-k8-controls">
        <div className="theory-k8-display-modes" role="group" aria-label={t("theory_stella_distance_modes")}>
          {(
            [
              { distance: 0, label: "theory_stella_nodes" },
              { distance: 1, label: "theory_stella_distance_1" },
              { distance: 2, label: "theory_stella_distance_2" },
              { distance: 3, label: "theory_stella_distance_3" },
            ] as const
          ).map(({ distance, label }) => (
            <button
              key={distance}
              className="theory-k8-distance-button"
              type="button"
              aria-controls="theory-stella-view theory-cayley-table"
              aria-pressed={distance === 0 ? nodesOnly : visibleDistances.has(distance)}
              aria-label={t(label)}
              title={t(distance === 0 ? "theory_stella_nodes_annotation" : `theory_stella_distance_${distance}_annotation`)}
              onClick={() => {
                if (distance === 0) {
                  selectDistances(new Set());
                } else toggleDistance(distance);
              }}
            >
              <span>{distance === 0 ? t("theory_stella_nodes_short") : t("theory_stella_distance_short", distance)}</span>
              {distance > 0 && <small>{t("theory_stella_edges_short", distance === 3 ? 4 : 12)}</small>}
            </button>
          ))}
        </div>
      </div>

      <ToggleActionTable link={link} hlLevel={hlLevel} />
    </div>
  );
});
