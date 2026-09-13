// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { VennDiagram } from "../VennDiagram";

function renderWithLanguage(onHover = vi.fn(), hlLevel: number | null = null) {
  localStorage.setItem("chromalum_lang", "en");
  const result = render(
    <LanguageProvider>
      <VennDiagram hlLevel={hlLevel} onHover={onHover} />
    </LanguageProvider>,
  );
  return { ...result, onHover };
}

describe("VennDiagram", () => {
  it("renders 8 region labels matching P({G,R,B})", () => {
    const { container } = renderWithLanguage();
    expect(container.querySelectorAll('[data-venn-primary][data-active="true"]')).toHaveLength(3);
    for (let lv = 0; lv <= 7; lv++) {
      expect(container.querySelector(`[data-testid="venn-region-${lv}"]`)).toBeTruthy();
    }
  });

  it("fills enabled primaries and leaves disabled channels as colored outlines for all eight states", () => {
    const view = (selectedLevel: number) => (
      <LanguageProvider>
        <VennDiagram hlLevel={null} onHover={vi.fn()} selectedLevel={selectedLevel} />
      </LanguageProvider>
    );
    const { container, rerender } = render(view(0));
    const states = [[], ["B"], ["R"], ["R", "B"], ["G"], ["G", "B"], ["R", "G"], ["R", "G", "B"]];
    const colors = { R: "#ff0000", G: "#00ff00", B: "#0000ff" };
    for (const [level, enabled] of states.entries()) {
      rerender(view(level));
      expect(
        [...container.querySelectorAll('[data-venn-primary][data-active="true"]')].map((node) => node.getAttribute("data-venn-primary")),
      ).toEqual(enabled);
      for (const [channel, color] of Object.entries(colors)) {
        const fill = container.querySelector(`[data-venn-primary="${channel}"]`)!;
        const outline = container.querySelector(`[data-venn-outline="${channel}"]`);
        if (enabled.includes(channel)) {
          expect(fill.getAttribute("fill")).toBe(color);
          expect(outline).toBeNull();
        } else {
          expect(fill.getAttribute("fill")).toBe("none");
          expect(outline?.getAttribute("fill")).toBe("none");
          expect(outline?.getAttribute("stroke")).toBe(color);
          for (const dimension of ["cx", "cy", "r"]) {
            expect(outline?.getAttribute(dimension)).toBe(fill.getAttribute(dimension));
          }
        }
      }
    }
  });

  it("adds missing primaries or removes all of a region's primaries when they are already enabled", () => {
    const onHover = vi.fn();
    function InteractiveDiagram() {
      const [selected, setSelected] = useState(0);
      return <VennDiagram hlLevel={null} onHover={onHover} selectedLevel={selected} onSelect={setSelected} />;
    }
    const { container } = render(
      <LanguageProvider>
        <InteractiveDiagram />
      </LanguageProvider>,
    );
    const svg = container.querySelector("svg")!;
    const [x, y, width, height] = svg.getAttribute("viewBox")!.split(" ").map(Number);
    svg.getBoundingClientRect = () => new DOMRect(x, y, width, height);
    for (const [region, selected] of [
      [2, 2],
      [4, 6],
      [2, 4],
      [1, 5],
      [2, 7],
      [4, 3],
      [2, 1],
      [1, 0],
      [6, 6],
      [6, 0],
      [7, 7],
      [7, 0],
      [6, 6],
      [3, 7],
      [6, 1],
      [3, 3],
      [3, 0],
      [5, 5],
      [5, 0],
      [2, 2],
      [3, 3],
      [5, 7],
      [5, 2],
      [0, 0],
    ]) {
      const label = container.querySelector(`[data-testid="venn-region-${region}"] text`)!;
      fireEvent.click(svg, { clientX: Number(label.getAttribute("x")), clientY: Number(label.getAttribute("y")) });
      expect(svg.getAttribute("data-selected-level")).toBe(String(selected));
      expect(onHover).toHaveBeenLastCalledWith(selected);
    }
  });

  it("dims non-active regions when a level is highlighted", () => {
    const { container } = renderWithLanguage(vi.fn(), 6);
    const r6 = container.querySelector('[data-testid="venn-region-6"]');
    const r1 = container.querySelector('[data-testid="venn-region-1"]');
    expect(r6?.getAttribute("opacity")).toBe("1");
    expect(Number(r1?.getAttribute("opacity"))).toBeLessThan(1);
  });

  it("does not draw an outer dashed frame when the empty-set region is active", () => {
    const { container } = renderWithLanguage(vi.fn(), 0);
    expect(container.querySelector("svg [stroke-dasharray]")).toBeNull();
  });

  it("calls onHover with the correct level when the mouse moves over a region", () => {
    const { container, onHover } = renderWithLanguage();
    const svg = container.querySelector('svg[role="img"]') as SVGSVGElement;
    // Stub getBoundingClientRect so coordinate math is deterministic.
    svg.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 300,
      height: 260,
      right: 300,
      bottom: 260,
      toJSON: () => ({}),
    });
    // viewBox (150, 150) is inside all 3 circles → level 7 (White)
    fireEvent.mouseMove(svg, { clientX: 150, clientY: 150 });
    expect(onHover).toHaveBeenCalledWith(7);
    // viewBox (40, 32) is outside all circles → level 0 (Black)
    fireEvent.mouseMove(svg, { clientX: 40, clientY: 32 });
    expect(onHover).toHaveBeenCalledWith(0);
  });
});
