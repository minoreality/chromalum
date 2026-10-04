// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutomataPanel } from "../AutomataPanel";
import { LanguageProvider } from "../../i18n";
import * as model from "../../automata/model";
function show() {
  localStorage.setItem("chromalum_lang", "en");
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 245, 245));
  Object.defineProperties(HTMLCanvasElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    releasePointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: () => true },
  });
  return render(
    <LanguageProvider>
      <AutomataPanel active={true} />
    </LanguageProvider>,
  );
}
afterEach(() => vi.restoreAllMocks());
describe("AutomataPanel", () => {
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
    expect(screen.getByRole("combobox", { name: "Rule" }).children.length).toBe(8);
    expect(screen.getByRole("combobox", { name: "Initial pattern" }).children.length).toBe(12);
    expect(screen.getAllByRole("application").length).toBe(1);
  });
  it("steps to time twenty and returns to the edited initial pattern", () => {
    show();
    const canvas = screen.getByRole("application");
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "Enter" });
    const edited = JSON.parse(localStorage.getItem("chromalum-automata-state-v1")!).seed;
    expect(edited[24 * 49 + 24]).toBe(4);
    expect((screen.getByRole("button", { name: "Return to initial pattern" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Advance one step" }));
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("1");
    const readout = screen.getByTestId("automata-readout").textContent!;
    expect(readout).toContain("initial G Green");
    expect(readout).toContain("t=1 K Black");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "20" } });
    expect((screen.getByRole("button", { name: "Advance one step" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Return to initial pattern" }));
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("0");
    expect(JSON.parse(localStorage.getItem("chromalum-automata-state-v1")!).seed).toEqual(edited);
  });
  it("resets presets to editable time zero while keeping the selected rule and color", () => {
    show();
    fireEvent.change(screen.getByRole("combobox", { name: "Rule" }), { target: { value: "life" } });
    fireEvent.click(screen.getByRole("button", { name: /^W White/ }));
    fireEvent.click(screen.getByRole("button", { name: "Advance one step" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Initial pattern" }), { target: { value: "black" } });
    const stored = JSON.parse(localStorage.getItem("chromalum-automata-state-v1")!);
    expect([stored.rule, stored.color, stored.time, stored.x, stored.y]).toEqual(["life", 7, 0, 24, 24]);
    expect(stored.seed).toEqual(Array(2401).fill(0));
  });
  it("reuses the plane for palette and selection changes", () => {
    const compute = vi.spyOn(model, "evolvePlane");
    show();
    const before = compute.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /^W White/ }));
    fireEvent.keyDown(screen.getByRole("application"), { key: "ArrowLeft" });
    expect(compute.mock.calls.length).toBe(before);
    fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
    expect(compute.mock.calls.length).toBe(before + 1);
    fireEvent.click(screen.getByRole("button", { name: "Advance one step" }));
    expect(compute.mock.calls.length).toBe(before + 2);
  });
  it("announces the final dragged cell once the interaction ends", () => {
    show();
    const canvas = screen.getByRole("application");
    const before = screen.getByTestId("automata-live").textContent;
    fireEvent.pointerDown(canvas, { pointerId: 1, isPrimary: true, pointerType: "mouse", button: 0, buttons: 1, clientX: 2, clientY: 2 });
    fireEvent.pointerMove(canvas, { pointerId: 1, isPrimary: true, pointerType: "mouse", buttons: 1, clientX: 22, clientY: 2 });
    expect(screen.getByTestId("automata-live").textContent).toBe(before);
    expect(screen.getByTestId("automata-readout").textContent).toContain("Cell (4, 0)");
    fireEvent.pointerUp(canvas, { pointerId: 1, isPrimary: true, pointerType: "mouse", buttons: 0, clientX: 22, clientY: 2 });
    expect(screen.getByTestId("automata-live").textContent).toContain("Cell (4, 0)");
  });
  it("shows a nonmodal notice after an actual save failure", () => {
    show();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Denied");
    });
    fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
    expect(screen.getByRole("status").textContent).toBe("Automata edits cannot be restored after reloading.");
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Advance one step" }));
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("1");
  });
});
