// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { FanoPlane } from "../FanoPlane";

function renderFano() {
  localStorage.setItem("chromalum_lang", "en");
  const onHover = vi.fn();
  const rendered = render(
    <LanguageProvider>
      <FanoPlane hlLevel={null} onHover={onHover} />
    </LanguageProvider>,
  );
  return { ...rendered, onHover };
}

function enableCompletionMode() {
  fireEvent.click(screen.getByRole("button", { name: "Complete a line from two points" }));
}

describe("FanoPlane", () => {
  it("completes the unique Fano line from two directly selected points", () => {
    const { container } = renderFano();
    enableCompletionMode();

    fireEvent.click(screen.getByRole("button", { name: "B, level 1, bits 001" }));
    expect(screen.getByTestId("fano-completion-status").textContent).toContain("B is fixed as the anchor");

    fireEvent.click(screen.getByRole("button", { name: "R, level 2, bits 010" }));

    expect(screen.getByTestId("fano-completion-status").textContent).toContain("B1 ⊕ R2 = M3");
    expect(screen.getByTestId("fano-completion-status").textContent).toContain("001 ⊕ 010 ⊕ 011 = 000");
    expect(container.querySelector('[data-fano-point="1"]')?.getAttribute("data-fano-selection-role")).toBe("a");
    expect(container.querySelector('[data-fano-point="2"]')?.getAttribute("data-fano-selection-role")).toBe("b");
    expect(container.querySelector('[data-fano-point="3"]')?.getAttribute("data-fano-selection-role")).toBe("c");
    expect(container.querySelector('[data-fano-line="1-2-3"]')?.getAttribute("data-fano-line-active")).toBe("true");
  });

  it("keeps the anchor while replacing the second point and completes the circular CMY line", () => {
    const { container } = renderFano();
    enableCompletionMode();

    fireEvent.click(screen.getByRole("button", { name: "M, level 3, bits 011" }));
    fireEvent.click(screen.getByRole("button", { name: "C, level 5, bits 101" }));

    expect(screen.getByTestId("fano-completion-status").textContent).toContain("M3 ⊕ C5 = Y6");
    expect(container.querySelector('[data-fano-line="3-5-6"]')?.getAttribute("data-fano-line-active")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /R, level 2, bits 010/ }));
    expect(container.querySelector('[data-fano-point="3"]')?.getAttribute("data-fano-selection-role")).toBe("a");
    expect(container.querySelector('[data-fano-point="2"]')?.getAttribute("data-fano-selection-role")).toBe("b");
    expect(container.querySelector('[data-fano-point="1"]')?.getAttribute("data-fano-selection-role")).toBe("c");
  });

  it("supports keyboard selection and clears an invalid repeated point", () => {
    renderFano();
    enableCompletionMode();
    const blue = screen.getByRole("button", { name: "B, level 1, bits 001" });

    fireEvent.keyDown(blue, { key: "Enter" });
    expect(blue.getAttribute("aria-pressed")).toBe("true");

    fireEvent.keyDown(blue, { key: " " });
    expect(blue.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("fano-completion-status").textContent).toBe("Select the first Fano point");
  });
});
