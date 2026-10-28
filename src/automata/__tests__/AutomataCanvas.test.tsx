// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutomataCanvas } from "../AutomataCanvas";
import { useAutomataState } from "../useAutomataState";
import { evolvePlane } from "../model";
import { loadAutomataState } from "../persistence";

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
  it("moves one cell outline before drawing without repainting or saving the board", () => {
    localStorage.setItem(
      "chromalum-flow-state-v1",
      JSON.stringify({ version: 1, seed: Array(2401).fill(0), rule: 4, preset: "black", time: 0, x: 0, y: 0, color: 2 }),
    );
    const context = document.createElement("canvas").getContext("2d")!;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
      Object.defineProperty(context, "canvas", { value: this, configurable: true });
      return context;
    });
    const paint = vi.spyOn(context, "fillRect");
    const bakedOutline = vi.spyOn(context, "strokeRect");
    vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 245, 245));
    render(<Harness active={true} />);
    const canvas = screen.getByRole("application");
    const before = localStorage.getItem("chromalum-flow-state-v1");
    const painted = paint.mock.calls.length;
    fireEvent.pointerMove(canvas, { clientX: 27.5, clientY: 37.5, pointerType: "mouse", isPrimary: true, buttons: 0 });
    const outline = canvas.parentElement!.querySelector<HTMLElement>(".automata-cell-cursor");
    expect(outline).not.toBeNull();
    expect(parseFloat(outline!.style.left)).toBeCloseTo((5 * 100) / 49);
    expect(parseFloat(outline!.style.top)).toBeCloseTo((7 * 100) / 49);
    expect(localStorage.getItem("chromalum-flow-state-v1")).toBe(before);
    expect(paint.mock.calls.length).toBe(painted);
    expect(bakedOutline).not.toHaveBeenCalled();
    act(() => canvas.focus());
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    fireEvent.keyUp(canvas, { key: "ArrowRight" });
    expect(parseFloat(outline!.style.left)).toBeCloseTo(100 / 49);
    expect(outline!.style.top).toBe("0%");
    fireEvent.keyDown(canvas, { key: "7" });
    expect(loadAutomataState().state.seed[1]).toBe(7);
    expect(canvas.parentElement!.querySelectorAll(".automata-cell-cursor")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "step" }));
    expect(canvas.parentElement!.querySelector(".automata-cell-cursor")).toBeNull();
    expect(bakedOutline).toHaveBeenCalled();
  });
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
