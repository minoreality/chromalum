// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { ColorDice, HueOrderNet } from "../ColorDice";

function renderWithLanguage() {
  localStorage.setItem("chromalum_lang", "en");
  const onHover = vi.fn();
  const rendered = render(
    <LanguageProvider>
      <ColorDice hlLevel={null} onHover={onHover} />
    </LanguageProvider>,
  );
  return { ...rendered, onHover };
}

function renderNetWithLanguage() {
  localStorage.setItem("chromalum_lang", "en");
  const onHover = vi.fn();
  const rendered = render(
    <LanguageProvider>
      <HueOrderNet hlLevel={null} onHover={onHover} />
    </LanguageProvider>,
  );
  return { ...rendered, onHover };
}

function pathEndpoints(path: string): { start: [number, number]; end: [number, number] } {
  const values = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return {
    start: [values[0], values[1]],
    end: [values[values.length - 2] ?? Number.NaN, values[values.length - 1] ?? Number.NaN],
  };
}

describe("ColorDice", () => {
  it("makes the rank-to-die-face coincidence and all eight three-face views explicit", () => {
    const { container } = renderWithLanguage();
    const structure = screen.getByTestId("color-die-rank-structure");
    const structureText = structure.textContent ?? "";
    const views = [...container.querySelectorAll<HTMLElement>("[data-dice-view]")];

    expect(structureText).toContain("L(c) = 1…6");
    expect(structureText).toContain("⚀ ⚁ ⚂ ⚃ ⚄ ⚅");
    expect(structureText).toContain("B₁ ↔ Y₆");
    expect(structureText).toContain("R₂ ↔ C₅");
    expect(structureText).toContain("G₄ ↔ M₃");
    expect(structureText).toContain("L(c̄) = 7 − L(c)");
    expect(structureText).toContain("L(c) + L(c̄) = 7");

    expect(screen.getByTestId("color-die-view-grid").style.maxWidth).toBe("560px");
    expect(views).toHaveLength(8);
    for (const view of views) {
      expect(view.querySelectorAll("[data-face-rank]")).toHaveLength(3);
      const relation = view.querySelector<HTMLElement>("[data-relation-kind]");
      expect(relation?.style.fontSize).toBe("10px");
    }
  });

  it("attaches every restricted RGB and CMY coincidence to its actual premise", () => {
    const { container } = renderWithLanguage();
    const text = container.textContent ?? "";
    const conditions = [...container.querySelectorAll<HTMLElement>("[data-condition]")].map((node) => node.getAttribute("data-condition"));

    expect(screen.getByTestId("rgb-restricted-rule").textContent).toContain("a ∧ b = 000");
    expect(screen.getByTestId("rgb-restricted-rule").textContent).toContain("a ∨ b = a ⊕ b");
    expect(screen.getByTestId("cmy-restricted-rule").textContent).toContain("a ∨ b = 111");
    expect(screen.getByTestId("cmy-restricted-rule").textContent).toContain("a ∧ b = XNOR(a,b)");
    expect(text).not.toContain("RGB→CMY: XOR");
    expect(text).not.toContain("CMY→RGB: AND");

    expect(conditions).toEqual(["010&100=000", "011|101=111", "100&001=000", "011|110=111", "001&010=000", "101|110=111"]);
    expect(text).toContain("010(R) ∧ 100(G) = 000");
    expect(text).toContain("= 010(R) ⊕ 100(G)");
    expect(text).toContain("= 110(Y)");
    expect(text).toContain("011(M) ∨ 110(Y) = 111");
    expect(text).toContain("= XNOR(011,110)");
    expect(text).toContain("= 010(R)");
    expect(text).toContain("a ∨ b = W");
    expect(text).toContain("L(a∧b)=L(a)+L(b)−7");
  });

  it("keeps the three-input views distinct from the conditional two-input coincidences", () => {
    const { container } = renderWithLanguage();
    const rgbTriple = container.querySelector<HTMLElement>('[data-dice-view="rgb-triple"]');
    const cmyTriple = container.querySelector<HTMLElement>('[data-dice-view="cmy-triple"]');

    expect(rgbTriple).not.toBeNull();
    expect(cmyTriple).not.toBeNull();
    expect(rgbTriple?.textContent).toContain("R₂ ∨ B₁ ∨ G₄ = W₇");
    expect(rgbTriple?.textContent).toContain("010(R) ⊕ 001(B)");
    expect(rgbTriple?.textContent).toContain("⊕ 100(G) = 111(W)");
    expect(cmyTriple?.textContent).toContain("C₅ ∧ M₃ ∧ Y₆ = K₀");
    expect(cmyTriple?.textContent).toContain("101(C) ∧ 011(M)");
    expect(cmyTriple?.textContent).toContain("∧ 110(Y) = 000(K)");
    expect(cmyTriple?.textContent).not.toContain("XNOR");
  });

  it("aims all three triple-input arrows at the shared center of the diagram", () => {
    const { container } = renderWithLanguage();

    for (const id of ["rgb-triple", "cmy-triple"]) {
      const view = container.querySelector<HTMLElement>(`[data-dice-view="${id}"]`);
      const node = view?.querySelector<SVGCircleElement>('[data-operation-node="triple-center"]');
      const arrows = [...(view?.querySelectorAll<SVGPathElement>('[data-relation-arrow="triple-input"]') ?? [])];

      expect(node).not.toBeNull();
      expect(arrows).toHaveLength(3);
      const center: [number, number] = [Number(node?.getAttribute("cx")), Number(node?.getAttribute("cy"))];
      expect(center).toEqual([36, 34]);

      for (const arrow of arrows) {
        const { start, end } = pathEndpoints(arrow.getAttribute("d") ?? "");
        const startDistance = Math.hypot(start[0] - center[0], start[1] - center[1]);
        const endDistance = Math.hypot(end[0] - center[0], end[1] - center[1]);
        expect(endDistance).toBeLessThanOrEqual(5.6);
        expect(endDistance).toBeLessThan(startDistance);
      }
      expect(view?.querySelector('[data-relation-arrow="triple-output"]')).toBeNull();
    }
  });

  it("uses arrows plus line style to distinguish additive and subtractive readings", () => {
    const { container } = renderWithLanguage();
    const rgbPair = container.querySelector<HTMLElement>('[data-dice-view="rgb-rg"]');
    const cmyPair = container.querySelector<HTMLElement>('[data-dice-view="cmy-mc"]');

    expect(rgbPair?.querySelector('marker[id="dice-relation-arrow-rgb-rg"]')).not.toBeNull();
    expect(cmyPair?.querySelector('marker[id="dice-relation-arrow-cmy-mc"]')).not.toBeNull();
    expect(rgbPair?.querySelector('g[stroke-dasharray="3 2"]')).toBeNull();
    expect(cmyPair?.querySelector('g[stroke-dasharray="3 2"]')).not.toBeNull();
    expect(rgbPair?.textContent).toContain("∨ = ⊕");
    expect(cmyPair?.textContent).toContain("∧ = XNOR");
  });

  it("preserves pointer pinning and makes every visible face keyboard operable", async () => {
    const { container, onHover } = renderWithLanguage();
    const view = container.querySelector<HTMLElement>('[data-dice-view="rgb-rg"]');
    expect(view).not.toBeNull();
    const redFace = within(view!).getByRole("button", { name: "R · 2 · 010" });

    fireEvent.mouseEnter(redFace);
    expect(onHover).toHaveBeenLastCalledWith(2);
    fireEvent.mouseLeave(redFace);
    expect(onHover).toHaveBeenLastCalledWith(null);

    fireEvent.click(redFace);
    await waitFor(() => expect(onHover).toHaveBeenLastCalledWith(2));
    expect(redFace.getAttribute("aria-pressed")).toBe("true");

    fireEvent.keyDown(redFace, { key: " " });
    await waitFor(() => expect(onHover).toHaveBeenLastCalledWith(null));
    expect(redFace.getAttribute("aria-pressed")).toBe("false");

    fireEvent.focus(redFace);
    expect(onHover).toHaveBeenLastCalledWith(2);
    fireEvent.blur(redFace);
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it("constructs the visible hue-order net before folding without restoring the long uniqueness appendix", () => {
    const { container } = renderNetWithLanguage();
    const text = container.textContent ?? "";
    const faces = [...container.querySelectorAll<SVGGElement>("[data-hue-net-face]")];
    const links = [...container.querySelectorAll<SVGGElement>("[data-hue-net-link]")];

    expect(
      screen.getByRole("group", { name: "The 2–2–2 cube net obtained by cutting the M–R edge of the chromatic six-cycle" }),
    ).toBeTruthy();
    expect(faces.map((face) => Number(face.getAttribute("data-hue-net-face")))).toEqual([2, 6, 4, 5, 1, 3]);
    expect(faces.map((face) => Number(face.getAttribute("data-hue-order")))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(links.map((link) => link.getAttribute("data-hue-net-link"))).toEqual(["2-6", "6-4", "4-5", "5-1", "1-3"]);
    expect(links.map((link) => Number(link.getAttribute("data-level-delta")))).toEqual([4, -2, 1, -4, 2]);
    expect(links.map((link) => [Number(link.getAttribute("data-from-level")), Number(link.getAttribute("data-to-level"))])).toEqual([
      [2, 6],
      [6, 4],
      [4, 5],
      [5, 1],
      [1, 3],
    ]);
    expect(links.map((link) => link.querySelector("[data-level-delta-label]")?.textContent)).toEqual([
      "ΔL=+4",
      "ΔL=−2",
      "ΔL=+1",
      "ΔL=−4",
      "ΔL=+2",
    ]);
    for (const link of links) {
      expect(link.getAttribute("data-edge-kind")).toBe("shared");
      const arrow = link.querySelector<SVGPathElement>('path[marker-end="url(#hue-net-arrow)"]');
      expect(arrow).not.toBeNull();
      const from = Number(link.getAttribute("data-from-level"));
      const to = Number(link.getAttribute("data-to-level"));
      const delta = Number(link.getAttribute("data-level-delta"));
      expect(delta).toBe(to - from);

      const { start, end } = pathEndpoints(arrow?.getAttribute("d") ?? "");
      expect(end[0]).toBeGreaterThan(start[0]);
      if (delta > 0) expect(end[1]).toBeLessThan(start[1]);
      else expect(end[1]).toBeGreaterThan(start[1]);
    }

    const cut = container.querySelector<HTMLElement>('[data-hue-net-cut="3-2"]');
    expect(cut).not.toBeNull();
    expect(cut?.getAttribute("data-from-level")).toBe("3");
    expect(cut?.getAttribute("data-to-level")).toBe("2");
    expect(cut?.getAttribute("data-level-delta")).toBe("-1");
    expect(cut?.getAttribute("data-edge-kind")).toBe("cut");
    expect(cut?.textContent).toContain("Cut edge: M₃ → R₂, ΔL=−1");
    expect(screen.getByTestId("hue-net-delta-definition").textContent).toContain("ΔL = L(next color) − L(current color)");
    expect(text).toContain("Hue path obtained by cutting the M–R edge of C₆");
    expect(screen.getByTestId("hue-net-fold").textContent).toContain("Fold along the five hue-order shared edges");
    expect(container.querySelector("details")).toBeNull();
    expect(text).not.toContain("11 free cube nets");
    expect(text).not.toContain("60°");
    expect(text).not.toContain("tone zigzag");
  });
});
