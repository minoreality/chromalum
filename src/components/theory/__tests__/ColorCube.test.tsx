// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { ColorCube } from "../ColorCube";

function renderWithLanguage() {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <ColorCube hlLevel={null} onHover={vi.fn()} />
    </LanguageProvider>,
  );
}

describe("ColorCube", () => {
  it("does not render RGB axis letter labels", () => {
    const { container } = renderWithLanguage();

    const svg = screen.getByRole("img", { name: "Color Cube" });
    expect([...svg.querySelectorAll("text")].some((el) => ["R", "G", "B"].includes(el.textContent ?? ""))).toBe(false);

    fireEvent.mouseEnter(screen.getByText("0").parentElement!);

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
});
