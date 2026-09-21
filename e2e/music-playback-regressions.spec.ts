import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
  await page.goto("/");
  await page.getByRole("tab", { name: "Music", exact: true }).click();
});

test("K8 cancellation clears the Gray voice and canon controls without resetting the new layer", async ({ page }) => {
  await page.getByRole("button", { name: "▶ 3-Voice", exact: true }).click();
  await expect(page.getByRole("button", { name: "⏹ 3-Voice", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "▶ d=1", exact: true }).click();
  await expect(page.getByRole("button", { name: "▶ 3-Voice", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "⏹ d=1", exact: true })).toBeVisible();

  const canon = page.getByTestId("complement-pairs-card");
  await canon.getByRole("button", { name: /^▶/ }).click();
  await expect(canon.getByRole("button", { name: /^⏹/ })).toBeVisible();
  await page.getByRole("button", { name: "▶ d=2", exact: true }).click();
  await expect(canon.getByRole("button", { name: /^⏹/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "⏹ d=2", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "▶ d=1", exact: true })).toBeVisible();
});

test("shared demo replacement clears the canon and XOR highlight immediately", async ({ page }) => {
  const now = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.getByRole("combobox", { name: "XOR first color" }).selectOption("1");
  await page.getByRole("combobox", { name: "XOR second color" }).selectOption("2");
  const xor = page.getByRole("button", { name: "▶ XOR", exact: true });
  const idleStyle = await xor.getAttribute("style");
  const canon = page.getByTestId("complement-pairs-card");
  await canon.getByRole("button", { name: /^▶/ }).click();
  await page.clock.runFor(1800);
  await expect(canon.getByRole("button", { name: /^⏹/ })).toBeVisible();

  await xor.click();
  await page.clock.runFor(1);
  await expect(canon.getByRole("button", { name: /^⏹/ })).toHaveCount(0);
  await expect(xor).not.toHaveAttribute("style", idleStyle!);
  await page.getByRole("button", { name: "▶ d=1", exact: true }).click();
  await expect(xor).toHaveAttribute("style", idleStyle!);
  await page.clock.runFor(2000);
  await expect(page.getByRole("button", { name: "⏹ d=1", exact: true })).toBeVisible();
});
