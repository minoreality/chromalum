import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { LEVEL_INFO, LEVEL_CANDIDATES, findClosestCandidate, hue2rgb } from "../color-engine";
import { BRUSH_MIN, BRUSH_MAX, BRUSH_STEP, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from "../constants";
import type { GlazeToolId } from "../constants";
import { S_BTN, S_BTN_ACTIVE } from "../styles";
import type { PanZoomHandlers, CanvasAction, CanvasData } from "../types";
import type { GlazeDrawingResult } from "../hooks/useGlazeDrawing";
import { useTranslation } from "../i18n";
import { useGlazeContext } from "../contexts/GlazeContext";
import { C, Z, SP, FS, R, SHADOW, HUE_GRADIENT } from "../tokens";

interface GlazePanelProps {
  prvRef: React.RefObject<HTMLCanvasElement | null>;
  prvWrapRef: React.RefObject<HTMLDivElement | null>;
  displayW: number;
  displayH: number;
  canvasTransform: React.CSSProperties;
  canvasCursor: string;
  cvs: CanvasData;
  dispatch: React.Dispatch<CanvasAction>;
  panZoom: PanZoomHandlers;
  glazeDrawing: GlazeDrawingResult;
  announce: (msg: string) => void;
  showToast: (message: string, type: "error" | "success" | "info") => void;
  undo: () => void;
  redo: () => void;
  zoom: number;
  brushLevel: number;
}

const S_HUE_WRAP: React.CSSProperties = { position: "relative", width: "100%", paddingTop: SP.xl };
const S_HUE_TRACK: React.CSSProperties = {
  width: "100%",
  height: 16,
  borderRadius: R.lg,
  background: HUE_GRADIENT,
  cursor: "pointer",
  border: `1px solid ${C.border}`,
};
const S_HUE_INPUT: React.CSSProperties = {
  position: "absolute",
  top: 8,
  left: 0,
  width: "100%",
  height: 16,
  opacity: 0,
  cursor: "pointer",
};

const GLAZE_TOOLS: { id: GlazeToolId; labelKey: string; key: string }[] = [
  { id: "glaze_brush", labelKey: "tool_glaze_brush", key: "b" },
  { id: "glaze_eraser", labelKey: "tool_glaze_eraser", key: "e" },
  { id: "glaze_fill", labelKey: "tool_glaze_fill", key: "f" },
];

export const GlazePanel = React.memo(function GlazePanel(props: GlazePanelProps) {
  const {
    prvRef,
    prvWrapRef,
    displayW,
    displayH,
    canvasTransform,
    canvasCursor,
    cvs,
    dispatch,
    panZoom,
    glazeDrawing,
    announce,
    undo,
    redo,
    zoom,
    brushLevel,
  } = props;
  const { statusRef: glazeStatusRef, curRef: glazeCurRef } = glazeDrawing;
  const { hueAngle, setHueAngle, glazeTool, setGlazeTool, brushSize, setBrushSize, directCandidates, setDirectCandidates } =
    useGlazeContext();
  const { t } = useTranslation();
  const [showHighlight, setShowHighlight] = useState(false);

  // Keyboard shortcuts for zoom/pan + tool switching
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // Tool shortcuts
      if (k === "b") {
        e.preventDefault();
        setGlazeTool("glaze_brush");
        announce(t("announce_glaze_brush"));
        return;
      }
      if (k === "e") {
        e.preventDefault();
        setGlazeTool("glaze_eraser");
        announce(t("announce_glaze_eraser"));
        return;
      }
      if (k === "f") {
        e.preventDefault();
        setGlazeTool("glaze_fill");
        announce(t("announce_glaze_fill"));
        return;
      }
      // Brush size
      if (e.key === "[") {
        e.preventDefault();
        setBrushSize((s) => Math.max(BRUSH_MIN, s - BRUSH_STEP));
        return;
      }
      if (e.key === "]") {
        e.preventDefault();
        setBrushSize((s) => Math.min(BRUSH_MAX, s + BRUSH_STEP));
        return;
      }
      // Zoom/Pan
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        panZoom.setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP));
        panZoom.schedCursorRef.current?.();
      } else if (e.key === "-") {
        e.preventDefault();
        panZoom.setZoom((z) => Math.max(ZOOM_MIN, z / ZOOM_STEP));
        panZoom.schedCursorRef.current?.();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        panZoom.setPan((p) => ({ ...p, x: p.x + 10 }));
        panZoom.schedCursorRef.current?.();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        panZoom.setPan((p) => ({ ...p, x: p.x - 10 }));
        panZoom.schedCursorRef.current?.();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        panZoom.setPan((p) => ({ ...p, y: p.y + 10 }));
        panZoom.schedCursorRef.current?.();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        panZoom.setPan((p) => ({ ...p, y: p.y - 10 }));
        panZoom.schedCursorRef.current?.();
      } else if (e.key === "0") {
        e.preventDefault();
        panZoom.setZoom(1);
        panZoom.setPan({ x: 0, y: 0 });
        panZoom.schedCursorRef.current?.();
      }
    },
    [panZoom, setGlazeTool, announce, t, setBrushSize],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || panZoom.spaceRef.current) {
        e.preventDefault();
        panZoom.startPan(e);
        return;
      }
      // Right-click or Alt+click: eyedropper (pick hue from pixel)
      if (e.button === 2 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        glazeDrawing.pickHue(e);
        return;
      }
      glazeDrawing.onDown(e);
    },
    [panZoom, glazeDrawing],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (panZoom.panningRef.current) {
        panZoom.movePan(e);
        return;
      }
      glazeDrawing.onMove(e);
    },
    [panZoom, glazeDrawing],
  );

  const handlePointerUp = useCallback(() => {
    if (panZoom.panningRef.current) {
      panZoom.endPan();
      return;
    }
    glazeDrawing.onUp();
  }, [panZoom, glazeDrawing]);

  const handlePointerLeave = useCallback(() => {
    glazeDrawing.onUp();
    glazeDrawing.clearCursor();
  }, [glazeDrawing]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  const handleHueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setHueAngle(Number(e.target.value));
      setDirectCandidates(new Map()); // exit direct mode when hue slider is used
    },
    [setHueAngle, setDirectCandidates],
  );

  const handleGlazeClear = useCallback(() => {
    dispatch({ type: "glaze_clear" });
  }, [dispatch]);

  const handleZoomReset = useCallback(() => {
    panZoom.setZoom(1);
    panZoom.setPan({ x: 0, y: 0 });
    panZoom.schedCursorRef.current?.();
  }, [panZoom]);

  // Preview: for selected hue angle, show what color each level maps to
  const levelPreview = useMemo(() => {
    return LEVEL_INFO.map((info, lv) => {
      const candidates = LEVEL_CANDIDATES[lv];
      const ci = findClosestCandidate(lv, hueAngle);
      const rgb = candidates[ci]?.rgb ?? [128, 128, 128];
      return { lv, name: info.name, rgb, hex: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` };
    });
  }, [hueAngle]);

  // Count glazed pixels
  const glazeCount = useMemo(() => {
    let c = 0;
    for (let i = 0; i < cvs.colorMap.length; i++) if (cvs.colorMap[i] > 0) c++;
    return c;
  }, [cvs.colorMap]);

  // Hue marker position — 360° wraps to 0° (same hue)
  const hueMarkerLeft = `${((hueAngle % 360) / 360) * 100}%`;

  // Highlight overlay: debounced generation to avoid jank during rapid strokes
  const [highlightUrl, setHighlightUrl] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHighlightUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!showHighlight) {
      if (prevHighlightUrlRef.current) {
        URL.revokeObjectURL(prevHighlightUrlRef.current);
        prevHighlightUrlRef.current = null;
      }
      setHighlightUrl(null);
      return;
    }
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      const c = document.createElement("canvas");
      c.width = cvs.w;
      c.height = cvs.h;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const img = ctx.createImageData(cvs.w, cvs.h);
      const d = img.data;
      for (let i = 0; i < cvs.colorMap.length; i++) {
        if (cvs.colorMap[i] > 0) {
          d[i * 4] = 255;
          d[i * 4 + 1] = 255;
          d[i * 4 + 2] = 0;
          d[i * 4 + 3] = 80;
        }
      }
      ctx.putImageData(img, 0, 0);
      c.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        if (prevHighlightUrlRef.current) URL.revokeObjectURL(prevHighlightUrlRef.current);
        prevHighlightUrlRef.current = url;
        setHighlightUrl(url);
      });
    }, 150);
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (prevHighlightUrlRef.current) {
        URL.revokeObjectURL(prevHighlightUrlRef.current);
        prevHighlightUrlRef.current = null;
      }
    };
  }, [showHighlight, cvs.colorMap, cvs.w, cvs.h]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SP.xl }}>
      <div className="panel-layout">
        <div className="panel-canvas" style={{ "--display-max": displayW + "px" } as React.CSSProperties}>
          <div style={{ fontSize: FS.md, color: C.textDim, textAlign: "center", lineHeight: "14px" }}>{t("label_glaze")}</div>
          <div
            ref={prvWrapRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: R.lg,
              overflow: "hidden",
              position: "relative",
              width: displayW,
              height: displayH,
              outline: "none",
            }}
          >
            <canvas
              ref={prvRef}
              role="img"
              aria-label={t("label_glaze")}
              style={{ width: displayW, height: displayH, display: "block", ...canvasTransform, cursor: canvasCursor, touchAction: "none" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onContextMenu={handleContextMenu}
            />
            {highlightUrl && (
              <img
                src={highlightUrl}
                alt=""
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: displayW,
                  height: displayH,
                  pointerEvents: "none",
                  zIndex: Z.cursorOverlay,
                  ...canvasTransform,
                  imageRendering: "pixelated",
                }}
              />
            )}
            <canvas
              ref={glazeCurRef}
              width={displayW}
              height={displayH}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: displayW,
                height: displayH,
                pointerEvents: "none",
                zIndex: Z.cursorOverlay,
              }}
            />
          </div>
          <div
            ref={glazeStatusRef}
            aria-live="polite"
            aria-atomic="true"
            style={{ fontSize: FS.sm, color: C.textDimmer, fontFamily: "monospace", minHeight: 14, textAlign: "center" }}
          >
            {"\u2014"}
          </div>
        </div>
        <div className="panel-sidebar">
          {/* Tools */}
          <div role="radiogroup" aria-label={t("aria_glaze_tools")} style={{ display: "flex", gap: SP.xs, justifyContent: "center" }}>
            {GLAZE_TOOLS.map((gt) => (
              <button
                key={gt.id}
                role="radio"
                aria-checked={glazeTool === gt.id}
                onClick={() => {
                  setGlazeTool(gt.id);
                  announce(t("announce_" + gt.id));
                }}
                style={glazeTool === gt.id ? S_BTN_ACTIVE : S_BTN}
              >
                {t(gt.labelKey)}({gt.key.toUpperCase()})
              </button>
            ))}
          </div>

          {/* Undo/Redo + Zoom */}
          <div style={{ display: "flex", gap: SP.md, alignItems: "center", justifyContent: "center", marginTop: SP.lg }}>
            <button style={S_BTN} onClick={undo} title={t("title_undo")}>
              {t("btn_undo")}
            </button>
            <button style={S_BTN} onClick={redo} title={t("title_redo")}>
              {t("btn_redo")}
            </button>
            <button
              style={S_BTN}
              onClick={handleZoomReset}
              title={t("title_zoom_reset")}
              aria-label={t("aria_zoom_reset", Math.round(zoom * 100))}
            >
              {"\u2299"}
              {Math.round(zoom * 100)}%
            </button>
          </div>

          {/* Brush size */}
          {glazeTool !== "glaze_fill" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: SP.lg,
                fontSize: 11,
                color: C.textDimmer,
                width: "100%",
                marginTop: SP.md,
                marginBottom: SP.md,
              }}
            >
              <span>{t("label_size")}</span>
              <button
                style={S_BTN}
                onClick={() => setBrushSize((s) => Math.max(BRUSH_MIN, s - BRUSH_STEP))}
                aria-label={t("aria_brush_size_decrease")}
              >
                {"\u2212"}
              </button>
              <input
                type="range"
                min={BRUSH_MIN}
                max={BRUSH_MAX}
                step={BRUSH_STEP}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                aria-label={t("aria_brush_size")}
                style={{ flex: 1, minWidth: 60 }}
              />
              <button
                style={S_BTN}
                onClick={() => setBrushSize((s) => Math.min(BRUSH_MAX, s + BRUSH_STEP))}
                aria-label={t("aria_brush_size_increase")}
              >
                +
              </button>
              <span style={{ color: C.textSecondary, minWidth: 20 }}>{brushSize}</span>
            </div>
          )}

          {/* Options + Clear */}
          <div style={{ display: "flex", alignItems: "center", gap: SP.lg, flexWrap: "wrap", justifyContent: "center", marginTop: SP.lg }}>
            <label style={{ fontSize: FS.sm, color: C.textDim, cursor: "pointer", display: "flex", alignItems: "center", gap: SP.sm }}>
              <input type="checkbox" checked={showHighlight} onChange={(e) => setShowHighlight(e.target.checked)} />
              {t("glaze_show_highlight")}
            </label>
            <button style={S_BTN} onClick={handleGlazeClear} title={t("title_glaze_clear")}>
              {t("btn_glaze_clear")}
            </button>
            {glazeCount > 0 && <span style={{ fontSize: FS.xs, color: C.textDimmer }}>{glazeCount.toLocaleString()}px</span>}
          </div>

          {/* Hue angle slider with marker */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: SP.md, marginTop: SP.lg }}>
            <div style={{ fontSize: FS.lg, color: C.textPrimary, textAlign: "center", fontFamily: "monospace" }}>
              {t("glaze_hue_angle")}: {Math.round(hueAngle % 360)}°
            </div>
            <div style={S_HUE_WRAP}>
              <div style={S_HUE_TRACK} />
              {/* Marker triangle */}
              <div
                style={{
                  position: "absolute",
                  top: 1,
                  left: hueMarkerLeft,
                  transform: "translateX(-5px)",
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: `6px solid ${C.textPrimary}`,
                  pointerEvents: "none",
                }}
              />
              {/* Candidate switch-point tick marks */}
              {useMemo(() => {
                const ticks: { deg: number; color: string }[] = [];
                for (let lv = 2; lv <= 5; lv++) {
                  const cands = LEVEL_CANDIDATES[lv];
                  if (cands.length <= 1 || cands[0].angle < 0) continue;
                  const angles = cands.map((c) => c.angle).sort((a, b) => a - b);
                  for (let i = 0; i < angles.length; i++) {
                    const a1 = angles[i];
                    const a2 = angles[(i + 1) % angles.length];
                    const diff = (a2 - a1 + 360) % 360;
                    const mid = (a1 + diff / 2) % 360;
                    ticks.push({ deg: mid, color: `rgb(${cands[0].rgb.join(",")})` });
                  }
                }
                return ticks;
              }, []).map((tick, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: 26,
                    left: `${(tick.deg / 359) * 100}%`,
                    transform: "translateX(-0.5px)",
                    width: 1,
                    height: 5,
                    background: C.textDimmer,
                    pointerEvents: "none",
                  }}
                />
              ))}
              <input
                type="range"
                min={0}
                max={359}
                step={1}
                value={Math.round(hueAngle) % 360}
                onChange={handleHueChange}
                aria-label={t("aria_hue_slider")}
                style={S_HUE_INPUT}
              />
            </div>
          </div>

          {/* Level preview — 2D candidate grid */}
          <div style={{ fontSize: FS.sm, color: C.textDim, textAlign: "center", marginTop: SP.xl, marginBottom: SP.xs }}>
            {t("glaze_preview")}
          </div>
          <div style={{ display: "flex", gap: SP.sm, justifyContent: "center", alignItems: "center", marginTop: SP.sm }}>
            {levelPreview.map((lp) => {
              const cands = LEVEL_CANDIDATES[lp.lv];
              const hasCands = cands.length > 1;
              const isDirect = directCandidates.has(lp.lv);
              const directIdx = directCandidates.get(lp.lv);
              const autoIdx = hasCands ? findClosestCandidate(lp.lv, hueAngle) : 0;
              // Current selected candidate index
              const currentIdx = isDirect ? directIdx! : autoIdx;
              // For 3 candidates: show prev above, current center, next below
              const prevIdx = hasCands ? (currentIdx - 1 + cands.length) % cands.length : -1;
              const nextIdx = hasCands ? (currentIdx + 1) % cands.length : -1;

              const makeSwatch = (ci: number, size: number, _isCurrent: boolean) => {
                const cand = cands[ci];
                const isSelected = directCandidates.get(lp.lv) === ci;
                return (
                  <div
                    key={ci}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setDirectCandidates((prev) => {
                        const next = new Map(prev);
                        if (next.get(lp.lv) === ci) next.delete(lp.lv);
                        else next.set(lp.lv, ci);
                        return next;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDirectCandidates((prev) => {
                          const next = new Map(prev);
                          if (next.get(lp.lv) === ci) next.delete(lp.lv);
                          else next.set(lp.lv, ci);
                          return next;
                        });
                      }
                    }}
                    title={`#${cand.rgb.map((c) => c.toString(16).padStart(2, "0")).join("")} ${Math.round(cand.angle)}°`}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: R.md,
                      cursor: "pointer",
                      background: `rgb(${cand.rgb.join(",")})`,
                      border: `2px solid ${isSelected ? C.accent : C.border}`,
                      boxSizing: "border-box" as const,
                      boxShadow: isSelected ? SHADOW.glow(C.accent) : "none",
                      opacity: 1,
                    }}
                  />
                );
              };

              const cycleCand = (dir: number) => {
                setDirectCandidates((prev) => {
                  const next = new Map(prev);
                  const cur = next.has(lp.lv) ? next.get(lp.lv)! : autoIdx;
                  next.set(lp.lv, (((cur + dir) % cands.length) + cands.length) % cands.length);
                  return next;
                });
              };

              const handleWheel = hasCands
                ? (e: React.WheelEvent) => {
                    e.preventDefault();
                    cycleCand(e.deltaY > 0 ? 1 : -1);
                  }
                : undefined;

              // Touch swipe support for cycling candidates
              const swipeStartRef = { current: 0 };
              const handleTouchStart = hasCands
                ? (e: React.TouchEvent) => {
                    swipeStartRef.current = e.touches[0].clientY;
                  }
                : undefined;
              const handleTouchEnd = hasCands
                ? (e: React.TouchEvent) => {
                    const dy = e.changedTouches[0].clientY - swipeStartRef.current;
                    if (Math.abs(dy) > 20) cycleCand(dy > 0 ? 1 : -1);
                  }
                : undefined;

              return (
                <div
                  key={lp.lv}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    cursor: hasCands ? "pointer" : "default",
                    touchAction: hasCands ? "none" : "auto",
                  }}
                >
                  {/* Upper candidate */}
                  {hasCands ? makeSwatch(prevIdx, 20, false) : <div style={{ height: 20 }} />}
                  {/* Current / main swatch — click to reset to auto */}
                  <div
                    role={isDirect ? "button" : undefined}
                    tabIndex={isDirect ? 0 : undefined}
                    onClick={
                      isDirect
                        ? () => {
                            setDirectCandidates((prev) => {
                              const next = new Map(prev);
                              next.delete(lp.lv);
                              return next;
                            });
                          }
                        : undefined
                    }
                    onKeyDown={
                      isDirect
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setDirectCandidates((prev) => {
                                const next = new Map(prev);
                                next.delete(lp.lv);
                                return next;
                              });
                            }
                          }
                        : undefined
                    }
                    title={isDirect ? t("title_reset_auto") : undefined}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: R.md,
                      background: isDirect ? `rgb(${cands[directIdx!]?.rgb.join(",")})` : lp.hex,
                      border: `2px solid ${isDirect ? C.accent : C.border}`,
                      boxSizing: "border-box" as const,
                      cursor: isDirect ? "pointer" : "default",
                    }}
                  />
                  {/* Lower candidate */}
                  {hasCands ? makeSwatch(nextIdx, 20, false) : <div style={{ height: 20 }} />}
                </div>
              );
            })}
          </div>

          {/* ── Linked 3-View Visualization ── */}
          {useMemo(() => {
            // Layout: Wheel center + right Y-projection + bottom X-projection
            const WR = 62,
              WCX = 80,
              WCY = 80,
              WO = 10,
              GAP = 12;
            const WD = 160; // wheel diameter area
            // Right graph: X=hue angle (0-360), Y=same as wheel Y axis
            const RX = WO + WD + GAP,
              RW = 160;
            // Bottom graph: Y=hue angle (0-360), X=same as wheel X axis
            const BY = WO + WD + GAP,
              BH = 100;
            const TW = RX + RW + 4,
              TH = BY + BH + 4;
            // Wheel absolute center
            const CX = WO + WCX,
              CY = WO + WCY;

            const lumR = (lv: number) => (LEVEL_INFO[lv].gray / 255) * WR;
            // Wheel dot position (absolute SVG coords)
            const wP = (a: number, lv: number) => {
              const rad = ((a - 90) * Math.PI) / 180,
                r = lumR(lv);
              return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
            };
            // Right graph: X maps hue 0-360, Y is SAME as wheel Y
            const rPx = (a: number) => RX + 10 + (a / 360) * (RW - 14);
            // Bottom graph: Y maps hue 0-360, X is SAME as wheel X
            const bPy = (a: number) => BY + 8 + (a / 360) * (BH - 16);

            const dots: { lv: number; ci: number; a: number; rgb: [number, number, number]; act: boolean }[] = [];
            for (let lv = 0; lv < LEVEL_CANDIDATES.length; lv++)
              for (let ci = 0; ci < LEVEL_CANDIDATES[lv].length; ci++) {
                const c = LEVEL_CANDIDATES[lv][ci];
                if (c.angle < 0) continue;
                dots.push({ lv, ci, a: c.angle, rgb: c.rgb, act: findClosestCandidate(lv, hueAngle) === ci });
              }

            return (
              <div style={{ marginTop: SP.xl, textAlign: "center" }}>
                <svg viewBox={`0 0 ${TW} ${TH}`} width="100%" style={{ maxWidth: TW }}>
                  {/* ═══ WHEEL ═══ */}
                  <g>
                    {Array.from({ length: 360 }, (_, d) => {
                      const r = ((d - 90) * Math.PI) / 180;
                      const [cr, cg, cb] = hue2rgb(d);
                      return (
                        <line
                          key={`h${d}`}
                          x1={CX + 68 * Math.cos(r)}
                          y1={CY + 68 * Math.sin(r)}
                          x2={CX + 75 * Math.cos(r)}
                          y2={CY + 75 * Math.sin(r)}
                          stroke={`rgb(${cr},${cg},${cb})`}
                          strokeWidth={1.5}
                        />
                      );
                    })}
                    {LEVEL_INFO.map((_, lv) => {
                      const r = lumR(lv);
                      return r > 1 ? (
                        <circle key={`g${lv}`} cx={CX} cy={CY} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
                      ) : null;
                    })}
                    <circle cx={CX} cy={CY} r={3} fill="#000" stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
                    <circle cx={CX} cy={CY} r={WR} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} strokeDasharray="2,2" />
                    {/* Current angle sweep line */}
                    {(() => {
                      const r = ((hueAngle - 90) * Math.PI) / 180;
                      return (
                        <line
                          x1={CX}
                          y1={CY}
                          x2={CX + 65 * Math.cos(r)}
                          y2={CY + 65 * Math.sin(r)}
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth={0.5}
                        />
                      );
                    })()}
                    {/* C2 symmetry */}
                    {(
                      [
                        [1, 6],
                        [2, 5],
                        [3, 4],
                      ] as [number, number][]
                    ).flatMap(([a, b]) =>
                      LEVEL_CANDIDATES[a].map((ca, ci) => {
                        if (ca.angle < 0) return null;
                        const comp = (ca.angle + 180) % 360;
                        const ciB = LEVEL_CANDIDATES[b].findIndex((cb) => Math.abs(((cb.angle - comp + 540) % 360) - 180) < 1);
                        if (ciB < 0) return null;
                        const pA = wP(ca.angle, a),
                          pB = wP(LEVEL_CANDIDATES[b][ciB].angle, b);
                        return (
                          <line
                            key={`s${a}${ci}`}
                            x1={pA.x}
                            y1={pA.y}
                            x2={pB.x}
                            y2={pB.y}
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth={0.5}
                            strokeDasharray="3,2"
                          />
                        );
                      }),
                    )}
                    {/* Active connections */}
                    {(() => {
                      const p = dots.filter((d) => d.act).map((d) => wP(d.a, d.lv));
                      return p.map((pt, i) =>
                        i > 0 ? (
                          <line
                            key={`wc${i}`}
                            x1={p[i - 1].x}
                            y1={p[i - 1].y}
                            x2={pt.x}
                            y2={pt.y}
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth={0.5}
                          />
                        ) : null,
                      );
                    })()}
                    {/* Dots */}
                    {dots.map((d) => {
                      const p = wP(d.a, d.lv);
                      return (
                        <circle
                          key={`w${d.lv}${d.ci}`}
                          cx={p.x}
                          cy={p.y}
                          r={d.act ? 5 : 2.5}
                          fill={d.act ? `rgb(${d.rgb.join(",")})` : "#555"}
                          stroke={d.act ? "#fff" : "none"}
                          strokeWidth={d.act ? 1 : 0}
                        />
                      );
                    })}
                    {/* Angle marker */}
                    {(() => {
                      const r = ((hueAngle - 90) * Math.PI) / 180,
                        x = CX + 75 * Math.cos(r),
                        y = CY + 75 * Math.sin(r);
                      return (
                        <polygon
                          points={`${x},${y} ${x + 4 * Math.cos(r + 2.5)},${y + 4 * Math.sin(r + 2.5)} ${x + 4 * Math.cos(r - 2.5)},${y + 4 * Math.sin(r - 2.5)}`}
                          fill="#fff"
                        />
                      );
                    })()}
                  </g>

                  {/* ═══ RIGHT: Y-projection (X=hue angle, Y=wheel Y coord) ═══ */}
                  <g>
                    <rect x={RX} y={CY - WR} width={RW} height={WR * 2} fill="rgba(255,255,255,0.02)" rx={4} />
                    {/* Center horizontal line (wheel center Y) */}
                    <line x1={RX} y1={CY} x2={RX + RW} y2={CY} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
                    {/* X-axis hue labels */}
                    {[0, 60, 120, 180, 240, 300].map((a) => (
                      <text key={`ra${a}`} x={rPx(a)} y={CY + WR + 10} fontSize={4} fill="#555" textAnchor="middle">
                        {a}°
                      </text>
                    ))}
                    {/* Current hue vertical line */}
                    <line
                      x1={rPx(hueAngle)}
                      y1={CY - WR}
                      x2={rPx(hueAngle)}
                      y2={CY + WR}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth={0.5}
                    />
                    {/* Dot traces: for each dot, plot at (rPx(angle), wheel_y) */}
                    {dots.map((d) => {
                      const wy = wP(d.a, d.lv).y; // same Y as on wheel
                      return (
                        <circle
                          key={`r${d.lv}${d.ci}`}
                          cx={rPx(d.a)}
                          cy={wy}
                          r={d.act ? 4 : 2}
                          fill={d.act ? `rgb(${d.rgb.join(",")})` : "#444"}
                          stroke={d.act ? "#fff" : "none"}
                          strokeWidth={d.act ? 0.5 : 0}
                        />
                      );
                    })}
                    {/* Connect active dots as wave */}
                    {(() => {
                      const sorted = dots.filter((d) => d.act).sort((a, b) => a.a - b.a);
                      const pts = sorted.map((d) => ({ x: rPx(d.a), y: wP(d.a, d.lv).y }));
                      return pts.map((pt, i) =>
                        i > 0 ? (
                          <line
                            key={`rc${i}`}
                            x1={pts[i - 1].x}
                            y1={pts[i - 1].y}
                            x2={pt.x}
                            y2={pt.y}
                            stroke="rgba(128,160,255,0.25)"
                            strokeWidth={0.8}
                          />
                        ) : null,
                      );
                    })()}
                  </g>

                  {/* ═══ BOTTOM: X-projection (Y=hue angle, X=wheel X coord) ═══ */}
                  <g>
                    <rect x={CX - WR} y={BY} width={WR * 2} height={BH} fill="rgba(255,255,255,0.02)" rx={4} />
                    {/* Center vertical line (wheel center X) */}
                    <line x1={CX} y1={BY} x2={CX} y2={BY + BH} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
                    {/* Y-axis hue labels */}
                    {[0, 60, 120, 180, 240, 300].map((a) => (
                      <text key={`ba${a}`} x={CX - WR - 6} y={bPy(a)} fontSize={4} fill="#555" textAnchor="end" dominantBaseline="middle">
                        {a}°
                      </text>
                    ))}
                    {/* Current hue horizontal line */}
                    <line
                      x1={CX - WR}
                      y1={bPy(hueAngle)}
                      x2={CX + WR}
                      y2={bPy(hueAngle)}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth={0.5}
                    />
                    {/* Dot traces: for each dot, plot at (wheel_x, bPy(angle)) */}
                    {dots.map((d) => {
                      const wx = wP(d.a, d.lv).x; // same X as on wheel
                      return (
                        <circle
                          key={`b${d.lv}${d.ci}`}
                          cx={wx}
                          cy={bPy(d.a)}
                          r={d.act ? 4 : 2}
                          fill={d.act ? `rgb(${d.rgb.join(",")})` : "#444"}
                          stroke={d.act ? "#fff" : "none"}
                          strokeWidth={d.act ? 0.5 : 0}
                        />
                      );
                    })}
                    {/* Connect active dots as wave */}
                    {(() => {
                      const sorted = dots.filter((d) => d.act).sort((a, b) => a.a - b.a);
                      const pts = sorted.map((d) => ({ x: wP(d.a, d.lv).x, y: bPy(d.a) }));
                      return pts.map((pt, i) =>
                        i > 0 ? (
                          <line
                            key={`bc${i}`}
                            x1={pts[i - 1].x}
                            y1={pts[i - 1].y}
                            x2={pt.x}
                            y2={pt.y}
                            stroke="rgba(128,160,255,0.25)"
                            strokeWidth={0.8}
                          />
                        ) : null,
                      );
                    })()}
                  </g>

                  {/* ═══ GUIDE LINES: horizontal (wheel→right) + vertical (wheel→bottom) ═══ */}
                  <g opacity={0.15}>
                    {dots
                      .filter((d) => d.act)
                      .map((d) => {
                        const w = wP(d.a, d.lv);
                        const col = `rgb(${d.rgb.join(",")})`;
                        return (
                          <React.Fragment key={`gl${d.lv}${d.ci}`}>
                            {/* Horizontal: wheel dot → right graph (same Y) */}
                            <line x1={w.x} y1={w.y} x2={rPx(d.a)} y2={w.y} stroke={col} strokeWidth={0.5} strokeDasharray="2,2" />
                            {/* Vertical: wheel dot → bottom graph (same X) */}
                            <line x1={w.x} y1={w.y} x2={w.x} y2={bPy(d.a)} stroke={col} strokeWidth={0.5} strokeDasharray="2,2" />
                          </React.Fragment>
                        );
                      })}
                  </g>
                </svg>
              </div>
            );
          }, [hueAngle, brushLevel])}
        </div>
        {/* panel-sidebar */}
      </div>
      {/* panel-layout */}
    </div>
  );
});
