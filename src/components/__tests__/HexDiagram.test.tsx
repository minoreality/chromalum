// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HexDiagram } from "../HexDiagram";
import { HEX_R } from "../../data/hex-data";

vi.mock("../../i18n", () => ({
  useTranslation: () => ({
    t: (key: string, ...args: unknown[]) => `${key}(${args.join(",")})`,
  }),
}));

function makeProps(overrides?: Partial<Parameters<typeof HexDiagram>[0]>) {
  return {
    candidateIndexByLevel: [0, 0, 0, 0, 0, 0, 0, 0],
    dispatch: vi.fn(),
    levelHistogram: [100, 50, 30, 20, 10, 5, 3, 1],
    total: 219,
    lockedLevels: [false, false, false, false, false, false, false, false],
    onSetLock: vi.fn(),
    onRandomize: vi.fn(),
    canRandomize: true,
    ...overrides,
  };
}

/** A dot's own circle: the last one in its group, after any rings and hit area. */
function dotBody(g: Element): SVGCircleElement {
  const circles = [...g.querySelectorAll("circle")];
  return circles[circles.length - 1] as SVGCircleElement;
}

describe("HexDiagram", () => {
  it("renders an SVG element", () => {
    const { container } = render(<HexDiagram {...makeProps()} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("role")).toBe("group");
  });

  it("has interactive groups with role='button'", () => {
    render(<HexDiagram {...makeProps()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("has aria-pressed attributes on interactive groups", () => {
    render(<HexDiagram {...makeProps()} />);
    const buttons = screen.getAllByRole("button");
    const withAriaPressed = buttons.filter((b) => b.getAttribute("aria-pressed") !== null);
    expect(withAriaPressed.length).toBe(buttons.length);
  });

  /** The selected-palette outline: the only dashed 4,3 path in the diagram. */
  function outlinePoints(container: HTMLElement): number {
    const path = [...container.querySelectorAll("path")].find((p) => p.getAttribute("stroke-dasharray") === "4,3");
    const d = path?.getAttribute("d");
    return d ? (d.match(/[ML]/g) ?? []).length : 0;
  }

  it("closes the outline over the levels the canvas uses, not all six", () => {
    // L1..L6 are the chromatic levels the outline can pass through; drop two.
    const { container } = render(<HexDiagram {...makeProps({ levelHistogram: [100, 50, 30, 0, 10, 0, 3, 1], total: 194 })} />);
    expect(outlinePoints(container)).toBe(4);

    const all = render(<HexDiagram {...makeProps()} />);
    expect(outlinePoints(all.container)).toBe(6);
  });

  it("draws no outline when fewer than three levels are left to close it", () => {
    // Two points are a line drawn there and back, one is nothing to enclose.
    const two = render(<HexDiagram {...makeProps({ levelHistogram: [100, 50, 30, 0, 0, 0, 0, 1], total: 181 })} />);
    expect(outlinePoints(two.container)).toBe(0);

    const none = render(<HexDiagram {...makeProps({ levelHistogram: [100, 0, 0, 0, 0, 0, 0, 1], total: 101 })} />);
    expect(outlinePoints(none.container)).toBe(0);
  });

  it("suppresses the mobile tap highlight on the dice button", () => {
    render(<HexDiagram {...makeProps()} />);
    const diceButton = screen.getByRole("button", { name: "btn_random_color()" });
    expect(diceButton.classList.contains("hex-dice-button")).toBe(true);
    expect(diceButton.getAttribute("style")).toContain("touch-action: manipulation");
    expect(diceButton.getAttribute("style")).toContain("outline: none");
  });

  it("sizes an active dot by its share of the canvas, on one scale for vertex and edge", () => {
    // Level 5 is a 70% level whose active candidate sits on an edge; level 2 is
    // a 16% level whose active candidate sits on a vertex. Separate scales drew
    // the first smaller than the second.
    const levelHistogram = [0, 40, 160, 0, 15, 700, 80, 5];
    const total = levelHistogram.reduce((sum, count) => sum + count, 0);
    const { container } = render(<HexDiagram {...makeProps({ levelHistogram, total })} />);

    const radius = new Map<number, number>();
    container.querySelectorAll('g[data-lv][aria-pressed="true"]').forEach((g) => {
      radius.set(Number(g.getAttribute("data-lv")), Number(dotBody(g).getAttribute("r")));
    });

    // Shares run 5 > 2 > 6 > 1 > 4 > 3, and so must the radii.
    const byShare = [5, 2, 6, 1, 4, 3];
    for (let i = 1; i < byShare.length; i++) {
      expect(radius.get(byShare[i - 1])!).toBeGreaterThan(radius.get(byShare[i])!);
    }
    // A level the canvas does not use is still a dot, at the floor every
    // selected candidate shares, and no level outgrows the closest two
    // candidate positions ever sit: HEX_R / 4, the spacing on an edge whose
    // endpoints are four levels apart.
    expect(radius.get(3)).toBe(12);
    expect(radius.get(5)).toBeLessThanOrEqual(HEX_R / 4);
  });

  it("keeps a level's dot the same size across its three candidates", () => {
    // Levels 2 to 5 offer three candidates each, one on a vertex and two on
    // edges. Cycling between them is the same level holding the same pixels, so
    // the size that stands for that share must not move with the position.
    const levelHistogram = [0, 40, 160, 0, 15, 700, 80, 5];
    const total = levelHistogram.reduce((sum, count) => sum + count, 0);

    const activeRadius = (level: number, candidateIndex: number) => {
      const candidateIndexByLevel = [0, 0, 0, 0, 0, 0, 0, 0];
      candidateIndexByLevel[level] = candidateIndex;
      const { container, unmount } = render(<HexDiagram {...makeProps({ levelHistogram, total, candidateIndexByLevel })} />);
      const g = container.querySelector(`g[data-lv="${level}"][aria-pressed="true"]`)!;
      const r = Number(dotBody(g).getAttribute("r"));
      unmount();
      return r;
    };

    for (const level of [2, 3, 4, 5]) {
      const [first, second, third] = [0, 1, 2].map((i) => activeRadius(level, i));
      expect(second).toBeCloseTo(first, 10);
      expect(third).toBeCloseTo(first, 10);
    }
  });

  it("leaves the selected dot of an unused level hollow, and still selectable", () => {
    // Level 2 holds pixels, level 3 holds none. Both are selected candidates.
    const levelHistogram = [0, 0, 160, 0, 0, 0, 0, 0];
    const total = 160;
    const dispatch = vi.fn();
    const { container } = render(<HexDiagram {...makeProps({ levelHistogram, total, dispatch })} />);
    const used = container.querySelector('g[data-lv="2"][aria-pressed="true"]')!;
    const unused = container.querySelector('g[data-lv="3"][aria-pressed="true"]')!;
    const filled = (g: Element) => (dotBody(g).getAttribute("fill") ?? "none") !== "none";
    expect(filled(used)).toBe(true);
    expect(filled(unused)).toBe(false);

    // Hollow, but not inert: the level's other candidates stay in the tab order
    // and still dispatch, so a palette can be set up before anything is
    // painted.
    const otherCandidate = container.querySelector('g[data-lv="3"][aria-pressed="false"]')!;
    expect(otherCandidate.getAttribute("tabindex")).toBe("0");
    fireEvent.click(otherCandidate);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "set_color", levelIndex: 3 }));
  });

  /** Every dot of a level, in the order the diagram lays them out. */
  function dotsOf(container: HTMLElement, level: number): Element[] {
    return [...container.querySelectorAll(`g[data-lv="${level}"]`)];
  }
  const selectedDot = (container: HTMLElement, level: number) => container.querySelector(`g[data-lv="${level}"][aria-pressed="true"]`)!;
  const otherDot = (container: HTMLElement, level: number) => container.querySelector(`g[data-lv="${level}"][aria-pressed="false"]`)!;

  it("draws a hollow dot's level number in one neutral, and a filled one's against its fill", () => {
    // In the candidate colour the digit ran from 2.21:1 for #0000ff to 17.72:1
    // for #ffff00 against the panel, and a 7.2px digit needs 4.5:1. A filled dot
    // is a different background - the candidate colour itself - so that one
    // still picks black or white from the level.
    const levelHistogram = [0, 0, 160, 0, 0, 0, 0, 0];
    const { container } = render(<HexDiagram {...makeProps({ levelHistogram, total: 160 })} />);

    const digitFill = (g: Element) => g.querySelector("text")!.getAttribute("fill");
    const hollow = [...container.querySelectorAll("g[data-lv]")].filter((g) => {
      const circles = [...g.querySelectorAll("circle")];
      return (circles[circles.length - 1].getAttribute("fill") ?? "none") === "none";
    });
    expect(hollow.length).toBe(13);
    for (const dot of hollow) expect(digitFill(dot)).toBe("#c8c8d8");

    // Level 2 is the one level on the canvas, so its selected dot is filled.
    expect(digitFill(container.querySelector('g[data-lv="2"][aria-pressed="true"]')!)).not.toBe("#c8c8d8");
  });

  it("keeps the selected dot reachable, so it can be unpinned and can say it is selected", () => {
    // It used to be dropped from the tab order and given pointer-events: none,
    // which left the level's current colour the one dot that could neither be
    // hovered nor announced, and let a pointer over it reach the dot behind.
    const { container } = render(<HexDiagram {...makeProps()} />);
    for (const level of [2, 3, 4, 5]) {
      for (const dot of dotsOf(container, level)) {
        expect(dot.getAttribute("tabindex")).toBe("0");
        expect((dot as SVGElement).style.pointerEvents).not.toBe("none");
      }
    }
    expect(selectedDot(container, 2).getAttribute("aria-pressed")).toBe("true");
  });

  it("pins the level to the right-clicked dot, selecting it in the same gesture", () => {
    const dispatch = vi.fn();
    const onSetLock = vi.fn();
    const { container } = render(<HexDiagram {...makeProps({ dispatch, onSetLock })} />);

    fireEvent.contextMenu(otherDot(container, 2));

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "set_color", levelIndex: 2 }));
    expect(onSetLock).toHaveBeenCalledWith(2, true);
  });

  it("releases the pin when the dot holding it is right-clicked again", () => {
    const dispatch = vi.fn();
    const onSetLock = vi.fn();
    const lockedLevels = [false, false, true, false, false, false, false, false];
    const { container } = render(<HexDiagram {...makeProps({ dispatch, onSetLock, lockedLevels })} />);

    fireEvent.contextMenu(selectedDot(container, 2));

    expect(onSetLock).toHaveBeenCalledWith(2, false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("moves the pin to another dot of a level that already holds one", () => {
    const dispatch = vi.fn();
    const onSetLock = vi.fn();
    const lockedLevels = [false, false, true, false, false, false, false, false];
    const { container } = render(<HexDiagram {...makeProps({ dispatch, onSetLock, lockedLevels })} />);

    fireEvent.contextMenu(otherDot(container, 2));

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "set_color", levelIndex: 2 }));
    expect(onSetLock).toHaveBeenCalledWith(2, true);
  });

  it("refuses a pin on a level the canvas does not use, or one with a single candidate", () => {
    const dispatch = vi.fn();
    const onSetLock = vi.fn();
    // Level 3 holds no pixels; levels 1 and 6 hold pixels but offer one
    // candidate each, so there is nothing for a pin to hold them to.
    const levelHistogram = [0, 40, 160, 0, 15, 700, 80, 5];
    const total = levelHistogram.reduce((sum, count) => sum + count, 0);
    const { container } = render(<HexDiagram {...makeProps({ dispatch, onSetLock, levelHistogram, total })} />);

    for (const dot of [...dotsOf(container, 3), ...dotsOf(container, 1), ...dotsOf(container, 6)]) {
      fireEvent.contextMenu(dot);
    }

    expect(onSetLock).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("holds a pinned level against the keyboard as well as the click", () => {
    // Enter used to go straight to the dispatch while the click beside it
    // checked the pin, so the level changed colour with its ring still on.
    const dispatch = vi.fn();
    const lockedLevels = [false, false, true, false, false, false, false, false];
    const { container } = render(<HexDiagram {...makeProps({ dispatch, lockedLevels })} />);
    const dot = otherDot(container, 2);

    fireEvent.click(dot);
    fireEvent.keyDown(dot, { key: "Enter" });
    fireEvent.keyDown(dot, { key: " " });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("marks a pinned level with the selected dot's own ring, not a second one over it", () => {
    // The gold ring and the dashed one used to land on the same radius, so the
    // level that was pinned was the one that stopped reading as selected.
    const ringsOf = (g: Element) => [...g.querySelectorAll("circle")].filter((c) => c.getAttribute("fill") === "none");
    const plain = render(<HexDiagram {...makeProps()} />);
    const pinned = render(<HexDiagram {...makeProps({ lockedLevels: [false, false, true, false, false, false, false, false] })} />);

    const before = ringsOf(selectedDot(plain.container, 2));
    const after = ringsOf(selectedDot(pinned.container, 2));
    expect(after.length).toBe(before.length);

    const ring = after.find((c) => c.classList.contains("hex-dot-selected-ring"))!;
    expect(ring.getAttribute("stroke")).toBe("#ffd700");
    expect(ring.getAttribute("stroke-dasharray")).toBeNull();
    expect(ring.getAttribute("r")).toBe(before.find((c) => c.classList.contains("hex-dot-selected-ring"))!.getAttribute("r"));
  });

  it("gives every dot one focus ring, left to :focus-visible rather than to state", () => {
    // A focus ring driven by a level-wide state ringed all three of a level's
    // dots for one focused element, and outlived the focus that raised it
    // because the handler that cleared it was removed as the dot became
    // selected. The ring is now an element per dot, shown by CSS.
    const { container } = render(<HexDiagram {...makeProps()} />);
    for (const dot of container.querySelectorAll("g[data-lv]")) {
      expect(dot.querySelectorAll(".hex-dot-focus-ring").length).toBe(1);
    }
    const dot = otherDot(container, 2);
    fireEvent.focus(dot);
    expect(container.querySelectorAll(".hex-dot-focus-ring").length).toBe(container.querySelectorAll("g[data-lv]").length);
  });

  it("pins on a long press, and not on a press that turns into a scroll", () => {
    vi.useFakeTimers();
    try {
      const onSetLock = vi.fn();
      const { container } = render(<HexDiagram {...makeProps({ onSetLock })} />);
      const dot = otherDot(container, 2);

      // A press that wanders is the start of a scroll, not a pin.
      fireEvent.pointerDown(dot, { pointerType: "touch", clientX: 100, clientY: 100 });
      fireEvent.pointerMove(dot, { pointerType: "touch", clientX: 100, clientY: 140 });
      vi.advanceTimersByTime(1000);
      expect(onSetLock).not.toHaveBeenCalled();

      fireEvent.pointerDown(dot, { pointerType: "touch", clientX: 100, clientY: 100 });
      vi.advanceTimersByTime(1000);
      expect(onSetLock).toHaveBeenCalledWith(2, true);

      // Chrome on Android raises its own contextmenu for that same press; it
      // must not undo the pin the timer just placed.
      onSetLock.mockClear();
      fireEvent.contextMenu(dot);
      expect(onSetLock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves a mouse press alone, so a held button is not a pin", () => {
    vi.useFakeTimers();
    try {
      const onSetLock = vi.fn();
      const { container } = render(<HexDiagram {...makeProps({ onSetLock })} />);

      fireEvent.pointerDown(otherDot(container, 2), { pointerType: "mouse", clientX: 100, clientY: 100 });
      vi.advanceTimersByTime(1000);

      expect(onSetLock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  // Which focus deserves an outline is the browser's own heuristic, and jsdom
  // does not model input modality, so :focus-visible is stubbed here: what is
  // under test is that the ring follows that answer, not the answer itself.
  // The heuristic proper is checked by hand in a real browser.
  function renderDiceWithFocusVisible(focusVisible: boolean) {
    render(<HexDiagram {...makeProps()} />);
    const diceButton = screen.getByRole("button", { name: "btn_random_color()" });
    vi.spyOn(diceButton, "matches").mockImplementation((selector: string) => selector === ":focus-visible" && focusVisible);
    return { diceButton, ringsIn: () => diceButton.querySelectorAll('circle[stroke][fill="none"]').length };
  }

  it("rings the dice button for a focus the browser would outline", () => {
    const { diceButton, ringsIn } = renderDiceWithFocusVisible(true);
    expect(ringsIn()).toBe(0);

    // fireEvent, not .focus(): a programmatic focus() on an svg <g> moves
    // activeElement without dispatching focus events.
    fireEvent.focus(diceButton);
    expect(ringsIn()).toBe(1);

    fireEvent.blur(diceButton);
    expect(ringsIn()).toBe(0);
  });

  it("leaves the dice button unringed for a focus the browser would not outline", () => {
    const { diceButton, ringsIn } = renderDiceWithFocusVisible(false);

    fireEvent.focus(diceButton);
    expect(ringsIn()).toBe(0);
  });

  it("leaves the dice button unfocusable, and unringed, with nothing to randomize", () => {
    render(<HexDiagram {...makeProps({ canRandomize: false })} />);
    const diceButton = screen.getByRole("button", { name: "btn_random_color()" });
    expect(diceButton.getAttribute("tabindex")).toBe("-1");

    fireEvent.focus(diceButton);
    expect(diceButton.querySelectorAll('circle[stroke][fill="none"]').length).toBe(0);
  });

  it("keyboard Enter triggers onClick (dispatch)", () => {
    const dispatch = vi.fn();
    render(<HexDiagram {...makeProps({ dispatch })} />);
    const buttons = screen.getAllByRole("button");
    // Press Enter on the first button
    fireEvent.keyDown(buttons[0], { key: "Enter" });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "set_color" }));
  });
});
