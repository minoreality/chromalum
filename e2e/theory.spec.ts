import { expect, test } from "@playwright/test";

test("opens the Theory tab and renders the main sections", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "Theory" }).click();

  await expect(page.getByRole("heading", { name: /Color Theory|色彩理論/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Binary Levels|バイナリレベル/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Color Cube|カラーキューブ/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Hamming Code|ハミング符号/ })).toBeVisible();
});
