import React, { useCallback } from "react";
import { S_BTN } from "../styles/shared";
import { useTranslation } from "../i18n";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { C, Z, SP, FS, FW, R, FONT } from "../styles/tokens";
import { shortcutsForTab } from "../shortcuts";
import type { MainTabId } from "../tabs";

interface HelpModalProps {
  showHelp: boolean;
  activeTabId: MainTabId;
  setShowHelp: React.Dispatch<React.SetStateAction<boolean>>;
  helpRef: React.RefObject<HTMLDivElement | null>;
}

export const HelpModal = React.memo(function HelpModal({ showHelp, activeTabId, setShowHelp, helpRef }: HelpModalProps) {
  const { t } = useTranslation();

  useFocusTrap(helpRef, showHelp);

  const handleClose = useCallback(() => setShowHelp(false), [setShowHelp]);
  const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  if (!showHelp) return null;

  const rows = shortcutsForTab(activeTabId).map((entry) => ({
    keys: "key" in entry ? entry.key : t(entry.keyCopy),
    label: t(entry.label),
  }));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: C.bgOverlay,
        zIndex: Z.modal,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={handleClose}
    >
      <div
        ref={helpRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("help_title")}
        style={{
          background: C.bgModal,
          border: `1px solid ${C.borderHover}`,
          borderRadius: R["2xl"],
          padding: SP["4xl"],
          boxSizing: "border-box",
          maxWidth: "min(400px, calc(100vw - 48px))",
          maxHeight: "80vh",
          overflowY: "auto",
          fontFamily: FONT.sans,
          fontSize: FS.lg,
          lineHeight: 1.25,
          color: C.textPrimary,
        }}
        onClick={stopPropagation}
      >
        <h2
          style={{
            fontFamily: FONT.mono,
            fontSize: FS["2xl"],
            fontWeight: FW.bold,
            margin: `0 0 ${SP["2xl"]}px`,
            color: C.accentBright,
            textAlign: "center",
          }}
        >
          {t("help_title")}
        </h2>
        {rows.map(({ keys, label }, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(116px, 0.9fr) minmax(0, 1fr)",
              columnGap: SP["2xl"],
              alignItems: "baseline",
              padding: `${SP.xs}px 0`,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span style={{ color: C.accentBright, fontFamily: FONT.mono, fontWeight: FW.bold, whiteSpace: "nowrap" }}>{keys}</span>
            <span style={{ color: C.textSecondary, minWidth: 0, textAlign: "right" }}>{label}</span>
          </div>
        ))}
        <button onClick={handleClose} tabIndex={0} style={{ ...S_BTN, marginTop: SP["2xl"], width: "100%", textAlign: "center" }}>
          {t("help_close")}
        </button>
      </div>
    </div>
  );
});
