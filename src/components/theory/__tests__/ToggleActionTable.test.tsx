// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { ToggleActionTable } from "../ToggleActionTable";

function renderTable() {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <ToggleActionTable hlLevel={null} onHover={vi.fn()} />
    </LanguageProvider>,
  );
}

describe("ToggleActionTable", () => {
  it("guides the user through one state row before the complete table", () => {
    const { container } = renderTable();

    expect(screen.getByText("Read one state row first")).toBeTruthy();
    expect(screen.getByText("x=110 · Y · L6")).toBeTruthy();

    const guidedMask = container.querySelector('[data-mask="2"][data-result="4"]');
    expect(guidedMask?.textContent).toContain("m=010 · τR");
    expect(guidedMask?.textContent).toContain("110→100");
    expect(guidedMask?.textContent).toContain("G · L4");
  });

  it("renders every state-mask transition and uses bit strings as the cell labels", () => {
    const { container } = renderTable();
    const cells = Array.from(container.querySelectorAll("g[data-row][data-mask][data-result]"));
    expect(cells).toHaveLength(64);

    for (const cell of cells) {
      const row = Number(cell.getAttribute("data-row"));
      const mask = Number(cell.getAttribute("data-mask"));
      expect(Number(cell.getAttribute("data-result"))).toBe(row ^ mask);
      const result = row ^ mask;
      expect(cell.querySelector("text")?.textContent).toBe(result.toString(2).padStart(3, "0"));
    }

    const yellowRed = container.querySelector('g[data-row="6"][data-mask="2"]');
    fireEvent.mouseEnter(yellowRed!);
    expect(screen.getByText(/Yellow 110/).textContent).toContain("── 010 (τR) ──▶ Green 100");
  });

  it("labels columns as toggle masks and rows as color states", () => {
    const { container } = renderTable();

    const magentaMaskColumn = container.querySelector('[data-column-mask="3"]');
    expect(magentaMaskColumn?.textContent).toContain("011");
    expect(magentaMaskColumn?.textContent).toContain("τRτB");
    expect(magentaMaskColumn?.textContent).not.toContain("M·L3");

    const magentaStateRow = container.querySelector('[data-row-state="3"]');
    expect(magentaStateRow?.textContent).toContain("011");
    expect(magentaStateRow?.textContent).toContain("M·L3");
  });
});
