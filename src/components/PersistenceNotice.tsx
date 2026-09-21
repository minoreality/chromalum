import { useCallback, useRef, useState } from "react";
import { useTranslation } from "../i18n";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface PersistenceNoticeProps {
  issue: "invalid" | "restore-failed" | "conflict" | null;
  recovering: boolean;
  recoveryFailed: boolean;
  onRecover: () => Promise<boolean>;
}

const MESSAGE_KEYS = {
  invalid: "toast_restore_invalid",
  "restore-failed": "toast_restore_failed",
  conflict: "toast_autosave_conflict",
} as const;

export function PersistenceNotice({ issue, recovering, recoveryFailed, onRecover }: PersistenceNoticeProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useFocusTrap(modalRef, open && issue !== null, close);

  if (!issue) return null;

  return (
    <>
      <button type="button" className="persistence-notice-trigger" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {t("persistence_off")}
      </button>
      {open && (
        <div className="persistence-modal-overlay" onClick={close}>
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="persistence-title"
            aria-describedby="persistence-description"
            tabIndex={-1}
            className="persistence-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="persistence-title">{t("persistence_off")}</h2>
            <p id="persistence-description">{t(MESSAGE_KEYS[issue]).split("\n").slice(1).join("\n")}</p>
            <p>{t(issue === "invalid" ? "persistence_recovery_description" : "persistence_reload_description")}</p>
            {recoveryFailed && <p role="alert">{t("persistence_recovery_failed")}</p>}
            <div className="persistence-actions">
              <button type="button" onClick={close}>
                {t("help_close")}
              </button>
              {issue === "invalid" && (
                <button
                  type="button"
                  disabled={recovering}
                  onClick={async () => {
                    if (await onRecover()) close();
                  }}
                >
                  {t(recovering ? "persistence_recovering" : "persistence_recover")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
