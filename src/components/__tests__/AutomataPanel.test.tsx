// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutomataPanel } from "../AutomataPanel";
import { LanguageProvider } from "../../i18n";
import * as model from "../../automata/model";
import { loadAutomataState } from "../../automata/persistence";
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
      <AutomataPanel active={true} displayWidth={245} displayHeight={245} />
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
    expect(within(screen.getByRole("combobox", { name: "Update rule" })).getAllByRole("option")).toHaveLength(12);
    expect(within(screen.getByRole("combobox", { name: "Initial pattern" })).getAllByRole("option")).toHaveLength(16);
    expect(screen.getAllByRole("application").length).toBe(1);
  });
  it("groups existing XOR choices and keeps the new rule and preset selections independent", () => {
    show();
    const rule = screen.getByRole("combobox", { name: "Update rule" });
    expect(within(within(rule).getByRole("group", { name: "XOR" })).getAllByRole("option")).toHaveLength(6);
    expect(within(within(rule).getByRole("group", { name: "Color operations" })).getAllByRole("option")).toHaveLength(4);
    expect(within(within(rule).getByRole("group", { name: "Life-like" })).getAllByRole("option")).toHaveLength(2);
    const original = loadAutomataState().state.seed;
    fireEvent.change(rule, { target: { value: "and" } });
    expect(loadAutomataState().state.seed).toEqual(original);
    fireEvent.change(screen.getByRole("combobox", { name: "Initial pattern" }), { target: { value: "or-spread" } });
    expect(loadAutomataState().state.rule).toBe("and");
    expect(loadAutomataState().state.preset).toBe("or-spread");
    const description = document.getElementById(rule.getAttribute("aria-describedby")!)!;
    expect(description.querySelector('[aria-hidden="false"]')?.textContent).toBe(
      "Keeps only channels shared by the cell and all four orthogonal neighbors.",
    );
  });
  it("steps to generation 64 and returns to the edited initial pattern", () => {
    show();
    expect(screen.getByRole("slider", { name: "Generation: 0 / 64" })).toBeTruthy();
    expect(screen.getByText("Edit initial pattern").getAttribute("aria-hidden")).toBe("false");
    expect(screen.queryByText("View result")).toBeNull();
    const canvas = screen.getByRole("application");
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "Enter" });
    const edited = loadAutomataState().state.seed;
    expect(edited[24 * 49 + 24]).toBe(4);
    expect((screen.getByRole("button", { name: "Return to generation 0" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next generation" }));
    expect(screen.getByRole("slider", { name: "Generation: 1 / 64" })).toBeTruthy();
    expect(screen.getByText("Edit initial pattern").getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByText("View result")).toBeNull();
    expect(screen.getByRole("slider").getAttribute("aria-describedby")).toBeNull();
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("1");
    const readout = screen.getByTestId("automata-live").textContent!;
    expect(readout).toContain("initial G Green");
    expect(readout).toContain("t=1 K Black");
    expect((screen.getByRole("slider") as HTMLInputElement).max).toBe("64");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "63" } });
    expect((screen.getByRole("button", { name: "Next generation" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Next generation" }));
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("64");
    expect(screen.getByRole("slider", { name: "Generation: 64 / 64" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Next generation" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Return to generation 0" }));
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("0");
    expect(screen.getByRole("slider", { name: "Generation: 0 / 64" })).toBeTruthy();
    expect(screen.getByText("Edit initial pattern").getAttribute("aria-hidden")).toBe("false");
    expect(screen.queryByText("View result")).toBeNull();
    expect(loadAutomataState().state.seed).toEqual(edited);
  });
  it("moves back one generation without changing the seed and stops at zero", () => {
    show();
    fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
    const seed = loadAutomataState().state.seed;
    const previous = screen.getByRole("button", { name: "Previous generation" }) as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "64" } });
    fireEvent.click(previous);
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("63");
    expect((screen.getByRole("button", { name: "Next generation" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "1" } });
    fireEvent.click(previous);
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("0");
    expect(previous.disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Return to generation 0" }) as HTMLButtonElement).disabled).toBe(true);
    expect(loadAutomataState().state.seed).toEqual(seed);
  });
  it("marks edited seeds across reload and allows reapplying the same preset", () => {
    const view = show();
    const preset = screen.getByRole("combobox", { name: "Initial pattern" }) as HTMLSelectElement;
    fireEvent.change(preset, { target: { value: "black" } });
    const canvas = screen.getByRole("application");
    fireEvent.click(screen.getByRole("button", { name: /^K Black/ }));
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(preset.value).toBe("black");
    fireEvent.click(screen.getByRole("button", { name: /^W White/ }));
    fireEvent.keyDown(canvas, { key: "ArrowLeft" });
    expect(preset.value).toBe("black");
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(preset.selectedOptions[0].textContent).toBe("Edited pattern");
    fireEvent.click(screen.getByRole("button", { name: /^K Black/ }));
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(preset.value).toBe("black");
    fireEvent.click(screen.getByRole("button", { name: /^W White/ }));
    fireEvent.keyDown(canvas, { key: "Enter" });
    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });
    view.unmount();
    show();
    const restored = screen.getByRole("combobox", { name: "Initial pattern" }) as HTMLSelectElement;
    expect(restored.selectedOptions[0].textContent).toBe("Edited pattern");
    fireEvent.change(restored, { target: { value: "black" } });
    expect(restored.value).toBe("black");
    expect(loadAutomataState().state.seed).toEqual(new Uint8Array(2401));
  });
  it("keeps a Life blinker alive when its middle generation extends beyond the visible board", () => {
    const seed = Array<number>(49 * 49).fill(0);
    for (const y of [23, 24, 25]) seed[y * 49] = 7;
    localStorage.setItem(
      "chromalum-flow-state-v1",
      JSON.stringify({ version: 1, seed, preset: "black", rule: "life", time: 0, x: 0, y: 24, color: 7 }),
    );
    show();
    fireEvent.click(screen.getByRole("button", { name: "Next generation" }));
    fireEvent.click(screen.getByRole("button", { name: "Next generation" }));
    expect(screen.getByTestId("automata-live").textContent).toContain("t=2 W White");
    expect(Array.from(loadAutomataState().state.seed)).toEqual(seed);
  });
  it("resets presets to editable time zero while keeping the selected rule and color", () => {
    show();
    fireEvent.change(screen.getByRole("combobox", { name: "Update rule" }), { target: { value: "life" } });
    fireEvent.click(screen.getByRole("button", { name: /^W White/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next generation" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Initial pattern" }), { target: { value: "black" } });
    const stored = loadAutomataState().state;
    expect([stored.rule, stored.color, stored.time, stored.x, stored.y]).toEqual(["life", 7, 0, 24, 24]);
    expect(stored.seed).toEqual(new Uint8Array(2401));
  });
  it("reuses the plane for palette and selection changes", () => {
    const compute = vi.spyOn(model, "evolveVisiblePlane");
    show();
    const before = compute.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /^W White/ }));
    fireEvent.keyDown(screen.getByRole("application"), { key: "ArrowLeft" });
    expect(compute.mock.calls.length).toBe(before);
    fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
    expect(compute.mock.calls.length).toBe(before + 1);
    fireEvent.click(screen.getByRole("button", { name: "Next generation" }));
    expect(compute.mock.calls.length).toBe(before + 2);
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
    fireEvent.click(screen.getByRole("button", { name: "Next generation" }));
    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("1");
  });
});
