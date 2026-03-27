import { vi } from "vitest";
import type { CanvasData } from "../types";

/** Create a minimal CanvasData for testing */
export function makeCvs(w = 10, h = 10): CanvasData {
  return { w, h, data: new Uint8Array(w * h), colorMap: new Uint8Array(w * h) };
}

/** Create a mock translation function */
export function mockT(key: string, ...args: unknown[]): string {
  return args.length ? `${key}(${args.join(",")})` : key;
}

/** Create a default colorLUT for testing */
export function makeColorLUT(): [number, number, number][] {
  return Array.from({ length: 8 }, () => [128, 128, 128] as [number, number, number]);
}

/** Create a default cc array for testing */
export function makeCc(): number[] {
  return [0, 0, 0, 0, 0, 0, 0, 0];
}

/** Create a default histogram for testing */
export function makeHist(): number[] {
  return [100, 50, 30, 20, 10, 5, 3, 1];
}

/** Create mock drawing context values */
export function mockDrawingContextValues() {
  return {
    displayW: 320,
    displayH: 320,
    panningRef: { current: false },
    spaceRef: { current: false },
    zoomRef: { current: 1 },
    panRef: { current: { x: 0, y: 0 } },
    startPan: vi.fn(),
    movePan: vi.fn(),
    endPan: vi.fn(),
    announce: vi.fn(),
    t: mockT,
  };
}
