import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("prototypes/de-morgan/");
});

test("the G and R example reaches B through Y and through M and C", async ({ page }) => {
  await expect(page.locator("[data-combined]")).toHaveAttribute("data-level", "6");
  await expect(page.locator("[data-complement-a]")).toHaveAttribute("data-level", "3");
  await expect(page.locator("[data-complement-b]")).toHaveAttribute("data-level", "5");
  await expect(page.locator("[data-path-result='left']")).toHaveAttribute("data-level", "1");
  await expect(page.locator("[data-path-result='right']")).toHaveAttribute("data-level", "1");
  await expect(page.locator("[data-result-level]")).toHaveAttribute("data-result-level", "1");
});

test("the AND-first M and C example reaches Y through B and through G and R", async ({ page }) => {
  await page.goto("prototypes/de-morgan/?operation=and");
  await expect(page.getByRole("button", { name: "ANDから始める", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".identity")).toHaveText("¬(a ∧ b) = ¬a ∨ ¬b");
  await expect(page.locator(".intro")).toContainText("ANDの結果を補色にする");
  await expect(page.locator(".split .edge-label.left")).toHaveText("AND");
  await expect(page.locator(".join .edge-label.right")).toHaveText("OR");
  await expect(page.locator("[data-combined]")).toHaveAttribute("data-level", "1");
  await expect(page.locator("[data-complement-a]")).toHaveAttribute("data-level", "4");
  await expect(page.locator("[data-complement-b]")).toHaveAttribute("data-level", "2");
  await expect(page.locator("[data-path-result='left']")).toHaveAttribute("data-level", "6");
  await expect(page.locator("[data-path-result='right']")).toHaveAttribute("data-level", "6");
  await expect(page.locator("[data-result-level]")).toHaveAttribute("data-result-level", "6");
});

test("switching modes preserves each input pair and resets to that mode's example", async ({ page }) => {
  const and = page.getByRole("button", { name: "ANDから始める", exact: true });
  const or = page.getByRole("button", { name: "ORから始める", exact: true });
  const inputA = page.getByRole("group", { name: "入力 a", exact: true });
  const inputB = page.getByRole("group", { name: "入力 b", exact: true });
  await and.focus();
  await and.press("Space");
  await expect(inputA.getByRole("radio", { name: "M 011", exact: true })).toBeChecked();
  await expect(inputB.getByRole("radio", { name: "C 101", exact: true })).toBeChecked();
  await inputA.getByRole("radio", { name: "Y 110", exact: true }).check();
  await or.click();
  await expect(page.locator(".identity")).toHaveText("¬(a ∨ b) = ¬a ∧ ¬b");
  await expect(inputA.getByRole("radio", { name: "G 100", exact: true })).toBeChecked();
  await expect(inputB.getByRole("radio", { name: "R 010", exact: true })).toBeChecked();
  await and.click();
  await expect(inputA.getByRole("radio", { name: "Y 110", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "M・Cに戻す" }).click();
  await expect(inputA.getByRole("radio", { name: "M 011", exact: true })).toBeChecked();
  await expect(page.locator("[data-result-level]")).toHaveAttribute("data-result-level", "6");
  await expect(page).toHaveURL(/operation=and/);
});

for (const operation of ["or", "and"] as const) {
  test(`${operation.toUpperCase()}-first routes agree with the complement of the set operation for all 64 pairs`, async ({ page }) => {
    await page.getByRole("button", { name: `${operation.toUpperCase()}から始める`, exact: true }).click();
    const subsets = [[], ["B"], ["R"], ["R", "B"], ["G"], ["G", "B"], ["G", "R"], ["G", "R", "B"]];
    const names = ["K", "B", "R", "M", "G", "C", "Y", "W"];
    for (let a = 0; a < 8; a++) {
      await page
        .getByRole("group", { name: "入力 a", exact: true })
        .getByRole("radio", { name: new RegExp(`^${names[a]} `) })
        .check();
      for (let b = 0; b < 8; b++) {
        await page
          .getByRole("group", { name: "入力 b", exact: true })
          .getByRole("radio", { name: new RegExp(`^${names[b]} `) })
          .check();
        const absent = ["G", "R", "B"].filter((primary) =>
          operation === "or"
            ? !subsets[a].includes(primary) && !subsets[b].includes(primary)
            : !subsets[a].includes(primary) || !subsets[b].includes(primary),
        );
        const expected = subsets.findIndex(
          (subset) => subset.length === absent.length && subset.every((primary) => absent.includes(primary)),
        );
        await expect(page.locator("[data-path-result='left']")).toHaveAttribute("data-level", String(expected));
        await expect(page.locator("[data-path-result='right']")).toHaveAttribute("data-level", String(expected));
      }
    }
  });
}

test("keyboard changes update the diagram and the page fits narrow screens", async ({ page }) => {
  const initial = page.getByRole("group", { name: "入力 a", exact: true }).getByRole("radio", { name: "G 100", exact: true });
  await initial.focus();
  await initial.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "C 101", exact: true }).first()).toBeChecked();
  await expect(page.locator("[data-result-level]")).toHaveAttribute("data-result-level", "0");
  for (const operation of ["OR", "AND"]) {
    await page.getByRole("button", { name: `${operation}から始める`, exact: true }).click();
    for (const width of [320, 390, 834, 1186]) {
      await page.setViewportSize({ width, height: 760 });
      const layout = await page.evaluate(() => ({
        fits: document.documentElement.scrollWidth <= innerWidth,
        labelsFit: [...document.querySelectorAll<HTMLElement>(".mode-button, .choice, .edge-label, .step-title, .color-node")].every(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
        tapTargets: [...document.querySelectorAll("input[type=radio]")].every((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width >= 24 && rect.height >= 40;
        }),
      }));
      expect(layout, `${operation} ${width}px`).toEqual({ fits: true, labelsFit: true, tapTargets: true });
    }
  }
});
