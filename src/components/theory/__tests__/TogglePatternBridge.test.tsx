// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { TogglePatternBridge } from "../TogglePatternBridge";

function renderBridge() {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <TogglePatternBridge hlLevel={null} onHover={vi.fn()} />
    </LanguageProvider>,
  );
}

describe("TogglePatternBridge", () => {
  it("derives exactly seven nonzero masks from the three primary toggles", () => {
    renderBridge();

    const bridge = screen.getByRole("group", { name: "Seven nonzero patterns composed from primary-bit toggles" });
    expect(bridge.textContent?.replace(/\s+/g, "")).toContain("τc²=id·τcτd=τdτc");
    expect(screen.getByTestId("toggle-pattern-layer-1").querySelectorAll("[data-testid^='toggle-pattern-']")).toHaveLength(3);
    expect(screen.getByTestId("toggle-pattern-layer-2").querySelectorAll("[data-testid^='toggle-pattern-']")).toHaveLength(3);
    expect(screen.getByTestId("toggle-pattern-layer-3").querySelectorAll("[data-testid^='toggle-pattern-']")).toHaveLength(1);

    for (const count of [1, 2]) {
      const chipRow = screen.getByTestId(`toggle-pattern-layer-${count}`).querySelector<HTMLElement>("div:nth-child(2)");
      expect(chipRow?.style.flexWrap).toBe("nowrap");
    }

    expect(screen.getByTestId("toggle-pattern-4").textContent).toContain("G · 100");
    expect(screen.getByTestId("toggle-pattern-6").textContent).toContain("Y · 110");
    expect(screen.getByTestId("toggle-pattern-6").textContent).toContain("τGτR");
    expect(screen.getByTestId("toggle-pattern-7").textContent).toContain("W · 111");
    expect(screen.getByTestId("toggle-pattern-7").textContent).toContain("τGτRτB");
  });

  it("connects the same masks to Fano points and Hamming syndromes", () => {
    renderBridge();

    expect(screen.getByText("7 nonzero masks → Fano points")).toBeTruthy();
    expect(screen.getByText("7 nonzero patterns → syndrome labels")).toBeTruthy();
  });
});
