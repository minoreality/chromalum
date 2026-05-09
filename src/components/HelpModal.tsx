import React, { useCallback } from "react";
import { S_BTN } from "../styles/shared";
import { useTranslation } from "../i18n";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { C, Z, SP, FS, FW, R, FONT } from "../styles/tokens";

interface HelpModalProps {
  showHelp: boolean;
  setShowHelp: React.Dispatch<React.SetStateAction<boolean>>;
  helpRef: React.RefObject<HTMLDivElement | null>;
}

export const HelpModal = React.memo(function HelpModal({ showHelp, setShowHelp, helpRef }: HelpModalProps) {
  const { t } = useTranslation();

  useFocusTrap(helpRef, showHelp);

  const handleClose = useCallback(() => setShowHelp(false), [setShowHelp]);
  const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  if (!showHelp) return null;

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
        {[
          // Drawing tools
          ["B", t("help_brush")],
          ["E", t("help_eraser")],
          ["F", t("help_fill")],
          ["L", t("help_line")],
          ["R", t("help_rect")],
          ["O", t("help_ellipse")],
          // Drawing parameters
          ["0-7", t("help_level")],
          ["[ / ]", t("help_brush_size")],
          [t("help_eyedropper_key"), t("help_eyedropper")],
          [t("help_dblclick_level_key"), t("help_dblclick_level")],
          // Navigation
          [t("help_pan_combined_key"), t("help_pan")],
          [t("help_arrow_pan_key"), t("help_arrow_pan")],
          [t("help_zoom_key"), t("help_zoom")],
          [t("help_middle_reset_key"), t("help_middle_reset")],
          [t("help_zoom_pixel_key"), t("help_zoom_pixel")],
          // File operations
          ["Ctrl+N", t("help_new_canvas")],
          ["Ctrl+V", t("help_paste")],
          [t("help_drop_image_key"), t("help_drop_image")],
          // Edit
          ["Ctrl+Z", t("help_undo")],
          ["Ctrl+Y / \u2318\u21E7Z", t("help_redo")],
          // UI
          ["?/F1", t("help_this_help")],
          ["Esc", t("help_close")],
        ].map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(116px, 0.9fr) minmax(0, 1fr)",
              columnGap: SP["2xl"],
              alignItems: "baseline",
              padding: `${SP.xs}px 0`,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span style={{ color: C.accentBright, fontFamily: FONT.mono, fontWeight: FW.bold, whiteSpace: "nowrap" }}>{k}</span>
            <span style={{ color: C.textSecondary, minWidth: 0, textAlign: "right" }}>{v}</span>
          </div>
        ))}
        <button onClick={handleClose} tabIndex={0} style={{ ...S_BTN, marginTop: SP["2xl"], width: "100%", textAlign: "center" }}>
          {t("help_close")}
        </button>
      </div>
    </div>
  );
});
