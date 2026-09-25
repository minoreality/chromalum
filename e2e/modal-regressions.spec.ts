import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_CANDIDATE_INDEX_BY_LEVEL } from "../src/color-engine";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((defaults) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("chromalum_lang", "en");
    Object.defineProperty(window, "showOpenFilePicker", { value: undefined, configurable: true });
    const first = [...defaults];
    const second = [...defaults];
    first[2] = 1;
    second[2] = 2;
    localStorage.setItem("chromalum_bookmarks", JSON.stringify([first, second]));
  }, DEFAULT_CANDIDATE_INDEX_BY_LEVEL);
  await page.goto("/");
});

async function importImage(page: Page, width = 200, height = 200) {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open image file" }).click();
  await (
    await chooserPromise
  ).setFiles({
    name: "crop.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="red"/></svg>`,
    ),
  });
}

async function pasteImage(page: Page) {
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><rect width="64" height="32" fill="blue"/></svg>'],
        "paste.svg",
        { type: "image/svg+xml" },
      ),
    );
    window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
  });
}

test("crop pointer overshoot preserves the opposite edge and replacement remains available", async ({ page }) => {
  await importImage(page);
  const dialog = page.getByRole("dialog", { name: "Crop image" });
  await expect(dialog).toBeVisible();
  for (const [name, key] of [
    ["left", "ArrowRight"],
    ["right", "ArrowLeft"],
    ["top", "ArrowDown"],
    ["bottom", "ArrowUp"],
  ]) {
    const handle = dialog.getByRole("group", { name: `Resize crop from ${name}`, exact: true });
    for (let i = 0; i < 5; i++) await handle.press(`Shift+${key}`);
  }
  const crop = dialog.getByRole("group", { name: "Move crop area", exact: true });
  const before = await crop.boundingBox();
  const handle = await dialog.getByRole("group", { name: "Resize crop from right", exact: true }).boundingBox();
  if (!before || !handle) throw new Error("Crop controls unavailable");
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 80, handle.y + handle.height / 2);
  await page.mouse.up();
  await expect(dialog.getByText("150 × 100 px", { exact: true })).toBeVisible();
  expect((await crop.boundingBox())!.x).toBeCloseTo(before.x, 1);
  await pasteImage(page);
  await expect(dialog.getByText("64 × 32 px", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
});

test("Gallery owns paste and drop until its preview closes", async ({ page }) => {
  await page.getByRole("tab", { name: "Gallery", exact: true }).click();
  await page.getByRole("button", { name: "Bookmarks (2)", exact: true }).click();
  await page.getByRole("button", { name: "Click to preview (1)", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Pattern preview" });
  await expect(preview).toBeVisible();
  await pasteImage(page);
  await preview.evaluate((node) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>'], "drop.svg", { type: "image/svg+xml" }));
    node.dispatchEvent(new DragEvent("dragenter", { dataTransfer: transfer, bubbles: true, cancelable: true }));
    node.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true }));
  });
  // Let asynchronous image reads/decodes settle before checking trap ownership.
  await page.waitForTimeout(300);
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(preview).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await preview.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await preview.getByRole("button", { name: "Remove bookmark", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bookmarks (1)", exact: true })).toBeVisible();
  await pasteImage(page);
  await expect(page.getByRole("dialog", { name: "Crop image" })).toBeVisible();
});

test("Map departure cancels a pending touch long press and closes an open save dialog", async ({ page }) => {
  const mapTab = page.getByRole("tab", { name: "Map", exact: true });
  await mapTab.click();
  const canvas = page.locator(".map-canvas-frame canvas");
  await canvas.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 1, clientX: 10, clientY: 10 });
  await page.keyboard.press("Alt+3");
  await page.waitForTimeout(1100);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await mapTab.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await canvas.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 2, clientX: 10, clientY: 10 });
  await expect(page.getByRole("dialog", { name: "Save this map?" })).toBeVisible();
  await page.keyboard.press("Alt+3");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await mapTab.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
