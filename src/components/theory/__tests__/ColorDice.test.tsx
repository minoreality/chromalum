// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { LanguageProvider } from "../../../i18n";
import { ColorDice } from "../ColorDice";

function renderWithLanguage() {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <ColorDice hlLevel={null} onHover={() => {}} />
    </LanguageProvider>,
  );
}

function renderNetWithLanguage() {
  localStorage.setItem("chromalum_lang", "en");
  const onHover = vi.fn();
  function InteractiveDice() {
    const [level, setLevel] = useState<number | null>(null);
    return (
      <ColorDice
        hlLevel={level}
        onHover={(next) => {
          onHover(next);
          setLevel(next);
        }}
      />
    );
  }
  const rendered = render(
    <LanguageProvider>
      <InteractiveDice />
    </LanguageProvider>,
  );
  return { ...rendered, onHover };
}

describe("ColorDice", () => {
  it("shows complementary face ranks without the removed mixing views", () => {
    const { container } = renderWithLanguage();
    const structure = screen.getByTestId("color-die-rank-structure");
    const structureText = structure.textContent ?? "";

    expect(structureText).toContain("L(c) = 1…6");
    expect(structureText).toContain("⚀⚁⚂⚃⚄⚅");
    expect(structureText).toContain("B₁↔Y₆");
    expect(structureText).toContain("R₂↔C₅");
    expect(structureText).toContain("G₄↔M₃");
    expect(structureText).toContain("L(c̄) = 7 − L(c)");
    expect(structureText).toContain("L(c) + L(c̄) = 7");

    expect(screen.queryByTestId("color-die-view-grid")).toBeNull();
    expect(container.textContent).not.toContain("XNOR");
  });

  it("preserves pointer pinning and makes every visible face keyboard operable", async () => {
    const { container, onHover } = renderNetWithLanguage();
    const view = container.querySelector<HTMLElement>('[data-testid="hue-order-net"]');
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

  it("shares the pinned selection between faces and complementary rows while hover and focus preview other pairs", () => {
    const { container } = renderNetWithLanguage();
    const row = (pair: string) => container.querySelector<HTMLButtonElement>(`[data-complement-pair="${pair}"]`)!;
    const highlightedFaces = () =>
      [...container.querySelectorAll('[data-hue-net-highlighted="true"]')]
        .map((face) => Number(face.getAttribute("data-hue-net-face")))
        .sort();
    const blueYellow = row("B1-Y6");
    const redCyan = row("R2-C5");
    const greenMagenta = row("G4-M3");

    fireEvent.mouseEnter(redCyan);
    expect(highlightedFaces()).toEqual([2, 5]);
    fireEvent.mouseLeave(redCyan);
    expect(highlightedFaces()).toEqual([]);

    fireEvent.click(blueYellow);
    fireEvent.mouseEnter(redCyan);
    expect(highlightedFaces()).toEqual([2, 5]);
    expect(blueYellow.getAttribute("aria-pressed")).toBe("true");
    fireEvent.mouseLeave(redCyan);
    expect(highlightedFaces()).toEqual([1, 6]);

    fireEvent.focus(greenMagenta);
    expect(highlightedFaces()).toEqual([3, 4]);
    fireEvent.blur(greenMagenta);
    expect(highlightedFaces()).toEqual([1, 6]);

    const cyan = container.querySelector('[data-hue-net-face="5"]')!;
    fireEvent.click(cyan);
    expect(highlightedFaces()).toEqual([2, 5]);
    expect(redCyan.getAttribute("aria-pressed")).toBe("true");
    expect(blueYellow.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(redCyan);
    expect(highlightedFaces()).toEqual([]);
    expect(cyan.getAttribute("aria-pressed")).toBe("false");
  });

  it("clears the pinned pair from a blank press inside the net", () => {
    const { container } = renderNetWithLanguage();
    const net = screen.getByRole("group", { name: "A 2–2–2 net of the Color Die preserving the five hue-order connections" });
    const cyan = container.querySelector('[data-hue-net-face="5"]')!;
    fireEvent.click(cyan);
    expect(cyan.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(net);
    expect(container.querySelectorAll("[aria-pressed='true']")).toHaveLength(0);
    expect(container.querySelectorAll('[data-hue-net-highlighted="true"]')).toHaveLength(0);
  });

  it("shows a connected hue-order net without arrows, delta badges, or a folding banner", () => {
    const { container } = renderNetWithLanguage();
    const net = screen.getByRole("group", { name: "A 2–2–2 net of the Color Die preserving the five hue-order connections" });
    const faces = [...net.querySelectorAll<SVGGElement>("[data-hue-net-face]")];

    expect(faces.map((face) => Number(face.getAttribute("data-hue-net-face")))).toEqual([2, 6, 4, 5, 1, 3]);
    expect(faces.map((face) => Number(face.getAttribute("data-hue-order")))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(net.querySelectorAll("text")).toHaveLength(0);
    expect(faces.map((face) => face.querySelectorAll("[data-hue-net-pip]").length)).toEqual([2, 6, 4, 5, 1, 3]);
    const pipColors = ["", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00"];
    for (const face of faces) {
      expect(face.querySelector("polygon")!.getAttribute("fill")).toBe("#e4e4e4");
      const level = Number(face.getAttribute("data-hue-net-face"));
      for (const pip of face.querySelectorAll("[data-hue-net-pip]")) {
        expect(pip.getAttribute("fill")?.toLowerCase()).toBe(pipColors[level]);
        expect(pip.closest('[aria-hidden="true"]')).not.toBeNull();
      }
    }
    const corners = faces.map((face) =>
      face
        .querySelector("polygon")!
        .getAttribute("points")!
        .split(" ")
        .map((point) => point.split(",").map(Number)),
    );
    for (let i = 0; i < corners.length - 1; i++) {
      const shared = corners[i].filter(([x, y]) =>
        corners[i + 1].some(([nextX, nextY]) => Math.abs(x - nextX) < 1e-8 && Math.abs(y - nextY) < 1e-8),
      );
      expect(shared).toHaveLength(2);
    }
    const cut = container.querySelector('[data-hue-net-cut="3-2"]');
    expect(cut?.textContent).toContain("Cut R₂–M₃; fold to join");
    expect(net.querySelector("path, marker")).toBeNull();
    expect(container.textContent).not.toContain("ΔL");
    expect(screen.queryByTestId("hue-net-fold")).toBeNull();
    expect(container.querySelector("details")).toBeNull();
  });
});
