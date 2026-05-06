import type React from "react";

import { MAIN_TABS } from "../tabs";
import type { TranslationFn } from "../i18n";
import { S_TAB_ACTIVE, S_TAB_INACTIVE } from "../styles/shared";

const S_TABLIST: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 0,
  marginBottom: "var(--sp-tablist-mb)",
  width: "100%",
};

interface AppTabBarProps {
  activeTab: number;
  onTabChange: (tab: number) => void;
  t: TranslationFn;
}

export function AppTabBar({ activeTab, onTabChange, t }: AppTabBarProps) {
  return (
    <div role="tablist" aria-label={t("tablist_label")} style={S_TABLIST}>
      {MAIN_TABS.map(({ key }, i) => (
        <button
          key={key}
          id={`tab-${i}`}
          role="tab"
          aria-selected={activeTab === i}
          aria-controls={`tabpanel-${i}`}
          onClick={() => onTabChange(i)}
          style={activeTab === i ? S_TAB_ACTIVE : S_TAB_INACTIVE}
        >
          {t(key)}
        </button>
      ))}
    </div>
  );
}
