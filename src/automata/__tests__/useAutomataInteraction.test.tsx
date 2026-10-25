// @vitest-environment jsdom
import { useMemo, useRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPlaneGeometry } from "../geometry";
import { useAutomataInteraction } from "../useAutomataInteraction";
import { useAutomataState } from "../useAutomataState";
import { loadAutomataState } from "../persistence";

function Harness({ active = true, size = 245 }: { active?: boolean; size?: number }) {
  const controller = useAutomataState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geometry = useMemo(() => getPlaneGeometry(size, 1), [size]);
  const { cancelInteraction, ...handlers } = useAutomataInteraction({ canvasRef, active, controller, geometry });
  return (
    <>
      <canvas ref={canvasRef} role="application" tabIndex={0} onBlur={cancelInteraction} {...handlers} />
      <output data-testid="seed">{Array.from(controller.state.seed).join("")}</output>
      <output data-testid="selected">
        {controller.state.x},{controller.state.y},{controller.state.time}
      </output>
      <button onClick={() => controller.dispatch({ type: "set-color", color: 0 })}>K</button>
      <button onClick={() => controller.dispatch({ type: "set-color", color: 4 })}>G</button>
      <button onClick={() => controller.dispatch({ type: "set-time", time: 1 })}>time</button>
      <button onClick={() => controller.dispatch({ type: "set-rule", rule: "life" })}>rule</button>
      <button onClick={() => controller.dispatch({ type: "set-preset", preset: "white" })}>preset</button>
    </>
  );
}
const seed = () => screen.getByTestId("seed").textContent!;
const pointer = (x: number, y: number, extra: PointerEventInit = {}) => ({
  pointerId: 1,
  isPrimary: true,
  pointerType: "mouse",
  button: 0,
  buttons: 1,
  clientX: x * 5 + 2.5,
  clientY: y * 5 + 2.5,
  ...extra,
});
beforeEach(() => {
  localStorage.setItem(
    "chromalum-automata-state-v1",
    JSON.stringify({ version: 1, seed: Array(2401).fill(0), rule: 4, preset: "black", time: 0, x: 0, y: 0, color: 2 }),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 245, 245));
  Object.defineProperties(HTMLCanvasElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    releasePointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: () => true },
  });
});
afterEach(() => vi.restoreAllMocks());
describe("Automata pointer interaction", () => {
  it("paints the clicked cell and erases it with black", () => {
    render(<Harness />);
    const canvas = screen.getByRole("application");
    fireEvent.pointerDown(canvas, pointer(1, 0));
    fireEvent.pointerUp(canvas, pointer(1, 0, { buttons: 0 }));
    expect(seed().slice(0, 3)).toBe("020");
    fireEvent.click(screen.getByRole("button", { name: "K" }));
    fireEvent.pointerDown(canvas, pointer(1, 0));
    fireEvent.pointerUp(canvas, pointer(1, 0, { buttons: 0 }));
    expect(seed().slice(0, 3)).toBe("000");
  });
  it("fills gaps and resumes after outside motion without drawing a bridge", () => {
    render(<Harness />);
    const canvas = screen.getByRole("application");
    fireEvent.pointerDown(canvas, pointer(0, 0));
    fireEvent.pointerMove(canvas, pointer(4, 0));
    expect(seed().slice(0, 5)).toBe("22222");
    fireEvent.pointerMove(canvas, pointer(50, 0));
    fireEvent.pointerMove(canvas, pointer(8, 0));
    fireEvent.pointerUp(canvas, pointer(8, 0, { buttons: 0 }));
    expect(seed().slice(0, 9)).toBe("222220002");
    expect(screen.getByTestId("selected").textContent).toBe("8,0,0");
  });
  it("selects results without editing the seed", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "time" }));
    const canvas = screen.getByRole("application");
    const before = seed();
    fireEvent.pointerDown(canvas, pointer(4, 5));
    fireEvent.pointerMove(canvas, pointer(7, 8));
    fireEvent.pointerUp(canvas, pointer(7, 8, { buttons: 0 }));
    expect(seed()).toBe(before);
    expect(screen.getByTestId("selected").textContent).toBe("7,8,1");
  });
  it("ignores non-primary buttons and a second finger's lifecycle", () => {
    render(<Harness />);
    const canvas = screen.getByRole("application");
    fireEvent.pointerDown(canvas, pointer(0, 0, { button: 2, buttons: 2 }));
    expect(seed()[0]).toBe("0");
    fireEvent.pointerDown(canvas, pointer(0, 0, { pointerType: "touch" }));
    for (const kind of ["pointerdown", "pointerup", "pointercancel", "lostpointercapture"]) {
      fireEvent(
        canvas,
        new PointerEvent(kind, { ...pointer(10, 0, { pointerType: "touch", pointerId: 2, isPrimary: false }), bubbles: true }),
      );
    }
    fireEvent.pointerMove(canvas, pointer(4, 0, { pointerType: "touch" }));
    fireEvent.pointerUp(canvas, pointer(4, 0, { pointerType: "touch", buttons: 0 }));
    expect(seed().slice(0, 5)).toBe("22222");
  });
  it.each(["release", "cancel", "lostcapture", "blur", "inactive", "time", "rule", "preset", "G", "resize", "buttons"])(
    "never resumes after %s",
    (reason) => {
      const { rerender } = render(<Harness />);
      const canvas = screen.getByRole("application");
      fireEvent.pointerDown(canvas, pointer(0, 0));
      expect(seed()[0]).toBe("2");
      if (reason === "release") fireEvent.pointerUp(canvas, pointer(0, 0, { buttons: 0 }));
      else if (reason === "cancel") fireEvent.pointerCancel(canvas, pointer(0, 0));
      else if (reason === "lostcapture") fireEvent.lostPointerCapture(canvas, pointer(0, 0));
      else if (reason === "blur") fireEvent(window, new Event("blur"));
      else if (reason === "inactive") rerender(<Harness active={false} />);
      else if (reason === "resize") rerender(<Harness size={196} />);
      else if (reason === "buttons") fireEvent.pointerMove(canvas, pointer(1, 0, { buttons: 0 }));
      else fireEvent.click(screen.getByRole("button", { name: reason }));
      const before = seed();
      fireEvent.pointerMove(canvas, pointer(4, 0));
      expect(seed()).toBe(before);
      expect(Array.from(loadAutomataState().state.seed).join("")).toBe(before);
    },
  );
  it("owns arrow selection and paint keys only without modifiers", () => {
    render(<Harness />);
    const canvas = screen.getByRole("application");
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "ArrowLeft" });
    expect(screen.getByTestId("selected").textContent).toBe("0,0,0");
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(seed().slice(0, 3)).toBe("020");
    fireEvent.keyDown(canvas, { key: "ArrowDown", altKey: true });
    expect(screen.getByTestId("selected").textContent).toBe("1,0,0");
    fireEvent.keyDown(canvas, { key: " " });
    fireEvent.click(screen.getByRole("button", { name: "time" }));
    const before = seed();
    fireEvent.keyDown(canvas, { key: "ArrowDown" });
    fireEvent.keyDown(canvas, { key: "Enter" });
    fireEvent.keyDown(canvas, { key: " " });
    expect(seed()).toBe(before);
    expect(screen.getByTestId("selected").textContent).toBe("1,1,1");
  });
});
