import React from "react";
import { THEORY_LEVELS } from "../../data/theory-data";
import { useTranslation } from "../../i18n";

const COMPLEMENTS = [
  [0, 7],
  [1, 6],
  [2, 5],
  [3, 4],
] as const;

function ColorRank({ level }: { level: number }) {
  return (
    <span className="theory-valuation-color">
      <i aria-hidden="true" style={{ background: THEORY_LEVELS[level].color }} />
      {THEORY_LEVELS[level].short}
      <strong>{level}</strong>
    </span>
  );
}

export const RankIdentities = React.memo(function RankIdentities() {
  const { t } = useTranslation();
  return (
    <div className="theory-valuation" data-testid="rank-identities">
      <p className="theory-desc">{t("theory_valuation_xor_note")}</p>
      <div className="theory-valuation-identities">
        <code>L(a∨b)+L(a∧b)=L(a)+L(b)</code>
        <code>L(a⊕b)=L(a)+L(b)−2L(a∧b)</code>
      </div>
    </div>
  );
});

export const ComplementRanks = React.memo(function ComplementRanks() {
  const { t } = useTranslation();
  return (
    <figure
      id="theory-complement-ranks"
      className="theory-valuation theory-valuation-complement"
      aria-labelledby="theory-complement-ranks-caption"
      data-testid="complement-ranks"
    >
      <figcaption id="theory-complement-ranks-caption">{t("theory_valuation_complement")}</figcaption>
      <p className="theory-valuation-note">{t("theory_valuation_complement_note")}</p>
      <div className="theory-valuation-pairs">
        {COMPLEMENTS.map(([a, b]) => (
          <div key={a} className="theory-valuation-pair" data-complement-pair={a + "-" + b}>
            <ColorRank level={a} />
            <span>↔</span>
            <ColorRank level={b} />
            <code>
              {a}+{b}=7
            </code>
          </div>
        ))}
      </div>
      <div className="theory-valuation-complement-formulas">
        <code>L(a)+L(¬a)=7</code>
      </div>
    </figure>
  );
});
