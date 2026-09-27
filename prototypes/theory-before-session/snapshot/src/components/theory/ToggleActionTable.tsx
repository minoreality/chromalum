import React from "react";
import { useTranslation } from "../../i18n";
import { CayleyTable } from "./CayleyTable";
import { K8PairComparison } from "./K8Relations";
import type { K8Selection } from "./k8-selection";

interface Props {
  link: K8Selection;
  hlLevel: number | null;
}

export const ToggleActionTable = React.memo(function ToggleActionTable({ link, hlLevel }: Props) {
  const { t } = useTranslation();
  return (
    <figure id="theory-toggle-table" className="theory-figure theory-toggle-figure">
      <figcaption>{t("theory_toggle_table_title")}</figcaption>
      <div className="theory-toggle-explorer" data-testid="toggle-action-explorer">
        <div className="theory-toggle-heading">
          <strong>
            τ<sub>m</sub>(x) = x ⊕ m
          </strong>
          <span>{t("theory_toggle_table_complete")}</span>
        </div>
        <CayleyTable link={link} hlLevel={hlLevel} />
        <K8PairComparison
          target={link.readout}
          hasEdges={link.visibleDistances.size > 0}
          pinned={link.selection?.kind === "transition" || link.selection?.kind === "mask"}
        />
        <p className="theory-toggle-hint">{t("theory_toggle_table_hint")}</p>
      </div>
    </figure>
  );
});
