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
    ).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
    expect(
      within(palette)
        .getAllByRole("button")
        .map((node) => node.textContent),
    ).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
    expect(
      within(palette)
        .getAllByRole("button")
        .map((node) => node.title),
    ).toEqual(["GRB:000", "GRB:001", "GRB:010", "GRB:011", "GRB:100", "GRB:101", "GRB:110", "GRB:111"]);
    expect(
      within(palette)
        .getByRole("button", { name: /^4 Green/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(within(palette).getByRole("button", { name: /^0 Black/ }));
    expect(
      within(palette)
        .getByRole("button", { name: /^0 Black/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getAllByRole("combobox").length).toBe(2);
    expect(within(screen.getByRole("combobox", { name: "Update rule" })).getAllByRole("option")).toHaveLength(14);
    const presets = screen.getByRole("combobox", { name: "Initial pattern" });
    expect(within(presets).getAllByRole("option")).toHaveLength(11);
    expect(within(presets).getByRole("option", { selected: true }).textContent).toBe("Overlapping squares");
    expect(screen.getAllByRole("application").length).toBe(1);
  });
  it("groups update rules and keeps the rule and preset selections independent", () => {
    show();
    const rule = screen.getByRole("combobox", { name: "Update rule" });
    expect(
      within(rule)
        .getAllByRole("group")
        .map((group) => [group.getAttribute("label"), ...Array.from(group.querySelectorAll("option"), (option) => option.value)]),
    ).toEqual([
      ["XOR", "4", "5", "diagonal", "diagonal-center", "8", "9"],
      ["OR / AND", "or", "and"],
      ["Majority / toggles", "majority", "hamming"],
      ["Life-like", "life", "rug", "seeds", "day-night"],
    ]);
    expect(
      within(within(rule).getByRole("group", { name: "Life-like" }))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Conway’s Game of Life", "Persian Rug", "Seeds", "Day & Night"]);
    const original = loadAutomataState().state.seed;
    fireEvent.change(rule, { target: { value: "and" } });
    expect(loadAutomataState().state.seed).toEqual(original);
    fireEvent.change(screen.getByRole("combobox", { name: "Initial pattern" }), { target: { value: "all-white" } });
    expect(loadAutomataState().state.rule).toBe("and");
    expect(loadAutomataState().state.preset).toBe("all-white");
    const description = document.getElementById(rule.getAttribute("aria-describedby")!)!;
    expect(description.querySelector(".automata-rule-hint")?.textContent).toContain("This is erosion in image processing.");
  });
  it("shows B/S notation on the two named XOR rules and the four Life-like rules", () => {
    show();
    const rule = screen.getByRole("combobox", { name: "Update rule" });
    const description = document.getElementById(rule.getAttribute("aria-describedby")!)!;
    const notations = new Map<string, string>([
      ["8", "B1357/S1357"],
      ["9", "B1357/S02468"],
      ["life", "B3/S23"],
      ["rug", "B234/S"],
      ["seeds", "B2/S"],
      ["day-night", "B3678/S34678"],
    ]);
    for (const option of (rule as HTMLSelectElement).options) {
      fireEvent.change(rule, { target: { value: option.value } });
      expect(description.querySelector("code")?.textContent).toBe(notations.get(option.value));
    }
  });
  it("steps to generation 64 and returns to the edited initial pattern", () => {
    show();
    expect(screen.getByRole("slider", { name: "Generation: 0 / 64" })).toBeTruthy();
    expect(screen.getByText("Pattern is editable").getAttribute("aria-hidden")).toBe("false");
    expect(screen.queryByText("View result")).toBeNull();
    const canvas = screen.getByRole("application");
    canvas.focus();
    fireEvent.keyDown(canvas, { key: "Enter" });
    const edited = loadAutomataState().state.seed;
    expect(edited[24 * 49 + 24]).toBe(4);
    expect((screen.getByRole("button", { name: "Return to generation 0" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next generation" }));
    expect(screen.getByRole("slider", { name: "Generation: 1 / 64" })).toBeTruthy();
    expect(screen.getByText("Pattern is editable").getAttribute("aria-hidden")).toBe("true");
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
    expect(screen.getByText("Pattern is editable").getAttribute("aria-hidden")).toBe("false");
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
    const originalHint = document.querySelector(".automata-rule-hint")!.textContent;
    const canvas = screen.getByRole("application");
    fireEvent.click(screen.getByRole("button", { name: /^0 Black/ }));
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(preset.value).toBe("black");
    fireEvent.click(screen.getByRole("button", { name: /^7 White/ }));
    fireEvent.keyDown(canvas, { key: "ArrowLeft" });
    expect(preset.value).toBe("black");
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(preset.selectedOptions[0].textContent).toBe("Edited pattern");
    expect(preset.hasAttribute("aria-describedby")).toBe(false);
    expect(document.querySelector(".automata-viewing-note")).toBeNull();
    expect(document.querySelector(".automata-rule-hint")?.textContent).toBe(originalHint);
    fireEvent.click(screen.getByRole("button", { name: /^0 Black/ }));
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(preset.value).toBe("black");
    expect(document.getElementById(preset.getAttribute("aria-describedby")!)?.textContent).toContain("same black");
    fireEvent.click(screen.getByRole("button", { name: /^7 White/ }));
    fireEvent.keyDown(canvas, { key: "Enter" });
    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });
    view.unmount();
    show();
    const restored = screen.getByRole("combobox", { name: "Initial pattern" }) as HTMLSelectElement;
    expect(restored.selectedOptions[0].textContent).toBe("Edited pattern");
    expect(document.querySelector(".automata-viewing-note")).toBeNull();
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
    fireEvent.click(screen.getByRole("button", { name: /^7 White/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next generation" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Initial pattern" }), { target: { value: "black" } });
    const stored = loadAutomataState().state;
    expect([stored.rule, stored.color, stored.time, stored.x, stored.y]).toEqual(["life", 7, 0, 24, 24]);
    expect(stored.seed).toEqual(new Uint8Array(2401));
  });
  it("reuses the evolution across palette, selection and generation changes", () => {
    const compute = vi.spyOn(model, "createVisibleEvolution");
    show();
    const preset = screen.getByRole("combobox", { name: "Initial pattern" });
    fireEvent.change(preset, { target: { value: "black" } });
    const before = compute.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /^7 White/ }));
    fireEvent.keyDown(screen.getByRole("application"), { key: "ArrowLeft" });
    expect(compute.mock.calls.length).toBe(before);
    fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
    expect(compute.mock.calls.length).toBe(before + 1);
    fireEvent.click(screen.getByRole("button", { name: "Next generation" }));
    expect(compute.mock.calls.length).toBe(before + 1);
    fireEvent.change(screen.getByRole("combobox", { name: "Update rule" }), { target: { value: "life" } });
    expect(compute.mock.calls.length).toBe(before + 2);
    fireEvent.change(preset, { target: { value: "all-white" } });
    expect(compute.mock.calls.length).toBe(before + 3);
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
