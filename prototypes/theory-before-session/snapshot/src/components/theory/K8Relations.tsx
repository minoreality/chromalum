import React from "react";
import { THEORY_LEVELS, hammingDist } from "../../data/theory-data";
import { useTranslation } from "../../i18n";
import { toggleFactorLabel } from "./CayleyTable";
import { targetMask, targetState, type K8Target } from "./k8-selection";

function StateValue({ level }: { level: number | null }) {
  const color = level === null ? null : THEORY_LEVELS[level];
  return (
    <dd>
      <strong>{color === null ? "—" : color.bits.join("")}</strong>
      <small>
        {color === null ? (
          "—"
        ) : (
          <>
            <i style={{ background: color.color }} aria-hidden="true" />
            {color.short} · L{level}
          </>
        )}
      </small>
    </dd>
  );
}

export const K8PairComparison = React.memo(function K8PairComparison({
  target,
  hasEdges,
  pinned,
}: {
  target: K8Target | null;
  hasEdges: boolean;
  pinned: boolean;
}) {
  const { t } = useTranslation();
  const a = targetState(target);
  const mask = targetMask(target);
  const b = target?.kind === "transition" ? target.state ^ target.mask : null;
  const distance = mask === null ? null : hammingDist(0, mask);
  const pair = a !== null && b !== null ? { a, b, mask: a ^ b, distance: hammingDist(a, b), gap: Math.abs(b - a) } : null;

  return (
    <div
      className="theory-k8-comparison theory-toggle-readout"
      data-testid="toggle-action-readout"
      data-state={a ?? ""}
      data-mask={mask ?? ""}
      data-result={b ?? ""}
      data-pinned={pinned}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <dl className="theory-toggle-values">
        <div>
          <dt>{t("theory_toggle_table_state_label")}</dt>
          <StateValue level={a} />
        </div>
        <div>
          <dt>{t("theory_toggle_table_mask_label")}</dt>
          <dd>
            <strong>{mask === null ? "—" : THEORY_LEVELS[mask].bits.join("")}</strong>
            <small>{mask === null ? "—" : toggleFactorLabel(mask)}</small>
          </dd>
        </div>
        <div>
          <dt>{t("theory_toggle_table_result_label")}</dt>
          <StateValue level={b} />
        </div>
      </dl>
      <div className="theory-k8-comparison-status" data-testid="stella-comparison-status">
        <dl className="theory-k8-comparison-metrics">
          <div>
            <dt>
              {t("theory_k8_comparison_distance")}{" "}
              <code>
                d<sub>H</sub>
              </code>
            </dt>
            <dd>
              <strong data-pair-distance={distance ?? undefined}>{distance ?? "—"}</strong>
              <code>{mask !== null ? `wt(${THEORY_LEVELS[mask].bits.join("")}) = ${distance}` : "\u00a0"}</code>
            </dd>
          </div>
          <div>
            <dt>
              {t("theory_k8_comparison_gap")} <code>|ΔL|</code>
            </dt>
            <dd>
              <strong data-pair-gap={pair?.gap}>{pair?.gap ?? "—"}</strong>
              <code>{pair ? `|${pair.b} − ${pair.a}| = ${pair.gap}` : "\u00a0"}</code>
            </dd>
          </div>
        </dl>
        <p className={pair ? "theory-k8-comparison-relation" : "theory-k8-comparison-prompt"}>
          {target?.kind === "mask"
            ? t(mask === 0 ? "theory_toggle_table_identity" : "theory_toggle_table_matching")
            : pair
              ? t(`theory_stella_compare_distance_${pair.distance}`)
              : !hasEdges
                ? t("theory_stella_compare_select_distance")
                : a === null
                  ? t("theory_stella_compare_select_first")
                  : t("theory_stella_compare_select_second", THEORY_LEVELS[a].short)}
        </p>
      </div>
      <div className="theory-k8-comparison-details" role="group" aria-label={t("theory_stella_compare_details")}>
        <dl>
          <div>
            <dt>XOR</dt>
            <dd>
              <code>
                {pair
                  ? `${THEORY_LEVELS[pair.a].bits.join("")} ⊕ ${THEORY_LEVELS[pair.b].bits.join("")} = ${THEORY_LEVELS[pair.mask].bits.join("")}`
                  : "—"}
              </code>
              {pair && (
                <span className="theory-k8-xor-color">
                  <i style={{ background: THEORY_LEVELS[pair.mask].color }} aria-hidden="true" />
                  {THEORY_LEVELS[pair.mask].short}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>{t("theory_stella_compare_parity")}</dt>
            <dd className="theory-k8-parity-values">
              {[a, b].map((level, index) => {
                const parity = level === null ? null : hammingDist(0, level) % 2;
                return <code key={index}>{level === null ? "—" : `π(${THEORY_LEVELS[level].short})=${parity} · T${parity}`}</code>;
              })}
            </dd>
          </div>
        </dl>
        <p>{t("theory_stella_compare_parity_note")}</p>
      </div>
    </div>
  );
});
