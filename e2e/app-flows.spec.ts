import { devices, expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("chromalum_lang", "en");
  });
});

async function gotoSource(page: Page) {
  await page.goto("/");
  await page.getByRole("tab", { name: "Source" }).click();
}

async function selectLevel(page: Page, level: number, name: string) {
  await page.getByRole("button", { name: `Level ${level} ${name}` }).click();
}

async function drawAtCenter(page: Page, canvas: Locator) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
}

async function canvasPixel(canvas: Locator, x: number, y: number) {
  return canvas.evaluate(
    (node, pos) => {
      const c = node as HTMLCanvasElement;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("2d context unavailable");
      return Array.from(ctx.getImageData(pos.x, pos.y, 1, 1).data);
    },
    { x, y },
  );
}

async function createCanvas(page: Page, size: number) {
  await page.getByRole("button", { name: /New/ }).click();
  const dialog = page.getByRole("dialog", { name: "New Canvas" });
  await dialog.getByRole("button", { name: `${size}×${size}`, exact: true }).click();
  await dialog.getByRole("button", { name: "Create" }).click();
}

async function readSavedCanvas(page: Page): Promise<{ width: number; height: number; revision: number } | null> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const openRequest = indexedDB.open("chromalum");
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const db = openRequest.result;
          const tx = db.transaction("state", "readonly");
          const getRequest = tx.objectStore("state").get("current");
          getRequest.onerror = () => reject(getRequest.error);
          getRequest.onsuccess = () => {
            const value = getRequest.result as { width: number; height: number; revision: number } | undefined;
            resolve(value ? { width: value.width, height: value.height, revision: value.revision } : null);
          };
          tx.oncomplete = () => db.close();
        };
      }),
  );
}

test("draws, undoes, redoes, saves, and restores the source canvas", async ({ page }) => {
  await gotoSource(page);

  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await expect.poll(() => canvasPixel(canvas, 160, 160)).toEqual([0, 0, 0, 255]);

  await drawAtCenter(page, canvas);
  await expect.poll(() => canvasPixel(canvas, 160, 160)).toEqual([255, 255, 255, 255]);

  await page.getByRole("button", { name: /Undo/ }).click();
  await expect.poll(() => canvasPixel(canvas, 160, 160)).toEqual([0, 0, 0, 255]);

  await page.getByRole("button", { name: /Redo/ }).click();
  await expect.poll(() => canvasPixel(canvas, 160, 160)).toEqual([255, 255, 255, 255]);

  await page.getByRole("button", { name: /Save Gray/ }).click();
  const saveDialog = page.getByRole("dialog", { name: "Save grayscale image?" });
  await expect(saveDialog).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await saveDialog.getByRole("button", { name: "Yes" }).click();
  await expect((await downloadPromise).suggestedFilename()).toMatch(/^chromalum_gray_.+\.png$/);

  await page.waitForTimeout(1300);
  await page.reload();
  const restored = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await expect.poll(() => canvasPixel(restored, 160, 160)).toEqual([255, 255, 255, 255]);
});

test("rejects a stale tab save instead of rolling back newer canvas work", async ({ page, context }) => {
  await gotoSource(page);
  await expect.poll(() => readSavedCanvas(page)).toMatchObject({ width: 320, height: 320, revision: 1 });

  const stalePage = await context.newPage();
  await gotoSource(stalePage);
  await stalePage.waitForTimeout(200);

  await createCanvas(page, 8);
  await expect.poll(() => readSavedCanvas(page)).toMatchObject({ width: 8, height: 8, revision: 2 });

  await createCanvas(stalePage, 16);
  await expect(stalePage.getByText("Auto-save failed")).toBeVisible();
  await expect.poll(() => readSavedCanvas(page)).toMatchObject({ width: 8, height: 8, revision: 2 });
  await stalePage.close();
});

test("glazes a chromatic source pixel and clears the glaze layer", async ({ page }) => {
  await gotoSource(page);

  const sourceCanvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await selectLevel(page, 2, "Red");
  await drawAtCenter(page, sourceCanvas);
  await expect.poll(() => canvasPixel(sourceCanvas, 160, 160)).toEqual([73, 73, 73, 255]);

  await page.getByRole("tab", { name: "Glaze" }).click();
  const glazeCanvas = page.getByRole("img", { name: "HUE GLAZE OVERLAY" });
  await drawAtCenter(page, glazeCanvas);

  await expect(page.locator("text=/\\d+px/")).toBeVisible();
  await page.getByRole("button", { name: /Clear Glaze/ }).click();
  await expect(page.locator("text=/\\d+px/")).toHaveCount(0);
});

