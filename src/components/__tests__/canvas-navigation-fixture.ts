import { vi } from "vitest";
import type { CanvasNavigationHandlers } from "../../hooks/usePreviewCanvasNavigation";

export function makeCanvasNavigation(): CanvasNavigationHandlers {
  return {
    handleMiddleDown: vi.fn(),
    movePan: vi.fn(),
    endPan: vi.fn(),
    cancelPanInteraction: vi.fn(),
    resetView: vi.fn(),
    onWheel: vi.fn(),
    onPinchDown: vi.fn(),
    onPinchMove: vi.fn(),
    onPinchUp: vi.fn(),
  };
}
