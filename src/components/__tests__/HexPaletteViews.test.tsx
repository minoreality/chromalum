// @vitest-environment jsdom
import React, { useReducer, useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HexPanel } from "../HexPanel";
import { LanguageProvider, useTranslation } from "../../i18n";
import { DEFAULT_CANDIDATE_INDEX_BY_LEVEL } from "../../color-engine";
import { colorReducer } from "../../state/color-reducer";
import { makeCanvasNavigation } from "./canvas-navigation-fixture";

function Palette() {
  const { t } = useTranslation();
  const [colors, dispatch] = useReducer(colorReducer, [...DEFAULT_CANDIDATE_INDEX_BY_LEVEL]);
  const [locks, setLocks] = useState(new Array<boolean>(8).fill(false));
  return (
    <HexPanel
      hexPreviewCanvasRef={React.createRef<HTMLCanvasElement>()}
      canvasData={{ width: 4, height: 4, levelData: new Uint8Array(16), pixelCandidateOverrideMap: new Uint8Array(16) }}
      displayWidth={128}
      displayHeight={128}
      canvasTransform={{}}
      navigation={makeCanvasNavigation()}
      candidateIndexByLevel={colors}
      candidateIndexDispatch={dispatch}
      levelHistogram={[4, 0, 12, 0, 0, 0, 0, 0]}
      total={16}
      lockedLevels={locks}
      setLevelLock={(level, locked) => setLocks((prev) => prev.map((value, i) => (i === level ? locked : value)))}
      handleRandomize={() => {}}
      canRandomize={true}
      patternInfo={{ total: locks[2] ? 1 : 3, expanded: "", perLevel: [1, 1, locks[2] ? 1 : 3, 1, 1, 1, 1, 1] }}
      t={t}
    />
  );
}

function renderPalette() {
  return render(
    <LanguageProvider>
      <Palette />
    </LanguageProvider>,
  );
}

const diagram = () => screen.getByRole("group", { name: "Pure-hue loop color selection" });
const list = () => screen.getByRole("list", { name: "Level color mapping" });
const row = (level: number) => within(list()).getByRole("listitem", { name: `L${level}` });

