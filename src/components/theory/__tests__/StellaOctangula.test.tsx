// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { StellaOctangula } from "../StellaOctangula";

function renderStella() {
  localStorage.setItem("chromalum_lang", "en");
  const onHover = vi.fn();
  const rendered = render(
    <LanguageProvider>
      <StellaOctangula hlLevel={null} onHover={onHover} />
    </LanguageProvider>,
  );
  return { ...rendered, onHover };
}

function renderControlledStella() {
  localStorage.setItem("chromalum_lang", "en");
  const onHover = vi.fn();

  function ControlledStella() {
    const [hlLevel, setHlLevel] = useState<number | null>(null);
    return (
      <StellaOctangula
        hlLevel={hlLevel}
        onHover={(level) => {
          onHover(level);
          setHlLevel(level);
        }}
      />
    );
  }

  const rendered = render(
    <LanguageProvider>
      <ControlledStella />
    </LanguageProvider>,
  );
  return { ...rendered, onHover };
}

function visibleLevels(container: HTMLElement): number[] {
  return [...container.querySelectorAll<SVGGElement>("[data-stella-vertex]")].map((vertex) =>
    Number(vertex.getAttribute("data-stella-vertex")),
  );
}

function visibleEdges(container: HTMLElement): string[] {
  return [...container.querySelectorAll<SVGGElement>("[data-stella-edge]")].map((edge) => edge.getAttribute("data-stella-edge") ?? "");
}

