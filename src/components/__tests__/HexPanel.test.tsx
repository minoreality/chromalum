// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CANDIDATE_INDEX_BY_LEVEL } from "../../color-engine";
import type { CanvasData } from "../../types";
import { HexPanel } from "../HexPanel";

vi.mock("../../i18n", () => ({
  useTranslation: () => ({
    t: (key: string, ...args: unknown[]) => (args.length ? `${key}(${args.join(",")})` : key),
  }),
}));

const t = ((key: string, ...args: unknown[]) => (args.length ? `${key}(${args.join(",")})` : key)) as React.ComponentProps<
  typeof HexPanel
>["t"];

function makeCvs(): CanvasData {
  const data = new Uint8Array(4);
  data.set([0, 3, 4, 7]);
  return { width: 2, height: 2, levelData: data, pixelCandidateOverrideMap: new Uint8Array(4) };
}

function makeProps(overrides?: Partial<React.ComponentProps<typeof HexPanel>>): React.ComponentProps<typeof HexPanel> {
  return {
    hexPreviewCanvasRef: React.createRef<HTMLCanvasElement>(),
    canvasData: makeCvs(),
    displayWidth: 128,
    displayHeight: 96,
    candidateIndexByLevel: [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL],
    candidateIndexDispatch: vi.fn(),
    levelHistogram: [1, 2, 3, 4, 5, 6, 7, 8],
    total: 36,
    lockedLevels: new Array(8).fill(false),
    setLevelLock: vi.fn(),
    handleRandomize: vi.fn(),
    canRandomize: true,
    patternInfo: { total: 42, expanded: "1 x 2 x 3", perLevel: [1, 2, 3, 4, 5, 6, 7, 8] },
    t,
    ...overrides,
  };
}

describe("HexPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cycles color candidates from document keyboard shortcuts and ignores modified keys", () => {
    const props = makeProps();
    render(<HexPanel {...props} />);

    fireEvent.keyDown(document, { key: "2" });
    fireEvent.keyDown(document, { key: "5" });
    fireEvent.keyDown(document, { key: "3", ctrlKey: true });
    fireEvent.keyDown(document, { key: "1" });

    expect(props.candidateIndexDispatch).toHaveBeenCalledTimes(2);
    expect(props.candidateIndexDispatch).toHaveBeenNthCalledWith(1, { type: "cycle_color", levelIndex: 2, direction: 1 });
    expect(props.candidateIndexDispatch).toHaveBeenNthCalledWith(2, { type: "cycle_color", levelIndex: 5, direction: 1 });
  });

  it("routes pattern-count click and keyboard activation when a gallery link is provided", () => {
    const onPatternClick = vi.fn();
    render(<HexPanel {...makeProps({ onPatternClick })} />);

    const patternLink = screen.getByRole("button", { name: "pattern_count_go_gallery(42)" });
    fireEvent.click(patternLink);
    fireEvent.keyDown(patternLink, { key: "Enter" });
    fireEvent.keyDown(patternLink, { key: " " });
    fireEvent.keyDown(patternLink, { key: "Escape" });

    expect(onPatternClick).toHaveBeenCalledTimes(3);
  });

  it("leaves a pinned level out of the 2-5 shortcut", () => {
    // The shortcut is the keyboard's form of clicking the level's dot, so it
    // answers to the pin the same way: level 3 is held, level 5 is not.
    const props = makeProps({ lockedLevels: [false, false, false, true, false, false, false, false] });
    render(<HexPanel {...props} />);

    fireEvent.keyDown(document, { key: "3" });
    fireEvent.keyDown(document, { key: "5" });

    expect(props.candidateIndexDispatch).toHaveBeenCalledTimes(1);
    expect(props.candidateIndexDispatch).toHaveBeenCalledWith({ type: "cycle_color", levelIndex: 5, direction: 1 });
  });

  it("leaves the palette unchanged while a modal dialog owns the keyboard", () => {
    const props = makeProps();
    const view = render(
      <>
        <HexPanel {...props} />
        <div role="dialog" aria-modal="true">
          <button>Close help</button>
        </div>
      </>,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Close help" }), { key: "2" });

    expect(props.candidateIndexDispatch).not.toHaveBeenCalled();

    view.rerender(<HexPanel {...props} />);
    fireEvent.keyDown(document, { key: "2" });

    expect(props.candidateIndexDispatch).toHaveBeenCalledWith({ type: "cycle_color", levelIndex: 2, direction: 1 });
  });

  it("leaves a digit already handled by a focused control alone", () => {
    const props = makeProps();
    render(<HexPanel {...props} />);
    const event = new KeyboardEvent("keydown", { key: "2", bubbles: true, cancelable: true });
    event.preventDefault();

    fireEvent(document, event);

    expect(props.candidateIndexDispatch).not.toHaveBeenCalled();
  });

  it("does not expose the pattern-count row as a button without a gallery callback", () => {
    render(<HexPanel {...makeProps()} />);

    expect(screen.queryByRole("button", { name: "pattern_count_go_gallery(42)" })).toBeNull();
  });

  it("reports hex candidate details for the hovered preview pixel", () => {
    const props = makeProps({
      levelHistogram: [1, 0, 0, 1, 1, 0, 0, 1],
      patternInfo: { total: 3, expanded: "1 x 3", perLevel: [1, 1, 1, 3, 3, 1, 1, 1] },
      lockedLevels: [false, false, false, true, false, false, false, false],
    });
    render(<HexPanel {...props} />);

    const canvas = screen.getByRole("img", { name: "aria_color_preview_canvas" });
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 128,
      bottom: 96,
      width: 128,
      height: 96,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerMove(canvas, { clientX: 96, clientY: 24 });

    const status = screen.getByText("(1,0) Hex L3 c3/3 @300° used=1px factor×3 locked");
    expect(status).toBeTruthy();
    expect(status.getAttribute("title")).toBe("(1,0) Hex L3 c3/3 @300° used=1px factor×3 locked");

    fireEvent.pointerLeave(canvas);
    expect(screen.queryByText("(1,0) Hex L3 c3/3 @300° used=1px factor×3 locked")).toBeNull();
  });
});
