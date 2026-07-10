import React, { useRef } from "react";

import { getTabButtonId, getTabPanelId, MAIN_TABS } from "../tabs";
import type { MainTabId } from "../tabs";
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
  activeTabId: MainTabId;
  onTabChange: (tabId: MainTabId) => void;
  t: TranslationFn;
}

export function AppTabBar({ activeTabId, onTabChange, t }: AppTabBarProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activateTab = (index: number) => {
    const normalized = (index + MAIN_TABS.length) % MAIN_TABS.length;
    onTabChange(MAIN_TABS[normalized].id);
    tabRefs.current[normalized]?.focus();
  };

  return (
    <div role="tablist" aria-label={t("tablist_label")} aria-orientation="horizontal" style={S_TABLIST}>
      {MAIN_TABS.map(({ id, key }, index) => (
        <button
          key={key}
          ref={(element) => {
            tabRefs.current[index] = element;
          }}
          type="button"
          id={getTabButtonId(id)}
          role="tab"
          aria-selected={activeTabId === id}
          aria-controls={getTabPanelId(id)}
          tabIndex={activeTabId === id ? 0 : -1}
          onClick={() => onTabChange(id)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              activateTab(index + (event.key === "ArrowRight" ? 1 : -1));
            } else if (event.key === "Home" || event.key === "End") {
              event.preventDefault();
              activateTab(event.key === "Home" ? 0 : MAIN_TABS.length - 1);
            }
          }}
          style={activeTabId === id ? S_TAB_ACTIVE : S_TAB_INACTIVE}
        >
          {t(key)}
        </button>
      ))}
    </div>
  );
}