test("keeps the Hex preview canvas at the source image dimensions", async ({ page }) => {
  await gotoSource(page);

  const sourceCanvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  const sourceSize = await sourceCanvas.evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    return { width: canvas.width, height: canvas.height };
  });

  await selectLevel(page, 2, "Red");
  await drawAtCenter(page, sourceCanvas);
  await page.getByRole("tab", { name: "Hex" }).click();

  const hexPreview = page.getByRole("img", { name: "CHROMATIC DIAGRAM" });
  await expect(hexPreview).toBeVisible();
  await expect
    .poll(() =>
      hexPreview.evaluate((node) => {
        const canvas = node as HTMLCanvasElement;
        return { width: canvas.width, height: canvas.height };
      }),
    )
    .toEqual(sourceSize);
});

test("regenerates gallery variants from a drawing and opens preview actions", async ({ page }) => {
  await gotoSource(page);

  await selectLevel(page, 2, "Red");
  await drawAtCenter(page, page.getByRole("application", { name: "Drawing canvas (grayscale)" }));

  await page.getByRole("tab", { name: "Gallery" }).click();
  await expect(page.getByText(/patterns$/)).toBeVisible();

  const preview = page.getByRole("button", { name: /Click to preview/ }).first();
  await expect(preview).toBeVisible();
  await preview.click();

  const previewDialog = page.getByRole("dialog", { name: "Pattern preview" });
  await expect(previewDialog.getByRole("button", { name: "Apply", exact: true })).toBeVisible();
  await expect(previewDialog.getByRole("button", { name: "Bookmark", exact: true })).toBeVisible();
  await expect(previewDialog.getByRole("button", { name: "Save", exact: true })).toBeVisible();
});

test("opens music controls without a global tone-mode toggle", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Music" }).click();

  await expect(page.getByRole("button", { name: "Pitch" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bit Spectrum" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "CHROMALUM" })).toHaveAttribute("aria-checked", "true");
});

test("caps Structural Sonification cards at four columns on wide desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
  await page.getByRole("tab", { name: "Music" }).click();

  const grid = page.locator("#music-algebra-panel");
  await expect(grid).toBeVisible();

  const columnCount = await grid.evaluate((node) => {
    const columns = window.getComputedStyle(node).gridTemplateColumns;
    return columns.split(" ").filter(Boolean).length;
  });

  expect(columnCount).toBe(4);
});

test("does not exceed four Structural Sonification columns on wide portrait", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1600 });
  await page.goto("/");
  await page.getByRole("tab", { name: "Music" }).click();

  const grid = page.locator("#music-algebra-panel");
  await expect(grid).toBeVisible();

  const columnCount = await grid.evaluate((node) => {
    const columns = window.getComputedStyle(node).gridTemplateColumns;
    return columns.split(" ").filter(Boolean).length;
  });

  expect(columnCount).toBeLessThanOrEqual(4);
});

test("keeps the tone zigzag graph fixed when playback starts", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Music" }).click();

  const zigzagButton = page.getByRole("button", { name: "▶ Vertices" });
  const zigzagCard = page.getByTestId("tone-zigzag-card");
  await expect(zigzagCard).toBeVisible();
  await zigzagCard.scrollIntoViewIfNeeded();

  const graph = zigzagCard.locator("svg");
  const cardBefore = await zigzagCard.boundingBox();
  const before = await graph.boundingBox();
  if (!cardBefore) throw new Error("Zigzag card is not visible");
  if (!before) throw new Error("Zigzag graph is not visible");

  await zigzagButton.click();
  await expect(zigzagCard.getByRole("button", { name: "⏹ Vertices" })).toBeVisible();

  const cardAfter = await zigzagCard.boundingBox();
  const after = await graph.boundingBox();
  if (!cardAfter) throw new Error("Zigzag card disappeared");
  if (!after) throw new Error("Zigzag graph disappeared");
  expect(Math.abs(after.x - cardAfter.x - (before.x - cardBefore.x))).toBeLessThan(0.5);
  expect(Math.abs(after.y - cardAfter.y - (before.y - cardBefore.y))).toBeLessThan(0.5);
  expect(Math.abs(after.width - before.width)).toBeLessThan(0.5);
  expect(Math.abs(after.height - before.height)).toBeLessThan(0.5);
});

const pixel5 = devices["Pixel 5"];

test.describe("mobile touch", () => {
  test.use({
    viewport: pixel5.viewport,
    userAgent: pixel5.userAgent,
    deviceScaleFactor: pixel5.deviceScaleFactor,
    isMobile: pixel5.isMobile,
    hasTouch: pixel5.hasTouch,
  });

  test("draws on the source canvas with a tap", async ({ page }) => {
    await gotoSource(page);

    const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
    await canvas.tap();
    await expect.poll(() => canvasPixel(canvas, 160, 160)).toEqual([255, 255, 255, 255]);
  });
});
