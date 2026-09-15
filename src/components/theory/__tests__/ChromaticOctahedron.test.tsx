// @vitest-environment jsdom
import { fireEvent, isInaccessible, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { OCTA_EDGES } from "../../../data/theory-data";
import { ChromaticOctahedron } from "../ChromaticOctahedron";
import { PinResetContext } from "../pin-reset";

function renderOctahedron() {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <ChromaticOctahedron />
    </LanguageProvider>,
  );
}

function expectGeneralResults() {
  const status = screen.getByTestId("octahedron-selection");
  const results = [...status.querySelectorAll("[data-edge-result]")];
  expect(results).toHaveLength(2);
  expect(results.some(isInaccessible)).toBe(false);
  expect(results[0].textContent).toContain("a ⊕ b = c");
  expect(results[0].textContent).toContain("Face {a,b,c}");
  expect(results[0].textContent).toContain("Three-vertex XOR: 000");
  expect(results[1].textContent).toContain("¬(a ⊕ b) = ¬c");
  expect(results[1].textContent).toContain("Face {a,b,¬c}");
  expect(results[1].textContent).toContain("Three-vertex XOR: 111");
  expect(results.every((result) => !result.querySelector(".theory-octahedron-swatch"))).toBe(true);
}

describe("ChromaticOctahedron", () => {
  it("starts with an unselected octahedron, all six colors and only edge controls", () => {
    const { container } = renderOctahedron();
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.querySelectorAll("[data-octa-vertex]")).toHaveLength(6);
    expect(container.querySelectorAll("[data-octa-surface-face]")).toHaveLength(8);
    expect(container.querySelectorAll("[data-octa-edge]")).toHaveLength(12);
    const labels = [...container.querySelectorAll("[data-octa-vertex] text")].map((el) => el.textContent);
    expect(labels.sort()).toEqual(["B", "C", "G", "M", "R", "Y"]);
    expect(container.querySelector("[data-die-vertex], [data-cube-edge], [data-die-face], path")).toBeNull();
    expect(container.textContent).not.toMatch(/die vertex|die face|mixing|join|meet/i);
    expect(screen.getAllByRole("button")).toHaveLength(24);
    expect(container.querySelectorAll("[aria-pressed='true'], [data-edge-face-role], [data-edge-node-role]")).toHaveLength(0);
    expectGeneralResults();
    expect([...container.querySelectorAll("[data-octa-vertex]")].every((vertex) => vertex.getAttribute("opacity") === "1")).toBe(true);
  });

  it("completes every edge with its XOR and complement triangles", () => {
    const { container } = renderOctahedron();
    expectGeneralResults();
    const controls = within(screen.getByRole("group", { name: "Select an octahedral edge" })).getAllByRole("button");
    expect(controls).toHaveLength(12);
    for (const [index, [a, b]] of OCTA_EDGES.entries()) {
      fireEvent.mouseEnter(controls[index]);
      expect(container.querySelectorAll("[data-octa-surface-face][data-active='true']")).toHaveLength(2);
      expect(container.querySelectorAll("[data-edge-selected='true']")).toHaveLength(1);
      for (const [role, result, parity] of [
        ["xor", a ^ b, 0],
        ["complement", a ^ b ^ 7, 7],
      ] as const) {
        const triangle = container.querySelector("[data-edge-face-role='" + role + "']")!;
        const vertices = triangle.getAttribute("data-face-verts")!.split("-").map(Number);
        expect(new Set(vertices)).toEqual(new Set([a, b, result]));
        expect(vertices.reduce((x, y) => x ^ y)).toBe(parity);
        expect(container.querySelector("[data-edge-node-role='" + role + "']")?.getAttribute("data-octa-vertex")).toBe(String(result));
        expect(container.querySelector("[data-edge-result='" + role + "']")?.textContent).toContain(result.toString(2).padStart(3, "0"));
      }
      fireEvent.mouseLeave(controls[index]);
      expectGeneralResults();
      expect(container.querySelectorAll("[data-octa-surface-face][data-active='true']")).toHaveLength(0);
    }
  });

  it("selects and deselects SVG edges with the keyboard while retaining a choice after preview", () => {
    const { container } = renderOctahedron();
    const edge = container.querySelector("[data-octa-edge-control='1-2']")!;
    fireEvent.focus(edge);
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("001 ⊕ 010 = 011");
    fireEvent.blur(edge);
    expectGeneralResults();
    fireEvent.keyDown(edge, { key: "Enter" });
    expect(edge.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("001 ⊕ 010 = 011");
    const other = container.querySelector("[data-octa-edge-control='2-4']")!;
    fireEvent.mouseEnter(other);
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("010 ⊕ 100 = 110");
    fireEvent.mouseLeave(other);
    expect(edge.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(edge, { key: " " });
    expect(edge.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelectorAll("[data-edge-face-role]")).toHaveLength(0);
    expectGeneralResults();
    fireEvent.keyDown(edge, { key: "Enter" });
    expect(edge.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-edge-face-role], [data-edge-result]")).toHaveLength(4);
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("001 ⊕ 010 = 011");
  });

  it("keeps aria-pressed on the pinned edge while focus or hover previews another", () => {
    const { container } = renderOctahedron();
    const pinnedEdge = container.querySelector("[data-octa-edge-control='1-2']")!;
    const otherEdge = container.querySelector("[data-octa-edge-control='2-4']")!;
    const choices = screen.getByRole("group", { name: "Select an octahedral edge" });
    const pinnedPair = within(choices).getByRole("button", { name: "Octahedral edge B 001 — R 010" });
    const otherPair = within(choices).getByRole("button", { name: "Octahedral edge R 010 — G 100" });

    fireEvent.focus(otherEdge);
    expect(otherEdge.getAttribute("aria-pressed")).toBe("false");
    expect(otherEdge.getAttribute("data-active")).toBe("true");
    expect(otherPair.getAttribute("data-active")).toBe("true");
    fireEvent.blur(otherEdge);
    expect(otherEdge.getAttribute("data-active")).toBe("false");

    fireEvent.keyDown(pinnedEdge, { key: "Enter" });
    expect(pinnedEdge.getAttribute("aria-pressed")).toBe("true");
    expect(pinnedPair.getAttribute("aria-pressed")).toBe("true");
    fireEvent.focus(otherEdge);
    expect(pinnedEdge.getAttribute("aria-pressed")).toBe("true");
    expect(pinnedPair.getAttribute("aria-pressed")).toBe("true");
    expect(otherEdge.getAttribute("aria-pressed")).toBe("false");
    expect(otherPair.getAttribute("aria-pressed")).toBe("false");
    expect(pinnedPair.getAttribute("data-active")).toBe("false");
    expect(otherPair.getAttribute("data-active")).toBe("true");
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("010 ⊕ 100 = 110");
    fireEvent.blur(otherEdge);
    fireEvent.mouseEnter(otherPair);
    expect(pinnedEdge.getAttribute("aria-pressed")).toBe("true");
    expect(otherPair.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelectorAll("[aria-pressed='true']")).toHaveLength(2);
    fireEvent.mouseLeave(otherPair);
    expect(pinnedPair.getAttribute("data-active")).toBe("true");
  });

  it("toggles the same edge from either SVG or native pair controls", () => {
    const { container } = renderOctahedron();
    const choices = screen.getByRole("group", { name: "Select an octahedral edge" });
    const pair = within(choices).getByRole("button", { name: "Octahedral edge M 011 — C 101" });
    fireEvent.click(pair);
    const edge = container.querySelector("[data-octa-edge-control='3-5']")!;
    expect(edge.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("011 ⊕ 101 = 110");
    fireEvent.click(edge);
    expect(pair.getAttribute("aria-pressed")).toBe("false");
    expectGeneralResults();
    fireEvent.click(edge);
    expect(pair.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-edge-face-role]")).toHaveLength(2);
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("011 ⊕ 101 = 110");
    fireEvent.click(pair);
    expect(edge.getAttribute("aria-pressed")).toBe("false");
    expectGeneralResults();
  });

  it("clears a selected edge from the diagram background or a vertex", () => {
    const { container } = renderOctahedron();
    const edge = container.querySelector("[data-octa-edge-control='1-3']")!;
    for (const target of [container.querySelector("svg")!, container.querySelector("[data-octa-vertex='3'] circle:last-of-type")!]) {
      fireEvent.click(edge);
      fireEvent.mouseLeave(edge);
      expect(edge.getAttribute("aria-pressed")).toBe("true");
      fireEvent.click(target);
      expect(container.querySelectorAll("[aria-pressed='true'], [data-edge-face-role], [data-edge-node-role]")).toHaveLength(0);
      expectGeneralResults();
    }
  });

  it("clears a preview and a chosen edge when the page reset fires", () => {
    localStorage.setItem("chromalum_lang", "en");
    function Controlled({ reset }: { reset: number }) {
      return (
        <LanguageProvider>
          <PinResetContext.Provider value={reset}>
            <ChromaticOctahedron />
          </PinResetContext.Provider>
        </LanguageProvider>
      );
    }
    const { container, rerender } = render(<Controlled reset={0} />);
    fireEvent.mouseEnter(container.querySelector("[data-octa-edge-control='2-4']")!);
    rerender(<Controlled reset={1} />);
    expectGeneralResults();
    fireEvent.click(container.querySelector("[data-octa-edge-control='1-2']")!);
    fireEvent.mouseEnter(container.querySelector("[data-octa-edge-control='2-4']")!);
    expect(container.querySelector("[data-octa-edge-control='1-2']")!.getAttribute("aria-pressed")).toBe("true");
    rerender(<Controlled reset={2} />);
    expect(container.querySelectorAll("[aria-pressed='true'], [data-edge-face-role], [data-edge-node-role]")).toHaveLength(0);
    expectGeneralResults();
  });
});
