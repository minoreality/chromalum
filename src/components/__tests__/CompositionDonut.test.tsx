// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { COMPOSITION_DONUT_PRESERVE_ATTR, CompositionDonut } from "../CompositionDonut";

const i18n = vi.hoisted(() => ({ prefix: "" }));

vi.mock("../../i18n", () => ({
  useTranslation: () => ({
    t: (key: string, ...args: unknown[]) => i18n.prefix + (args.length ? `${key}(${args.join(",")})` : key),
  }),
}));

const colorLUT: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 255],
  [255, 0, 0],
  [255, 0, 255],
  [0, 255, 0],
  [0, 255, 255],
  [255, 255, 0],
  [255, 255, 255],
];

function renderCompositionDonut() {
  const width = 10;
  const height = 10;
  const levelData = new Uint8Array(width * height);
  levelData.fill(0, 0, 50);
  levelData.fill(1, 50);

  return render(
    <div>
      <button>outside</button>
      <button {...{ [COMPOSITION_DONUT_PRESERVE_ATTR]: "true" }}>map control</button>
      <CompositionDonut
        canvasData={{ width, height, levelData, pixelCandidateOverrideMap: new Uint8Array(width * height) }}
        levelHistogram={[50, 50, 0, 0, 0, 0, 0, 0]}
        total={100}
        colorLUT={colorLUT}
        candidateIndexByLevel={[0, 0, 0, 0, 0, 0, 0, 0]}
      />
    </div>,
  );
}

/** A 10×10 canvas holding the given number of pixels of each level, in level order. */
function donutFor(levelHistogram: number[]) {
  const levelData = new Uint8Array(100);
  let at = 0;
  levelHistogram.forEach((count, lv) => {
    levelData.fill(lv, at, at + count);
    at += count;
  });
  return (
    <CompositionDonut
      canvasData={{ width: 10, height: 10, levelData, pixelCandidateOverrideMap: new Uint8Array(100) }}
      levelHistogram={levelHistogram}
      total={100}
      colorLUT={colorLUT}
      candidateIndexByLevel={[0, 0, 0, 0, 0, 0, 0, 0]}
    />
  );
}

describe("CompositionDonut", () => {
  // Paste, Alt+L and keyboard edits change what the pin describes without a
  // pointerdown to clear it, so the readout has to follow the current canvas.
  it("keeps a pinned slice's readout current when the canvas changes under it", () => {
    const { container, rerender } = render(donutFor([50, 50, 0, 0, 0, 0, 0, 0]));
    fireEvent.click(container.querySelectorAll("[data-composition-donut-slice='true']")[1]);
    expect(screen.getByText("L1 Blue")).toBeTruthy();
    expect(screen.getByText("donut_count_pct(50.0,50)")).toBeTruthy();

    rerender(donutFor([70, 30, 0, 0, 0, 0, 0, 0]));
    expect(screen.getByText("L1 Blue")).toBeTruthy();
    expect(screen.getByText("donut_count_pct(30.0,30)")).toBeTruthy();
    expect(screen.queryByText("donut_count_pct(50.0,50)")).toBeNull();
  });

  it("drops the pin when its level leaves the canvas", () => {
    const { container, rerender } = render(donutFor([50, 50, 0, 0, 0, 0, 0, 0]));
    fireEvent.click(container.querySelectorAll("[data-composition-donut-slice='true']")[1]);
    expect(screen.getByText("L1 Blue")).toBeTruthy();

    rerender(donutFor([100, 0, 0, 0, 0, 0, 0, 0]));
    expect(screen.queryByText("L1 Blue")).toBeNull();

    // The pin does not come back when the level does.
    rerender(donutFor([50, 50, 0, 0, 0, 0, 0, 0]));
    expect(screen.queryByText("L1 Blue")).toBeNull();
  });

  it("retranslates a pinned slice's readout when the language changes", () => {
    const { container, rerender } = render(donutFor([50, 50, 0, 0, 0, 0, 0, 0]));
    fireEvent.click(container.querySelectorAll("[data-composition-donut-slice='true']")[1]);
    expect(screen.getByText("donut_tone_value(1/7)")).toBeTruthy();

    i18n.prefix = "ja:";
    try {
      rerender(donutFor([50, 50, 0, 0, 0, 0, 0, 0]));
      expect(screen.getByText("ja:donut_tone_value(1/7)")).toBeTruthy();
    } finally {
      i18n.prefix = "";
    }
  });

  it("clears a pinned slice when the user clicks outside the graph", () => {
    const { container } = renderCompositionDonut();
    const slices = container.querySelectorAll("[data-composition-donut-slice='true']");

    fireEvent.pointerDown(slices[0]);
    fireEvent.click(slices[0]);
    expect(screen.getByText("L0 Black")).toBeTruthy();

    fireEvent.pointerDown(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByText("L0 Black")).toBeNull();
  });

  it("keeps slice clicks available while outside-click clearing is armed", () => {
    const { container } = renderCompositionDonut();
    const slices = container.querySelectorAll("[data-composition-donut-slice='true']");

    fireEvent.pointerDown(slices[0]);
    fireEvent.click(slices[0]);
    expect(screen.getByText("L0 Black")).toBeTruthy();

    fireEvent.pointerDown(slices[1]);
    fireEvent.click(slices[1]);
    expect(screen.queryByText("L0 Black")).toBeNull();
    expect(screen.getByText("L1 Blue")).toBeTruthy();
  });

  it("keeps a pinned slice when the user clicks a preserved map control", () => {
    const { container } = renderCompositionDonut();
    const slices = container.querySelectorAll("[data-composition-donut-slice='true']");

    fireEvent.pointerDown(slices[0]);
    fireEvent.click(slices[0]);
    expect(screen.getByText("L0 Black")).toBeTruthy();

    fireEvent.pointerDown(screen.getByRole("button", { name: "map control" }));
    expect(screen.getByText("L0 Black")).toBeTruthy();
  });
});
