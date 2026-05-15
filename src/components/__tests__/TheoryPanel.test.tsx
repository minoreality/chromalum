// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "../../i18n";
import { TheoryPanel } from "../TheoryPanel";

function renderWithLanguage() {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <TheoryPanel />
    </LanguageProvider>,
  );
}

describe("TheoryPanel", () => {
  it("renders the main theory sections and controls", () => {
    const { container } = renderWithLanguage();

    expect(screen.getByText("Discrete Algebraic Color Theory")).toBeTruthy();
    expect(screen.getByText("FOUNDATIONS & NOTATION")).toBeTruthy();
    expect(screen.getByText("CUBE & CYCLES")).toBeTruthy();
    expect(screen.getByText("PROJECTIVE GEOMETRY & CODING")).toBeTruthy();
    expect(screen.getByText("POLYHEDRA")).toBeTruthy();
    expect(screen.getByText("SYNTHESIS & LIMITS")).toBeTruthy();
    expect(screen.getByText("Complements")).toBeTruthy();
    expect(screen.getAllByText("K₈").length).toBeGreaterThan(0);

    expect(Array.from(container.querySelectorAll(".theory-heading")).map((el) => el.textContent)).toEqual([
      "Venn Diagram",
      "Binary Levels",
      "XOR Operation",
      "Color Cube",
      "Gray Code Cycle",
      "Tone Zigzag",
      "Color Die",
      "Fano Plane",
      "Hamming Code",
      "Color Diamond",
      "Color Tetra",
      "Color Star",
      "Polyhedra network",
      "Connections",
      "Scope and Limits",
    ]);

    const polyhedraDiagram = screen.getByRole("img", { name: "Polyhedra network" });
    expect(polyhedraDiagram.querySelector("desc")?.textContent).toContain("common composition");
    const polyhedraLabels = Array.from(polyhedraDiagram.querySelectorAll("text")).map((el) => el.textContent);
    for (const label of ["Cube Q\u2083", "Octahedron", "T\u2080/T\u2081", "Stella Oct."]) {
      expect(polyhedraLabels).toContain(label);
    }
    for (const label of ["F-V reversal", "parity split", "stellation", "compounding"]) {
      expect(polyhedraLabels).toContain(label);
    }
    expect(polyhedraDiagram.querySelector('line[stroke-dasharray="4,3"]')).toBeTruthy();
  });

  it("uses the horizontal space inside the binary table SVG", () => {
    renderWithLanguage();

    const binaryTable = screen.getByRole("img", { name: "Binary Levels" });
    expect(binaryTable.getAttribute("viewBox")).toBe("8 0 368 224");

    const textNodes = Array.from(binaryTable.querySelectorAll("text"));
    const channelHeaderXs = textNodes
      .filter((node) => ["G", "R", "B"].includes(node.textContent ?? "") && node.getAttribute("y") === "18")
      .map((node) => node.getAttribute("x"));
    expect(channelHeaderXs).toEqual(["170", "192", "214"]);
    expect(textNodes.find((node) => node.textContent === "Wt")?.getAttribute("x")).toBe("242");
    expect(textNodes.find((node) => node.textContent === "Hamming")?.getAttribute("x")).toBe("274");
    expect(textNodes.find((node) => node.textContent === "Tone")?.getAttribute("x")).toBe("332");
    expect(textNodes.filter((node) => node.getAttribute("x") === "358").map((node) => node.textContent)).toEqual([
      "0/7",
      "1/7",
      "2/7",
      "3/7",
      "4/7",
      "5/7",
      "6/7",
      "7/7",
    ]);
  });

  it("uses normalized tone labels in the tone zigzag", () => {
    renderWithLanguage();

    const zigzag = screen.getByRole("img", { name: "Tone Zigzag" });
    const textContent = Array.from(zigzag.querySelectorAll("text")).map((node) => node.textContent);

    expect(textContent).toEqual(expect.arrayContaining(["0/7", "1/7", "2/7", "3/7", "4/7", "5/7", "6/7", "7/7", "1/2"]));
    expect(textContent).toEqual(expect.arrayContaining(["+4", "-2", "+1", "-4", "+2", "-1"]));
    const segmentLines = Array.from(zigzag.querySelectorAll('line[stroke-width="2"]'));
    const segmentLabels = ["+4", "-2", "+1", "-4", "+2", "-1"].map((label) =>
      Array.from(zigzag.querySelectorAll("text")).find((node) => node.textContent === label),
    );
    expect(segmentLines).toHaveLength(6);
    for (const [i, label] of segmentLabels.entries()) {
      expect(label?.getAttribute("dominant-baseline")).toBe("central");
      const line = segmentLines[i];
      const x0 = Number(label?.getAttribute("x"));
      const y0 = Number(label?.getAttribute("y"));
      const x1 = Number(line.getAttribute("x1"));
      const y1 = Number(line.getAttribute("y1"));
      const x2 = Number(line.getAttribute("x2"));
      const y2 = Number(line.getAttribute("y2"));
      const distance = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / Math.hypot(y2 - y1, x2 - x1);
      expect(distance).toBeGreaterThan(10);
    }
    const toneCycleLabels = Array.from(zigzag.querySelectorAll('[data-tone-cycle-label="true"]'));
    expect(toneCycleLabels.map((node) => node.textContent)).toEqual(["2", "3", "4", "5", "6", "5", "4", "5", "4", "3", "2", "1", "2", "3"]);
    expect(toneCycleLabels.map((node) => node.getAttribute("fill"))).toEqual([
      "rgb(255,0,0)",
      "rgb(255,64,0)",
      "rgb(255,128,0)",
      "rgb(255,191,0)",
      "rgb(255,255,0)",
      "rgb(128,255,0)",
      "rgb(0,255,0)",
      "rgb(0,255,255)",
      "rgb(0,191,255)",
      "rgb(0,128,255)",
      "rgb(0,64,255)",
      "rgb(0,0,255)",
      "rgb(128,0,255)",
      "rgb(255,0,255)",
    ]);
    const hueAxisLabels = Array.from(zigzag.querySelectorAll('[data-hue-axis-label="true"]'));
    expect(hueAxisLabels.map((node) => node.textContent)).toEqual([
      "0turn",
      "1/6turn",
      "1/3turn",
      "1/2turn",
      "2/3turn",
      "5/6turn",
      "1turn",
    ]);
    expect(hueAxisLabels.map((node) => node.getAttribute("x"))).toEqual(["40", "110", "180", "250", "320", "390", "460"]);
    expect(Number(toneCycleLabels[0].getAttribute("y"))).toBeLessThan(Number(hueAxisLabels[0].getAttribute("y")));
    expect(zigzag.querySelector("#hueGrad")).toBeFalsy();
    expect(zigzag.querySelector('rect[fill="url(#hueGrad)"]')).toBeFalsy();
    expect(textContent.filter((text) => text === "N=4")).toHaveLength(2);
    expect(textContent).not.toContain("N=4 zone");
    expect(textContent).not.toContain("127.5");
    expect(textContent).not.toContain("255");

    const hoverTargets = zigzag.querySelectorAll("rect[fill='transparent']");
    fireEvent.mouseEnter(hoverTargets[2]);
    const levelTwoText = Array.from(zigzag.querySelectorAll("text")).map((node) => node.textContent);
    expect(levelTwoText).toContain("=1");
    const complementSumLabel = Array.from(zigzag.querySelectorAll("text")).find((node) => node.textContent === "=1");
    const nRegionLabel = Array.from(zigzag.querySelectorAll("text")).find((node) => node.textContent === "N=4");
    expect(complementSumLabel?.getAttribute("x")).toBe(nRegionLabel?.getAttribute("x"));
    expect(Number(complementSumLabel?.getAttribute("x"))).toBeGreaterThan(
      Number(hueAxisLabels[hueAxisLabels.length - 1].getAttribute("x")),
    );
    const rightSideVerticalLines = Array.from(zigzag.querySelectorAll("line")).filter(
      (line) =>
        line.getAttribute("x1") === line.getAttribute("x2") &&
        Number(line.getAttribute("x1")) > Number(hueAxisLabels[hueAxisLabels.length - 1].getAttribute("x")),
    );
    expect(rightSideVerticalLines).toHaveLength(0);
    expect(levelTwoText).toEqual(expect.arrayContaining(["0turn", "5/8turn", "3/4turn"]));
    expect(levelTwoText).not.toContain("225°");

    fireEvent.mouseLeave(hoverTargets[2]);
    fireEvent.mouseEnter(zigzag.querySelector('[data-tone-level="2"]')!);
    expect(Array.from(zigzag.querySelectorAll("text")).map((node) => node.textContent)).toContain("=1");
  });

  it("keeps Color Tetra SVG definition ids unique across T0 and T1", () => {
    renderWithLanguage();

    const tetraSection = screen.getByText("Color Tetra").closest("section");
    expect(tetraSection).toBeTruthy();

    const ids = Array.from(tetraSection!.querySelectorAll("[id]")).map((node) => node.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.startsWith("t0-tfg-"))).toBe(true);
    expect(ids.some((id) => id.startsWith("t1-tfg-"))).toBe(true);
  });

  it("keeps Color Tetra T0 and T1 diagrams side by side in narrow layouts", () => {
    renderWithLanguage();

    const tetraPair = screen.getByTestId("tetra-pair");
    expect(tetraPair.style.display).toBe("grid");
    expect(tetraPair.style.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
    expect(tetraPair.querySelectorAll("svg")).toHaveLength(2);
  });

  it("clears pinned highlights when clicking the full-width background surface", async () => {
    const { container } = renderWithLanguage();

    const venn = screen.getByRole("img", { name: "Venn Diagram" });
    await act(async () => {
      fireEvent.click(venn);
      await Promise.resolve();
    });
    await waitFor(() => expect(venn.querySelector('rect[stroke="#fff"]')).toBeTruthy());

    const resetSurface = container.querySelector(".theory-reset-surface");
    expect(resetSurface).toBeTruthy();
    await act(async () => {
      fireEvent.click(resetSurface!);
      await Promise.resolve();
    });
    await waitFor(() => expect(venn.querySelector('rect[stroke="#fff"]')).toBeFalsy());
  });

  it("shows Color Star surface ridges and returns from K8 to surface mode", () => {
    renderWithLanguage();

    const starSection = screen.getByText("Color Star").closest("section");
    expect(starSection).toBeTruthy();

    const buttons = Array.from(starSection!.querySelectorAll("button"));
    const surfaceButton = buttons.find((button) => button.textContent === "Surface");
    const k8Button = buttons.find((button) => button.textContent === "K\u2088");
    expect(surfaceButton).toBeTruthy();
    expect(k8Button).toBeTruthy();

    const compoundLineCount = starSection!.querySelectorAll("line").length;
    fireEvent.click(surfaceButton!);

    expect(starSection!.textContent).toContain("24 surface faces");
    expect(surfaceButton!.getAttribute("aria-pressed")).toBe("true");
    expect(starSection!.querySelectorAll("line").length).toBeGreaterThan(compoundLineCount);

    fireEvent.click(k8Button!);
    expect(starSection!.textContent).toContain("Q\u2083(12)");
    expect(k8Button!.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(surfaceButton!);
    expect(starSection!.textContent).toContain("24 surface faces");
    expect(surfaceButton!.getAttribute("aria-pressed")).toBe("true");
  });
});
