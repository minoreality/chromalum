import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("chromalum_lang", "en");
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Source", exact: true }).click();
});

test("Source bare zoom keys and shifted Ctrl/Meta plus change zoom exactly once", async ({ page }) => {
  const workspace = page.locator(".canvas-workspace");
  const zoom = page.getByRole("button", { name: /Reset zoom/ });

  await zoom.click();
  await workspace.focus();
  await page.keyboard.press("Shift+Equal");
  await expect(zoom).toHaveAccessibleName("Reset zoom (current 115%)");
  await page.keyboard.press("Minus");
  await expect(zoom).toHaveAccessibleName("Reset zoom (current 100%)");

  for (const modifier of ["Control", "Meta"]) {
    await zoom.click();
    await workspace.focus();
    await page.keyboard.press(`${modifier}+Shift+Equal`);
    await expect(zoom).toHaveAccessibleName("Reset zoom (current 115%)");
  }

  // Playwright's keyboard maps US keys. Dispatch the actual JIS '+' event
  // separately to exercise the browser's bubbling and cancellation path.
  await zoom.click();
  const consumed = await workspace.evaluate((element) => {
    const event = new KeyboardEvent("keydown", {
      key: "+",
      code: "Semicolon",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(consumed).toBe(true);
  await expect(zoom).toHaveAccessibleName("Reset zoom (current 115%)");
});

test("Glaze tool keys follow the active tab from tab, toolbar, and canvas focus", async ({ page }) => {
  await page.getByRole("radio", { name: /Line/ }).click();
  const glazeTab = page.getByRole("tab", { name: "Glaze", exact: true });
  await glazeTab.click();
  const tools = page.getByRole("radiogroup", { name: "Glaze tools" });

  for (const focus of ["tab", "toolbar", "canvas"]) {
    if (focus === "tab") await glazeTab.focus();
    else if (focus === "toolbar") await tools.getByRole("radio", { name: /Brush/ }).focus();
    else await page.locator(".canvas-workspace").focus();

    for (const [key, name] of [
      ["e", "Eraser"],
      ["f", "Fill"],
      ["b", "Brush"],
    ]) {
      await page.keyboard.press(key);
      await expect(tools.getByRole("radio", { name: new RegExp(name) })).toHaveAttribute("aria-checked", "true");
    }
    await page.keyboard.press("r");
  }

  await page.getByRole("tab", { name: "Source", exact: true }).click();
  await expect(page.getByRole("radio", { name: /Line/ })).toHaveAttribute("aria-checked", "true");
});

test("a modal text field keeps zoom and tool keys away from Source", async ({ page }) => {
  await page.getByRole("radio", { name: /Line/ }).click();
  const zoom = page.getByRole("button", { name: /Reset zoom/ });
  await zoom.click();
  await page.getByRole("button", { name: /New/ }).click();
  const dialog = page.getByRole("dialog", { name: "New Canvas" });
  await dialog.getByRole("spinbutton", { name: "Canvas width" }).focus();
  await page.keyboard.press("e");
  await page.keyboard.press("Shift+Equal");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(zoom).toHaveAccessibleName("Reset zoom (current 100%)");
  await expect(page.getByRole("radio", { name: /Line/ })).toHaveAttribute("aria-checked", "true");
});
