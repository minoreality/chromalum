// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGlazeDrawing } from "../useGlazeDrawing";
import { renderCanvasBuffers } from "../../drawing/render-buf";
import type { CanvasData } from "../../types";
import type { GlazeToolId } from "../../constants";

/* ── Mocks ──────────────────────────────────── */

const mockAnnounce = vi.fn();
const mockEndPan = vi.fn();
const mockSetHueAngle = vi.fn();
const mockPanningRef = { current: false };
const mockZoomRef = { current: 1 };
const mockPanRef = { current: { x: 0, y: 0 } };
const cursorOverlayMocks = vi.hoisted(() => ({
  trackCursor: vi.fn(),
  clearCursor: vi.fn(),
}));
const floodFillMocks = vi.hoisted(() => ({
  requestCanvasFill: vi.fn(),
  requestGlazeFill: vi.fn(),
}));

vi.mock("../../state/DrawingContext", () => ({
  useDrawingContext: () => ({
    displayWidth: 320,
    displayHeight: 320,
    panningRef: mockPanningRef,
    spaceRef: { current: false },
    zoomRef: mockZoomRef,
    panRef: mockPanRef,
    startPan: vi.fn(),
    movePan: vi.fn(),
    endPan: mockEndPan,
    announce: mockAnnounce,
    t: (k: string) => k,
  }),
}));

vi.mock("../useFloodFillWorker", () => ({
  useFloodFillWorker: () => floodFillMocks,
}));

vi.mock("../useCursorOverlay", () => ({
  useCursorOverlay: () => ({
    cursorCanvasRef: { current: document.createElement("canvas") },
    cursorRafRef: { current: null },
    scheduleCursorRedrawRef: { current: null },
    cursorPosRef: { current: null },
    trackCursor: cursorOverlayMocks.trackCursor,
    clearCursor: cursorOverlayMocks.clearCursor,
  }),
}));

vi.mock("../../drawing/render-buf", () => ({
  renderCanvasBuffers: vi.fn(),
}));

function makeCvs(w = 10, h = 10): CanvasData {
  return {
    width: w,
    height: h,
    levelData: new Uint8Array(w * h),
    pixelCandidateOverrideMap: new Uint8Array(w * h),
  };
}

