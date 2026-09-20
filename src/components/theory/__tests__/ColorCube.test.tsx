// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { ColorCube } from "../ColorCube";

function renderWithLanguage(hlLevel: number | null = null) {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <ColorCube hlLevel={hlLevel} onHover={vi.fn()} />
    </LanguageProvider>,
  );
}

describe("ColorCube", () => {
  it("projects a regular cube with one uniform scale in both views", () => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const matchMedia = vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
    try {
      renderWithLanguage();
      const cube = screen.getByRole("group", { name: "Color Cube" });
      const checkProjection = () => {
        const points = [0, 4, 2, 1].map((level) => {
          const circle = cube.querySelector(`[data-level="${level}"] > circle[r="9"]`)!;
          return [Number(circle.getAttribute("cx")), Number(circle.getAttribute("cy"))];
        });
        const x = points.slice(1).map((point) => point[0] - points[0][0]);
        const y = points.slice(1).map((point) => point[1] - points[0][1]);
        // The two rows of a scaled orthographic rotation are orthogonal and
        // have equal lengths. The old 2D interpolation violated this condition.
        expect(Math.hypot(...y)).toBeCloseTo(Math.hypot(...x), 9);
        expect(x.reduce((sum, value, index) => sum + value * y[index], 0)).toBeCloseTo(0, 9);
      };
      checkProjection();
      fireEvent.click(screen.getByRole("button", { name: "Hasse" }));
      checkProjection();
    } finally {
      matchMedia.mockRestore();
    }
  });

  it("paints the correct crossings in reduced motion without promoting highlighted rear edges", () => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const matchMedia = vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
    try {
      renderWithLanguage(2);
      const cube = screen.getByRole("group", { name: "Color Cube" });
      const crossingOrder = () => {
        const edges = [...cube.querySelectorAll("[data-cube-edge]")].map((edge) => edge.getAttribute("data-cube-edge"));
        expect(edges).toHaveLength(12);
        expect(edges.indexOf("2-3")).toBeLessThan(edges.indexOf("1-5"));
        expect(edges.indexOf("2-6")).toBeLessThan(edges.indexOf("4-5"));
        expect([...cube.querySelectorAll('[data-cube-active="true"]')].map((edge) => edge.getAttribute("data-cube-edge")).sort()).toEqual([
          "0-2",
          "2-3",
          "2-6",
        ]);
      };
      crossingOrder();
      const hasse = screen.getByRole("button", { name: "Hasse" });
      fireEvent.click(hasse);
      expect(cube.querySelector(".theory-cube-ranks")?.getAttribute("opacity")).toBe("1");
      crossingOrder();
      fireEvent.click(hasse);
      expect(cube.querySelector(".theory-cube-ranks")).toBeNull();
      crossingOrder();
    } finally {
      matchMedia.mockRestore();
    }
  });

  it("previews each complete face and retains a selected face across previews and projections", () => {
    const { container } = renderWithLanguage();
    const surface = container.querySelector(".theory-cube")!;
    const cube = screen.getByRole("group", { name: "Color Cube" });
    const faces = [...container.querySelectorAll<HTMLButtonElement>("[data-cube-face]")];
    expect(faces.map((face) => face.dataset.cubeFace)).toEqual(["G-0", "G-1", "R-0", "R-1", "B-0", "B-1"]);
    for (const [index, face] of faces.entries()) {
      fireEvent.mouseEnter(face);
      const weight = [4, 2, 1][Math.floor(index / 2)];
      const expectedVertices = Array.from({ length: 8 }, (_, lv) => lv).filter((lv) => Number((lv & weight) !== 0) === index % 2);
      expect([...cube.querySelectorAll('[data-cube-vertex-active="true"]')].map((node) => Number(node.getAttribute("data-level")))).toEqual(
        expectedVertices,
      );
      expect(cube.querySelectorAll('[data-cube-active="true"]')).toHaveLength(4);
      fireEvent.mouseLeave(face);
      expect(cube.querySelectorAll('[data-cube-active="true"]')).toHaveLength(0);
    }
    fireEvent.click(faces[0]);
    fireEvent.mouseLeave(faces[0]);
    expect(surface.getAttribute("data-selected-face")).toBe("G-0");
    fireEvent.mouseEnter(faces[5]);
    expect(surface.getAttribute("data-active-face")).toBe("B-1");
    expect(surface.getAttribute("data-selected-face")).toBe("G-0");
    fireEvent.mouseLeave(faces[5]);
    expect(surface.getAttribute("data-active-face")).toBe("G-0");
    fireEvent.click(screen.getByRole("button", { name: "Hasse" }));
    expect(surface.getAttribute("data-active-face")).toBe("G-0");
    expect(cube.querySelectorAll('[data-cube-active="true"]')).toHaveLength(4);
    fireEvent.keyDown(faces[0], { key: "Escape" });
    expect(surface.getAttribute("data-selected-face")).toBeNull();
    expect(cube.querySelectorAll('[data-cube-active="true"]')).toHaveLength(0);
  });

  it("shows the whole cube by default and toggles the three incident edges across projections", () => {
    const { container } = renderWithLanguage();
    const cube = screen.getByRole("group", { name: "Color Cube" });
    expect(container.querySelectorAll('[data-cube-active="true"]')).toHaveLength(0);
    fireEvent.keyDown(cube.querySelector('[data-level="1"]')!, { key: "Enter" });
    expect([...container.querySelectorAll('[data-cube-active="true"]')].map((edge) => edge.getAttribute("data-cube-edge")).sort()).toEqual([
      "0-1",
      "1-3",
      "1-5",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Hasse" }));
    expect(cube.querySelector('[data-level="1"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll('[data-cube-active="true"]')).toHaveLength(3);
    fireEvent.keyDown(cube.querySelector('[data-level="1"]')!, { key: " " });
    expect(container.querySelectorAll('[data-cube-active="true"]')).toHaveLength(0);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button", { name: /Toggle primary/ })).toBeNull();
  });
  it("does not render RGB axis letter labels", () => {
    const { container } = renderWithLanguage();

    const svg = screen.getByRole("group", { name: "Color Cube" });
    expect([...svg.querySelectorAll("text")].some((el) => ["R", "G", "B"].includes(el.textContent ?? ""))).toBe(false);

    fireEvent.mouseEnter(svg.querySelector('[data-level="0"]')!);

    expect([...svg.querySelectorAll("text")].some((el) => ["R", "G", "B"].includes(el.textContent ?? ""))).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Hasse" }));

    expect([...container.querySelectorAll("svg text")].some((el) => ["R", "G", "B"].includes(el.textContent ?? ""))).toBe(false);
  });

  it("renders all four complement diagonals when the complement overlay is enabled", () => {
    const { container } = renderWithLanguage();

    expect(container.querySelectorAll('[data-testid^="cube-complement-"]')).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Complements" }));

    expect(container.querySelectorAll('[data-testid^="cube-complement-"]')).toHaveLength(4);
    expect(container.querySelector('[data-testid="cube-complement-0-7"]')).not.toBeNull();
  });

  it("emphasizes the three primary-colored edges at a highlighted vertex without equation chips", () => {
    const { container } = renderWithLanguage(1);

    const svg = screen.getByRole("group", { name: "Color Cube" });
    const highlightedEdges = [...svg.querySelectorAll('line[stroke-width="2"]')];
    expect(highlightedEdges).toHaveLength(3);
    expect(highlightedEdges.map((edge) => edge.getAttribute("stroke")).sort()).toEqual(["#0000ff", "#00ff00", "#ff0000"]);
    expect(container.textContent).not.toContain("⊕");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps geometry overlays available while switching to the Hasse projection", async () => {
    const { container } = renderWithLanguage();
    expect(screen.queryByRole("button", { name: "Mixing" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Complements" }));
    const hasse = screen.getByRole("button", { name: "Hasse" });
    fireEvent.click(hasse);
    await waitFor(() => expect(screen.queryByText("rank")).not.toBeNull());
    expect(hasse.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Complements" }).getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll('[data-testid^="cube-complement-"]')).toHaveLength(4);
    expect(screen.getByRole("group", { name: "Color Cube" })).toBeTruthy();
    fireEvent.click(hasse);
    await waitFor(() => expect(screen.queryByText("rank")).toBeNull());
    expect(container.querySelectorAll('[data-testid^="cube-complement-"]')).toHaveLength(4);
  });
});
