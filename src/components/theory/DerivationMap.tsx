import React from "react";
import { useTranslation } from "../../i18n";
import { C } from "../../styles/tokens";
import { THEORY_LEVELS } from "../../data/theory-data";
import { levelLabelColor } from "../../color-engine";

export const DerivationMap = React.memo(function DerivationMap() {
  const { t } = useTranslation();

  return (
    <div className="theory-derivation" role="group" aria-label={t("theory_derivation_aria")}>
      <OrderDerivation />
      <div className="theory-derivation-conclusion">
        <div className="theory-diagram-label">{t("theory_derivation_rank_title")}</div>
        <code>L(S)=#&#123;T∈A | σ(T)&lt;σ(S)&#125;</code>
        <code>L(g,r,b)=4g+2r+b · T=L/7</code>
        <p>{t("theory_derivation_rank_note")}</p>
        <p className="theory-derivation-supplement">{t("theory_derivation_supplement")}</p>
      </div>
    </div>
  );
});

const OrderDerivation = React.memo(function OrderDerivation() {
  const { t } = useTranslation();

  return (
    <figure className="theory-derivation-order" aria-labelledby="theory-order-title">
      <figcaption>
        <div id="theory-order-title" className="theory-diagram-label">
          {t("theory_empirical_condition")}
        </div>
        <p>{t("theory_empirical_order_intro")}</p>
      </figcaption>
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
        <span className="theory-derivation-arrow" aria-hidden="true">
          ↓
        </span>
        <ol className="theory-derivation-order-colors" aria-label="K<B<R<M<G<C<Y<W">
          {THEORY_LEVELS.map((info, level) => (
            <li key={level}>
              <span style={{ background: level === 0 ? C.bgRoot : info.color, color: levelLabelColor(level) }}>{info.short}</span>
              <span>{level}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="theory-derivation-result">
        <span>{t("theory_derivation_ranks")}</span>
        <strong className="theory-derivation-named-ranks">
          <span>B=1</span>
          <span>R=2</span>
          <span>G=4</span>
        </strong>
      </div>
    </figure>
  );
});
