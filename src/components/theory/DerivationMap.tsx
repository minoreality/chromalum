import React from "react";
import { useTranslation } from "../../i18n";
import { C } from "../../styles/tokens";
import { THEORY_LEVELS } from "../../data/theory-data";
import { levelLabelColor } from "../../color-engine";

export const PrimaryNumberDerivation = React.memo(function PrimaryNumberDerivation() {
  const { t } = useTranslation();

  return (
    <div className="theory-derivation">
      <div className="theory-derivation-conclusion">
        <p>{t("theory_derivation_named_ranks_note")}</p>
        <div className="theory-derivation-result">
          <span>{t("theory_derivation_ranks")}</span>
          <strong className="theory-derivation-named-ranks">
            <span>B=1</span>
            <span>R=2</span>
            <span>G=4</span>
          </strong>
        </div>
        <div className="theory-derivation-proof">
          <p>{t("theory_derivation_weights_intro")}</p>
          <ol>
            <li>{t("theory_derivation_weight_one")}</li>
            <li>{t("theory_derivation_weight_two")}</li>
            <li>{t("theory_derivation_weight_four")}</li>
          </ol>
          <p>{t("theory_derivation_rank_note")}</p>
        </div>
        <p className="theory-derivation-bits-note">{t("theory_derivation_bits_note")}</p>
        <code>L(g,r,b)=4g+2r+b</code>
        <p className="theory-derivation-supplement">{t("theory_derivation_supplement")}</p>
      </div>
    </div>
  );
});

export const OrderDerivation = React.memo(function OrderDerivation() {
  const { t } = useTranslation();

  return (
    <div className="theory-derivation">
      <figure className="theory-derivation-order" aria-label={t("theory_order_rank_title")}>
        <div className="theory-derivation-order-visual">
          <code className="theory-derivation-score">
            σ(g,r,b) = w<sub>G</sub>g + w<sub>R</sub>r + w<sub>B</sub>b
          </code>
          <div className="theory-derivation-comparisons">
            <code>
              w<sub>B</sub> &gt; 0
            </code>
            <code>
              w<sub>R</sub> &gt; w<sub>B</sub>
            </code>
            <code>
              w<sub>G</sub> &gt; w<sub>R</sub> + w<sub>B</sub>
            </code>
          </div>
          <p className="theory-desc">{t("theory_order_proof")}</p>
          <span className="theory-derivation-arrow" aria-hidden="true">
            ↓
          </span>
          <div className="theory-derivation-state-order">
            <p id="theory-subset-order-label">{t("theory_derivation_subset_order")}</p>
            <ol className="theory-derivation-order-colors" aria-labelledby="theory-subset-order-label">
              {THEORY_LEVELS.map((info, level) => {
                const members = ["G", "R", "B"].filter((_, index) => info.bits[index] === 1);
                return (
                  <li key={level}>
                    <span className="theory-derivation-subset">{`{${members.join(",")}}`}</span>
                    <span
                      className="theory-derivation-color-label"
                      style={{ background: level === 0 ? C.bgRoot : info.color, color: levelLabelColor(level) }}
                    >
                      {info.short}
                    </span>
                    <span>{level}</span>
                  </li>
                );
              })}
            </ol>
            <p className="theory-derivation-order-note">{t("theory_derivation_subset_note")}</p>
            <div className="theory-derivation-rank-definition">
              <p>{t("theory_derivation_rank_definition")}</p>
              <code>L(S)=#&#123;T∈A | σ(T)&lt;σ(S)&#125;</code>
            </div>
          </div>
        </div>
      </figure>
    </div>
  );
});
