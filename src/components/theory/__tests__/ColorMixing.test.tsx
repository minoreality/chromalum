// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { ColorMixing } from "../ColorMixing";

function renderMixing() {
  localStorage.setItem("chromalum_lang", "en");
  render(
    <LanguageProvider>
      <ColorMixing />
    </LanguageProvider>,
  );
  return {
    grb: screen.getByRole("figure", { name: "GRB Logical OR" }),
    ycm: screen.getByRole("figure", { name: "YCM Logical AND" }),
  };
}

function selectInputs(figure: HTMLElement, inputs: readonly number[]) {
  for (const button of within(figure).getAllByRole("button")) {
    const bits = button.getAttribute("aria-label")!.slice(-3);
    const active = inputs.includes(parseInt(bits, 2));
    if (button.getAttribute("aria-pressed") !== String(active)) fireEvent.click(button);
  }
}

function expectResult(figure: HTMLElement, expected: number) {
  expect(figure.querySelector("[data-mixing-result]")?.getAttribute("data-mixing-result")).toBe(String(expected));
  expect([...figure.querySelectorAll("tfoot td")].map((cell) => cell.textContent).join("")).toBe(expected.toString(2).padStart(3, "0"));
}

describe("ColorMixing", () => {
  it("shows both fixed operations with complementary positions and three-bit nodes", () => {
    const { grb, ycm } = renderMixing();
    expectResult(grb, 7);
    expectResult(ycm, 0);
    expect(within(grb).getByRole("status").textContent).toBe("G ∨ R ∨ B = W");
    expect(within(ycm).getByRole("status").textContent).toBe("M ∧ C ∧ Y = K");
    expect(grb.querySelector("[data-mixing-operator]")?.textContent).toBe("∨");
    expect(ycm.querySelector("[data-mixing-operator]")?.textContent).toBe("∧");
    expect(
      within(grb).getByRole("img", { name: "Logic gate applying OR to each of the three bits" }).getAttribute("data-mixing-gate"),
    ).toBe("or");
    expect(
      within(ycm).getByRole("img", { name: "Logic gate applying AND to each of the three bits" }).getAttribute("data-mixing-gate"),
    ).toBe("and");
    expect(within(grb).getAllByRole("button")).toHaveLength(3);
    expect(within(ycm).getAllByRole("button")).toHaveLength(3);
    const inputNodes = [grb, ycm].map((figure) => [...figure.querySelectorAll("[data-mixing-input]")]);
    for (let index = 0; index < 3; index++) {
      expect(
        Number(inputNodes[0][index].getAttribute("data-mixing-input")) ^ Number(inputNodes[1][index].getAttribute("data-mixing-input")),
      ).toBe(7);
      for (const coordinate of ["cx", "cy"]) {
        expect(inputNodes[0][index].querySelector("circle")?.getAttribute(coordinate)).toBe(
          inputNodes[1][index].querySelector("circle")?.getAttribute(coordinate),
        );
      }
    }
    for (const figure of [grb, ycm]) {
      expect(figure.querySelectorAll('svg [role="button"][tabindex="0"]')).toHaveLength(3);
      expect(figure.querySelectorAll("button")).toHaveLength(0);
      for (const node of figure.querySelectorAll("[data-mixing-color]")) {
        expect(node.querySelector("text")?.textContent).toBe(Number(node.getAttribute("data-mixing-color")).toString(2).padStart(3, "0"));
      }
      expect(figure.querySelectorAll("path:not([data-mixing-gate])")).toHaveLength(0);
    }
  });

  it("calculates all six pairs and both triples independently, including corresponding complements", () => {
    const { grb, ycm } = renderMixing();
    const cases = [
      { primary: [4, 2], secondary: [3, 5], join: 6, meet: 1 },
      { primary: [4, 1], secondary: [3, 6], join: 5, meet: 2 },
      { primary: [2, 1], secondary: [5, 6], join: 3, meet: 4 },
      { primary: [4, 2, 1], secondary: [3, 5, 6], join: 7, meet: 0 },
    ];
    let previousMeet = 0;
    for (const example of cases) {
      selectInputs(grb, example.primary);
      expectResult(grb, example.join);
      expectResult(ycm, previousMeet);
      selectInputs(ycm, example.secondary);
      expectResult(ycm, example.meet);
      expectResult(grb, example.join);
      expect(example.join ^ example.meet).toBe(7);
      previousMeet = example.meet;
      for (const [figure, selected] of [
        [grb, example.primary],
        [ycm, example.secondary],
      ] as const) {
        for (const row of figure.querySelectorAll("tbody tr")) {
          const level = Number(row.getAttribute("data-mixing-bit-input"));
          expect([...row.querySelectorAll("td")].map((cell) => cell.textContent).join("")).toBe(
            selected.includes(level) ? level.toString(2).padStart(3, "0") : "———",
          );
        }
      }
    }
  });

  it("passes each single input through and waits only when all inputs are off", () => {
    const { grb, ycm } = renderMixing();
    for (const figure of [grb, ycm]) {
      for (const input of figure.querySelectorAll("[data-mixing-input]")) {
        const level = Number(input.getAttribute("data-mixing-input"));
        selectInputs(figure, [level]);
        expectResult(figure, level);
        expect(figure.querySelector("[data-mixing-result] circle")?.getAttribute("fill")).toBe(
          input.querySelector("[data-mixing-color] circle")?.getAttribute("fill"),
        );
      }
      selectInputs(figure, []);
      expect(figure.querySelector("[data-mixing-result]")?.getAttribute("data-mixing-result")).toBe("pending");
      expect(figure.querySelector("[data-mixing-result] circle")).toBeNull();
      expect(within(figure).getByRole("status").textContent).toBe("Select an input color");
      expect([...figure.querySelectorAll("tfoot td")].map((cell) => cell.textContent).join("")).toBe("———");
    }
  });
});