describe("StellaOctangula", () => {
  it("adds isolated T0 and T1 modes without changing the compound, surface, or K8 controls", () => {
    const { container } = renderStella();
    const diagram = screen.getByRole("group", { name: "Color Tetrahedra and Color Star" });

    expect(diagram.getAttribute("data-stella-mode")).toBe("compound");
    expect(visibleLevels(container)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(visibleEdges(container)).toHaveLength(12);
    expect(container.querySelectorAll("[data-stella-face]")).toHaveLength(8);

    fireEvent.click(screen.getByRole("button", { name: /T0/i }));
    expect(diagram.getAttribute("data-stella-mode")).toBe("t0");
    expect(visibleLevels(container)).toEqual([0, 3, 5, 6]);
    expect(visibleEdges(container)).toEqual(["0-3", "0-5", "0-6", "3-5", "3-6", "5-6"]);
    expect(container.querySelectorAll('[data-stella-face][data-stella-tetra="t0"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-stella-face][data-stella-tetra="t1"]')).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /T1/i }));
    expect(diagram.getAttribute("data-stella-mode")).toBe("t1");
    expect(visibleLevels(container)).toEqual([1, 2, 4, 7]);
    expect(visibleEdges(container)).toEqual(["1-2", "1-4", "1-7", "2-4", "2-7", "4-7"]);
    expect(container.querySelectorAll('[data-stella-face][data-stella-tetra="t0"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-stella-face][data-stella-tetra="t1"]')).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: "Surface" }));
    expect(diagram.getAttribute("data-stella-mode")).toBe("compound");
    expect(screen.getByRole("button", { name: "Surface" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "K₈" }));
    expect(diagram.getAttribute("data-stella-mode")).toBe("k8");
    expect(visibleLevels(container)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

    fireEvent.click(screen.getByRole("button", { name: "Compound" }));
    expect(diagram.getAttribute("data-stella-mode")).toBe("compound");
    expect(visibleEdges(container)).toHaveLength(12);
  });

  it("keeps isolated tetrahedron vertices hoverable, pinnable, and keyboard operable", async () => {
    const { onHover } = renderStella();

    fireEvent.click(screen.getByRole("button", { name: /T0/i }));
    const black = screen.getByRole("button", { name: "K · 0 · 000" });

    fireEvent.mouseEnter(black);
    expect(onHover).toHaveBeenLastCalledWith(0);
    fireEvent.mouseLeave(black);
    expect(onHover).toHaveBeenLastCalledWith(null);

    fireEvent.focus(black);
    expect(onHover).toHaveBeenLastCalledWith(0);
    fireEvent.blur(black);
    expect(onHover).toHaveBeenLastCalledWith(null);

    fireEvent.click(black);
    await waitFor(() => expect(onHover).toHaveBeenLastCalledWith(0));
    expect(black.getAttribute("aria-pressed")).toBe("true");

    fireEvent.keyDown(black, { key: " " });
    await waitFor(() => expect(onHover).toHaveBeenLastCalledWith(null));
    expect(black.getAttribute("aria-pressed")).toBe("false");
  });

  it("clears a pinned and shared highlight before switching to the other tetrahedron", async () => {
    const { container, onHover } = renderControlledStella();

    fireEvent.click(screen.getByRole("button", { name: /T0/i }));
    fireEvent.click(screen.getByRole("button", { name: "K · 0 · 000" }));
    await waitFor(() => expect(onHover).toHaveBeenLastCalledWith(0));
    expect(screen.getByRole("button", { name: "K · 0 · 000" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /T1/i }));
    await waitFor(() => expect(onHover).toHaveBeenLastCalledWith(null));
    expect(visibleLevels(container)).toEqual([1, 2, 4, 7]);
    for (const vertex of container.querySelectorAll("[data-stella-vertex]")) {
      expect(vertex.getAttribute("data-stella-dimmed")).toBe("false");
    }

    fireEvent.click(screen.getByRole("button", { name: /T0/i }));
    expect(screen.getByRole("button", { name: "K · 0 · 000" }).getAttribute("aria-pressed")).toBe("false");
  });

  it.each([
    { a: "K · 0 · 000", b: "B · 1 · 001", edge: "0-1", maskBits: "001", distance: "1", label: "distance 1" },
    { a: "B · 1 · 001", b: "R · 2 · 010", edge: "1-2", maskBits: "011", distance: "2", label: "distance 2" },
    { a: "R · 2 · 010", b: "C · 5 · 101", edge: "2-5", maskBits: "111", distance: "3", label: "distance 3" },
  ])("compares a directly selected K8 pair at $label", ({ a, b, edge, maskBits, distance, label }) => {
    const { container } = renderStella();
    fireEvent.click(screen.getByRole("button", { name: "K₈" }));

    fireEvent.click(screen.getByRole("button", { name: a }));
    fireEvent.click(screen.getByRole("button", { name: b }));

    const status = screen.getByTestId("stella-comparison-status");
    expect(status.textContent).toContain(`wt(${maskBits})`);
    expect(status.textContent).toContain(`= ${distance}`);
    expect(status.textContent).toContain(label);
    expect(container.querySelector(`[data-k8-edge="${edge}"]`)?.getAttribute("data-k8-edge-active")).toBe("true");
    expect(container.querySelectorAll('[data-k8-edge-active="true"]')).toHaveLength(1);
  });

  it("keeps the K8 anchor while replacing the target and clears the comparison on Escape", () => {
    const { container } = renderStella();
    fireEvent.click(screen.getByRole("button", { name: "K₈" }));
    fireEvent.click(screen.getByRole("button", { name: "R · 2 · 010" }));
    fireEvent.click(screen.getByRole("button", { name: "C · 5 · 101" }));

    fireEvent.click(screen.getByRole("button", { name: "G · 4 · 100" }));
    expect(container.querySelector('[data-stella-comparison-role="a"]')?.getAttribute("data-stella-vertex")).toBe("2");
    expect(container.querySelector('[data-stella-comparison-role="b"]')?.getAttribute("data-stella-vertex")).toBe("4");
    expect(screen.getByTestId("stella-comparison-status").textContent).toContain("distance 2");

    fireEvent.keyDown(container.querySelector('[data-stella-vertex="4"]')!, { key: "Escape" });
    expect(container.querySelector("[data-stella-comparison-role]")).toBeNull();
    expect(screen.getByTestId("stella-comparison-status").textContent).toBe("Select an anchor vertex in K₈");
  });
});
