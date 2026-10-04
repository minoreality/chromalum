import { expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
});

const image = (canvas: Locator) => canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
const pixel = (canvas: Locator, x: number, y: number) =>
  canvas.evaluate((el, p) => Array.from((el as HTMLCanvasElement).getContext("2d")!.getImageData(p.x, p.y, 1, 1).data), { x, y });
async function point(canvas: Locator, x: number, y: number) {
  return canvas.evaluate(
    (el, p) => {
      const c = el as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      return { x: r.left + ((p.x + 0.5) * r.width) / c.width, y: r.top + ((p.y + 0.5) * r.height) / c.height };
    },
    { x, y },
  );
}

async function prepareGlaze(page: Page) {
  await page.goto("./#source");
  await page.getByRole("button", { name: "📐New", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New Canvas", exact: true });
  await dialog.getByRole("spinbutton", { name: "Canvas width", exact: true }).fill("32");
  await dialog.getByRole("spinbutton", { name: "Canvas height", exact: true }).fill("32");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Level 2 Red", exact: true }).click();
  await page.getByRole("radio", { name: /Fill/ }).click();
  const source = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await source.click();
  await expect.poll(() => pixel(source, 0, 0)).toEqual([73, 73, 73, 255]);
  const sourceImage = await image(source);
  await page.getByRole("tab", { name: "Glaze", exact: true }).click();
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
  await page.getByRole("slider", { name: "Hue angle (0-359 degrees)", exact: true }).fill("225");
  const canvas = page.locator("#tabpanel-glaze .canvas-workspace canvas").first();
  await expect.poll(() => pixel(canvas, 0, 0)).toEqual([255, 0, 0, 255]);
  return { canvas, sourceImage };
}

for (const shape of [
  { name: "Line", intermediate: [22, 6], oldPixel: [14, 6], painted: [14, 14], empty: [6, 22] },
  { name: "Rect", intermediate: [10, 10], oldPixel: [10, 8], painted: [14, 6], empty: [14, 14] },
  { name: "Ellipse", intermediate: [10, 10], oldPixel: [6, 8], painted: [14, 6], empty: [14, 14] },
]) {
  test(`previews a Glaze ${shape.name} and commits only its final outline as one undo step`, async ({ page }) => {
    const { canvas, sourceImage } = await prepareGlaze(page);
    const before = await image(canvas);
    await page.getByRole("radio", { name: new RegExp(shape.name) }).click();
    const start = await point(canvas, 6, 6);
    const first = await point(canvas, shape.intermediate[0], shape.intermediate[1]);
    const end = await point(canvas, 22, 22);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(first.x, first.y);
    await expect.poll(() => pixel(canvas, shape.oldPixel[0], shape.oldPixel[1])).toEqual([0, 64, 255, 255]);
    await page.mouse.move(end.x, end.y);
    await expect.poll(() => pixel(canvas, shape.oldPixel[0], shape.oldPixel[1])).toEqual([255, 0, 0, 255]);
    await expect.poll(() => pixel(canvas, shape.painted[0], shape.painted[1])).toEqual([0, 64, 255, 255]);
    expect(await pixel(canvas, shape.empty[0], shape.empty[1])).toEqual([255, 0, 0, 255]);
    await page.mouse.up();
    const committed = await image(canvas);
    await page.keyboard.press("Control+z");
    await expect.poll(() => image(canvas)).toBe(before);
    await page.keyboard.press("Control+y");
    await expect.poll(() => image(canvas)).toBe(committed);
    await page.getByRole("tab", { name: "Source", exact: true }).click();
    expect(await image(page.getByRole("application", { name: "Drawing canvas (grayscale)" }))).toBe(sourceImage);
  });
}

for (const focus of ["canvas", "header"] as const) {
  test(`routes L/R/O to Glaze tools from the ${focus} without changing the Source tool`, async ({ page }) => {
    await prepareGlaze(page);
    const target =
      focus === "canvas" ? page.locator("#tabpanel-glaze .canvas-workspace") : page.getByRole("button", { name: "Shortcuts", exact: true });
    await target.focus();
    for (const { key, tool } of [
      { key: "l", tool: "Line" },
      { key: "r", tool: "Rect" },
      { key: "o", tool: "Ellipse" },
    ]) {
      await page.keyboard.press(key);
      await expect(page.getByRole("radio", { name: new RegExp(tool) })).toBeChecked();
    }
    await page.getByRole("tab", { name: "Source", exact: true }).click();
    await expect(page.getByRole("radio", { name: /Fill/ })).toBeChecked();
  });
}

for (const shape of [
  { name: "Line", endY: 6 },
  { name: "Rect", endY: 22 },
  { name: "Ellipse", endY: 22 },
]) {
  test(`uses the current brush width for a Glaze ${shape.name} outline`, async ({ page }) => {
    const { canvas } = await prepareGlaze(page);
    await page.getByRole("slider", { name: "Brush size", exact: true }).fill("5");
    await page.getByRole("radio", { name: new RegExp(shape.name) }).click();
    const start = await point(canvas, 6, 6);
    const end = await point(canvas, 22, shape.endY);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y);
    await page.mouse.up();
    expect(await pixel(canvas, 14, 4)).toEqual([0, 64, 255, 255]);
    expect(await pixel(canvas, 14, 3)).toEqual([255, 0, 0, 255]);
  });
}

test("settles a Glaze shape before switching tabs and keeps its undo intact", async ({ page }) => {
  const { canvas, sourceImage } = await prepareGlaze(page);
  const before = await image(canvas);
  await page.getByRole("radio", { name: /Rect/ }).click();
  const start = await point(canvas, 6, 6);
  const end = await point(canvas, 22, 22);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y);
  await page.keyboard.press("Alt+2");
  await page.mouse.up();
  await page.getByRole("tab", { name: "Glaze", exact: true }).click();
  expect(await pixel(canvas, 14, 6)).toEqual([0, 64, 255, 255]);
  expect(await pixel(canvas, 14, 14)).toEqual([255, 0, 0, 255]);
  await page.keyboard.press("Control+z");
  await expect.poll(() => image(canvas)).toBe(before);
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  expect(await image(page.getByRole("application", { name: "Drawing canvas (grayscale)" }))).toBe(sourceImage);
});

