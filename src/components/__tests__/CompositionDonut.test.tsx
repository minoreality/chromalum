// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { COMPOSITION_DONUT_PRESERVE_ATTR, CompositionDonut } from "../CompositionDonut";

vi.mock("../../i18n", () => ({
  useTranslation: () => ({
    t: (key: string, ...args: unknown[]) => (args.length ? `${key}(${args.join(",")})` : key),
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

describe("CompositionDonut", () => {
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
