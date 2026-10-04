// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { HelpModal } from "../HelpModal";

// Exercise the displayed copy rather than keeping a second dictionary in the test.
vi.mock("../../i18n", async () => {
  const { en } = await import("../../i18n/en");
  return { useTranslation: () => ({ t: (key: keyof typeof en) => en[key] }) };
});

// Mock the focus trap hook
const useFocusTrapMock = vi.fn();
vi.mock("../../hooks/useFocusTrap", () => ({
  useFocusTrap: (...args: unknown[]) => useFocusTrapMock(...args),
}));

describe("HelpModal", () => {
  const helpRef = React.createRef<HTMLDivElement>();

  it("closes on Escape through its own focus trap, not the window shortcut handler", () => {
    const setShowHelp = vi.fn();
    render(<HelpModal showHelp={true} activeTabId="source" setShowHelp={setShowHelp} helpRef={helpRef} />);
    const calls = useFocusTrapMock.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[1]).toBe(true);
    const onEscape = lastCall?.[2] as (() => void) | undefined;
    expect(typeof onEscape).toBe("function");
    onEscape?.();
    expect(setShowHelp).toHaveBeenCalledWith(false);
  });

  it("does not render when showHelp is false", () => {
    const { container } = render(<HelpModal showHelp={false} activeTabId="source" setShowHelp={() => {}} helpRef={helpRef} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders when showHelp is true", () => {
    render(<HelpModal showHelp={true} activeTabId="source" setShowHelp={() => {}} helpRef={helpRef} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("shows help title", () => {
    render(<HelpModal showHelp={true} activeTabId="source" setShowHelp={() => {}} helpRef={helpRef} />);
    expect(screen.getByText("Keyboard Shortcuts")).toBeTruthy();
  });

  it("lists the drawing shortcuts for the Source tab", () => {
    render(<HelpModal showHelp={true} activeTabId="source" setShowHelp={() => {}} helpRef={helpRef} />);
    expect(screen.getByText("Level / paint")).toBeTruthy();
    expect(screen.getByText("Hold 0-7")).toBeTruthy();
    expect(screen.getByText("Draw shape")).toBeTruthy();
    expect(screen.getByText("Cancel shape")).toBeTruthy();
    // Tool keys are printed on the tool buttons, so the list does not repeat them.
    expect(screen.queryByText("B")).toBeNull();
    for (const omitted of ["Ctrl+N", "Ctrl+Z", "Ctrl+Y / ⌘⇧Z", "Drag & drop", "Alt+L", "?/F1", "Level ×2"]) {
      expect(screen.queryByText(omitted)).toBeNull();
    }
    expect(screen.queryByText("Pin / release")).toBeNull();
  });

  it.each(["glaze"] as const)("leaves the Source-only zoom-button gesture off the %s tab", (tab) => {
    render(<HelpModal showHelp={true} activeTabId={tab} setShowHelp={() => {}} helpRef={helpRef} />);
    expect(screen.getByText("Select level")).toBeTruthy();
    expect(screen.getByText("Zoom")).toBeTruthy();
    // Only Source's zoom button takes the pixel-scale right-click gesture.
    expect(screen.queryByText("Right-click zoom btn")).toBeNull();
  });

  it("keeps the zoom-button gesture on the Source tab", () => {
    render(<HelpModal showHelp={true} activeTabId="source" setShowHelp={() => {}} helpRef={helpRef} />);
    expect(screen.getByText("Right-click zoom btn")).toBeTruthy();
  });

  it("lists only the figure keys and the common rows for the Theory tab", () => {
    render(<HelpModal showHelp={true} activeTabId="theory" setShowHelp={() => {}} helpRef={helpRef} />);
    expect(screen.getByText("Pin / release")).toBeTruthy();
    expect(screen.getByText("Alt+1-7")).toBeTruthy();
    expect(screen.getByText("Switch tab")).toBeTruthy();
    expect(screen.queryByText("Ctrl+Z")).toBeNull();
    expect(screen.queryByText("Select level")).toBeNull();
  });

  it("lists the pin gesture beside the candidate keys for the Hex tab", () => {
    render(<HelpModal showHelp={true} activeTabId="hex" setShowHelp={() => {}} helpRef={helpRef} />);
    expect(screen.getByText("2-5")).toBeTruthy();
    expect(screen.getByText("Cycle color")).toBeTruthy();
    // Right-click and long press are printed nowhere on the figure, and the
    // gold ring is the pin's whole report, so this row is the only place a
    // reader can find the gesture at all.
    expect(screen.getByText("Right-click / Hold")).toBeTruthy();
    expect(screen.getByText("Pin / release")).toBeTruthy();
    expect(screen.getByText("Blank ×2 / Hold / V")).toBeTruthy();
    expect(screen.getByText("Palette view")).toBeTruthy();
    expect(screen.queryByText("Select level")).toBeNull();
  });

  it("lists the sonification keys for the Music tab", () => {
    render(<HelpModal showHelp={true} activeTabId="music" setShowHelp={() => {}} helpRef={helpRef} />);
    expect(screen.getByText("1-6")).toBeTruthy();
    expect(screen.getByText("Play level")).toBeTruthy();
    expect(screen.queryByText("Select level")).toBeNull();
  });

  it("has close button", () => {
    const setShowHelp = vi.fn();
    render(<HelpModal showHelp={true} activeTabId="source" setShowHelp={setShowHelp} helpRef={helpRef} />);
    const closeBtns = screen.getAllByText("Close");
    const closeBtn = closeBtns.find((el) => el.tagName === "BUTTON")!;
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.tagName).toBe("BUTTON");
    fireEvent.click(closeBtn);
    expect(setShowHelp).toHaveBeenCalledWith(false);
  });
});