test.describe("Glaze touch shapes", () => {
  test.use({ hasTouch: true, isMobile: true });
  for (const shape of [
    { name: "Line", painted: [14, 14], empty: [14, 6] },
    { name: "Rect", painted: [14, 6], empty: [14, 14] },
    { name: "Ellipse", painted: [14, 6], empty: [14, 14] },
  ]) {
    test(`draws and undoes a Glaze ${shape.name} with a touch drag`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const { canvas } = await prepareGlaze(page);
      const before = await image(canvas);
      await page.getByRole("radio", { name: new RegExp(shape.name) }).click();
      await canvas.scrollIntoViewIfNeeded();
      const start = await point(canvas, 6, 6);
      const end = await point(canvas, 22, 22);
      const cdp = await page.context().newCDPSession(page);
      try {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, ...start }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ id: 1, ...end }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } finally {
        await cdp.detach();
      }
      await expect.poll(() => pixel(canvas, shape.painted[0], shape.painted[1])).toEqual([0, 64, 255, 255]);
      expect(await pixel(canvas, shape.empty[0], shape.empty[1])).toEqual([255, 0, 0, 255]);
      await page.getByRole("button", { name: /Undo/ }).click();
      await expect.poll(() => image(canvas)).toBe(before);
    });
  }
});

for (const language of ["ja", "en"] as const) {
  for (const width of [1280, 320]) {
    test(`matches the Source tool-button layout in Glaze at ${width}px in ${language}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 668 });
      await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
      await page.goto("./#source");
      const signature = (group: Locator) =>
        group.evaluate((el) => {
          const groupRect = el.getBoundingClientRect();
          return Array.from(el.querySelectorAll('[role="radio"]')).map((button) => {
            const rect = button.getBoundingClientRect();
            return { x: rect.x - groupRect.x - groupRect.width / 2, y: rect.y - groupRect.y, width: rect.width, height: rect.height };
          });
        });
      const source = await signature(
        page.getByRole("radiogroup", { name: language === "ja" ? "描画ツール" : "Drawing tools", exact: true }),
      );
      await page.getByRole("tab", { name: "Glaze", exact: true }).click();
      const group = page.getByRole("radiogroup", { name: language === "ja" ? "グレーズツール" : "Glaze tools", exact: true });
      await expect(group.getByRole("radio")).toHaveCount(6);
      const glaze = await signature(group);
      for (let i = 0; i < 6; i++) {
        for (const property of ["x", "y", "width", "height"] as const) expect(glaze[i][property]).toBeCloseTo(source[i][property], 2);
      }
      expect(glaze[0].y).toBe(glaze[2].y);
      expect(glaze[3].y).toBe(glaze[5].y);
      expect(glaze[3].y).toBeGreaterThan(glaze[0].y);
      const bounds = await group.evaluate((el) =>
        Array.from(el.querySelectorAll("button")).map((button) => {
          const r = button.getBoundingClientRect();
          return { left: r.left, right: r.right, viewport: innerWidth };
        }),
      );
      for (const box of bounds) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(box.viewport);
      }
    });
  }
}
