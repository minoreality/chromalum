// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CANONICAL_HUE_ANGLES_BY_LEVEL,
  CANONICAL_HUE_CYCLE,
  CHROMALUM_HUE_EDGE_LEVEL_DELTAS,
  CHROMALUM_TONE_DENOMINATOR,
} from "../../../chromalum-color-model";
import { LanguageProvider } from "../../../i18n";
import { findToneIntersections, ToneZigzag } from "../ToneZigzag";

function renderToneZigzag(hlLevel: number | null = null, onHover = vi.fn()) {
  localStorage.setItem("chromalum_lang", "en");
  return {
    ...render(
      <LanguageProvider>
        <ToneZigzag hlLevel={hlLevel} onHover={onHover} />
      </LanguageProvider>,
    ),
    onHover,
  };
}

describe("ToneZigzag", () => {
  it("derives every integer-level fiber from the canonical hue model", () => {
    for (let level = 0; level <= CHROMALUM_TONE_DENOMINATOR; level++) {
      const actual = findToneIntersections(level / CHROMALUM_TONE_DENOMINATOR).map(({ h }) => Math.round(h));
      expect(actual).toEqual(CANONICAL_HUE_ANGLES_BY_LEVEL[level]);
    }
  });

  it("keeps four-preimage behavior only in the two intermediate bands", () => {
    expect(findToneIntersections(1.5 / 7)).toHaveLength(2);
    expect(findToneIntersections(2.5 / 7)).toHaveLength(4);
    expect(findToneIntersections(3.5 / 7)).toHaveLength(2);
    expect(findToneIntersections(4.5 / 7)).toHaveLength(4);
    expect(findToneIntersections(5.5 / 7)).toHaveLength(2);
  });

  it("deduplicates the R intersection at the circular seam", () => {
    const hits = findToneIntersections(2 / 7);

    expect(hits.map(({ h }) => Math.round(h))).toEqual([0, 225, 270]);
    expect(hits.filter(({ h }) => h < 0.5 || h > 359.5)).toHaveLength(1);
  });

  it("renders the canonical fourteen intersections and six signed edges", () => {
    const { container } = renderToneZigzag();

    expect(container.querySelectorAll("[data-tone-intersection]")).toHaveLength(CANONICAL_HUE_CYCLE.length);
    expect(container.querySelectorAll("[data-hue-edge]")).toHaveLength(6);
    expect(container.querySelectorAll("[data-edge-row]")).toHaveLength(6);
    expect(CHROMALUM_HUE_EDGE_LEVEL_DELTAS).toEqual([4, -2, 1, -4, 2, -1]);
    expect(screen.getByText("T(h + 1/2) = 1 − T(h)")).toBeTruthy();
  });

  it("aligns the ordered level sequence with the fourteen plotted intersections", () => {
    const { container } = renderToneZigzag();
    const sequence = container.querySelector("[data-tone-sequence='true']");
    const labels = [...container.querySelectorAll("[data-sequence-index]")];
    const intersections = [...container.querySelectorAll("[data-tone-intersection]")];
    const svg = container.querySelector("svg");

    expect(sequence?.getAttribute("role")).toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.querySelectorAll("[role='button']")).toHaveLength(0);
    expect(svg?.querySelector("desc")?.textContent).toContain("2 3 4 5 6 5 4 5 4 3 2 1 2 3");
    expect(labels).toHaveLength(14);
    expect(labels.map((label) => Number(label.getAttribute("data-sequence-level")))).toEqual([2, 3, 4, 5, 6, 5, 4, 5, 4, 3, 2, 1, 2, 3]);

    labels.forEach((label, index) => {
      const dot = intersections[index].querySelector("circle");
      expect(label.getAttribute("x")).toBe(dot?.getAttribute("cx"));
      expect(label.getAttribute("fill")).toBe(dot?.getAttribute("fill"));
      expect(Number(label.getAttribute("data-sequence-hue"))).toBe(CANONICAL_HUE_CYCLE[index].hueAngleDeg);
    });
  });

  it("presents transition, toggle, delta, and inclusion in a fitted full-width table", () => {
    const { container } = renderToneZigzag();

    const table = screen.getByRole("table");
    const wrapper = container.querySelector<HTMLElement>(".theory-zigzag-table-wrap")!;
    expect(table.style.width).toBe("100%");
    expect(table.style.tableLayout).toBe("fixed");
    expect(table.style.minWidth).toBe("");
    expect(wrapper.style.overflowX).toBe("");
    expect([...table.querySelectorAll("col")].map((column) => column.getAttribute("style"))).toEqual([
      "width: 28%;",
      "width: 38%;",
      "width: 14%;",
      "width: 20%;",
    ]);

    const rows = table.querySelectorAll("tbody tr");
    expect(rows[0].textContent).toContain("R₂ → Y₆");
    expect(rows[0].textContent).toContain("τG");
    expect(rows[0].textContent).toContain("+4");
    expect(rows[0].textContent).toContain("R₂ ⊂ Y₆");
    expect(rows[1].textContent).toContain("Y₆ ⊃ G₄");
  });

  it("keeps hover, focus, pinning, and keyboard activation on eight external level buttons", async () => {
    const onHover = vi.fn();
    const { container } = renderToneZigzag(null, onHover);
    const scrollContainer = container.querySelector<HTMLElement>(".theory-zigzag-level-scroll")!;
    const controlGroup = container.querySelector<HTMLElement>("[data-tone-level-controls='true']")!;
    const controls = container.querySelectorAll<HTMLButtonElement>("[data-tone-level-control]");
    const levelFour = container.querySelector<HTMLButtonElement>("[data-tone-level-control='4']")!;

    expect(controls).toHaveLength(8);
    expect(scrollContainer.style.overflowX).toBe("auto");
    expect(controlGroup.style.flexWrap).toBe("nowrap");
    expect(controlGroup.style.width).toBe("max-content");
    expect(controlGroup.style.minWidth).toBe("100%");
    expect(levelFour.tagName).toBe("BUTTON");
    expect(levelFour.type).toBe("button");
    expect(levelFour.tabIndex).toBe(0);
    expect(levelFour.style.minWidth).toBe("0px");
    expect(levelFour.style.minHeight).toBe("36px");
    expect(levelFour.style.flex).toBe("0 0 auto");
    expect(levelFour.style.whiteSpace).toBe("nowrap");

    fireEvent.mouseEnter(levelFour);
    fireEvent.mouseLeave(levelFour);
    expect(onHover).toHaveBeenNthCalledWith(1, 4);
    expect(onHover).toHaveBeenNthCalledWith(2, null);

    levelFour.focus();
    expect(document.activeElement).toBe(levelFour);
    expect(onHover).toHaveBeenLastCalledWith(4);
    fireEvent.blur(levelFour);
    expect(onHover).toHaveBeenLastCalledWith(null);

    fireEvent.keyDown(levelFour, { key: "Enter" });
    await waitFor(() => expect(levelFour.getAttribute("aria-pressed")).toBe("true"));
    expect(container.querySelector("[data-active-fiber='4']")?.textContent).toContain("N4 = 3");
    expect(onHover).toHaveBeenLastCalledWith(4);

    fireEvent.keyDown(levelFour, { key: " " });
    await waitFor(() => expect(levelFour.getAttribute("aria-pressed")).toBe("false"));
    expect(onHover).toHaveBeenLastCalledWith(null);

    const levelFive = container.querySelector<HTMLButtonElement>("[data-tone-level-control='5']")!;
    fireEvent.click(levelFive);
    await waitFor(() => expect(levelFive.getAttribute("aria-pressed")).toBe("true"));
    expect(container.querySelector("[data-active-fiber='5']")?.textContent).toContain("N5 = 3");
  });

  it("restores direct graph hover without making the SVG keyboard-interactive", () => {
    const onHover = vi.fn();
    const { container } = renderToneZigzag(null, onHover);
    const hoverLayer = container.querySelector<SVGGElement>("[data-tone-hover-layer='true']")!;
    const levelFour = container.querySelector<SVGRectElement>("[data-tone-level-hover='4']")!;
    const svg = container.querySelector("svg")!;

    expect(container.querySelectorAll("[data-tone-level-hover]")).toHaveLength(8);
    expect(hoverLayer.getAttribute("aria-hidden")).toBe("true");
    expect(svg.querySelectorAll("[role='button'], [tabindex]")).toHaveLength(0);

    fireEvent.mouseEnter(levelFour);
    expect(onHover).toHaveBeenLastCalledWith(4);

    fireEvent.mouseLeave(hoverLayer);
    expect(onHover).toHaveBeenLastCalledWith(null);
  });
});
