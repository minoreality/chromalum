import React from "react";
import { C, FS, SP, FONT } from "../../styles/tokens";
import { useTranslation } from "../../i18n";

const S_ITEM: React.CSSProperties = {
  fontFamily: FONT.mono,
  fontSize: FS.sm,
  lineHeight: 1.7,
  color: C.textPrimary,
  margin: 0,
};

export const ConnectionsSummary = React.memo(function ConnectionsSummary() {
  const { t } = useTranslation();
  const items = ["theory_conn_core", "theory_conn_order", "theory_conn_structures"] as const;

  return (
    <ol
      style={{
        width: "100%",
        maxWidth: 620,
        margin: 0,
        paddingLeft: SP["2xl"],
        display: "flex",
        flexDirection: "column",
        gap: SP.lg,
        boxSizing: "border-box",
      }}
    >
      {items.map((key) => (
        <li key={key} style={S_ITEM}>
          {t(key)}
        </li>
      ))}
    </ol>
  );
});

export const ScopeSummary = React.memo(function ScopeSummary() {
  const { t } = useTranslation();
  const limits = ["theory_conn_limit_vertices", "theory_conn_limit_tone", "theory_conn_limit_operations"] as const;

  return (
    <ul
      style={{
        width: "100%",
        maxWidth: 620,
        margin: 0,
        paddingLeft: SP["2xl"],
        display: "flex",
        flexDirection: "column",
        gap: SP.md,
        boxSizing: "border-box",
      }}
    >
      {limits.map((key) => (
        <li key={key} style={{ ...S_ITEM, color: C.textDimmer }}>
          {t(key)}
        </li>
      ))}
    </ul>
  );
});
