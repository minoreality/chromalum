// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGlazeDrawing } from "../useGlazeDrawing";
import type { CanvasData } from "../../types";

/* ── Mocks ──────────────────────────────────── */

const mockAnnounce = vi.fn();
const mockEndPan = vi.fn();
const mockSetHueAngle = vi.fn();
const mockPanningRef = { current: false };

vi.mock("../../state/DrawingContext", () => ({
  useDrawingContext: () => ({
    displayW: 320,
    displayH: 320,
    panningRef: mockPanningRef,
    spaceRef: { current: false },
    zoomRef: { current: 1 },
    panRef: { current: { x: 0, y: 0 } },
    startPan: vi.fn(),
    movePan: vi.fn(),
    endPan: mockEndPan,
    announce: mockAnnounce,
    t: (k: string) => k,
  }),
}));

vi.mock("../useFloodFillWorker", () => ({
  useFloodFillWorker: () => ({
    requestCanvasFill: vi.fn(() => Promise.resolve({ data: new Uint8Array(100), changed: new Uint32Array(0), truncated: false })),
    requestGlazeFill: vi.fn(() => Promise.resolve({ colorMap: new Uint8Array(100), changed: new Uint32Array(0), truncated: false })),
  }),
}));

vi.mock("../useCursorOverlay", () => ({
  useCursorOverlay: () => ({
    curRef: { current: document.createElement("canvas") },
    cursorRafRef: { current: null },
    schedCursorRef: { current: null },
    cursorPosRef: { current: null },
    trackCursor: vi.fn(),
    clearCursor: vi.fn(),
  }),
}));

function makeCvs(w = 10, h = 10): CanvasData {
  return {
    w,
    h,
    data: new Uint8Array(w * h),
    colorMap: new Uint8Array(w * h),
  };
}

function makeOpts(overrides?: Partial<Parameters<typeof useGlazeDrawing>[0]>) {
  return {
    cvs: makeCvs(),
    dispatch: vi.fn(),
    colorLUT: Array.from({ length: 8 }, () => [128, 128, 128] as [number, number, number]),
    hueAngle: 180,
    setHueAngle: mockSetHueAngle,
    glazeTool: "glaze_brush" as const,
    brushSize: 1,
    prvRef: { current: null as HTMLCanvasElement | null },
    directCandidates: new Map<number, number>(),
    ...overrides,
  };
}

function mockCanvasRect(canvas: HTMLCanvasElement) {
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: 320,
    bottom: 320,
    width: 320,
    height: 320,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

function pointerEvent(overrides?: Partial<React.PointerEvent>): React.PointerEvent {
  const clientX = overrides?.clientX ?? 160;
  const clientY = overrides?.clientY ?? 160;
  return {
    button: 0,
    pointerId: 1,
    target: { setPointerCapture: vi.fn() },
    clientX,
    clientY,
    preventDefault: vi.fn(),
    nativeEvent: { clientX, clientY },
    ...overrides,
  } as unknown as React.PointerEvent;
}

/* ── Tests ──────────────────────────────────── */

describe("useGlazeDrawing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPanningRef.current = false;
  });

  it("onUp during pan calls endPan", () => {
    const { result } = renderHook(() => useGlazeDrawing(makeOpts()));
    mockPanningRef.current = true;
    act(() => {
      result.current.onUp();
    });
    expect(mockEndPan).toHaveBeenCalled();
    mockPanningRef.current = false;
  });

  it("paints a glaze override and dispatches a color-map diff", () => {
    const cvs = makeCvs(10, 10);
    const centerIndex = 5 * 10 + 5;
    cvs.data[centerIndex] = 2;
    const dispatch = vi.fn();
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ cvs, dispatch, brushSize: 1 })));
    const canvas = result.current.curRef.current!;
    mockCanvasRect(canvas);

    act(() => {
      result.current.onDown(pointerEvent({ target: canvas }));
    });

    expect(result.current.drawingRef.current).toBe(true);

    act(() => {
      result.current.onUp();
    });

    expect(result.current.drawingRef.current).toBe(false);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "stroke_end",
        finalColorMap: expect.any(Uint8Array),
        diff: expect.objectContaining({
          idx: expect.any(Uint32Array),
          cmNv: expect.any(Uint8Array),
        }),
      }),
    );
    const action = dispatch.mock.calls[0][0];
    expect(action.finalColorMap[centerIndex]).toBeGreaterThan(0);
    expect(Array.from(action.diff.idx)).toContain(centerIndex);
  });

  it.each([0, 7])("pickHue on achromatic level L%s announces an error", (level) => {
    const cvs = makeCvs(10, 10);
    cvs.data[0] = level;
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ cvs })));
    const canvas = result.current.curRef.current!;
    mockCanvasRect(canvas);

    act(() => {
      result.current.pickHue(pointerEvent({ clientX: 0, clientY: 0, target: canvas }));
    });

    expect(mockAnnounce).toHaveBeenCalledWith("announce_hue_achromatic");
  });
});
