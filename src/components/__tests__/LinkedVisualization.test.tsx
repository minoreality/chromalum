// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LinkedVisualization } from "../LinkedVisualization";
import { MusicLinkedVisualization } from "../music/MusicLinkedVisualization";

vi.mock("../../i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("LinkedVisualization split", () => {
  it("renders the shared color legend by default", () => {
    render(<LinkedVisualization hueAngle={0} brushLevel={0} />);

    expect(screen.getByText("linkedviz_mode_l0")).toBeTruthy();
    expect(screen.getByText("linkedviz_legend_l0_origin")).toBeTruthy();
    expect(screen.queryByText("Diatonic (7-note)")).toBeNull();
  });

  it("renders interval ratios only through the music wrapper", () => {
    render(<MusicLinkedVisualization hueAngle={0} brushLevel={0} scaleMode="diatonic7" />);

    expect(screen.getByText("linkedviz_mode_l0")).toBeTruthy();
    expect(screen.getByText("Diatonic (7-note)")).toBeTruthy();
    expect(screen.queryByText("linkedviz_legend_l0_origin")).toBeNull();
  });
});
