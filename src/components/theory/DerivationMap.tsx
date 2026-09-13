import React from "react";
import { useTranslation } from "../../i18n";
import { C } from "../../styles/tokens";
import { THEORY_LEVELS } from "../../data/theory-data";
import { SubsetSumDerivation } from "./SubsetSumDerivation";

export const DerivationMap = React.memo(function DerivationMap() {
  const { t } = useTranslation();

  return (
    <div className="theory-derivation" role="group" aria-label={t("theory_derivation_aria")}>
      <div className="theory-derivation-paths">
        <SubsetSumDerivation />
        <EmpiricalResonance />
      </div>
      <div className="theory-derivation-conclusion">
        <div className="theory-diagram-label">{t("theory_derivation_convergence")}</div>
        <code>L(g,r,b)=4g+2r+b · T=L/7</code>
        <p>{t("theory_derivation_convergence_note")}</p>
      </div>
      <div className="theory-derivation-notes">
        <p>
          <strong>{t("theory_derivation_weights")}</strong>
          {t("theory_subset_rule")}
        </p>
        <div>
          <p>
            <strong>{t("theory_derivation_ranks")}</strong>
            {t("theory_empirical_rank_note")}
          </p>
          <div className="theory-derivation-definitions">
            <code>s(g,r,b)=w_Gg+w_Rr+w_Bb</code>
            <code>w_G&gt;w_R+w_B · w_R&gt;w_B&gt;0</code>
            <code>rank_s(c)=#&#123;x∈A | s(x)&lt;s(c)&#125;</code>
          </div>
        </div>
      </div>
    </div>
  );
});

const EmpiricalResonance = React.memo(function EmpiricalResonance() {
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
        <div className="theory-derivation-comparisons">
          <code>s(R)&gt;s(B)</code>
          <code>s(G)&gt;s(M)</code>
        </div>
        <span className="theory-derivation-arrow" aria-hidden="true">
          ↓
        </span>
        <ol className="theory-derivation-order-colors" aria-label="K<B<R<M<G<C<Y<W">
          {THEORY_LEVELS.map((info, level) => (
            <li key={level}>
              <span style={{ background: level === 0 ? C.bgRoot : info.color, color: level <= 1 ? "#fff" : "#000" }}>{info.short}</span>
              <span>{level}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="theory-derivation-result">
        <span>{t("theory_derivation_ranks")}</span>
        <strong className="theory-derivation-named-ranks">
          <span>B &lt; R &lt; G</span>
        </strong>
      </div>
    </figure>
  );
});
