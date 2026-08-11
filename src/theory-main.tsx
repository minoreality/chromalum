import React from "react";
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
  width: "100%",
  maxWidth: 560,
  boxSizing: "border-box",
  margin: "0 auto",
  padding: "10px 12px 4px",
  color: C.textDimmer,
  fontFamily: FONT.mono,
  fontSize: FS.sm,
};

function TheoryDevelopmentApp() {
  return (
    <main>
      <header style={S_DEV_HEADER}>
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
