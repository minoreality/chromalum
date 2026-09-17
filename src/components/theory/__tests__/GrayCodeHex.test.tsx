// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { HueTraversal } from "../HueTraversal";

function renderTraversal(onHover = vi.fn()) {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <HueTraversal hlLevel={null} onHover={onHover} />
    </LanguageProvider>,
  );
}

function selectedEdges(container: HTMLElement) {
  return ["data-cycle-edge", "data-hue-edge", "data-edge-row"].map((attribute) =>
    [...container.querySelectorAll("[" + attribute + '][data-hue-selected="true"]')].map((element) => element.getAttribute(attribute)),
  );
}

function expectAllDeltas(container: HTMLElement, expected: string[]) {
  for (const selector of ["[data-cycle-delta]", "[data-zigzag-delta]", "[data-edge-row] td:nth-child(3)"]) {
    expect([...container.querySelectorAll(selector)].map((label) => label.textContent)).toEqual(expected);
  }
}

function expectCycleDeltas(container: HTMLElement, selectedEdge: number, signedDelta: string) {
  const expected = ["±4", "±2", "±1", "±4", "±2", "±1"];
  expected[selectedEdge] = signedDelta;
  expectAllDeltas(container, expected);
  expect(container.querySelector(`[data-cycle-edge="${selectedEdge}"]`)?.getAttribute("aria-description")).toBe(`ΔL = ${signedDelta}`);
}

