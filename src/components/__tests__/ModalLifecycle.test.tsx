// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CropModal } from "../CropModal";
import { MapCanvas } from "../MapCanvas";

vi.mock("../../i18n", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Crop resize boundaries", () => {
  it.each([
    ["e", 80, 0, [50, 50, 150, 100]],
    ["w", -80, 0, [0, 50, 150, 100]],
    ["s", 0, 80, [50, 50, 100, 150]],
    ["n", 0, -80, [50, 0, 100, 150]],
    ["se", 80, 80, [50, 50, 150, 150]],
    ["nw", -80, -80, [0, 0, 150, 150]],
    ["e", -180, 0, [50, 50, 4, 100]],
    ["w", 180, 0, [146, 50, 4, 100]],
  ])("keeps the opposite edge fixed when %s overshoots", (mode, dx, dy, crop) => {
    HTMLElement.prototype.setPointerCapture ??= vi.fn();
    const onConfirm = vi.fn();
    render(<CropModal img={document.createElement("img")} imgW={200} imgH={200} onConfirm={onConfirm} onCancel={vi.fn()} />);
    for (let i = 0; i < 5; i++) {
      for (const [edge, key] of [
        ["w", "ArrowRight"],
        ["e", "ArrowLeft"],
        ["n", "ArrowDown"],
        ["s", "ArrowUp"],
      ]) {
        fireEvent.keyDown(screen.getByRole("group", { name: `crop_resize_${edge}_aria` }), { key, shiftKey: true });
      }
    }
    const handle = screen.getByRole("group", { name: `crop_resize_${mode}_aria` });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: dx, clientY: dy });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "btn_ok" }));
    expect(onConfirm).toHaveBeenCalledWith(...crop);
  });
});

describe("Map dialog lifecycle", () => {
  function map(active: boolean) {
    const values = new Float32Array(4);
    const props = {
      active,
      mode: "levelTone" as const,
      displayWidth: 200,
      displayHeight: 200,
      candidateIndexByLevel: new Array<number>(8).fill(0),
      canvasData: { width: 2, height: 2, levelData: new Uint8Array(4), pixelCandidateOverrideMap: new Uint8Array(4) },
      pixelMaps: {
        width: 2,
        height: 2,
        neighborIsolation: values,
        boundaryDistance: values,
        gradientAngle: values,
        gradientMagnitude: values,
        regionId: new Int32Array(4),
        edgeMask: new Uint8Array(4),
        levelTone: values,
        localDiversity: values,
      },
    };
    return <MapCanvas {...props} />;
  }

  it.each([400, 1000])("closes the save dialog and cancels pending long press on departure after %i ms", (delay) => {
    vi.useFakeTimers();
    const view = render(map(true));
    fireEvent.pointerDown(view.container.querySelector("canvas")!, { pointerType: "touch", pointerId: 1, clientX: 10, clientY: 10 });
    act(() => vi.advanceTimersByTime(delay));
    if (delay === 1000) expect(screen.getByRole("dialog")).toBeTruthy();
    view.rerender(map(false));
    act(() => vi.advanceTimersByTime(1200));
    expect(screen.queryByRole("dialog")).toBeNull();
    view.rerender(map(true));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("clears a pending long press on unmount", () => {
    vi.useFakeTimers();
    const view = render(map(true));
    const timers = vi.spyOn(globalThis, "setTimeout");
    const cancelTimer = vi.spyOn(globalThis, "clearTimeout");
    fireEvent.pointerDown(view.container.querySelector("canvas")!, { pointerType: "touch", pointerId: 1 });
    const timerIndex = timers.mock.calls.findIndex(([, delay]) => delay === 1000);
    expect(timerIndex).toBeGreaterThanOrEqual(0);
    const longPressTimer = timers.mock.results[timerIndex].value;
    view.unmount();
    expect(cancelTimer).toHaveBeenCalledWith(longPressTimer);
  });
});
