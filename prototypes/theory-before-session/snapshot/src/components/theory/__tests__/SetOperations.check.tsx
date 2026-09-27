// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../../../i18n";
import { SetOperations } from "../SetOperations";

const channels = ["G", "R", "B"] as const;
const subsets = [[], ["B"], ["R"], ["R", "B"], ["G"], ["G", "B"], ["G", "R"], ["G", "R", "B"]];
const formatSubset = (members: readonly string[]) => (members.length ? `{${members.join(",")}}` : "∅");

describe("SetOperations", () => {
  it("uses the same two arbitrary states for union and intersection over all 64 pairs", () => {
    localStorage.setItem("chromalum_lang", "en");
    const { container } = render(
      <LanguageProvider>
        <SetOperations />
      </LanguageProvider>,
    );
    const inputs = [screen.getByRole("group", { name: "Input S" }), screen.getByRole("group", { name: "Input T" })];
    const choose = (index: number, members: readonly string[]) => {
      channels.forEach((channel) => {
        const button = within(inputs[index]).getByRole("button", { name: channel });
        if (button.getAttribute("aria-pressed") !== String(members.includes(channel))) fireEvent.click(button);
      });
      expect(inputs[index].querySelector("[data-subset]")?.textContent).toBe(formatSubset(members));
    };
    const union = container.querySelector('[data-set-operation="union"]')!;
    const intersection = container.querySelector('[data-set-operation="intersection"]')!;
    expect(union.querySelector("[data-subset]")?.textContent).toBe("{G,R,B}");
    expect(intersection.querySelector("[data-subset]")?.textContent).toBe("{R}");
    for (const s of subsets) {
      choose(0, s);
      for (const t of subsets) {
        choose(1, t);
        const expectedUnion = channels.filter((c) => s.includes(c) || t.includes(c));
        const expectedIntersection = channels.filter((c) => s.includes(c) && t.includes(c));
        expect(union.querySelector("[data-subset]")?.textContent).toBe(formatSubset(expectedUnion));
        expect(intersection.querySelector("[data-subset]")?.textContent).toBe(formatSubset(expectedIntersection));
        expect(union.querySelector("[data-bits]")?.textContent).toBe(channels.map((c) => +expectedUnion.includes(c)).join(""));
        expect(intersection.querySelector("[data-bits]")?.textContent).toBe(
          channels.map((c) => +expectedIntersection.includes(c)).join(""),
        );
      }
    }
  });
});
