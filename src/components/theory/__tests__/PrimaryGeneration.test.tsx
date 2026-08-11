// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { PrimaryGeneration } from "../PrimaryGeneration";

function renderDemo() {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <PrimaryGeneration hlLevel={null} onHover={vi.fn()} />
    </LanguageProvider>,
  );
}

describe("PrimaryGeneration", () => {
  it("uses only G, R, and B as generators while displaying all eight generated states", () => {
    renderDemo();

    const generators = screen.getByRole("group", { name: "Primary generators G, R, and B" });
    expect(within(generators).getAllByRole("button")).toHaveLength(3);

    const layers = screen.getByLabelText("All eight states grouped by the number of selected primaries");
    expect(Array.from(layers.querySelectorAll("[data-level]")).map((node) => Number(node.getAttribute("data-level")))).toEqual([
      0, 4, 2, 1, 6, 5, 3, 7,
    ]);

    const equation = screen.getByTestId("generation-equation");
    expect(equation.textContent).toContain("G ∨ R");
    expect(equation.textContent).toContain("Y110");
    expect(equation.textContent).toContain("4+2=6");

    fireEvent.click(within(generators).getByRole("button", { name: "Primary B, bits 001, weight 1" }));
    expect(equation.textContent).toContain("G ∨ R ∨ B");
    expect(equation.textContent).toContain("W111");
    expect(equation.textContent).toContain("4+2+1=7");
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
});
