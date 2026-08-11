// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { HammingDiagram } from "../HammingDiagram";

function renderWithLanguage() {
  localStorage.setItem("chromalum_lang", "en");
  return render(
    <LanguageProvider>
      <HammingDiagram hlLevel={null} onHover={vi.fn()} />
    </LanguageProvider>,
  );
}

describe("HammingDiagram", () => {
  const cases = [
    { position: 1, received: "1110011", syndrome: "001" },
    { position: 2, received: "0010011", syndrome: "010" },
    { position: 3, received: "0100011", syndrome: "011" },
    { position: 4, received: "0111011", syndrome: "100" },
    { position: 5, received: "0110111", syndrome: "101" },
    { position: 6, received: "0110001", syndrome: "110" },
    { position: 7, received: "0110010", syndrome: "111" },
  ] as const;

  it("starts from a nonzero valid Hamming(7,4) codeword", () => {
    renderWithLanguage();

    expect(screen.getByText("Click a position to inject an error")).toBeTruthy();
    expect(screen.getByTestId("hamming-original-codeword").textContent).toBe("c0110011");
    expect(screen.getByTestId("hamming-received-word").textContent).toBe("r0110011");
  });

  it.each(cases)("computes and corrects the syndrome for an error at position $position", ({ position, received, syndrome }) => {
    renderWithLanguage();

    fireEvent.click(screen.getByTestId(`hamming-position-${position}`));

    expect(screen.getByTestId("hamming-received-word").textContent).toBe(`r${received}`);
    expect(screen.getByText(new RegExp(`Error at position ${position} \\(`))).toBeTruthy();
    expect(screen.getByTestId("hamming-syndrome").textContent?.replace(/\s+/g, " ")).toMatch(new RegExp(`syndrome = ${syndrome}`));

    fireEvent.click(screen.getByRole("button", { name: /Correct/ }));

    expect(screen.getByText(new RegExp(`Corrected position ${position} \\(`))).toBeTruthy();
    expect(screen.getByTestId("hamming-received-word").textContent).toBe("r0110011");
    expect(screen.getByTestId("hamming-syndrome").textContent?.replace(/\s+/g, " ")).toMatch(/syndrome = 000/);
  });

  it("reset restores the clean received word", () => {
    renderWithLanguage();

    fireEvent.click(screen.getByTestId("hamming-position-5"));
    expect(screen.getByTestId("hamming-received-word").textContent).toBe("r0110111");

    fireEvent.click(screen.getByRole("button", { name: /Reset/ }));

    expect(screen.getByTestId("hamming-received-word").textContent).toBe("r0110011");
    expect(screen.getByText("Click a position to inject an error")).toBeTruthy();
  });
});
