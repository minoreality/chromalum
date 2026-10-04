import React, { useReducer, useState } from "react";
import { createRoot } from "react-dom/client";
import { ColorMappingList } from "./ColorMappingList";
import { DEFAULT_CANDIDATE_INDEX_BY_LEVEL } from "../../src/color-engine";
import { colorReducer } from "../../src/state/color-reducer";
import { LanguageProvider } from "../../src/i18n";
import { C, FONT } from "../../src/styles/tokens";
import "../../src/styles/global.css";

function ColorMappingPrototype() {
  const [candidateIndexByLevel, dispatch] = useReducer(colorReducer, [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL]);
  const [brushLevel, setBrushLevel] = useState(0);

  return (
    <main
      style={{
        padding: 16,
        color: C.textPrimary,
        fontFamily: FONT.sans,
        width: "100%",
        boxSizing: "border-box",
        maxWidth: 452,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 20 }}>CHROMALUM Color Mapping</h1>
      <p>Colorタブのレベル別配色一覧。色候補と選択レベルを切り替えられます。</p>
      <div style={{ maxWidth: 420, margin: "24px auto", overflowX: "auto" }}>
        <div style={{ minWidth: 420 }}>
          <ColorMappingList
            candidateIndexByLevel={candidateIndexByLevel}
            dispatch={dispatch}
            brushLevel={brushLevel}
            onSelectLevel={setBrushLevel}
          />
        </div>
      </div>
      <a href="../../#hex" style={{ color: C.textPrimary }}>
        CHROMALUMのHexを開く
      </a>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <ColorMappingPrototype />
    </LanguageProvider>
  </React.StrictMode>,
);
