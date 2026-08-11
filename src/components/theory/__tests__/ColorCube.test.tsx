// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { ColorCube } from "../ColorCube";

function renderWithLanguage(hlLevel: number | null = null) {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <ColorCube hlLevel={hlLevel} onHover={vi.fn()} />
    </LanguageProvider>,
  );
}

function enterMixing() {
  fireEvent.click(screen.getByRole("button", { name: "Mixing" }));
  return screen.getByRole("group", { name: "RGB and CMY mixing on the Color Cube" });
}

describe("ColorCube", () => {
  it("does not render RGB axis letter labels", () => {
    const { container } = renderWithLanguage();

    const svg = screen.getByRole("img", { name: "Color Cube" });
    expect([...svg.querySelectorAll("text")].some((el) => ["R", "G", "B"].includes(el.textContent ?? ""))).toBe(false);

    fireEvent.mouseEnter(screen.getByText("0").parentElement!);

    expect([...svg.querySelectorAll("text")].some((el) => ["R", "G", "B"].includes(el.textContent ?? ""))).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Hasse" }));

    expect([...container.querySelectorAll("svg text")].some((el) => ["R", "G", "B"].includes(el.textContent ?? ""))).toBe(false);
  });

  it("renders all four complement diagonals when the complement overlay is enabled", () => {
    const { container } = renderWithLanguage();

    expect(container.querySelectorAll('[data-testid^="cube-complement-"]')).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Complements" }));

    expect(container.querySelectorAll('[data-testid^="cube-complement-"]')).toHaveLength(4);
    expect(container.querySelector('[data-testid="cube-complement-0-7"]')).not.toBeNull();
  });

  it("uses XOR difference masks to label the three primary-colored edges at a highlighted vertex", () => {
    renderWithLanguage(1);

    const edgeGroup = screen.getByRole("group", {
      name: "XOR difference masks on the three edges incident to the highlighted cube vertex",
    });
    expect(edgeGroup.textContent).toContain("001⊕000=001 · B");
    expect(edgeGroup.textContent).toContain("001⊕011=010 · R");
    expect(edgeGroup.textContent).toContain("001⊕101=100 · G");
  });

  it("keeps the projection independently toggleable during mixing and locks the input family after the first selection", async () => {
    renderWithLanguage();

    expect(screen.getByRole("img", { name: "Color Cube" })).not.toBeNull();
    expect(screen.queryByText("rank")).toBeNull();
    enterMixing();

    expect(screen.queryByRole("img", { name: "Color Cube" })).toBeNull();
    expect(screen.getByRole("button", { name: "Exit mixing" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("button", { name: "Complements" })).toBeNull();
    const hasseButton = screen.getByRole("button", { name: "Hasse" });
    expect(hasseButton.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByText("rank")).toBeNull();

    fireEvent.click(hasseButton);
    expect(hasseButton.getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(screen.queryByText("rank")).not.toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "R₂, available as an input" }));

    for (const label of [
      "C₅, unavailable in the current mixing family",
      "M₃, unavailable in the current mixing family",
      "Y₆, unavailable in the current mixing family",
    ]) {
      const input = screen.getByRole("button", { name: label });
      expect(input.getAttribute("aria-disabled")).toBe("true");
      expect(input.getAttribute("data-mix-state")).toBe("unavailable");
      expect(input.getAttribute("tabindex")).toBeNull();
    }
    expect(screen.getByRole("button", { name: "G₄, available as an input" }).getAttribute("aria-disabled")).toBe("false");
    expect(screen.getByRole("button", { name: "B₁, available as an input" }).getAttribute("aria-disabled")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Exit mixing" }));
    expect(screen.getByRole("img", { name: "Color Cube" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Hasse" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("rank")).not.toBeNull();
  });

  it.each([
    {
      relation: "R∨G=Y",
      inputs: ["R₂", "G₄"],
      rankedFormula: "least upper bound · R₂ ∨ G₄ = Y₆",
      bitFormula: "010(R) ∨ 100(G) = 110(Y)",
      result: 6,
      edges: ["2-6", "4-6"],
    },
    {
      relation: "G∨B=C",
      inputs: ["G₄", "B₁"],
      rankedFormula: "least upper bound · G₄ ∨ B₁ = C₅",
      bitFormula: "100(G) ∨ 001(B) = 101(C)",
      result: 5,
      edges: ["4-5", "1-5"],
    },
    {
      relation: "B∨R=M",
      inputs: ["B₁", "R₂"],
      rankedFormula: "least upper bound · B₁ ∨ R₂ = M₃",
      bitFormula: "001(B) ∨ 010(R) = 011(M)",
      result: 3,
      edges: ["1-3", "2-3"],
    },
    {
      relation: "M∧C=B",
      inputs: ["M₃", "C₅"],
      rankedFormula: "greatest lower bound · M₃ ∧ C₅ = B₁",
      bitFormula: "011(M) ∧ 101(C) = 001(B)",
      result: 1,
      edges: ["3-1", "5-1"],
    },
    {
      relation: "M∧Y=R",
      inputs: ["M₃", "Y₆"],
      rankedFormula: "greatest lower bound · M₃ ∧ Y₆ = R₂",
      bitFormula: "011(M) ∧ 110(Y) = 010(R)",
      result: 2,
      edges: ["3-2", "6-2"],
    },
    {
      relation: "C∧Y=G",
      inputs: ["C₅", "Y₆"],
      rankedFormula: "greatest lower bound · C₅ ∧ Y₆ = G₄",
      bitFormula: "101(C) ∧ 110(Y) = 100(G)",
      result: 4,
      edges: ["5-4", "6-4"],
    },
  ])(
    "shows the canonical $relation formula and two correctly directed cover edges",
    ({ inputs, rankedFormula, bitFormula, result, edges }) => {
      const { container } = renderWithLanguage();
      enterMixing();

      for (const input of inputs) {
        fireEvent.click(screen.getByRole("button", { name: `${input}, available as an input` }));
      }

      const status = screen.getByTestId("cube-mix-status");
      expect(status.textContent).toContain(rankedFormula);
      expect(status.textContent).toContain(bitFormula);
      expect(container.querySelector(`[data-mix-result="${result}"]`)).not.toBeNull();

      const directedEdges = [...container.querySelectorAll('[data-testid^="cube-mix-edge-"]')];
      expect(directedEdges).toHaveLength(2);
      for (const edgeId of edges) {
        expect(container.querySelector(`[data-testid="cube-mix-edge-${edgeId}"]`)).not.toBeNull();
      }
      for (const edge of directedEdges) {
        expect(edge.getAttribute("marker-end")).toBe("url(#cube-mix-arrow)");
      }
    },
  );

  it("uses the canonical R-B-G order and all nine two-stage cover edges for the RGB triple", () => {
    const { container } = renderWithLanguage();
    enterMixing();

    fireEvent.click(screen.getByRole("button", { name: "R₂, available as an input" }));
    fireEvent.click(screen.getByRole("button", { name: "G₄, available as an input" }));
    fireEvent.click(screen.getByRole("button", { name: "B₁, available as an input" }));

    const status = screen.getByTestId("cube-mix-status");
    expect(status.textContent).toContain("least upper bound · R₂ ∨ B₁ ∨ G₄ = W₇");
    expect(status.textContent).toContain("010(R) ∨ 001(B) ∨ 100(G) = 111(W)");
    expect(container.querySelector('[data-mix-result="7"]')).not.toBeNull();

    const directedEdges = [...container.querySelectorAll('[data-testid^="cube-mix-edge-"]')];
    expect(directedEdges).toHaveLength(9);
    for (const edgeId of ["1-3", "1-5", "2-3", "2-6", "4-5", "4-6", "3-7", "5-7", "6-7"]) {
      expect(container.querySelector(`[data-testid="cube-mix-edge-${edgeId}"]`)).not.toBeNull();
    }
    for (const edge of directedEdges) {
      expect(edge.getAttribute("marker-end")).toBe("url(#cube-mix-arrow)");
    }
    for (const level of [3, 5, 6]) {
      const intermediate = container.querySelector(`[data-level="${level}"][data-mix-state="intermediate"]`);
      expect(intermediate?.querySelector(`[data-mix-intermediate="${level}"]`)).not.toBeNull();
    }
  });

  it("shows the exact CMY triple meet and all nine two-stage cover edges at K", () => {
    const { container } = renderWithLanguage();
    enterMixing();

    fireEvent.click(screen.getByRole("button", { name: "C₅, available as an input" }));
    fireEvent.click(screen.getByRole("button", { name: "M₃, available as an input" }));
    fireEvent.click(screen.getByRole("button", { name: "Y₆, available as an input" }));

    const status = screen.getByTestId("cube-mix-status");
    expect(status.textContent).toContain("greatest lower bound · C₅ ∧ M₃ ∧ Y₆ = K₀");
    expect(status.textContent).toContain("101(C) ∧ 011(M) ∧ 110(Y) = 000(K)");
    expect(container.querySelector('[data-mix-result="0"]')).not.toBeNull();

    const directedEdges = [...container.querySelectorAll('[data-testid^="cube-mix-edge-"]')];
    expect(directedEdges).toHaveLength(9);
    for (const edgeId of ["5-1", "5-4", "3-1", "3-2", "6-2", "6-4", "1-0", "2-0", "4-0"]) {
      expect(container.querySelector(`[data-testid="cube-mix-edge-${edgeId}"]`)).not.toBeNull();
    }
    for (const edge of directedEdges) {
      expect(edge.getAttribute("marker-end")).toBe("url(#cube-mix-arrow)");
    }
    for (const level of [1, 2, 4]) {
      const intermediate = container.querySelector(`[data-level="${level}"][data-mix-state="intermediate"]`);
      expect(intermediate?.querySelector(`[data-mix-intermediate="${level}"]`)).not.toBeNull();
    }
  });

  it("restores the normal image role and a previously enabled complement overlay on exit", () => {
    const { container } = renderWithLanguage();

    fireEvent.click(screen.getByRole("button", { name: "Complements" }));
    expect(container.querySelectorAll('[data-testid^="cube-complement-"]')).toHaveLength(4);

    enterMixing();
    expect(container.querySelectorAll('[data-testid^="cube-complement-"]')).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Exit mixing" }));

    expect(screen.getByRole("img", { name: "Color Cube" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Complements" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Hasse" }).getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelectorAll('[data-testid^="cube-complement-"]')).toHaveLength(4);
  });
});
