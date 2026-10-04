import { expect, test } from "@playwright/test";

for (const width of [1280, 320]) {
  test(`switches candidate colors in the saved list at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => localStorage.setItem("chromalum_lang", "ja"));
    await page.goto("prototypes/color-mapping/");
    await expect(page.getByRole("heading", { name: "CHROMALUM Color Mapping" })).toBeVisible();
    const row = page.getByRole("button", { name: "次の色候補 (Level 2 Red)", exact: true }).locator("..").locator("..");
    const selected = row.locator('button[aria-label^="Level 2 色候補"]');
    const selectedHex = () =>
      selected.evaluateAll((buttons) =>
        buttons.find((button) => (button as HTMLElement).style.border.includes("2px"))?.getAttribute("aria-label"),
      );
    await expect.poll(selectedHex).toContain("#ff0000");
    await page.getByRole("button", { name: "次の色候補 (Level 2 Red)", exact: true }).click();
    await expect.poll(selectedHex).toContain("#0040ff");
    await page.getByRole("button", { name: "Level 2 色候補 #8000ff 270°", exact: true }).click();
    await expect.poll(selectedHex).toContain("#8000ff");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