describe("Hex palette views", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("chromalum_lang", "en");
  });
  afterEach(() => vi.useRealTimers());

  it("switches both ways from non-control parts while sharing the selected palette", () => {
    renderPalette();
    fireEvent.doubleClick(diagram().querySelector("polygon")!);
    const blue = within(row(2)).getByRole("button", { name: "Level 2 color candidate #0040ff 225°" });
    fireEvent.click(blue);
    expect(blue.getAttribute("aria-pressed")).toBe("true");
    fireEvent.doubleClick(within(row(2)).getByText("225°"));
    expect(screen.queryByRole("list", { name: "Level color mapping" })).toBeNull();
    expect(within(diagram()).getByRole("button", { name: "Level 2 color candidate (#0040ff)" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps double clicks on dots, the die, and list controls inside their own operations", () => {
    renderPalette();
    fireEvent.doubleClick(within(diagram()).getByRole("button", { name: "R — Level 2" }));
    fireEvent.doubleClick(within(diagram()).getByRole("button", { name: "Randomize palette" }));
    expect(diagram()).toBeTruthy();
    fireEvent.keyDown(document, { key: "v" });
    fireEvent.doubleClick(within(row(2)).getByRole("button", { name: "Next color candidate (Level 2 Red)" }));
    fireEvent.doubleClick(within(row(2)).getByRole("button", { name: "Level 2 color candidate #0040ff 225°" }));
    expect(list()).toBeTruthy();
  });

  it("keeps the list free of pattern counts and holds a pinned candidate in either view", () => {
    renderPalette();
    fireEvent.doubleClick(diagram());
    expect(screen.queryAllByLabelText(/Pattern factor/)).toHaveLength(0);
    expect(within(list()).queryByText(/×[13]/)).toBeNull();
    const activeView = list().parentElement!;
    expect(within(activeView).queryAllByText(/3 patterns/)).toHaveLength(0);
    fireEvent.contextMenu(within(row(2)).getByRole("button", { name: "Level 2 color candidate #0040ff 225°" }));
    expect(row(2).getAttribute("data-locked")).toBe("true");
    expect(within(row(2)).getByRole("button", { name: "Next color candidate (Level 2 Red)" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(within(row(2)).getByRole("button", { name: "Level 2 color candidate #8000ff 270°" }));
    fireEvent.keyDown(document, { key: "2" });
    expect(within(row(2)).getByRole("button", { name: "Level 2 color candidate #0040ff 225°" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(document, { key: "v" });
    const pinned = within(diagram()).getByRole("button", { name: "Level 2 color candidate (#0040ff)" });
    expect(pinned.querySelector(".hex-dot-selected-ring")?.getAttribute("stroke-dasharray")).toBeNull();
  });

  it("switches once after a stationary touch hold", () => {
    vi.useFakeTimers();
    renderPalette();
    const background = diagram();
    fireEvent.pointerDown(background, { pointerType: "touch", pointerId: 1, isPrimary: true, clientX: 30, clientY: 30 });
    act(() => vi.advanceTimersByTime(600));
    expect(list()).toBeTruthy();
    fireEvent.contextMenu(background);
    fireEvent.pointerUp(background, { pointerType: "touch", pointerId: 1, isPrimary: true });
    act(() => vi.advanceTimersByTime(600));
    expect(list()).toBeTruthy();
  });

  it("cancels a pending diagram-dot hold when switching to the list", () => {
    vi.useFakeTimers();
    renderPalette();
    const blue = within(diagram()).getByRole("button", { name: "Level 2 color candidate (#0040ff)" });
    fireEvent.pointerDown(blue, { pointerType: "touch", pointerId: 1, isPrimary: true, clientX: 30, clientY: 30 });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.keyDown(document, { key: "v" });
    act(() => vi.advanceTimersByTime(600));
    expect(row(2).getAttribute("data-locked")).toBe("false");
    expect(within(row(2)).getByRole("button", { name: "Level 2 color candidate #ff0000 0°" }).getAttribute("aria-pressed")).toBe("true");
  });

  it.each(["move", "cancel", "second touch"])("leaves scrolling and cancelled holds alone: %s", (reason) => {
    vi.useFakeTimers();
    renderPalette();
    const background = diagram();
    fireEvent.pointerDown(background, { pointerType: "touch", pointerId: 1, isPrimary: true, clientX: 30, clientY: 30 });
    if (reason === "move") fireEvent.pointerMove(background, { pointerType: "touch", pointerId: 1, clientX: 45, clientY: 30 });
    if (reason === "cancel") fireEvent.pointerCancel(background, { pointerType: "touch", pointerId: 1 });
    if (reason === "second touch") fireEvent.pointerDown(background, { pointerType: "touch", pointerId: 2, isPrimary: false });
    act(() => vi.advanceTimersByTime(600));
    expect(diagram()).toBeTruthy();
  });

  it("leaves V to text fields, modified shortcuts, and open dialogs", () => {
    const view = render(
      <LanguageProvider>
        <Palette />
        <input aria-label="Note" />
      </LanguageProvider>,
    );
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Note" }), { key: "v" });
    fireEvent.keyDown(document, { key: "v", ctrlKey: true });
    expect(diagram()).toBeTruthy();
    view.rerender(
      <LanguageProvider>
        <Palette />
        <div role="dialog" aria-modal="true">
          Help
        </div>
      </LanguageProvider>,
    );
    fireEvent.keyDown(document, { key: "v" });
    expect(diagram()).toBeTruthy();
    view.rerender(
      <LanguageProvider>
        <Palette />
      </LanguageProvider>,
    );
    fireEvent.keyDown(document, { key: "v" });
    expect(list()).toBeTruthy();
  });
});
