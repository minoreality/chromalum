// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { classifyWheelDevice, usePanZoom, wheelDeltaPx } from "../usePanZoom";
import type { CanvasData } from "../../types";
import { MOUSE_NOTCH_PX, WHEEL_LINE_PX, WHEEL_PAGE_PX, ZOOM_MAX, ZOOM_MIN, ZOOM_PINCH_RATE, ZOOM_STEP } from "../../constants";

function makeMocks() {
  const canvasData: CanvasData = {
    width: 320,
    height: 320,
    levelData: new Uint8Array(320 * 320),
    pixelCandidateOverrideMap: new Uint8Array(320 * 320),
  };
  const displayWidth = 320;
  const scheduleCursorRedrawRef = { current: null as (() => void) | null };
  return { canvasData, displayWidth, scheduleCursorRedrawRef };
}

describe("usePanZoom", () => {
  function makeFakePointerEvent(overrides?: Partial<React.PointerEvent> & { rect?: Partial<DOMRect> }): React.PointerEvent {
    const rect = {
      left: 0,
      top: 0,
      width: 320,
      height: 320,
      right: 320,
      bottom: 320,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...overrides?.rect,
    } as DOMRect;
    return {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      preventDefault: vi.fn(),
      target: { setPointerCapture: vi.fn() },
      currentTarget: { getBoundingClientRect: () => rect },
      ...overrides,
    } as unknown as React.PointerEvent;
  }

  function focusAtViewportPoint(point: { x: number; y: number }, zoom: number, pan: { x: number; y: number }, canvasData: CanvasData) {
    return {
      x: (point.x - 0.5) / zoom + 0.5 - pan.x / canvasData.width,
      y: (point.y - 0.5) / zoom + 0.5 - pan.y / canvasData.height,
    };
  }

  function makeWheelEvent(overrides?: Partial<WheelEvent> & { rect?: Partial<DOMRect> }): WheelEvent {
    const rect = {
      left: 0,
      top: 0,
      width: 320,
      height: 320,
      right: 320,
      bottom: 320,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...overrides?.rect,
    } as DOMRect;
    return {
      deltaX: 0,
      deltaY: -MOUSE_NOTCH_PX,
      deltaMode: 0,
      ctrlKey: false,
      metaKey: false,
      clientX: 160,
      clientY: 160,
      preventDefault: vi.fn(),
      currentTarget: { getBoundingClientRect: () => rect },
      ...overrides,
    } as unknown as WheelEvent;
  }

  it("initial zoom is 1", () => {
    const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
    const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));
    expect(result.current.zoom).toBe(1);
  });

  it("initial pan is {x:0, y:0}", () => {
    const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
    const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));
    expect(result.current.pan).toEqual({ x: 0, y: 0 });
  });

  it("initial cursorMode is null", () => {
    const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
    const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));
    expect(result.current.cursorMode).toBeNull();
  });

  it("setZoom changes zoom", () => {
    const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
    const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));
    act(() => {
      result.current.setZoom(2);
    });
    expect(result.current.zoom).toBe(2);
  });

  it("setPan changes pan", () => {
    const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
    const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));
    act(() => {
      result.current.setPan({ x: 10, y: 20 });
    });
    expect(result.current.pan).toEqual({ x: 10, y: 20 });
  });

  it("setPan with same values does not cause new reference (equality check)", () => {
    const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
    const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

    act(() => {
      result.current.setPan({ x: 5, y: 10 });
    });
    const ref1 = result.current.pan;

    // Set to same values
    act(() => {
      result.current.setPan({ x: 5, y: 10 });
    });
    const ref2 = result.current.pan;

    // Should be the same reference due to equality optimization
    expect(ref2).toBe(ref1);
  });

  it("setPan with function updater works", () => {
    const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
    const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

    act(() => {
      result.current.setPan({ x: 5, y: 10 });
    });
    act(() => {
      result.current.setPan((prev) => ({ x: prev.x + 1, y: prev.y + 2 }));
    });
    expect(result.current.pan).toEqual({ x: 6, y: 12 });
  });

  it("setPan clamps every update, including a run of relative steps", () => {
    const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
    const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

    act(() => {
      result.current.setPan({ x: 10_000, y: -10_000 });
    });
    expect(result.current.pan).toEqual({ x: canvasData.width, y: -canvasData.height });

    // The shape the arrow keys arrive in: Source, Color and Glaze each step the
    // pan by 10 a press and none of them bounded the result themselves.
    act(() => {
      result.current.setPan({ x: 0, y: 0 });
    });
    act(() => {
      for (let press = 0; press < 60; press++) result.current.setPan((p) => ({ ...p, x: p.x + 10 }));
    });
    expect(result.current.panRef.current.x).toBe(canvasData.width);
    expect(result.current.pan.x).toBe(canvasData.width);
  });

  it("refs are exposed and initialized", () => {
    const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
    const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));
    expect(result.current.panningRef.current).toBe(false);
    expect(result.current.spaceRef.current).toBe(false);
    expect(result.current.panStartRef.current).toEqual({ x: 0, y: 0 });
    expect(result.current.panOriginRef.current).toEqual({ x: 0, y: 0 });
  });

  it("clears transient pan state when pan-zoom mode is disabled", () => {
    const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
    const scheduleCursorRedraw = vi.fn();
    scheduleCursorRedrawRef.current = scheduleCursorRedraw;
    const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

    act(() => {
      result.current.setPanZoomMode(true);
      result.current.setCursorMode("grab");
      result.current.panningRef.current = true;
      result.current.spaceRef.current = true;
    });
    act(() => {
      result.current.setPanZoomMode((prev) => !prev);
    });

    expect(result.current.panZoomMode).toBe(false);
    expect(result.current.cursorMode).toBeNull();
    expect(result.current.panningRef.current).toBe(false);
    expect(result.current.spaceRef.current).toBe(false);
    expect(scheduleCursorRedraw).toHaveBeenCalled();
  });

  it("movePan clamps pan to canvas bounds and schedules cursor redraw", () => {
    const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
    let scheduledPan: { x: number; y: number } | null = null;
    let readCurrentPan: (() => { x: number; y: number }) | null = null;
    const scheduleCursorRedraw = vi.fn(() => {
      scheduledPan = readCurrentPan?.() ?? null;
    });
    scheduleCursorRedrawRef.current = scheduleCursorRedraw;
    const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));
    readCurrentPan = () => result.current.panRef.current;

    act(() => {
      result.current.startPan(makeFakePointerEvent({ clientX: 0, clientY: 0 }));
    });
    act(() => {
      result.current.movePan(makeFakePointerEvent({ clientX: 10_000, clientY: -10_000 }));
    });

    expect(result.current.pan).toEqual({ x: canvasData.width, y: -canvasData.height });
    expect(scheduledPan).toEqual({ x: canvasData.width, y: -canvasData.height });
    expect(scheduleCursorRedraw).toHaveBeenCalled();
  });

  describe("onWheel", () => {
    it("zooms in and out around the pointer", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const scheduleCursorRedraw = vi.fn();
      scheduleCursorRedrawRef.current = scheduleCursorRedraw;
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      act(() => {
        result.current.onWheel(makeWheelEvent({ deltaY: -100 }));
      });
      expect(result.current.zoom).toBeGreaterThan(1);

      act(() => {
        result.current.onWheel(makeWheelEvent({ deltaY: 100 }));
      });
      expect(result.current.zoom).toBeCloseTo(1);
      expect(scheduleCursorRedraw).toHaveBeenCalled();
    });

    it("clamps wheel zoom to configured min and max", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      act(() => {
        result.current.setZoom(ZOOM_MAX / 1.01);
      });
      act(() => {
        result.current.onWheel(makeWheelEvent({ deltaY: -100 }));
      });
      expect(result.current.zoom).toBe(ZOOM_MAX);

      act(() => {
        result.current.setZoom(ZOOM_MIN * 1.01);
      });
      act(() => {
        result.current.onWheel(makeWheelEvent({ deltaY: 100 }));
      });
      expect(result.current.zoom).toBe(ZOOM_MIN);
    });

    it("zooms by distance travelled, not by event count", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      // Two notches must land on ZOOM_STEP squared, not on whatever a per-event
      // factor would give. A pinch splits the same travel over dozens of events.
      act(() => {
        result.current.onWheel(makeWheelEvent({ deltaY: -MOUSE_NOTCH_PX }));
        result.current.onWheel(makeWheelEvent({ deltaY: -MOUSE_NOTCH_PX }));
      });
      expect(result.current.zoom).toBeCloseTo(ZOOM_STEP * ZOOM_STEP, 5);
    });

    it("accumulates a pinch over its whole gesture, not per event", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      // A trackpad pinch: ctrlKey set, twenty sub-notch deltas covering 100px.
      act(() => {
        for (let i = 0; i < 20; i++) result.current.onWheel(makeWheelEvent({ deltaY: -5, ctrlKey: true }));
      });
      expect(result.current.zoom).toBeCloseTo(Math.exp(100 * ZOOM_PINCH_RATE), 5);
    });

    it("pans with a two-finger scroll and leaves zoom alone", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      // displayWidth === canvasData.width, so scale is 1 and deltas are canvas px.
      act(() => {
        result.current.onWheel(makeWheelEvent({ deltaX: -4, deltaY: -12 }));
      });
      // Fingers up report a negative deltaY and scroll the view up, so the canvas
      // under it moves down — against the fingers, as a scrolling document does.
      expect(result.current.pan).toEqual({ x: 4, y: 12 });
      expect(result.current.zoom).toBe(1);
    });

    it("holds a gesture's device when one delta happens to match a notch", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      // A fast flick can land on an exact notch value mid-scroll; that must not
      // turn one frame of the same gesture into a zoom.
      act(() => {
        result.current.onWheel(makeWheelEvent({ deltaY: -12 }));
        result.current.onWheel(makeWheelEvent({ deltaY: -MOUSE_NOTCH_PX }));
      });
      expect(result.current.zoom).toBe(1);
      expect(result.current.pan).toEqual({ x: 0, y: 12 + MOUSE_NOTCH_PX });
    });

    it("classifies the pointing device from one wheel event", () => {
      const mouse = { deltaX: 0, deltaY: -MOUSE_NOTCH_PX, deltaMode: 0 };
      expect(classifyWheelDevice(mouse, "trackpad")).toBe("mouse");
      expect(classifyWheelDevice({ deltaX: 0, deltaY: -3, deltaMode: 1 }, "trackpad")).toBe("mouse");
      expect(classifyWheelDevice({ deltaX: 0, deltaY: -12, deltaMode: 0 }, "mouse")).toBe("trackpad");
      expect(classifyWheelDevice({ deltaX: 0, deltaY: -100.5, deltaMode: 0 }, "mouse")).toBe("trackpad");
      expect(classifyWheelDevice({ deltaX: -2, deltaY: 0, deltaMode: 0 }, "mouse")).toBe("trackpad");
      // A pure zero says nothing, so the sticky value survives it.
      expect(classifyWheelDevice({ deltaX: 0, deltaY: 0, deltaMode: 0 }, "trackpad")).toBe("trackpad");
      expect(classifyWheelDevice({ deltaX: 0, deltaY: 0, deltaMode: 0 }, "mouse")).toBe("mouse");
    });

    it("normalises line and page wheel deltas to pixels", () => {
      expect(wheelDeltaPx(-100, 0)).toBe(-100);
      expect(wheelDeltaPx(-3, 1)).toBe(-3 * WHEEL_LINE_PX);
      expect(wheelDeltaPx(-1, 2)).toBe(-WHEEL_PAGE_PX);
      expect(wheelDeltaPx(-100, undefined)).toBe(-100);
    });

    it("clamps wheel-generated pan to canvas bounds", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      act(() => {
        result.current.setPan({ x: 10_000, y: -10_000 });
      });
      act(() => {
        result.current.onWheel(makeWheelEvent({ deltaY: -100, clientX: 0, clientY: 320 }));
      });

      expect(result.current.pan.x).toBeGreaterThanOrEqual(-canvasData.width);
      expect(result.current.pan.x).toBeLessThanOrEqual(canvasData.width);
      expect(result.current.pan.y).toBeGreaterThanOrEqual(-canvasData.height);
      expect(result.current.pan.y).toBeLessThanOrEqual(canvasData.height);
    });
  });

  describe("pinch handlers", () => {
    it("uses one pointer as pan input and clamps the result", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      act(() => {
        result.current.onPinchDown(makeFakePointerEvent({ pointerId: 1, clientX: 0, clientY: 0 }));
      });
      expect(result.current.panningRef.current).toBe(true);

      act(() => {
        result.current.onPinchMove(makeFakePointerEvent({ pointerId: 1, clientX: 10_000, clientY: 10_000 }));
      });
      expect(result.current.pan).toEqual({ x: canvasData.width, y: canvasData.height });

      act(() => {
        result.current.onPinchUp(makeFakePointerEvent({ pointerId: 1 }));
      });
      expect(result.current.panningRef.current).toBe(false);
    });

    it("pinch-zooms with two pointers and resumes pan when one remains", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      act(() => {
        result.current.onPinchDown(makeFakePointerEvent({ pointerId: 1, clientX: 0, clientY: 0 }));
        result.current.onPinchDown(makeFakePointerEvent({ pointerId: 2, clientX: 0, clientY: 100 }));
      });
      expect(result.current.panningRef.current).toBe(false);

      act(() => {
        result.current.onPinchMove(makeFakePointerEvent({ pointerId: 2, clientX: 0, clientY: 200 }));
      });
      expect(result.current.zoom).toBe(2);

      act(() => {
        result.current.onPinchUp(makeFakePointerEvent({ pointerId: 2 }));
      });
      expect(result.current.panningRef.current).toBe(true);
    });

    it("pans with two pointers when the pinch center moves", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const scheduleCursorRedraw = vi.fn();
      scheduleCursorRedrawRef.current = scheduleCursorRedraw;
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      act(() => {
        result.current.onPinchDown(makeFakePointerEvent({ pointerId: 1, clientX: 100, clientY: 100 }));
        result.current.onPinchDown(makeFakePointerEvent({ pointerId: 2, clientX: 200, clientY: 100 }));
      });

      act(() => {
        result.current.onPinchMove(makeFakePointerEvent({ pointerId: 1, clientX: 140, clientY: 130 }));
        result.current.onPinchMove(makeFakePointerEvent({ pointerId: 2, clientX: 240, clientY: 130 }));
      });

      expect(result.current.zoom).toBeCloseTo(1);
      expect(result.current.pan).toEqual({ x: 40, y: 30 });
      expect(scheduleCursorRedraw).toHaveBeenCalled();
    });

    it("keeps the pinch focal point stable near the canvas edge", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));
      const startCenter = { x: 280 / displayWidth, y: 160 / displayWidth };

      act(() => {
        result.current.setPan({ x: 40, y: 0 });
      });
      const startFocus = focusAtViewportPoint(startCenter, result.current.zoom, result.current.pan, canvasData);

      act(() => {
        result.current.onPinchDown(makeFakePointerEvent({ pointerId: 1, clientX: 260, clientY: 160 }));
        result.current.onPinchDown(makeFakePointerEvent({ pointerId: 2, clientX: 300, clientY: 160 }));
      });
      act(() => {
        result.current.onPinchMove(makeFakePointerEvent({ pointerId: 1, clientX: 240, clientY: 160 }));
        result.current.onPinchMove(makeFakePointerEvent({ pointerId: 2, clientX: 320, clientY: 160 }));
      });

      expect(result.current.zoom).toBe(2);
      const endFocus = focusAtViewportPoint(startCenter, result.current.zoom, result.current.pan, canvasData);
      expect(endFocus.x).toBeCloseTo(startFocus.x);
      expect(endFocus.y).toBeCloseTo(startFocus.y);
    });
  });

  /* ---------- handleMiddleDown ---------- */

  describe("handleMiddleDown", () => {
    it("first middle-click starts pan (delegates to startPan)", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      act(() => {
        result.current.handleMiddleDown(makeFakePointerEvent({ button: 1 }));
      });

      expect(result.current.panningRef.current).toBe(true);
    });

    it("double middle-click within 400ms resets zoom and pan", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      // Set non-default zoom/pan
      act(() => {
        result.current.setZoom(3);
        result.current.setPan({ x: 50, y: 50 });
      });
      expect(result.current.zoom).toBe(3);

      // First middle-click
      act(() => {
        result.current.handleMiddleDown(makeFakePointerEvent({ button: 1 }));
      });
      // End pan (simulate pointer up)
      act(() => {
        result.current.endPan();
      });

      // Second middle-click quickly
      act(() => {
        result.current.handleMiddleDown(makeFakePointerEvent({ button: 1 }));
      });

      expect(result.current.zoom).toBe(1);
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
      // Should NOT start panning after reset
      expect(result.current.panningRef.current).toBe(false);
    });

    it("two middle-clicks spaced > 400ms apart both start pan", () => {
      const { canvasData, displayWidth, scheduleCursorRedrawRef } = makeMocks();
      const { result } = renderHook(() => usePanZoom(canvasData, displayWidth, scheduleCursorRedrawRef));

      act(() => {
        result.current.setZoom(2);
        result.current.setPan({ x: 10, y: 10 });
      });

      // First click
      act(() => {
        result.current.handleMiddleDown(makeFakePointerEvent({ button: 1 }));
      });
      act(() => {
        result.current.endPan();
      });

      // Simulate 500ms delay by mocking performance.now
      const origNow = performance.now;
      let offset = 0;
      vi.spyOn(performance, "now").mockImplementation(() => origNow.call(performance) + offset);
      offset = 500;

      // Second click after delay — should NOT reset
      act(() => {
        result.current.handleMiddleDown(makeFakePointerEvent({ button: 1 }));
      });

      expect(result.current.zoom).toBe(2);
      expect(result.current.panningRef.current).toBe(true);

      vi.restoreAllMocks();
    });
  });
});
