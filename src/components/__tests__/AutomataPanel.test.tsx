// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutomataPanel } from "../AutomataPanel";
import { LanguageProvider } from "../../i18n";
import * as model from "../../automata/model";
import { loadAutomataState } from "../../automata/persistence";
import type { AutomataImage } from "../../automata/state";
function show(image?: AutomataImage) {
  localStorage.setItem("chromalum_lang", "en");
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 245, 245));
  Object.defineProperties(HTMLCanvasElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    releasePointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: () => true },
  });
  return render(
    <LanguageProvider>
      <AutomataPanel active={true} displayWidth={245} displayHeight={245} {...(image ? { image } : {})} />
    </LanguageProvider>,
  );
}
afterEach(() => vi.restoreAllMocks());
describe("AutomataPanel", () => {
  it("uses the loaded image as an editable rectangular initial pattern", () => {
    const image = { width: 3, height: 2, levelData: Uint8Array.from([0, 1, 2, 3, 4, 7]) };
    show(image);
    fireEvent.change(screen.getByRole("combobox", { name: "Initial pattern" }), { target: { value: "image" } });
    expect(loadAutomataState().state.seed).toEqual(image.levelData);
    expect(screen.getByRole("application").style.aspectRatio).toBe("3 / 2");
    fireEvent.keyDown(screen.getByRole("application"), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
    expect(loadAutomataState().state.seed[5]).toBe(4);
    expect(image.levelData[5]).toBe(7);
  });
  it("offers all eight colors and only the two pattern selectors", () => {
    show();
    const palette = screen.getByRole("group", { name: "Palette" });
    expect(
      within(palette)
        .getAllByRole("button")
        .map((node) => node.getAttribute("aria-label")?.split(" ")[0]),
    ).toEqual(["K", "B", "R", "M", "G", "C", "Y", "W"]);
    expect(
      within(palette)
        .getByRole("button", { name: /^G Green/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(within(palette).getByRole("button", { name: /^K Black/ }));
    expect(
      within(palette)
        .getByRole("button", { name: /^K Black/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getAllByRole("combobox").length).toBe(2);
    expect(within(screen.getByRole("combobox", { name: "Rule" })).getAllByRole("option")).toHaveLength(8);
    expect(within(screen.getByRole("combobox", { name: "Initial pattern" })).getAllByRole("option")).toHaveLength(13);
    expect(screen.getAllByRole("application").length).toBe(1);
  });
  it("steps to time twenty and returns to the edited initial pattern", () => {
    show();
    const canvas = screen.getByRole("application");
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "Enter" });
    const edited = loadAutomataState().state.seed;
    expect(edited[24 * 49 + 24]).toBe(4);
    expect((screen.getByRole("button", { name: "Return to initial pattern" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Advance one step" }));
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("1");
    const readout = screen.getByTestId("automata-live").textContent!;
    expect(readout).toContain("initial G Green");
    expect(readout).toContain("t=1 K Black");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "20" } });
    expect((screen.getByRole("button", { name: "Advance one step" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Return to initial pattern" }));
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("0");
    expect(loadAutomataState().state.seed).toEqual(edited);
  });
  it("resets presets to editable time zero while keeping the selected rule and color", () => {
    show();
    fireEvent.change(screen.getByRole("combobox", { name: "Rule" }), { target: { value: "life" } });
    fireEvent.click(screen.getByRole("button", { name: /^W White/ }));
    fireEvent.click(screen.getByRole("button", { name: "Advance one step" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Initial pattern" }), { target: { value: "black" } });
    const stored = loadAutomataState().state;
    expect([stored.rule, stored.color, stored.time, stored.x, stored.y]).toEqual(["life", 7, 0, 24, 24]);
    expect(stored.seed).toEqual(new Uint8Array(2401));
  });
  it("reuses the plane for palette and selection changes", () => {
    const compute = vi.spyOn(model, "evolvePlane");
    show();
    const before = compute.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /^W White/ }));
    fireEvent.keyDown(screen.getByRole("application"), { key: "ArrowLeft" });
    expect(compute.mock.calls.length).toBe(before);
    fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
    expect(compute.mock.calls.length).toBe(before);
    fireEvent.click(screen.getByRole("button", { name: "Advance one step" }));
    expect(compute.mock.calls.length).toBe(before + 1);
  });
  it("announces the final dragged cell once the interaction ends", () => {
    show();
    const canvas = screen.getByRole("application");
    const before = screen.getByTestId("automata-live").textContent;
    fireEvent.pointerDown(canvas, { pointerId: 1, isPrimary: true, pointerType: "mouse", button: 0, buttons: 1, clientX: 2, clientY: 2 });
    fireEvent.pointerMove(canvas, { pointerId: 1, isPrimary: true, pointerType: "mouse", buttons: 1, clientX: 22, clientY: 2 });
    expect(screen.getByTestId("automata-live").textContent).toBe(before);
    fireEvent.pointerUp(canvas, { pointerId: 1, isPrimary: true, pointerType: "mouse", buttons: 0, clientX: 22, clientY: 2 });
    expect(screen.getByTestId("automata-live").textContent).toContain("Cell (4, 0)");
  });
  it("shows a nonmodal notice after an actual save failure", () => {
    show();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Denied");
    });
    fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
    expect(screen.getByRole("status").textContent).toBe("Flow edits cannot be restored after reloading.");
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Advance one step" }));
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("1");
  });
});
