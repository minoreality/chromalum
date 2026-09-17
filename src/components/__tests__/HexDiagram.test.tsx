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
    onToggleLock: vi.fn(),
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
    // painted. The already-selected one is out of the tab order either way.
    const otherCandidate = container.querySelector('g[data-lv="3"][aria-pressed="false"]')!;
    expect(otherCandidate.getAttribute("tabindex")).toBe("0");
    fireEvent.click(otherCandidate);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "set_color", levelIndex: 3 }));
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
