import React, { useLayoutEffect } from "react";
import ReactDOM from "react-dom/client";
import type { Root } from "react-dom/client";
import "./styles/global.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { TheoryPanel } from "./components/TheoryPanel";
import { LanguageProvider } from "./i18n";
import { C, FS, FONT } from "./styles/tokens";

const S_DEV_HEADER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 6px 4px",
  color: C.textDimmer,
  fontFamily: FONT.mono,
  fontSize: FS.sm,
};

function TheoryDevelopmentApp() {
  useLayoutEffect(() => {
    const storageKey = `chromalum_theory_dev_scroll:${window.location.pathname}${window.location.hash}`;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    // Restore after React has mounted the full page, before its first paint.
    try {
      const saved = sessionStorage.getItem(storageKey);
      const y = saved === null ? null : Number(saved);
      if (y !== null && Number.isFinite(y) && y >= 0) window.scrollTo(0, y);
    } catch {
      // The development page should still work when storage is blocked.
    }

    const savePosition = () => {
      try {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      } catch {
        // Scroll persistence is best-effort.
      }
    };

    window.addEventListener("scroll", savePosition, { passive: true });
    window.addEventListener("pagehide", savePosition);
    return () => {
      // Also retain the current position when Vite refreshes this component.
      savePosition();
      window.removeEventListener("scroll", savePosition);
      window.removeEventListener("pagehide", savePosition);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  return (
    <main>
      <header className="theory-dev-header" style={S_DEV_HEADER}>
        <span>THEORY DEVELOPMENT</span>
        <LanguageSwitcher />
      </header>
      <TheoryPanel />
    </main>
  );
}

type TheoryRootElement = HTMLElement & {
  __chromalumTheoryRoot?: Root;
};

const rootElement = document.getElementById("root") as TheoryRootElement;
const root = rootElement.__chromalumTheoryRoot ?? ReactDOM.createRoot(rootElement);
rootElement.__chromalumTheoryRoot = root;

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <TheoryDevelopmentApp />
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
