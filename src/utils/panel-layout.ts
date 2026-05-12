import type React from "react";

const LANDSCAPE_CANVAS_OFFSET_RATIO = 0.12;
const LANDSCAPE_CANVAS_OFFSET_MAX = 72;

function getDisplayAspect(displayW: number, displayH: number): number {
  return Math.max(1, displayW) / Math.max(1, displayH);
}

export function getPanelLayoutClassName(displayW: number, displayH: number): string {
  const aspect = getDisplayAspect(displayW, displayH);
  if (aspect <= 0.7) return "panel-layout panel-layout--tall-portrait";
  if (aspect < 1) return "panel-layout panel-layout--portrait";
  return "panel-layout";
}

export function getCanvasPanelClassName(displayW: number, displayH: number): string {
  return displayW > displayH ? "panel-canvas panel-canvas--landscape" : "panel-canvas";
}

export function getCanvasPanelStyle(displayW: number, displayH: number): React.CSSProperties {
  const style = { "--display-max": `${displayW}px` } as React.CSSProperties;
  if (displayW <= displayH) return style;

  const offset = Math.min(LANDSCAPE_CANVAS_OFFSET_MAX, Math.round((displayW - displayH) * LANDSCAPE_CANVAS_OFFSET_RATIO));
  return {
    ...style,
    "--canvas-landscape-offset": `${offset}px`,
  } as React.CSSProperties;
}
