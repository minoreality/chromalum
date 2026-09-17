// @vitest-environment jsdom
import { fireEvent, isInaccessible, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { OCTA_EDGES, THEORY_LEVELS } from "../../../data/theory-data";
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

const bitsOf = (lv: number) => lv.toString(2).padStart(3, "0");
function pairFor(a: number, b: number) {
  const choices = screen.getByRole("group", { name: "Select an octahedral edge" });
  return within(choices).getByRole("button", {
    name: `Octahedral edge ${THEORY_LEVELS[a].short} ${bitsOf(a)} — ${THEORY_LEVELS[b].short} ${bitsOf(b)}`,
  });
}

describe("ChromaticOctahedron", () => {
  it("wears the mask that carries one end of the edge to the other", () => {
    const { container } = renderOctahedron();
    const strokeOf = (a: number, b: number) => container.querySelector(`[data-octa-edge='${a}-${b}']`)!.getAttribute("stroke");

    // Every edge shows a ⊕ b, so the colour names the channels that invert.
    for (const [a, b] of OCTA_EDGES) expect(strokeOf(a, b)).toBe(THEORY_LEVELS[a ^ b].color);

    // The six one-channel edges are the hue cycle, drawn in the primaries.
    const hueCycle: readonly number[] = [1, 3, 2, 6, 4, 5];
    for (let index = 0; index < hueCycle.length; index++) {
      const a = hueCycle[index];
      const b = hueCycle[(index + 1) % hueCycle.length];
      const [low, high] = a < b ? [a, b] : [b, a];
      expect(THEORY_LEVELS[a ^ b].bits.reduce((sum, value) => sum + value, 0)).toBe(1);
      expect(strokeOf(low, high)).toBe(THEORY_LEVELS[a ^ b].color);
    }

    // The other six outline the two opposite faces, drawn in the secondaries.
    for (const face of [
      [2, 4, 1],
      [5, 3, 6],
    ] as const) {
      for (const [a, b] of [
        [face[0], face[1]],
        [face[1], face[2]],
        [face[0], face[2]],
      ] as const) {
        const [low, high] = a < b ? [a, b] : [b, a];
        expect(THEORY_LEVELS[a ^ b].bits.reduce((sum, value) => sum + value, 0)).toBe(2);
        expect(strokeOf(low, high)).toBe(THEORY_LEVELS[a ^ b].color);
      }
    }

    // Each mask appears on exactly the two edges that face each other.
    const byMask = new Map<number, string[]>();
    for (const [a, b] of OCTA_EDGES) byMask.set(a ^ b, [...(byMask.get(a ^ b) ?? []), `${a}-${b}`]);
    expect([...byMask.keys()].sort((first, second) => first - second)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const [mask, pair] of byMask) {
      expect(pair).toHaveLength(2);
      const [first, second] = pair.map((key) => key.split("-").map(Number));
      expect([first[0] ^ 7, first[1] ^ 7].sort()).toEqual([...second].sort());
      expect(mask).toBeGreaterThan(0);
    }
  });

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
    // The figure only draws; the twelve choices live in the list below it.
    expect(screen.getAllByRole("button")).toHaveLength(12);
    expect(container.querySelectorAll("svg [role='button']")).toHaveLength(0);
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

  it("selects and deselects an edge from the list with the keyboard while retaining a choice after preview", () => {
    const { container } = renderOctahedron();
    const edge = pairFor(1, 2);
    fireEvent.focus(edge);
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("001 ⊕ 010 = 011");
    fireEvent.blur(edge);
    expectGeneralResults();
    fireEvent.click(edge);
    expect(edge.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("001 ⊕ 010 = 011");
    // Hovering another choice previews it without losing the pinned one.
    const other = pairFor(2, 4);
    fireEvent.mouseEnter(other);
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("010 ⊕ 100 = 110");
    fireEvent.mouseLeave(other);
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("001 ⊕ 010 = 011");
    expect(edge.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(edge);
    expect(edge.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelectorAll("[data-edge-face-role]")).toHaveLength(0);
    expectGeneralResults();
    fireEvent.click(edge);
    expect(edge.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-edge-face-role], [data-edge-result]")).toHaveLength(4);
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("001 ⊕ 010 = 011");
  });

  it("keeps aria-pressed on the pinned edge while focus or hover previews another", () => {
    const { container } = renderOctahedron();
    const pinnedPair = pairFor(1, 2);
    const otherPair = pairFor(2, 4);

    fireEvent.focus(otherPair);
    expect(otherPair.getAttribute("aria-pressed")).toBe("false");
    expect(otherPair.getAttribute("data-active")).toBe("true");
    fireEvent.blur(otherPair);
    expect(otherPair.getAttribute("data-active")).toBe("false");

    fireEvent.click(pinnedPair);
    expect(pinnedPair.getAttribute("aria-pressed")).toBe("true");
    fireEvent.focus(otherPair);
    expect(pinnedPair.getAttribute("aria-pressed")).toBe("true");
    expect(otherPair.getAttribute("aria-pressed")).toBe("false");
    expect(pinnedPair.getAttribute("data-active")).toBe("false");
    expect(otherPair.getAttribute("data-active")).toBe("true");
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("010 ⊕ 100 = 110");
    fireEvent.blur(otherPair);
    fireEvent.mouseEnter(otherPair);
    expect(pinnedPair.getAttribute("aria-pressed")).toBe("true");
    expect(otherPair.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelectorAll("[aria-pressed='true']")).toHaveLength(1);
    fireEvent.mouseLeave(otherPair);
    expect(pinnedPair.getAttribute("data-active")).toBe("true");
  });

  it("toggles an edge from the list and shows the choice on the figure", () => {
    const { container } = renderOctahedron();
    const pair = pairFor(3, 5);
    const drawn = () => container.querySelector("[data-octa-edge='3-5']")!.getAttribute("data-edge-selected");
    fireEvent.click(pair);
    expect(pair.getAttribute("aria-pressed")).toBe("true");
    expect(drawn()).toBe("true");
    expect(screen.getByTestId("octahedron-selection").textContent).toContain("011 ⊕ 101 = 110");
    fireEvent.click(pair);
    expect(pair.getAttribute("aria-pressed")).toBe("false");
    expect(drawn()).toBe("false");
    expectGeneralResults();
  });

  it("clears a selected edge from anywhere on the diagram", () => {
    const { container } = renderOctahedron();
    const pair = pairFor(1, 3);
    // The figure never selects, so a click anywhere in it can only clear.
    for (const target of [
      container.querySelector("svg")!,
      container.querySelector("[data-octa-vertex='3'] circle:last-of-type")!,
      container.querySelector("[data-octa-edge='1-3']")!,
    ]) {
      fireEvent.click(pair);
      fireEvent.mouseLeave(pair);
      expect(pair.getAttribute("aria-pressed")).toBe("true");
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
    fireEvent.mouseEnter(pairFor(2, 4));
    rerender(<Controlled reset={1} />);
    expectGeneralResults();
    fireEvent.click(pairFor(1, 2));
    fireEvent.mouseEnter(pairFor(2, 4));
    expect(pairFor(1, 2).getAttribute("aria-pressed")).toBe("true");
    rerender(<Controlled reset={2} />);
    expect(container.querySelectorAll("[aria-pressed='true'], [data-edge-face-role], [data-edge-node-role]")).toHaveLength(0);
    expectGeneralResults();
  });
});
