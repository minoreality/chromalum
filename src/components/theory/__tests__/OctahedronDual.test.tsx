// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { OCTA_COMPLEMENT_AXES, OCTA_EDGES, OCTA_FACES } from "../../../data/theory-data";
import { OctahedronDual } from "../OctahedronDual";

function renderDual(hlLevel: number | null = null) {
  localStorage.setItem("chromalum_lang", "en");
  const onHover = vi.fn();
  const rendered = render(
    <LanguageProvider>
      <OctahedronDual hlLevel={hlLevel} onHover={onHover} />
    </LanguageProvider>,
  );
  return { ...rendered, onHover };
}

describe("OctahedronDual", () => {
  it("renders both sides of the combinatorial duality without a rotating 3D scene", () => {
    const { container } = renderDual();

    expect(container.querySelectorAll("[data-die-surface-face]")).toHaveLength(6);
    expect(container.querySelectorAll("[data-die-face]")).toHaveLength(6);
    expect(container.querySelectorAll("[data-die-vertex]")).toHaveLength(8);
    expect(container.querySelectorAll("[data-octa-vertex]")).toHaveLength(6);
    expect(container.querySelectorAll("[data-octa-surface-face]")).toHaveLength(8);
    expect(container.querySelectorAll("[data-octa-face]")).toHaveLength(8);
    expect(container.querySelectorAll("[data-octa-edge]")).toHaveLength(12);
    expect(container.querySelector("[data-dual-correspondence]")).not.toBeNull();
    expect(container.querySelector("[data-dual-correspondence]")?.textContent).toContain("D ↔ D*");
    expect(container.querySelector("[data-dual-correspondence]")?.textContent).not.toContain("DUAL");
    expect(container.querySelector("animate, animateTransform")).toBeNull();
  });

  it("derives the three antipodal axes and all eight triangular faces from shared theory data", () => {
    const { container } = renderDual();
    const axes = [...container.querySelectorAll("[data-complement-axis]")].map((node) => node.getAttribute("data-complement-axis"));
    const edges = [...container.querySelectorAll("[data-octa-edge]")].map((node) => node.getAttribute("data-octa-edge"));
    const faces = [...container.querySelectorAll("[data-octa-face]")].map((node) => ({
      color: Number(node.getAttribute("data-octa-face")),
      verts: node.getAttribute("data-face-verts"),
    }));

    expect(axes).toEqual(OCTA_COMPLEMENT_AXES.map(([a, b]) => `${a}-${b}`));
    expect(edges).toEqual(OCTA_EDGES.map(([a, b]) => `${a}-${b}`));
    expect(faces).toEqual(OCTA_FACES.map((face) => ({ color: face.color, verts: face.verts.join("-") })));
  });

  it("makes octahedral face adjacency the cube graph Q3", () => {
    const { container } = renderDual(0);
    const faceSet = container.querySelector('[data-dual-set="eight-octa-faces"]');

    expect(faceSet?.getAttribute("data-face-adjacency-count")).toBe("12");
    expect(faceSet?.getAttribute("data-face-adjacency-is-q3")).toBe("true");
    expect(container.querySelectorAll('[data-octa-surface-face][data-face-adjacent="true"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-cube-edge][data-highlighted-incident="true"]')).toHaveLength(3);
  });

  it("links a die face to the identically labelled octahedral vertex and its complement axis", () => {
    const { container } = renderDual(2);
    const dieFace = container.querySelector('[data-die-surface-face="2"]');
    const octaVertex = container.querySelector('[data-octa-vertex="2"]');
    const complementAxis = container.querySelector('[data-complement-axis="2-5"]');

    expect(dieFace?.getAttribute("stroke")).toBe("#fff");
    expect(octaVertex?.getAttribute("aria-pressed")).toBe("true");
    expect(complementAxis?.getAttribute("data-axis-active")).toBe("true");
  });

  it("supports hover, keyboard focus, and persistent pinning on both dual sets", async () => {
    const { container, onHover } = renderDual();
    const dieVertex = container.querySelector<SVGGElement>('[data-die-vertex="7"]');
    const octaVertex = container.querySelector<SVGGElement>('[data-octa-vertex="2"]');

    expect(dieVertex).not.toBeNull();
    expect(octaVertex).not.toBeNull();

    fireEvent.mouseEnter(dieVertex!);
    expect(onHover).toHaveBeenLastCalledWith(7);
    fireEvent.mouseLeave(dieVertex!);
    expect(onHover).toHaveBeenLastCalledWith(null);

    fireEvent.focus(octaVertex!);
    expect(onHover).toHaveBeenLastCalledWith(2);
    fireEvent.blur(octaVertex!);
    expect(onHover).toHaveBeenLastCalledWith(null);

    fireEvent.click(octaVertex!);
    await waitFor(() => expect(onHover).toHaveBeenLastCalledWith(2));
    expect(octaVertex?.getAttribute("aria-pressed")).toBe("true");

    fireEvent.keyDown(octaVertex!, { key: " " });
    await waitFor(() => expect(onHover).toHaveBeenLastCalledWith(null));
    expect(octaVertex?.getAttribute("aria-pressed")).toBe("false");
  });

  it("states all four dual correspondences outside the compact diagram", () => {
    renderDual();

    const relations = screen.getByTestId("octahedron-dual-relations");
    expect(relations.querySelector('[data-dual-relation="faces-to-vertices"]')).not.toBeNull();
    expect(relations.querySelector('[data-dual-relation="vertices-to-faces"]')).not.toBeNull();
    expect(relations.querySelector('[data-dual-relation="edges-to-edges"]')).not.toBeNull();
    expect(relations.querySelector('[data-dual-relation="opposites-to-axes"]')).not.toBeNull();
    expect(relations.querySelector('[data-dual-relation="face-adjacency-q3"]')).not.toBeNull();
  });
});
