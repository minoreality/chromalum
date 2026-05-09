// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { XorDemo } from "../XorDemo";

function renderWithLanguage() {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <XorDemo hlLevel={null} onHover={vi.fn()} />
    </LanguageProvider>,
  );
}

function nodeTexts(svg: SVGSVGElement, transform: string) {
  const group = svg.querySelector(`g[transform="${transform}"]`);
  return [...(group?.querySelectorAll("text") ?? [])].map((text) => text.textContent);
}

describe("XorDemo", () => {
  it("uses bit strings inside the XOR result circles and level labels below them", () => {
    const { container } = renderWithLanguage();

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();

    expect(nodeTexts(svg!, "translate(50, 40)")).toEqual(["001", "L1"]);
    expect(nodeTexts(svg!, "translate(170, 40)")).toEqual(["010", "L2"]);
    expect(nodeTexts(svg!, "translate(290, 40)")).toEqual(["011", "L3"]);
  });

  it("shows complement equations as bit strings with color-name pairs", () => {
    renderWithLanguage();

    expect(screen.getByText("001 ⊕ 111 = 110 Blue ↔ Yellow")).toBeTruthy();
    expect(screen.getByText("010 ⊕ 111 = 101 Red ↔ Cyan")).toBeTruthy();
  });
});
