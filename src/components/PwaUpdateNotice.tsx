import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n";
import { activateUpdate, registerServiceWorker } from "../pwa";

export function PwaUpdateNotice({ flushPendingSave }: { flushPendingSave: () => Promise<boolean> }) {
  const { t } = useTranslation();
  const [worker, setWorker] = useState<ServiceWorker | null>(null);
  const [deferred, setDeferred] = useState<ServiceWorker | null>(null);
  const [applying, setApplying] = useState(false);
  const [issue, setIssue] = useState<"activation" | "save" | null>(null);
  const headerButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const listeners = new AbortController();
    registerServiceWorker(setWorker, listeners.signal);
    return () => listeners.abort();
  }, []);

  useEffect(() => {
    if (deferred) headerButton.current?.focus({ preventScroll: true });
  }, [deferred]);

  if (!worker) return null;
  const apply = async () => {
    if (applying) return;
    setApplying(true);
    try {
      await activateUpdate(worker);
      if (!(await flushPendingSave()) && issue !== "save") {
        setIssue("save");
      } else {
        window.location.reload();
        return;
      }
    } catch {
      setIssue("activation");
    }
    setApplying(false);
    setDeferred(null);
  };
  const label = t(applying ? "pwa_updating" : issue === "save" ? "pwa_update_without_saving" : "pwa_update_now");

  if (deferred === worker) {
    return (
      <button ref={headerButton} type="button" className="pwa-update-link" disabled={applying} onClick={apply}>
        {label}
      </button>
    );
  }

  return (
    <div className="pwa-update-notice">
      <span role="status">
        {t(issue === "save" ? "pwa_update_unsaved" : issue === "activation" ? "pwa_update_failed" : "pwa_update_ready")}
      </span>
      <div className="pwa-update-actions">
        <button
          type="button"
          disabled={applying}
          onClick={() => {
            setIssue(null);
            setDeferred(worker);
          }}
        >
          {t("pwa_update_later")}
        </button>
        <button type="button" className="pwa-update-primary" disabled={applying} onClick={apply}>
          {label}
        </button>
      </div>
    </div>
  );
}
