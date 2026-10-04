import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { S_CANVAS_STATUS_STABLE, S_CHECKERBOARD, S_PANEL_SUBTITLE } from "../styles/shared";
import { LEVEL_CANDIDATES } from "../color-engine";
import { controlOwnsKey } from "../shortcuts";
import { LEVEL_MASK } from "../constants";
import { rgbStr } from "../utils";
import { C, SP, FS, R } from "../styles/tokens";
import { HexDiagram } from "./HexDiagram";
import { HexPaletteList } from "./HexPaletteList";
import { useBackgroundPress } from "../hooks/useBackgroundPress";
import type { ColorAction } from "../state/color-reducer";
import type { TranslationFn } from "../i18n";
import type { CanvasData } from "../types";
import { getCanvasPanelClassName, getCanvasPanelStyle, getPanelLayoutClassName } from "../utils/panel-layout";
import { formatHexListPixelStatus, formatHexPixelStatus } from "../utils/pixel-status";
import { getFullStatusText, getVisibleStatusText, type StatusText, useCompactStatus } from "../utils/status-display";
import { usePreviewCanvasNavigation, type CanvasNavigationHandlers } from "../hooks/usePreviewCanvasNavigation";

interface HexPanelProps {
  hexPreviewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasData: CanvasData;
  displayWidth: number;
  displayHeight: number;
  canvasTransform: React.CSSProperties;
  navigation: CanvasNavigationHandlers;
  candidateIndexByLevel: readonly number[];
  candidateIndexDispatch: React.Dispatch<ColorAction>;
  levelHistogram: number[];
  total: number;
  lockedLevels: boolean[];
  setLevelLock: (levelIndex: number, locked: boolean) => void;
  handleRandomize: () => void;
  canRandomize: boolean;
  patternInfo: { total: number; expanded: string; perLevel: number[] };
  t: TranslationFn;
  onPatternClick?: () => void;
}

const S_FLEX_COL_CENTER: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: SP.lg };

