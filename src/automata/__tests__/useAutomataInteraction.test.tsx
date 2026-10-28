// @vitest-environment jsdom
import { useMemo, useRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPlaneGeometry } from "../geometry";
import { useAutomataInteraction } from "../useAutomataInteraction";
import { useAutomataState } from "../useAutomataState";
import { loadAutomataState } from "../persistence";

function Harness({ active = true, size = 245, editable }: { active?: boolean; size?: number; editable?: boolean }) {
  const controller = useAutomataState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geometry = useMemo(() => getPlaneGeometry(size, 1), [size]);
  const {
    cancelInteraction: _cancelInteraction,
    cursorCell: _cursorCell,
    ...handlers
  } = useAutomataInteraction({
    canvasRef,
    active,
    controller,
    geometry,
    editable,
  });
  return (
    <>
      <canvas ref={canvasRef} role="application" tabIndex={0} {...handlers} />
      <output data-testid="seed">{Array.from(controller.state.seed).join("")}</output>
      <output data-testid="color">{controller.state.color}</output>
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
    "chromalum-flow-state-v1",
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
describe("Automata numeric drawing", () => {
  beforeEach(() => {
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => screen.queryByRole("application")),
    });
  });
  it("selects and stamps all eight colors at the keyboard cursor, including black to erase", () => {
    render(<Harness />);
    const canvas = screen.getByRole("application");
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    for (const color of [7, 0, 1, 2, 3, 4, 5, 6, 7]) {
      fireEvent.keyDown(canvas, { key: String(color) });
      expect(seed().slice(0, 3)).toBe(`0${color}0`);
      expect(screen.getByTestId("color").textContent).toBe(String(color));
      expect(loadAutomataState().state.seed[1]).toBe(color);
    }
  });
  it("stamps a hovered cell without a click, then follows arrow selection and renewed pointer motion", () => {
    render(<Harness editable={true} />);
    fireEvent.click(screen.getByRole("button", { name: "time" }));
    const canvas = screen.getByRole("application");
    fireEvent.pointerMove(canvas, pointer(2, 0, { buttons: 0 }));
    fireEvent.keyDown(document.body, { key: "4", code: "Numpad4" });
    expect(seed().slice(0, 5)).toBe("00400");
    expect(document.activeElement).toBe(canvas);
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    fireEvent.keyDown(canvas, { key: "5" });
    expect(seed().slice(0, 5)).toBe("00450");
    fireEvent.pointerMove(canvas, pointer(6, 0, { buttons: 0 }));
    fireEvent.keyDown(canvas, { key: "1" });
    expect(seed().slice(0, 8)).toBe("00450010");
    expect(loadAutomataState().state.time).toBe(1);
  });
  it.each(["leave", "covered", "blur", "inactive"])("discards the pointer target after %s", (reason) => {
    const { rerender } = render(<Harness />);
    const canvas = screen.getByRole("application");
    canvas.focus();
    fireEvent.pointerMove(canvas, pointer(2, 0, { buttons: 0 }));
    if (reason === "leave") fireEvent.pointerLeave(canvas);
    else if (reason === "covered") vi.mocked(document.elementFromPoint).mockReturnValue(document.body);
    else if (reason === "blur") fireEvent(window, new Event("blur"));
    else rerender(<Harness active={false} />);
    fireEvent.keyDown(canvas, { key: "7" });
    expect(seed()).toBe("0".repeat(2401));
    expect(screen.getByTestId("color").textContent).toBe("2");
  });
  it.each(["result", "later-generation"])("keeps %s read-only for both pointer and keyboard targets", (kind) => {
    render(<Harness {...(kind === "result" ? { editable: false } : {})} />);
    if (kind === "later-generation") fireEvent.click(screen.getByRole("button", { name: "time" }));
    const canvas = screen.getByRole("application");
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "7" });
    fireEvent.pointerMove(canvas, pointer(2, 0, { buttons: 0 }));
    fireEvent.keyDown(canvas, { key: "7" });
    expect(seed()).toBe("0".repeat(2401));
    expect(screen.getByTestId("color").textContent).toBe("2");
  });
  it("keeps the keyboard target when scrolling causes a pointer leave without pointer motion", () => {
    render(<Harness />);
    const canvas = screen.getByRole("application");
    canvas.focus();
    fireEvent.pointerMove(canvas, pointer(2, 0, { buttons: 0 }));
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    fireEvent.pointerLeave(canvas);
    fireEvent.keyDown(canvas, { key: "7" });
    expect(seed().slice(0, 3)).toBe("070");
  });
  it("stops using the keyboard target after actual pointer motion outside the canvas", () => {
    render(<Harness />);
    const canvas = screen.getByRole("application");
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    fireEvent.pointerLeave(canvas);
    fireEvent.pointerMove(document.body, pointer(50, 0, { buttons: 0 }));
    fireEvent.keyDown(canvas, { key: "7" });
    expect(seed()).toBe("0".repeat(2401));
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    fireEvent.keyDown(canvas, { key: "7" });
    expect(seed().slice(0, 4)).toBe("0070");
  });
  it("leaves modified, composing, repeated and already handled keys alone", () => {
    render(<Harness />);
    const canvas = screen.getByRole("application");
    canvas.focus();
    for (const extra of [
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { isComposing: true },
      { repeat: true },
    ]) {
      fireEvent.keyDown(canvas, { key: "7", ...extra });
    }
    const event = new KeyboardEvent("keydown", { key: "7", bubbles: true, cancelable: true });
    event.preventDefault();
    fireEvent(canvas, event);
    expect(seed()).toBe("0".repeat(2401));
    expect(screen.getByTestId("color").textContent).toBe("2");
  });
  it.each(["select", "input", "dialog"])("leaves numbers with the active %s", (kind) => {
    render(<Harness />);
    const control = document.createElement(kind === "dialog" ? "button" : kind);
    const host = document.createElement("div");
    if (kind === "dialog") {
      host.setAttribute("role", "dialog");
      host.setAttribute("aria-modal", "true");
    }
    host.append(control);
    document.body.append(host);
    try {
      control.focus();
      fireEvent.pointerMove(screen.getByRole("application"), pointer(2, 0, { buttons: 0 }));
      fireEvent.keyDown(control, { key: "7" });
      expect(seed()).toBe("0".repeat(2401));
      expect(screen.getByTestId("color").textContent).toBe("2");
    } finally {
      host.remove();
    }
  });
  it("does not interrupt a pointer stroke or change its color", () => {
    render(<Harness />);
    const canvas = screen.getByRole("application");
    fireEvent.pointerDown(canvas, pointer(0, 0));
    fireEvent.keyDown(canvas, { key: "7" });
    fireEvent.pointerMove(canvas, pointer(2, 0));
    fireEvent.pointerUp(canvas, pointer(2, 0, { buttons: 0 }));
    expect(seed().slice(0, 4)).toBe("2220");
    expect(screen.getByTestId("color").textContent).toBe("2");
  });
});
describe("Automata pointer interaction", () => {
  it("edits the initial pattern while observing a later generation", () => {
    render(<Harness editable={true} />);
    fireEvent.click(screen.getByRole("button", { name: "time" }));
    const canvas = screen.getByRole("application");
    fireEvent.pointerDown(canvas, pointer(1, 0));
    fireEvent.pointerUp(canvas, pointer(1, 0, { buttons: 0 }));
    expect(seed().slice(0, 3)).toBe("020");
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(seed().slice(0, 4)).toBe("0220");
    expect(loadAutomataState().state.time).toBe(1);
  });
  it("keeps the result canvas read-only even at generation zero", () => {
    render(<Harness editable={false} />);
    const canvas = screen.getByRole("application");
    const before = seed();
    fireEvent.pointerDown(canvas, pointer(1, 0));
    fireEvent.pointerUp(canvas, pointer(1, 0, { buttons: 0 }));
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(seed()).toBe(before);
    expect(screen.getByTestId("selected").textContent).toBe("1,0,0");
  });
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
    fireEvent.keyUp(canvas, { key: "ArrowLeft" });
    expect(screen.getByTestId("selected").textContent).toBe("0,0,0");
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    fireEvent.keyUp(canvas, { key: "ArrowRight" });
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
  it("combines held arrow directions and removes released or opposing directions", () => {
    render(<Harness />);
    const canvas = screen.getByRole("application");
    fireEvent.pointerDown(canvas, pointer(10, 10));
    fireEvent.pointerUp(canvas, pointer(10, 10, { buttons: 0 }));
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    fireEvent.keyDown(canvas, { key: "ArrowUp" });
    expect(screen.getByTestId("selected").textContent).toBe("12,9,0");
    fireEvent.keyDown(canvas, { key: "ArrowUp", repeat: true });
    expect(screen.getByTestId("selected").textContent).toBe("13,8,0");
    fireEvent.keyUp(canvas, { key: "ArrowUp" });
    fireEvent.keyDown(canvas, { key: "ArrowRight", repeat: true });
    expect(screen.getByTestId("selected").textContent).toBe("14,8,0");
    fireEvent.keyDown(canvas, { key: "ArrowLeft" });
    expect(screen.getByTestId("selected").textContent).toBe("14,8,0");
    fireEvent.keyUp(canvas, { key: "ArrowRight" });
    fireEvent.keyDown(canvas, { key: "ArrowLeft", repeat: true });
    expect(screen.getByTestId("selected").textContent).toBe("13,8,0");
    fireEvent.keyUp(canvas, { key: "ArrowLeft" });
    fireEvent.keyDown(canvas, { key: "7" });
    expect(seed()[8 * 49 + 13]).toBe("7");
  });
  it.each(["blur", "inactive", "focus"])("clears held directions after %s", (reason) => {
    const { rerender } = render(<Harness />);
    const canvas = screen.getByRole("application");
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    if (reason === "blur") fireEvent(window, new Event("blur"));
    else if (reason === "focus") screen.getByRole("button", { name: "G" }).focus();
    else {
      rerender(<Harness active={false} />);
      rerender(<Harness />);
    }
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "ArrowDown" });
    expect(screen.getByTestId("selected").textContent).toBe("1,1,0");
  });
});
