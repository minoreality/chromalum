// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { PrimaryGeneration } from "../PrimaryGeneration";
import { VennDiagram } from "../VennDiagram";

function renderDemo() {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <PrimaryGeneration
        hlLevel={null}
        onHover={vi.fn()}
        diagram={({ selectedLevel, onSelect }) => (
          <VennDiagram hlLevel={null} onHover={vi.fn()} selectedLevel={selectedLevel} onSelect={onSelect} />
        )}
      />
    </LanguageProvider>,
  );
}

describe("PrimaryGeneration", () => {
  it("uses only G, R, and B as generators while displaying all eight generated states", () => {
    renderDemo();

    const generators = screen.getByRole("group", { name: "Primaries G, R, and B" });
    expect(within(generators).getAllByRole("button")).toHaveLength(3);

    const layers = screen.getByLabelText("All eight states grouped by the number of selected primaries");
    expect(Array.from(layers.querySelectorAll("[data-level]")).map((node) => Number(node.getAttribute("data-level")))).toEqual([
      0, 4, 2, 1, 6, 5, 3, 7,
    ]);

    const equation = screen.getByTestId("generation-equation");
    expect(equation.textContent).toContain("{} → K");
    expect(equation.textContent).toContain("K000");
    expect(equation.textContent).not.toContain("=");
    expect(generators.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    expect(layers.querySelector('[data-level="0"]')?.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(within(generators).getByRole("button", { name: "Primary G, bits 100" }));
    fireEvent.click(within(generators).getByRole("button", { name: "Primary R, bits 010" }));
    expect(equation.textContent).toContain("{G,R} → Y");
    expect(equation.textContent).toContain("Y110");

    fireEvent.click(within(generators).getByRole("button", { name: "Primary B, bits 001" }));
    expect(equation.textContent).toContain("{G,R,B} → W");
    expect(equation.textContent).toContain("W111");
  });

  it("clears the diagram from surrounding space without cancelling clicks on its primary regions", () => {
    const { container } = renderDemo();
    const generators = screen.getByRole("group", { name: "Primaries G, R, and B" });
    const equation = screen.getByTestId("generation-equation");
    const svg = container.querySelector(".theory-venn-svg")!;
    svg.getBoundingClientRect = () => new DOMRect(26, 0, 248, 220);

    fireEvent.click(within(generators).getByRole("button", { name: "Primary G, bits 100" }));
    fireEvent.click(svg, { clientX: 150, clientY: 62 });
    expect(equation.textContent).toContain("Y110");
    expect(generators.querySelectorAll('[aria-pressed="true"]')).toHaveLength(2);

    fireEvent.click(container.querySelector(".theory-generation-diagram")!);
    expect(equation.textContent).toContain("K000");
    expect(generators.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    expect(svg.querySelectorAll('[data-venn-primary][data-active="true"]')).toHaveLength(0);
  });

  it("keeps the eight-state operand distinct from the three allowed primary toggles", () => {
    renderDemo();

    const states = screen.getByRole("group", { name: "Current color state" });
    const toggles = screen.getByRole("group", { name: "Primary bit to toggle" });
    expect(within(states).getAllByRole("button")).toHaveLength(8);
    expect(within(toggles).getAllByRole("button")).toHaveLength(3);
    expect(within(toggles).queryByRole("button", { name: /Magenta|Cyan|Yellow|White/ })).toBeNull();

    const transition = screen.getByTestId("primary-toggle-transition");
    expect(transition.textContent).toContain("R010");
    expect(transition.textContent).toContain("G: 0→1");
    expect(transition.textContent).toContain("x′=x⊕e_G");
    expect(transition.textContent).toContain("Y110");
    expect(transition.textContent).toContain("2→6");
    expect(transition.textContent).toContain("+4");
    expect(transition.textContent).toContain("w_G=4");

    fireEvent.click(within(states).getByRole("button", { name: "State Yellow, bits 110, level 6" }));
    fireEvent.click(within(toggles).getByRole("button", { name: "Toggle primary R, weight 2" }));
    expect(transition.textContent).toContain("Y110");
    expect(transition.textContent).toContain("R: 1→0");
    expect(transition.textContent).toContain("G100");
    expect(transition.textContent).toContain("6→4");
    expect(transition.textContent).toContain("−2");
    expect(transition.textContent).toContain("w_R=2");
  });

  it("selects every generated state from the layer list and synchronizes its primary controls", () => {
    renderDemo();
    const generators = screen.getByRole("group", { name: "Primaries G, R, and B" });
    const layers = screen.getByRole("group", { name: "All eight states grouped by the number of selected primaries" });
    const equation = screen.getByTestId("generation-equation");
    for (const [name, bits] of [
      ["K", "000"],
      ["B", "001"],
      ["R", "010"],
      ["M", "011"],
      ["G", "100"],
      ["C", "101"],
      ["Y", "110"],
      ["W", "111"],
    ]) {
      const state = within(layers).getByRole("button", { name: `Select the primaries for state ${name}, bits ${bits}` });
      fireEvent.click(state);
      expect(state.getAttribute("aria-pressed")).toBe("true");
      expect(layers.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
      expect(equation.textContent).toContain(`${name}${bits}`);
      within(generators)
        .getAllByRole("button")
        .forEach((button, index) => {
          expect(button.getAttribute("aria-pressed")).toBe(String(bits[index] === "1"));
        });
    }
  });
});