export const HexPanel = React.memo(function HexPanel(props: HexPanelProps) {
  const {
    hexPreviewCanvasRef,
    canvasData,
    displayWidth,
    displayHeight,
    canvasTransform,
    navigation,
    candidateIndexByLevel,
    candidateIndexDispatch,
    levelHistogram,
    total,
    lockedLevels,
    setLevelLock,
    handleRandomize,
    canRandomize,
    patternInfo,
    t,
    onPatternClick,
  } = props;

  const compactStatus = useCompactStatus();
  const canvasNavigation = usePreviewCanvasNavigation(navigation);
  const [hoverStatusByView, setHoverStatusByView] = useState<Record<"diagram" | "list", StatusText> | null>(null);
  const [paletteView, setPaletteView] = useState<"diagram" | "list">("diagram");
  const hoverInfo = hoverStatusByView?.[paletteView] ?? null;
  const toggleView = useCallback(() => setPaletteView((view) => (view === "diagram" ? "list" : "diagram")), []);
  const backgroundPress = useBackgroundPress(toggleView, paletteView);
  const hoverPosition = useRef<{ x: number; y: number } | null>(null);

  const updateCanvasHover = useCallback(
    (point: { x: number; y: number }) => {
      const rect = hexPreviewCanvasRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0 || canvasData.width === 0 || canvasData.height === 0) {
        setHoverStatusByView(null);
        return;
      }
      const x = Math.floor(((point.x - rect.left) / rect.width) * canvasData.width);
      const y = Math.floor(((point.y - rect.top) / rect.height) * canvasData.height);
      if (x < 0 || x >= canvasData.width || y < 0 || y >= canvasData.height) {
        setHoverStatusByView(null);
        return;
      }
      const lv = canvasData.levelData[y * canvasData.width + x] & LEVEL_MASK;
      setHoverStatusByView({
        diagram: formatHexPixelStatus({
          x,
          y,
          lv,
          candidateIndexByLevel,
          levelHistogram,
          patternFactor: patternInfo.perLevel[lv] ?? 1,
          isLocked: lockedLevels[lv] ?? false,
        }),
        list: formatHexListPixelStatus({ x, y, lv, candidateIndexByLevel }),
      });
    },
    [hexPreviewCanvasRef, candidateIndexByLevel, canvasData, levelHistogram, lockedLevels, patternInfo.perLevel],
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      hoverPosition.current = { x: e.clientX, y: e.clientY };
      updateCanvasHover(hoverPosition.current);
    },
    [updateCanvasHover],
  );

  useLayoutEffect(() => {
    if (hoverPosition.current) updateCanvasHover(hoverPosition.current);
  }, [canvasTransform, displayWidth, displayHeight, updateCanvasHover]);

  const handleCanvasPointerLeave = useCallback(() => {
    hoverPosition.current = null;
    setHoverStatusByView(null);
  }, []);

  // Keyboard 2-5: cycle candidate color for that level. A pinned level sits it
  // out, the same as it does for a click on its dot and for the die.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || controlOwnsKey(e.target, e)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]') !== null) return;
      const k = e.key;
      if (k.toLowerCase() === "v") {
        e.preventDefault();
        toggleView();
        return;
      }
      if (k >= "2" && k <= "5" && !lockedLevels[+k]) {
        candidateIndexDispatch({ type: "cycle_color", levelIndex: +k, direction: 1 });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [candidateIndexDispatch, lockedLevels, toggleView]);

  return (
    <div style={S_FLEX_COL_CENTER}>
      <div style={S_PANEL_SUBTITLE}>{t(paletteView === "diagram" ? "label_diagram" : "label_color_list")}</div>
      <div className={getPanelLayoutClassName(displayWidth, displayHeight)}>
        <div className={getCanvasPanelClassName(displayWidth, displayHeight)} style={getCanvasPanelStyle(displayWidth, displayHeight)}>
          <div
            className="canvas-workspace"
            ref={canvasNavigation.workspaceRef}
            tabIndex={0}
            aria-label={t("aria_color_preview")}
            aria-keyshortcuts="Control+c Meta+c"
            onPointerDown={canvasNavigation.onPointerDown}
            onPointerMove={canvasNavigation.onPointerMove}
            onPointerUp={canvasNavigation.onPointerUp}
            onPointerCancel={canvasNavigation.onPointerCancel}
            onLostPointerCapture={canvasNavigation.onPointerCancel}
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: R.lg,
              overflow: "hidden",
              position: "relative",
              width: displayWidth,
              height: displayHeight,
              touchAction: "none",
              ...S_CHECKERBOARD,
            }}
          >
            {/* The panel label above names the figure now, so it can no longer
                name this canvas too. What the canvas shows is the palette
                applied to the drawing, so it takes the color preview label. */}
            <canvas
              ref={hexPreviewCanvasRef}
              role="img"
              aria-label={t("aria_color_preview_canvas")}
              onPointerMove={handleCanvasPointerMove}
              onPointerLeave={handleCanvasPointerLeave}
              style={{ width: displayWidth, height: displayHeight, display: "block", imageRendering: "pixelated", ...canvasTransform }}
            />
          </div>
          <div
            aria-live="polite"
            aria-atomic="true"
            title={hoverInfo ? getFullStatusText(hoverInfo) : undefined}
            style={S_CANVAS_STATUS_STABLE}
          >
            {hoverInfo ? getVisibleStatusText(hoverInfo, compactStatus) : "\u2014"}
          </div>
        </div>
        <div
          className="panel-sidebar hex-palette-switcher"
          role="group"
          aria-label={t("hex_palette_label")}
          aria-keyshortcuts="V"
          tabIndex={0}
          {...backgroundPress}
        >
          <div
            className="hex-palette-view"
            data-view="diagram"
            data-active={paletteView === "diagram"}
            aria-hidden={paletteView !== "diagram"}
            inert={paletteView !== "diagram"}
          >
            <HexDiagram
              key={paletteView}
              candidateIndexByLevel={candidateIndexByLevel}
              dispatch={candidateIndexDispatch}
              levelHistogram={levelHistogram}
              total={total}
              lockedLevels={lockedLevels}
              onSetLock={setLevelLock}
              onRandomize={handleRandomize}
              canRandomize={canRandomize}
            />
            {/* Pattern info — 3 aligned rows: labels, dots, ∏ᵢcᵢ = counts × ... = total */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SP.lg, marginTop: -SP.lg }}>
              <div
                onClick={onPatternClick}
                role={onPatternClick ? "button" : undefined}
                tabIndex={onPatternClick ? 0 : undefined}
                onKeyDown={
                  onPatternClick
                    ? (ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          onPatternClick();
                        }
                      }
                    : undefined
                }
                aria-label={onPatternClick ? t("pattern_count_go_gallery", patternInfo.total) : undefined}
                style={{
                  display: "grid",
                  gridTemplateColumns: `auto repeat(15, auto) auto`,
                  justifyContent: "center",
                  justifyItems: "center",
                  alignItems: "center",
                  rowGap: 3,
                  columnGap: 0,
                  maxWidth: "100%",
                  overflowX: "auto",
                  ...(onPatternClick
                    ? { cursor: "pointer", borderRadius: R.md, padding: `${SP.xs}px ${SP.sm}px`, transition: "background 0.15s" }
                    : {}),
                }}
                onMouseEnter={
                  onPatternClick
                    ? (e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                      }
                    : undefined
                }
                onMouseLeave={
                  onPatternClick
                    ? (e) => {
                        (e.currentTarget as HTMLElement).style.background = "";
                      }
                    : undefined
                }
                onFocus={
                  onPatternClick
                    ? (e) => {
                        (e.currentTarget as HTMLElement).style.outline = `2px solid ${C.accentBright}`;
                        (e.currentTarget as HTMLElement).style.outlineOffset = "2px";
                      }
                    : undefined
                }
                onBlur={
                  onPatternClick
                    ? (e) => {
                        (e.currentTarget as HTMLElement).style.outline = "";
                      }
                    : undefined
                }
              >
                {/* Row 1: Level labels */}
                <span />
                {/* spacer for ∏ᵢcᵢ = column */}
                {patternInfo.perLevel.map((_, lv) => {
                  const active = levelHistogram[lv] > 0;
                  return (
                    <React.Fragment key={"l" + lv}>
                      {lv > 0 && <span />}
                      <span style={{ fontSize: FS.sm, color: active ? C.accentBright : C.textDimmer, minWidth: 22, textAlign: "center" }}>
                        L{lv}
                      </span>
                    </React.Fragment>
                  );
                })}
                <span />
                {/* spacer for = total column */}
                {/* Row 2: Color dots — empty circle if unused */}
                <span />
                {patternInfo.perLevel.map((_, lv) => {
                  const active = levelHistogram[lv] > 0;
                  const cands = LEVEL_CANDIDATES[lv];
                  const rgb = cands[candidateIndexByLevel[lv] % cands.length]?.rgb ?? [128, 128, 128];
                  return (
                    <React.Fragment key={"d" + lv}>
                      {lv > 0 && <span />}
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          justifySelf: "center",
                          ...(active
                            ? { background: rgbStr(rgb) }
                            : { background: "none", border: `1px solid ${C.textDimmer}`, boxSizing: "border-box" as const }),
                        }}
                      />
                    </React.Fragment>
                  );
                })}
                <span />
                {/* Row 3: ∏ᵢcᵢ = counts × ... = total */}
                <span style={{ fontSize: FS.sm, color: C.accentBright, paddingRight: SP.xs, whiteSpace: "nowrap" }}>
                  {"\u220F\u1D62c\u1D62 ="}
                </span>
                {patternInfo.perLevel.map((c, lv) => {
                  const active = levelHistogram[lv] > 0;
                  const mulActive = lv > 0 && levelHistogram[lv - 1] > 0 && levelHistogram.slice(lv).some((h) => h > 0);
                  return (
                    <React.Fragment key={"c" + lv}>
                      {lv > 0 && <span style={{ fontSize: FS.sm, color: mulActive ? C.accentBright : C.textDimmer }}>{"\u00d7"}</span>}
                      <span
                        style={{
                          fontSize: FS.md,
                          color: active ? C.accentBright : C.textDimmer,
                          fontWeight: active ? 700 : 400,
                          minWidth: 22,
                          textAlign: "center",
                        }}
                      >
                        {c}
                      </span>
                    </React.Fragment>
                  );
                })}
                <span style={{ fontSize: FS.sm, color: C.accentBright, paddingLeft: SP.sm, whiteSpace: "nowrap" }}>
                  = {t("random_patterns", patternInfo.total)}
                </span>
              </div>
            </div>
          </div>
          <div
            className="hex-palette-view"
            data-view="list"
            data-active={paletteView === "list"}
            aria-hidden={paletteView !== "list"}
            inert={paletteView !== "list"}
          >
            <HexPaletteList
              candidateIndexByLevel={candidateIndexByLevel}
              dispatch={candidateIndexDispatch}
              levelHistogram={levelHistogram}
              lockedLevels={lockedLevels}
              onSetLock={setLevelLock}
              active={paletteView === "list"}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