describe("Shared hue traversal", () => {
  it("distinguishes choosing a start, choosing a direction, and making a transition", () => {
    const { container } = renderTraversal();
    const readout = container.querySelector(".theory-hue-readout")!;
    const cycle = screen.getByRole("group", { name: "Chromatic One-Bit Six-Cycle" });
    expect([...cycle.querySelectorAll("[data-cycle-node] > text")].map((node) => node.textContent)).toEqual([
      "010",
      "110",
      "100",
      "101",
      "001",
      "011",
    ]);
    const clockwise = screen.getByRole("button", { name: "Clockwise" });
    const counterclockwise = screen.getByRole("button", { name: "Counter-clockwise" });
    expect(within(cycle).getAllByRole("button")).toHaveLength(6);
    expectAllDeltas(container, ["|4|", "|2|", "|1|", "|4|", "|2|", "|1|"]);
    expect((clockwise as HTMLButtonElement).disabled).toBe(true);
    expect((counterclockwise as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(clockwise);
    fireEvent.click(counterclockwise);
    expect(selectedEdges(container)).toEqual([[], [], []]);
    expect(readout.getAttribute("data-hue-phase")).toBe("choose-start");
    expect(readout.hasAttribute("data-hue-action")).toBe(false);
    expect(cycle.querySelector("polygon")).toBeNull();
    expect(cycle.querySelector("[data-cycle-node][aria-current]")).toBeNull();
    expect(container.querySelector(".theory-hue-caption")?.textContent).toBe("Each node represents a color state.");

    fireEvent.click(within(cycle).getByRole("button", { name: "Choose R 010 as the starting color" }));
    expectAllDeltas(container, ["Δ4", "Δ2", "Δ1", "Δ4", "Δ2", "Δ1"]);
    expect((clockwise as HTMLButtonElement).disabled).toBe(false);
    expect((counterclockwise as HTMLButtonElement).disabled).toBe(false);
    expect(selectedEdges(container)).toEqual([[], [], []]);
    expect(readout.getAttribute("data-hue-phase")).toBe("ready");
    expect(readout.textContent).toBe("Choose a direction");
    expect(readout.hasAttribute("data-hue-action")).toBe(false);
    expect(cycle.querySelector("polygon")).toBeNull();
    expect(container.querySelector('[data-cycle-node="2"]')?.getAttribute("aria-current")).toBe("true");
    expect(container.querySelector(".theory-hue-caption")?.textContent).toBe("The selected state is red.");
    expect(screen.getByRole("status").hasAttribute("data-hue-transition")).toBe(false);
    expect(within(cycle).queryAllByRole("button")).toHaveLength(0);
    expect(container.querySelectorAll(".theory-hue-cycle-panel button")).toHaveLength(2);

    fireEvent.click(clockwise);
    expect(readout.getAttribute("data-hue-phase")).toBe("transition");
    expect(container.querySelector('[data-cycle-node="6"]')?.getAttribute("aria-current")).toBe("true");
    expectCycleDeltas(container, 0, "+4");
    expect(readout.textContent).toContain("R → Y");
    expect(readout.textContent).toContain("Add green");
    expect(container.querySelector(".theory-hue-caption")?.textContent).toBe("The transition from red to yellow means adding green.");
    expect(container.querySelector(".theory-hue-caption")?.getAttribute("lang")).toBe("en");
    expect(readout.getAttribute("title")).toBe("010 → 110 · G: 0 → 1");
    expect(selectedEdges(container)).toEqual([["0"], ["0"], ["0"]]);
    expect(screen.getByRole("status").textContent).toContain("R 010 → Y 110 · toggle G · ΔL=+4");
    const row = container.querySelector('[data-edge-row="3"]')!;
    expect(within(screen.getByRole("table")).queryByRole("button")).toBeNull();
    fireEvent.click(row);
    expect(selectedEdges(container)).toEqual([["0"], ["0"], ["0"]]);
    for (let step = 0; step < 3; step++) fireEvent.click(screen.getByRole("button", { name: "Clockwise" }));
    expectCycleDeltas(container, 3, "−4");
    expect(selectedEdges(container)).toEqual([["3"], ["3"], ["3"]]);
    expect(screen.getByRole("status").textContent).toContain("C 101 → B 001 · toggle G · ΔL=−4");
    expect(readout.textContent).toContain("C → B");
    expect(readout.textContent).toContain("Remove green");
    expect(readout.getAttribute("title")).toBe("101 → 001 · G: 1 → 0");
    const idleRows = [...container.querySelectorAll('[data-edge-row][data-hue-selected="false"]')].map((row) => row.textContent);
    const deltaPositions = [...container.querySelectorAll("[data-zigzag-delta]")].map((label) => [
      label.getAttribute("x"),
      label.getAttribute("y"),
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Counter-clockwise" }));
    expectCycleDeltas(container, 3, "+4");
    expect(selectedEdges(container)).toEqual([["3"], ["3"], ["3"]]);
    expect(screen.getByRole("status").textContent).toContain("B 001 → C 101 · toggle G · ΔL=+4");
    expect(readout.textContent).toContain("B → C");
    expect(readout.textContent).toContain("Add green");
    expect(row.textContent).toContain("B₁→C₅");
    expect(row.textContent).toContain("B₁⊂C₅");
    expect(container.querySelector('[data-hue-edge="3"]')?.textContent).toContain("+4");
    expect([...container.querySelectorAll('[data-edge-row][data-hue-selected="false"]')].map((row) => row.textContent)).toEqual(idleRows);
    expect(
      [...container.querySelectorAll("[data-zigzag-delta]")].map((label) => [label.getAttribute("x"), label.getAttribute("y")]),
    ).toEqual(deltaPositions);
  });

  it("keeps diagram inspection and tone selection from changing the traversal", () => {
    const onHover = vi.fn();
    const { container } = renderTraversal(onHover);
    const cycle = screen.getByRole("group", { name: "Chromatic One-Bit Six-Cycle" });
    fireEvent.click(within(cycle).getByRole("button", { name: "Choose R 010 as the starting color" }));
    fireEvent.click(screen.getByRole("button", { name: "Clockwise" }));
    expect(within(cycle).queryAllByRole("button")).toHaveLength(0);
    expect(cycle.querySelectorAll("[tabindex], [aria-pressed]")).toHaveLength(0);
    expect(container.querySelectorAll(".theory-hue-cycle-panel button")).toHaveLength(2);
    expect(container.querySelector('[data-cycle-node="6"]')?.getAttribute("aria-current")).toBe("true");
    for (const target of container.querySelectorAll(
      "[data-cycle-node], [data-cycle-edge], [data-cycle-delta], [data-hue-edge], [data-tone-level-hover], [data-edge-row]",
    )) {
      fireEvent.click(target, { clientX: 500, clientY: 150 });
      fireEvent.keyDown(target, { key: "Enter" });
      fireEvent.keyDown(target, { key: " " });
      expect(selectedEdges(container)).toEqual([["0"], ["0"], ["0"]]);
      expect(screen.getByRole("status").getAttribute("data-hue-transition")).toBe("2-6");
    }
    const blue = within(cycle).getByRole("img", { name: "B 001" });
    fireEvent.mouseEnter(blue);
    expect(onHover).toHaveBeenLastCalledWith(1);
    fireEvent.mouseLeave(blue);
    expect(onHover).toHaveBeenLastCalledWith(null);
    expect(selectedEdges(container)).toEqual([["0"], ["0"], ["0"]]);
    fireEvent.click(container.querySelector('[data-tone-level-control="2"]')!);
    expect(selectedEdges(container)).toEqual([["0"], ["0"], ["0"]]);
    expect(container.querySelector('[data-active-fiber="2"]')).not.toBeNull();
  });

  it("advances one edge per press and wraps a complete cycle in either direction", () => {
    const { container } = renderTraversal();
    const clockwise = screen.getByRole("button", { name: "Clockwise" });
    const counterclockwise = screen.getByRole("button", { name: "Counter-clockwise" });
    expect(container.querySelectorAll(".theory-hue-controls button")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Choose R 010 as the starting color" }));

    for (const [edge, transition, delta, action, sentence] of [
      [0, "2-6", "+4", "Add green", "The transition from red to yellow means adding green."],
      [1, "6-4", "−2", "Remove red", "The transition from yellow to green means removing red."],
      [2, "4-5", "+1", "Add blue", "The transition from green to cyan means adding blue."],
      [3, "5-1", "−4", "Remove green", "The transition from cyan to blue means removing green."],
      [4, "1-3", "+2", "Add red", "The transition from blue to magenta means adding red."],
      [5, "3-2", "−1", "Remove blue", "The transition from magenta to red means removing blue."],
    ] as const) {
      fireEvent.click(clockwise);
      expect(selectedEdges(container)).toEqual([[`${edge}`], [`${edge}`], [`${edge}`]]);
      expectCycleDeltas(container, edge, delta);
      expect(screen.getByRole("status").getAttribute("data-hue-transition")).toBe(transition);
      expect(container.querySelector(".theory-hue-action")?.textContent).toBe(action);
      expect(container.querySelector(".theory-hue-caption")?.textContent).toBe(sentence);
    }
    for (const [edge, transition, delta, action, sentence] of [
      [5, "2-3", "+1", "Add blue", "The transition from red to magenta means adding blue."],
      [4, "3-1", "−2", "Remove red", "The transition from magenta to blue means removing red."],
      [3, "1-5", "+4", "Add green", "The transition from blue to cyan means adding green."],
      [2, "5-4", "−1", "Remove blue", "The transition from cyan to green means removing blue."],
      [1, "4-6", "+2", "Add red", "The transition from green to yellow means adding red."],
      [0, "6-2", "−4", "Remove green", "The transition from yellow to red means removing green."],
    ] as const) {
      fireEvent.click(counterclockwise);
      expect(selectedEdges(container)).toEqual([[`${edge}`], [`${edge}`], [`${edge}`]]);
      expectCycleDeltas(container, edge, delta);
      expect(screen.getByRole("status").getAttribute("data-hue-transition")).toBe(transition);
      expect(container.querySelector(".theory-hue-action")?.textContent).toBe(action);
      expect(container.querySelector(".theory-hue-caption")?.textContent).toBe(sentence);
    }
    fireEvent.click(clockwise);
    expect(screen.getByRole("status").getAttribute("data-hue-transition")).toBe("2-6");
  });

  it("allows every color as a starting point and moves only to its neighbor in either direction", () => {
    for (const [start, clockwiseTo, counterclockwiseTo] of [
      [2, 6, 3],
      [6, 4, 2],
      [4, 5, 6],
      [5, 1, 4],
      [1, 3, 5],
      [3, 2, 1],
    ]) {
      for (const [direction, destination] of [
        ["Clockwise", clockwiseTo],
        ["Counter-clockwise", counterclockwiseTo],
      ] as const) {
        const { container, unmount } = renderTraversal();
        const startNode = container.querySelector(`[data-cycle-node="${start}"]`)!;
        // Both standard keyboard activation keys can choose a starting point.
        fireEvent.keyDown(startNode, { key: direction === "Clockwise" ? "Enter" : " " });
        expect(startNode.getAttribute("aria-current")).toBe("true");
        expect(selectedEdges(container)).toEqual([[], [], []]);
        for (const node of container.querySelectorAll("[data-cycle-node]")) fireEvent.click(node);
        expect(startNode.getAttribute("aria-current")).toBe("true");
        expect(container.querySelector("[data-hue-action]")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: direction }));
        expect(screen.getByRole("status").getAttribute("data-hue-transition")).toBe(`${start}-${destination}`);
        expect(container.querySelector(`[data-cycle-node="${destination}"]`)?.getAttribute("aria-current")).toBe("true");
        expect(container.querySelector("[data-hue-current-node]")?.getAttribute("data-hue-current-node")).toBe(`${destination}`);
        unmount();
      }
    }
  });
});
