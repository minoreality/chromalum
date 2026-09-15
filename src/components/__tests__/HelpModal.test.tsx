// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { HelpModal } from "../HelpModal";

// Mock the i18n hook
vi.mock("../../i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        help_title: "Keyboard Shortcuts",
        help_close: "Close",
        help_level: "Select tone level",
        help_brush_size: "Brush size +/-",
        help_pan: "Pan",
        help_zoom: "Zoom",
        help_new_canvas: "New canvas",
        help_undo: "Undo",
        help_redo: "Redo",
        help_paste: "Paste image",
        help_this_help: "This help (also F1)",
        help_pan_key: "Space+Drag",
        help_zoom_key: "Wheel / +/-",
        help_eyedropper: "Pick level (eyedropper)",
        help_eyedropper_key: "Right-click / Alt+click",
        help_dblclick_level: "Select level + Brush tool",
        help_dblclick_level_key: "Double-click level",
        help_zoom_pixel: "Pixel-perfect zoom",
        help_zoom_pixel_key: "Right-click zoom btn",
        help_theory_pin: "Pin or release the focused figure element",
        help_music_play: "Play that level",
        help_switch_tab: "Switch tab",
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock the focus trap hook
vi.mock("../../hooks/useFocusTrap", () => ({
  useFocusTrap: () => {},
}));

describe("HelpModal", () => {
  const helpRef = React.createRef<HTMLDivElement>();

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
    expect(screen.getByText("Undo")).toBeTruthy();
    expect(screen.getByText("Select tone level")).toBeTruthy();
    // Tool keys are printed on the tool buttons, so the list does not repeat them.
    expect(screen.queryByText("B")).toBeNull();
    expect(screen.queryByText("Pin or release the focused figure element")).toBeNull();
  });

  it("lists only the figure keys and the common rows for the Theory tab", () => {
    render(<HelpModal showHelp={true} activeTabId="theory" setShowHelp={() => {}} helpRef={helpRef} />);
    expect(screen.getByText("Pin or release the focused figure element")).toBeTruthy();
    expect(screen.getByText("This help (also F1)")).toBeTruthy();
    expect(screen.getByText("Alt+1-8")).toBeTruthy();
    expect(screen.getByText("Switch tab")).toBeTruthy();
    expect(screen.queryByText("Undo")).toBeNull();
    expect(screen.queryByText("Select tone level")).toBeNull();
  });

  it("lists the sonification keys for the Music tab", () => {
    render(<HelpModal showHelp={true} activeTabId="music" setShowHelp={() => {}} helpRef={helpRef} />);
    expect(screen.getByText("1-6")).toBeTruthy();
    expect(screen.getByText("Play that level")).toBeTruthy();
    expect(screen.queryByText("Select tone level")).toBeNull();
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
