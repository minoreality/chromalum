// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutomataCanvas } from "../AutomataCanvas";
import { useAutomataState } from "../useAutomataState";
import { evolvePlane } from "../model";

function Harness({ active }: { active: boolean }) {
  const controller = useAutomataState();
  return (
    <>
      <AutomataCanvas
        active={active}
        controller={controller}
        board={evolvePlane(controller.state.seed, 49, controller.state.time, controller.state.rule)}
        label="CA board"
        description="Arrows select. Enter paints."
      />
      <button onClick={() => controller.dispatch({ type: "set-time", time: 1 })}>step</button>
    </>
  );
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("AutomataCanvas", () => {
  it("does not measure or draw while hidden and redraws when shown", () => {
    const context = document.createElement("canvas").getContext("2d")!;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
      Object.defineProperty(context, "canvas", { value: this, configurable: true });
      return context;
    });
    const paint = vi.spyOn(context, "fillRect");
    const measure = vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 245, 245));
    const observe = vi.fn(),
      disconnect = vi.fn();
    const Observer = vi.fn(function () {
      return { observe, disconnect };
    });
    vi.stubGlobal("ResizeObserver", Observer);
    const { rerender } = render(<Harness active={false} />);
    expect(measure).not.toHaveBeenCalled();
    expect(paint).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
    rerender(<Harness active={true} />);
    expect(observe).toHaveBeenCalledTimes(1);
    expect(paint.mock.calls.length).toBeGreaterThanOrEqual(2401);
    const canvas = screen.getByRole("application") as HTMLCanvasElement;
    expect([canvas.width, canvas.height]).toEqual([245, 245]);
    const backing = [canvas.width, canvas.height];
    fireEvent.click(screen.getByRole("button", { name: "step" }));
    expect(screen.getByRole("application")).toBe(canvas);
    expect([canvas.width, canvas.height]).toEqual(backing);
    rerender(<Harness active={false} />);
    const count = paint.mock.calls.length,
      measures = measure.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "step" }));
    expect(paint.mock.calls.length).toBe(count);
    expect(measure.mock.calls.length).toBe(measures);
    expect(disconnect).toHaveBeenCalled();
    rerender(<Harness active={true} />);
    expect(paint.mock.calls.length).toBeGreaterThan(count);
  });
  it("does not draw a zero-width plane", () => {
    const context = document.createElement("canvas").getContext("2d")!;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    const paint = vi.spyOn(context, "fillRect");
    vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 0, 0));
    render(<Harness active={true} />);
    expect(paint).not.toHaveBeenCalled();
  });
});