function makeOpts(overrides?: Partial<Parameters<typeof useGlazeDrawing>[0]>) {
  return {
    canvasData: makeCvs(),
    dispatch: vi.fn(),
    colorLUT: Array.from({ length: 8 }, () => [128, 128, 128] as [number, number, number]),
    candidateIndexByLevel: [0, 0, 0, 0, 0, 0, 0, 0],
    hueAngleDeg: 180,
    setHueAngleDeg: mockSetHueAngle,
    glazeTool: "glaze_brush" as const,
    brushSize: 1,
    previewCanvasRef: { current: null as HTMLCanvasElement | null },
    candidateOverridesByLevel: new Map<number, number>(),
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
    buttons: 1,
    altKey: false,
    pointerId: 1,
    target: { setPointerCapture: vi.fn() },
    currentTarget: { hasPointerCapture: vi.fn(() => false) },
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
    mockZoomRef.current = 1;
    mockPanRef.current = { x: 0, y: 0 };
    floodFillMocks.requestCanvasFill.mockResolvedValue({
      levelData: new Uint8Array(100),
      changedIndices: new Uint32Array(0),
      truncated: false,
    });
    floodFillMocks.requestGlazeFill.mockResolvedValue({
      pixelCandidateOverrideMap: new Uint8Array(100),
      changedIndices: new Uint32Array(0),
      truncated: false,
    });
  });

  it.each([
    {
      tool: "glaze_line",
      intermediate: [7, 1],
      painted: [
        [1, 1],
        [4, 4],
        [7, 7],
      ],
      restored: [
        [4, 1],
        [1, 7],
      ],
    },
    {
      tool: "glaze_rect",
      intermediate: [3, 3],
      painted: [
        [4, 1],
        [7, 4],
        [4, 7],
        [1, 4],
      ],
      restored: [
        [3, 2],
        [4, 4],
      ],
    },
    {
      tool: "glaze_ellipse",
      intermediate: [3, 3],
      painted: [
        [4, 1],
        [7, 4],
        [4, 7],
        [1, 4],
      ],
      restored: [
        [2, 1],
        [1, 1],
        [4, 4],
      ],
    },
  ])("replaces the $tool preview while preserving existing glaze and Source levels", ({ tool, intermediate, painted, restored }) => {
    const canvasData = makeCvs();
    canvasData.levelData.fill(2);
    canvasData.pixelCandidateOverrideMap.fill(3);
    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useGlazeDrawing(makeOpts({ canvasData, dispatch, glazeTool: tool as GlazeToolId, hueAngleDeg: 225 })),
    );
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);
    const at = (x: number, y: number) => pointerEvent({ target: canvas, clientX: (x + 0.5) * 32, clientY: (y + 0.5) * 32 });
    act(() => {
      result.current.onDown(at(1, 1));
      result.current.onMove(at(intermediate[0], intermediate[1]));
      result.current.onMove(at(7, 7));
      result.current.onUp();
    });

    const committed = dispatch.mock.calls[0][0];
    const overrides = committed.finalPixelCandidateOverrideMap as Uint8Array;
    for (const [x, y] of painted) expect(overrides[y * 10 + x], `painted (${x},${y})`).toBe(2);
    for (const [x, y] of restored) expect(overrides[y * 10 + x], `restored (${x},${y})`).toBe(3);
    expect(Array.from(committed.finalLevelData)).toEqual(Array(100).fill(2));
    expect(Array.from(canvasData.pixelCandidateOverrideMap)).toEqual(Array(100).fill(3));
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("applies only the selected Glaze candidates along a line crossing different Source levels", () => {
    const canvasData = makeCvs();
    canvasData.pixelCandidateOverrideMap.fill(1);
    canvasData.levelData.set([0, 1, 2, 3, 4, 5, 6, 7], 11);
    const beforeLevels = canvasData.levelData.slice();
    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useGlazeDrawing(
        makeOpts({
          canvasData,
          dispatch,
          glazeTool: "glaze_line" as GlazeToolId,
          candidateOverridesByLevel: new Map([
            [2, 1],
            [4, 2],
          ]),
        }),
      ),
    );
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);
    act(() => {
      result.current.onDown(pointerEvent({ target: canvas, clientX: 48, clientY: 48 }));
      result.current.onMove(pointerEvent({ target: canvas, clientX: 272, clientY: 48 }));
      result.current.onUp();
    });
    const committed = dispatch.mock.calls[0][0];
    expect(Array.from(committed.finalPixelCandidateOverrideMap.slice(11, 19))).toEqual([1, 1, 2, 1, 3, 1, 1, 1]);
    expect(committed.finalLevelData).toEqual(beforeLevels);
  });

  it("keeps a Glaze rectangle's initial tool, brush size and color when controls change during the drag", () => {
    const canvasData = makeCvs();
    canvasData.levelData.fill(2);
    const dispatch = vi.fn();
    const { result, rerender } = renderHook(
      (params: { glazeTool: GlazeToolId; brushSize: number; hueAngleDeg: number; candidateOverridesByLevel: Map<number, number> }) =>
        useGlazeDrawing(makeOpts({ canvasData, dispatch, ...params })),
      {
        initialProps: {
          glazeTool: "glaze_rect" as GlazeToolId,
          brushSize: 1,
          hueAngleDeg: 225,
          candidateOverridesByLevel: new Map<number, number>(),
        },
      },
    );
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);
    act(() => result.current.onDown(pointerEvent({ target: canvas, clientX: 48, clientY: 48 })));
    rerender({ glazeTool: "glaze_brush", brushSize: 5, hueAngleDeg: 0, candidateOverridesByLevel: new Map([[2, 0]]) });
    act(() => {
      result.current.onMove(pointerEvent({ target: canvas, clientX: 240, clientY: 240 }));
      result.current.onUp();
    });
    const overrides = dispatch.mock.calls[0][0].finalPixelCandidateOverrideMap as Uint8Array;
    expect(overrides[1 * 10 + 4]).toBe(2);
    expect(overrides[4 * 10 + 7]).toBe(2);
    expect(overrides[4 * 10 + 4]).toBe(0);
    expect(overrides[0 * 10 + 4]).toBe(0);
  });

  it("finishes its glaze stroke when another input started panning before release", () => {
    const dispatch = vi.fn();
    const canvasData = makeCvs();
    canvasData.levelData.fill(2);
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, dispatch })));
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);
    act(() => result.current.onDown(pointerEvent({ target: canvas })));
    mockPanningRef.current = true;
    act(() => document.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, bubbles: true })));
    expect(mockEndPan).toHaveBeenCalledOnce();
    expect(result.current.drawingRef.current).toBe(false);
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it.each(["pointerup", "pointercancel", "lostpointercapture", "blur"])(
    "finishes the owned glaze stroke on a document-level %s",
    (type) => {
      const dispatch = vi.fn();
      const canvasData = makeCvs();
      canvasData.levelData.fill(2);
      const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, dispatch })));
      const canvas = result.current.cursorCanvasRef.current!;
      mockCanvasRect(canvas);
      act(() => result.current.onDown(pointerEvent({ target: canvas })));
      act(() => {
        if (type === "blur") window.dispatchEvent(new Event("blur"));
        else document.dispatchEvent(new PointerEvent(type, { pointerId: 1, bubbles: true }));
      });
      expect(result.current.drawingRef.current).toBe(false);
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0][0].finalPixelCandidateOverrideMap[55]).toBeGreaterThan(0);
    },
  );

  it("finishes a missed glaze release before hover paints", () => {
    const dispatch = vi.fn();
    const canvasData = makeCvs();
    canvasData.levelData.fill(2);
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, dispatch })));
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);
    act(() => result.current.onDown(pointerEvent({ target: canvas })));
    act(() => result.current.onMove(pointerEvent({ target: canvas, buttons: 0, clientX: 280 })));
    expect(result.current.drawingRef.current).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("discards a pending glaze fill when the canvas is replaced", async () => {
    let resolveFill!: (value: { pixelCandidateOverrideMap: Uint8Array; changedIndices: Uint32Array; truncated: boolean }) => void;
    floodFillMocks.requestGlazeFill.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFill = resolve;
        }),
    );
    const dispatch = vi.fn();
    const originalCanvas = makeCvs();
    originalCanvas.levelData.fill(2);
    const replacementCanvas = makeCvs(8, 8);
    const { result, rerender } = renderHook(
      ({ canvasData }) => useGlazeDrawing(makeOpts({ canvasData, dispatch, glazeTool: "glaze_fill" })),
      { initialProps: { canvasData: originalCanvas } },
    );
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);

    act(() => {
      result.current.onDown(pointerEvent({ target: canvas }));
      result.current.onUp();
    });
    expect(result.current.drawingRef.current).toBe(true);

    rerender({ canvasData: replacementCanvas });
    expect(result.current.drawingRef.current).toBe(false);

    await act(async () => {
      resolveFill({
        pixelCandidateOverrideMap: new Uint8Array(100).fill(1),
        changedIndices: new Uint32Array([0]),
        truncated: false,
      });
      await Promise.resolve();
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(result.current.drawingRef.current).toBe(false);
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

  it.each(["replacement", "unmount"] as const)("discards a queued glaze render on canvas %s", (change) => {
    vi.useFakeTimers();
    try {
      const canvasData = makeCvs();
      canvasData.levelData.fill(2);
      const { result, rerender, unmount } = renderHook(({ canvasData }) => useGlazeDrawing(makeOpts({ canvasData })), {
        initialProps: { canvasData },
      });
      const canvas = result.current.cursorCanvasRef.current!;
      mockCanvasRect(canvas);
      act(() => {
        result.current.onDown(pointerEvent({ target: canvas }));
        result.current.onMove(pointerEvent({ target: canvas, clientX: 224 }));
      });
      vi.mocked(renderCanvasBuffers).mockClear();

      if (change === "replacement") rerender({ canvasData: makeCvs() });
      else unmount();
      act(() => vi.advanceTimersByTime(32));

      expect(renderCanvasBuffers).not.toHaveBeenCalled();
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    { glazeTool: "glaze_eraser" as const, brushSize: 1 },
    { glazeTool: "glaze_fill" as const, brushSize: 1 },
    { glazeTool: "glaze_brush" as const, brushSize: 5 },
  ])("keeps the active stroke parameters when controls change to $glazeTool at size $brushSize", (nextParams) => {
    const canvasData = makeCvs();
    canvasData.levelData.fill(2);
    const dispatch = vi.fn();
    const { result, rerender } = renderHook(
      ({ glazeTool, brushSize }: { glazeTool: GlazeToolId; brushSize: number }) =>
        useGlazeDrawing(makeOpts({ canvasData, dispatch, glazeTool, brushSize })),
      { initialProps: { glazeTool: "glaze_brush" as GlazeToolId, brushSize: 1 } },
    );
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);
    act(() => result.current.onDown(pointerEvent({ target: canvas })));
    rerender(nextParams);
    act(() => {
      result.current.onMove(pointerEvent({ target: canvas, clientX: 224 }));
      result.current.onUp();
    });

    expect(dispatch).toHaveBeenCalledTimes(1);
    const overrides = dispatch.mock.calls[0][0].finalPixelCandidateOverrideMap as Uint8Array;
    expect(overrides[5 * 10 + 5]).toBeGreaterThan(0);
    expect(overrides[5 * 10 + 6]).toBeGreaterThan(0);
    expect(overrides[6 * 10 + 6]).toBe(0);
  });

  it("paints a glaze override and dispatches a color-map diff", () => {
    const canvasData = makeCvs(10, 10);
    const centerIndex = 5 * 10 + 5;
    canvasData.levelData[centerIndex] = 2;
    const dispatch = vi.fn();
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, dispatch, brushSize: 1 })));
    const canvas = result.current.cursorCanvasRef.current!;
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
        finalPixelCandidateOverrideMap: expect.any(Uint8Array),
        diff: expect.objectContaining({
          indices: expect.any(Uint32Array),
          newPixelCandidateOverrideValues: expect.any(Uint8Array),
        }),
      }),
    );
    const action = dispatch.mock.calls[0][0];
    expect(action.finalPixelCandidateOverrideMap[centerIndex]).toBeGreaterThan(0);
    expect(Array.from(action.diff.indices)).toContain(centerIndex);
  });

  it("uses pen pressure for glaze brush size", () => {
    const canvasData = makeCvs(20, 20);
    canvasData.levelData.fill(2);
    const dispatch = vi.fn();
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, dispatch, brushSize: 10 })));
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);

    act(() => {
      result.current.onDown(
        pointerEvent({
          target: canvas,
          nativeEvent: { clientX: 160, clientY: 160, pointerType: "pen", pressure: 1 } as PointerEvent,
        }),
      );
    });
    act(() => {
      result.current.onUp();
    });

    const workingOverrideMap = dispatch.mock.calls[0][0].finalPixelCandidateOverrideMap as Uint8Array;
    expect(workingOverrideMap[10 * 20 + 16]).toBeGreaterThan(0);
  });

  it.each([
    { glazeTool: "glaze_brush" as GlazeToolId, initialPixelCandidateOverrideValue: 0, expectCenterChanged: true, expectEdgeChanged: true },
    {
      glazeTool: "glaze_eraser" as GlazeToolId,
      initialPixelCandidateOverrideValue: 2,
      expectCenterChanged: false,
      expectEdgeChanged: false,
    },
  ])(
    "clips a crossing $glazeTool stroke at the canvas edge when the pointer moves outside",
    ({ glazeTool, initialPixelCandidateOverrideValue, expectCenterChanged, expectEdgeChanged }) => {
      const canvasData = makeCvs(10, 10);
      canvasData.levelData.fill(2);
      canvasData.pixelCandidateOverrideMap.fill(initialPixelCandidateOverrideValue);
      const dispatch = vi.fn();
      const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, dispatch, glazeTool, brushSize: 1 })));
      const canvas = result.current.cursorCanvasRef.current!;
      mockCanvasRect(canvas);

      act(() => {
        result.current.onDown(pointerEvent({ target: canvas }));
      });
      act(() => {
        result.current.onMove(pointerEvent({ clientX: 400, clientY: 160, target: canvas }));
      });
      act(() => {
        result.current.onUp();
      });

      const workingOverrideMap = dispatch.mock.calls[0][0].finalPixelCandidateOverrideMap as Uint8Array;
      expect(workingOverrideMap?.[5 * 10 + 5] > 0).toBe(expectCenterChanged);
      expect(workingOverrideMap?.[5 * 10 + 9] > 0).toBe(expectEdgeChanged);
    },
  );

  it("keeps outside glaze brush movement from smearing along the nearest edge and connects on re-entry", () => {
    const canvasData = makeCvs(10, 10);
    canvasData.levelData.fill(2);
    const dispatch = vi.fn();
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, dispatch, brushSize: 1 })));
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);

    act(() => {
      result.current.onDown(pointerEvent({ clientX: 160, clientY: 256, target: canvas }));
    });
    act(() => {
      result.current.onMove(pointerEvent({ clientX: 160, clientY: -160, target: canvas }));
    });
    act(() => {
      result.current.onMove(pointerEvent({ clientX: 256, clientY: -160, target: canvas }));
    });
    act(() => {
      result.current.onMove(pointerEvent({ clientX: 256, clientY: 160, target: canvas }));
    });
    act(() => {
      result.current.onUp();
    });

    const workingOverrideMap = dispatch.mock.calls[0][0].finalPixelCandidateOverrideMap as Uint8Array;
    expect(workingOverrideMap[0 * 10 + 5]).toBeGreaterThan(0);
    expect(workingOverrideMap[0 * 10 + 6]).toBe(0);
    expect(workingOverrideMap[1 * 10 + 8]).toBeGreaterThan(0);
  });

  it("accumulates dirty rects while a glaze brush render frame is pending", () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    const cancelSpy = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});

    try {
      const canvasData = makeCvs(10, 10);
      canvasData.levelData.fill(2);
      const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, brushSize: 1 })));
      const canvas = result.current.cursorCanvasRef.current!;
      mockCanvasRect(canvas);

      act(() => {
        result.current.onDown(pointerEvent({ target: canvas }));
      });
      vi.mocked(renderCanvasBuffers).mockClear();

      act(() => {
        result.current.onMove(pointerEvent({ clientX: 192, clientY: 160, target: canvas }));
      });
      act(() => {
        result.current.onMove(pointerEvent({ clientX: 224, clientY: 160, target: canvas }));
      });

      expect(rafCallbacks).toHaveLength(1);
      expect(cancelSpy).not.toHaveBeenCalled();

      act(() => {
        rafCallbacks[0](0);
      });

      expect(renderCanvasBuffers).toHaveBeenCalledTimes(1);
      expect(vi.mocked(renderCanvasBuffers).mock.calls[0][7]).toEqual({ x: 5, y: 5, w: 3, h: 1 });
    } finally {
      rafSpy.mockRestore();
      cancelSpy.mockRestore();
    }
  });

  it.each([0, 7])("pickHue on achromatic level L%s announces an error", (level) => {
    const canvasData = makeCvs(10, 10);
    canvasData.levelData[0] = level;
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData })));
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);

    act(() => {
      result.current.pickHue(pointerEvent({ clientX: 0, clientY: 0, target: canvas }));
    });

    expect(mockAnnounce).toHaveBeenCalledWith("announce_hue_achromatic");
  });

  it("picks the exact model hue instead of reversing the RGB8 display color", () => {
    const canvasData = makeCvs(10, 10);
    canvasData.levelData[0] = 4;
    const candidateIndexByLevel = [0, 0, 0, 0, 2, 0, 0, 0];
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, candidateIndexByLevel })));
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);

    act(() => {
      result.current.pickHue(pointerEvent({ clientX: 0, clientY: 0, target: canvas }));
    });

    expect(mockSetHueAngle).toHaveBeenCalledWith(195);
    expect(mockAnnounce).toHaveBeenCalledWith("announce_hue_picked");
  });

  it("arms a background drag and starts a glaze brush only after entering the canvas", () => {
    mockZoomRef.current = 0.5;
    const canvasData = makeCvs(10, 10);
    canvasData.levelData.fill(2);
    const dispatch = vi.fn();
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, dispatch, brushSize: 1 })));
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);

    act(() => {
      result.current.onWorkspaceDown(pointerEvent({ clientX: 40, clientY: 160, target: canvas }));
    });

    expect(result.current.drawingRef.current).toBe(false);

    act(() => {
      result.current.onWorkspaceMove(pointerEvent({ clientX: 160, clientY: 160, target: canvas }));
    });
    act(() => {
      result.current.onUp();
    });

    const workingOverrideMap = dispatch.mock.calls[0][0].finalPixelCandidateOverrideMap as Uint8Array;
    expect(workingOverrideMap[5 * 10 + 0]).toBeGreaterThan(0);
    expect(workingOverrideMap[5 * 10 + 5]).toBeGreaterThan(0);
  });

  it("tracks the glaze cursor over checkerboard background without starting a stroke", () => {
    mockZoomRef.current = 0.5;
    const canvasData = makeCvs(10, 10);
    canvasData.levelData.fill(2);
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, brushSize: 1 })));
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);

    act(() => {
      result.current.onWorkspaceMove(pointerEvent({ clientX: 40, clientY: 160, target: canvas }));
    });

    expect(cursorOverlayMocks.trackCursor).toHaveBeenCalled();
    expect(cursorOverlayMocks.clearCursor).not.toHaveBeenCalled();
    expect(result.current.drawingRef.current).toBe(false);
  });

  it("clears the glaze cursor when the pointer leaves the workspace", () => {
    const canvasData = makeCvs(10, 10);
    canvasData.levelData.fill(2);
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData, brushSize: 1 })));
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);

    act(() => {
      result.current.onWorkspaceMove(pointerEvent({ clientX: -32, clientY: 160, target: canvas }));
    });

    expect(cursorOverlayMocks.trackCursor).not.toHaveBeenCalled();
    expect(cursorOverlayMocks.clearCursor).toHaveBeenCalled();
    expect(result.current.drawingRef.current).toBe(false);
  });

  it("ignores pickHue events that start on the checkerboard background", () => {
    mockZoomRef.current = 0.5;
    const canvasData = makeCvs(10, 10);
    canvasData.levelData[5 * 10 + 0] = 2;
    const { result } = renderHook(() => useGlazeDrawing(makeOpts({ canvasData })));
    const canvas = result.current.cursorCanvasRef.current!;
    mockCanvasRect(canvas);

    act(() => {
      result.current.pickHue(pointerEvent({ clientX: 40, clientY: 160, target: canvas }));
    });

    expect(mockSetHueAngle).not.toHaveBeenCalled();
    expect(mockAnnounce).not.toHaveBeenCalled();
  });
});
