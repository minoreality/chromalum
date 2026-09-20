import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    copiedCanvasImages: string[];
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("chromalum_lang", "en");
    window.copiedCanvasImages = [];
    // Keep the OS clipboard untouched; use real PNG encoding and ClipboardItem.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async write(items: ClipboardItem[]) {
          const blob = await items[0].getType("image/png");
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
          bitmap.close();
          window.copiedCanvasImages.push(canvas.toDataURL("image/png"));
        },
      },
    });
  });
});

for (const tab of ["Source", "Color", "Glaze", "Hex", "Map"]) {
  test(`${tab} copies a hovered canvas without focusing or drawing`, async ({ page }) => {
    await page.goto(`/#${tab.toLowerCase()}`);
    const workspace = page.locator(".canvas-workspace");
    const canvas = workspace.locator("canvas").first();
    await page.getByRole("tab", { name: tab, exact: true }).focus();
    await canvas.hover();
    await expect(workspace).not.toBeFocused();
    const expected = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
    await page.keyboard.press("Control+c");
    await expect.poll(() => page.evaluate(() => window.copiedCanvasImages)).toEqual([expected]);
    await page.keyboard.press("Meta+c");
    await expect.poll(() => page.evaluate(() => window.copiedCanvasImages)).toEqual([expected, expected]);
    expect(await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL())).toBe(expected);
    await page.getByRole("heading", { name: "CHROMALUM", exact: true }).hover();
    await page.keyboard.press("Control+c");
    expect(await page.evaluate(() => window.copiedCanvasImages)).toHaveLength(2);
  });

  test(`${tab} copies only its focused canvas with Ctrl+C and Meta+C`, async ({ page }) => {
    await page.goto(`/#${tab.toLowerCase()}`);
    const workspace = page.locator(".canvas-workspace");
    const canvas = workspace.locator("canvas").first();
    await expect(canvas).toBeVisible();

    // Merely showing a canvas must not take over the page's copy shortcut.
    await page.getByRole("tab", { name: tab, exact: true }).focus();
    await page.keyboard.press("Control+c");
    expect(await page.evaluate(() => window.copiedCanvasImages)).toEqual([]);

    await canvas.click();
    await expect(workspace).toBeFocused();
    const expected = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL("image/png"));
    await page.keyboard.press("Control+c");
    await expect.poll(() => page.evaluate(() => window.copiedCanvasImages)).toEqual([expected]);
    await expect(page.getByText("Image copied", { exact: true })).toBeVisible();

    // Keyboard navigation can return to the canvas without drawing another mark.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(workspace).toBeFocused();
    await page.getByRole("heading", { name: "CHROMALUM", exact: true }).hover();
    await page.keyboard.press("Meta+c");
    await expect.poll(() => page.evaluate(() => window.copiedCanvasImages)).toEqual([expected, expected]);
  });
}

test("Glaze copies the painted colors without its highlight overlay or zoom", async ({ page }) => {
  await page.goto("/#source");
  await page.getByRole("button", { name: "Level 2 Red", exact: true }).click();
  await page.getByRole("application", { name: "Drawing canvas (grayscale)" }).click();
  await page.getByRole("tab", { name: "Glaze", exact: true }).click();
  const canvas = page.getByRole("img", { name: "HUE GLAZE OVERLAY" });
  const before = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  await page.getByRole("slider", { name: "Hue angle (0-359 degrees)" }).fill("240");
  await canvas.click();
  await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL())).not.toBe(before);
  const expected = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  await page.getByRole("checkbox", { name: "Emphasize glazed area" }).check();
  const workspace = page.locator(".canvas-workspace");
  await expect(workspace.locator("canvas[aria-hidden=true]")).toBeVisible();
  await workspace.focus();
  await page.keyboard.press("+");
  await page.keyboard.press("Control+c");
  await expect.poll(() => page.evaluate(() => window.copiedCanvasImages)).toEqual([expected]);
});

test("Gallery copies the hovered preview at original size without applying it", async ({ page }) => {
  await page.goto("/#source");
  await page.getByRole("button", { name: "Level 2 Red", exact: true }).click();
  await page.getByRole("application", { name: "Drawing canvas (grayscale)" }).click();
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  const originalColor = await page
    .getByRole("img", { name: "Color preview canvas" })
    .evaluate((node: HTMLCanvasElement) => node.toDataURL());
  await page.getByRole("tab", { name: "Gallery", exact: true }).click();
  const thumbnail = page.getByRole("button", { name: /Click to preview/ }).last();
  await thumbnail.click();
  const dialog = page.getByRole("dialog", { name: "Pattern preview" });
  const canvas = dialog.locator("canvas");
  const apply = dialog.getByRole("button", { name: "Apply", exact: true });
  await apply.focus();
  await canvas.hover();
  await page.keyboard.press("Control+c");
  await expect.poll(() => page.evaluate(() => window.copiedCanvasImages.length)).toBe(1);
  await expect(dialog).toBeVisible();
  const copied = await page.evaluate(async () => {
    const image = new Image();
    image.src = window.copiedCanvasImages[0];
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight, png: window.copiedCanvasImages[0] };
  });
  expect(copied.width).toBe(320);
  expect(copied.height).toBe(320);
  expect(copied.png).not.toBe(originalColor);

  // The full-resolution copy must match this variant's existing PNG export.
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(copied.png).toBe(`data:image/png;base64,${Buffer.concat(chunks).toString("base64")}`);

  await apply.focus();
  await canvas.hover();
  await page.keyboard.press("Meta+c");
  await expect.poll(() => page.evaluate(() => window.copiedCanvasImages.length)).toBe(2);
  await apply.hover();
  await page.keyboard.press("Control+c");
  expect(await page.evaluate(() => window.copiedCanvasImages)).toHaveLength(2);
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Color", exact: true }).click();
  expect(await page.getByRole("img", { name: "Color preview canvas" }).evaluate((node: HTMLCanvasElement) => node.toDataURL())).toBe(
    originalColor,
  );
});

test("hover copy preserves text selection and input ownership", async ({ page }) => {
  await page.goto("/#hex");
  const canvas = page.locator(".canvas-workspace canvas");
  await page.getByRole("heading", { name: "CHROMALUM", exact: true }).evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  await canvas.hover();
  await page.keyboard.press("Control+c");
  expect(await page.evaluate(() => window.copiedCanvasImages)).toEqual([]);
  await page.evaluate(() => window.getSelection()!.removeAllRanges());
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  await page.getByRole("button", { name: /New/ }).click();
  const input = page.getByRole("dialog", { name: "New Canvas" }).getByRole("spinbutton").first();
  await input.focus();
  // The dialog owns copy even while the pointer is over the canvas behind it.
  const box = await page.locator(".canvas-workspace canvas").first().boundingBox();
  await page.mouse.move(box!.x + 2, box!.y + 2);
  await page.keyboard.press("Control+c");
  expect(await page.evaluate(() => window.copiedCanvasImages)).toEqual([]);
});
