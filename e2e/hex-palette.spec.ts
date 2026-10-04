import { devices, expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("chromalum_lang", "en");
  });
});

async function openUsedPalette(page: Page) {
  await page.goto("/");
  await page.getByRole("tab", { name: "Source" }).click();
  await page.getByRole("button", { name: /New/ }).click();
  const dialog = page.getByRole("dialog", { name: "New Canvas" });
  await dialog.getByRole("button", { name: "8×8", exact: true }).click();
  await dialog.getByRole("button", { name: "Create" }).click();
  await page.getByRole("button", { name: "Level 2 Red", exact: true }).click();
  const source = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  const box = await source.boundingBox();
  if (!box) throw new Error("Source canvas is not visible");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole("tab", { name: "Hex" }).click();
  await expect(page.getByRole("group", { name: "Pure-hue loop color selection" })).toBeVisible();
  return page.getByRole("group", { name: "Palette display", exact: true });
}

async function previewPixel(page: Page) {
  return page.getByRole("img", { name: "Color preview canvas" }).evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    return Array.from(canvas.getContext("2d")!.getImageData(4, 4, 1, 1).data);
  });
}

async function pageBounds(page: Page) {
  const rect = (locator: Locator) =>
    locator.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height };
    });
  return {
    preview: await rect(page.getByRole("img", { name: "Color preview canvas" })),
    palette: await rect(page.getByRole("group", { name: "Palette display", exact: true })),
    footer: await rect(page.getByText(/Copyright ©/)),
  };
}

async function centre(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Gesture target is not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function originalDiagramLayout(palette: Locator) {
  return palette.evaluate((sidebar) => {
    // The original sidebar contained the diagram and count directly. Recreate
    // that structure offscreen to detect constraints introduced by the switcher.
    const original = sidebar.cloneNode(false) as HTMLElement;
    original.className = "panel-sidebar";
    original.removeAttribute("tabindex");
    original.removeAttribute("role");
    const width = sidebar.getBoundingClientRect().width;
    Object.assign(original.style, { position: "fixed", left: "0", top: "0", width: `${width}px`, visibility: "hidden" });
    for (const child of sidebar.querySelector('.hex-palette-view[data-view="diagram"]')!.children) {
      original.append(child.cloneNode(true));
    }
    sidebar.parentElement!.append(original);
    const box = original.getBoundingClientRect();
    const svg = original.querySelector("svg")!.getBoundingClientRect();
    const result = { height: box.height, width: svg.width, svgHeight: svg.height, offsetX: svg.x - box.x, offsetY: svg.y - box.y };
    original.remove();
    return result;
  });
}

async function hold(page: Page, client: CDPSession, at: { x: number; y: number }) {
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at] });
  await page.waitForTimeout(700);
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

test("preserves the original dashed outline when three chromatic levels are used", async ({ page }) => {
  const palette = await openUsedPalette(page);
  await page.getByRole("tab", { name: "Source" }).click();
  const source = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  const box = await source.boundingBox();
  if (!box) throw new Error("Source canvas is not visible");
  for (const { level, name, coordinate } of [
    { level: 3, name: "Magenta", coordinate: 2.5 },
    { level: 4, name: "Green", coordinate: 6.5 },
  ]) {
    await page.getByRole("button", { name: `Level ${level} ${name}`, exact: true }).click();
    await page.mouse.click(box.x + (box.width * coordinate) / 8, box.y + (box.height * coordinate) / 8);
  }
  await page.getByRole("tab", { name: "Hex" }).click();
  const diagram = page.getByRole("group", { name: "Pure-hue loop color selection" });
  const outline = diagram.locator('path[stroke-dasharray="4,3"]');
  await expect(outline).toHaveCount(1);
  const originalPath = await outline.getAttribute("d");
  const originalViewBox = await diagram.getAttribute("viewBox");
  await palette.locator("svg").dblclick({ position: { x: 3, y: 3 } });
  await expect(page.getByRole("list", { name: "Level color mapping" })).toBeVisible();
  await page.keyboard.press("v");
  await expect(outline).toBeVisible();
  await expect(outline).toHaveAttribute("d", originalPath!);
  await expect(diagram).toHaveAttribute("viewBox", originalViewBox!);
});

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 320, height: 740 },
]) {
  test(`switches Hex views without moving the preview or footer at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const palette = await openUsedPalette(page);
    // The alternate rows must also fit the wide glyph stack used by CI.
    await page.addStyleTag({ content: '.hex-palette-list, .hex-palette-list * { font-family: "MS Gothic" !important; }' });
    await expect.poll(() => previewPixel(page)).toEqual([255, 0, 0, 255]);
    await expect(page.getByRole("button", { name: "View 3 patterns in Gallery" })).toBeVisible();
    const before = await pageBounds(page);
    const original = await originalDiagramLayout(palette);
    const diagramBox = await palette.locator("svg").boundingBox();
    if (!diagramBox) throw new Error("Hex diagram is not visible");
    expect(before.palette.height).toBeCloseTo(original.height, 1);
    expect(diagramBox.width).toBeCloseTo(original.width, 1);
    expect(diagramBox.height).toBeCloseTo(original.svgHeight, 1);
    expect(diagramBox.x - before.palette.x).toBeCloseTo(original.offsetX, 1);
    expect(diagramBox.x + diagramBox.width / 2).toBeCloseTo(before.palette.x + before.palette.width / 2, 1);
    await palette.locator("svg").dblclick({ position: { x: 3, y: 3 } });
    const list = page.getByRole("list", { name: "Level color mapping" });
    await expect(list).toBeVisible();
    await expect(list.getByRole("listitem")).toHaveCount(8);
    await expect(list.getByLabel(/Pattern factor/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "View 3 patterns in Gallery" })).toHaveCount(0);
    expect(await pageBounds(page)).toEqual(before);
    await expect.poll(() => previewPixel(page)).toEqual([255, 0, 0, 255]);
    const horizontalBounds = await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll("span")]
        .filter((node) => node.getBoundingClientRect().right > innerWidth)
        .slice(0, 6)
        .map((node) => ({ text: node.textContent, right: node.getBoundingClientRect().right })),
    }));
    expect(horizontalBounds.width, JSON.stringify(horizontalBounds)).toBeLessThanOrEqual(horizontalBounds.viewport);
    const overflow = await list
      .locator(".hex-list-equation")
      .evaluateAll((nodes) => nodes.some((node) => node.scrollWidth > node.clientWidth));
    expect(overflow).toBe(false);

    const blue = list.getByRole("button", { name: "Level 2 color candidate #0040ff 225°", exact: true });
    await blue.dblclick();
    await expect(list).toBeVisible();
    await expect(blue).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => previewPixel(page)).toEqual([0, 64, 255, 255]);
    await page.keyboard.press("v");
    await expect(page.getByRole("group", { name: "Pure-hue loop color selection" })).toBeVisible();
    await expect(palette.locator('g[data-lv="2"][aria-pressed="true"]')).toHaveAttribute("aria-label", "Level 2 color candidate (#0040ff)");
    expect(await pageBounds(page)).toEqual(before);
    await page.getByRole("button", { name: "View 3 patterns in Gallery" }).click();
    await expect(page.getByRole("tab", { name: "Gallery" })).toHaveAttribute("aria-selected", "true");
  });
}

test("leaves double-clicks on the original disabled die alone", async ({ page }) => {
  await page.goto("/#hex");
  const die = page.getByRole("button", { name: "Randomize palette" });
  await expect(die).toHaveAttribute("aria-disabled", "true");
  const at = await centre(die);
  await page.mouse.dblclick(at.x, at.y);
  await expect(page.getByRole("group", { name: "Pure-hue loop color selection" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Level color mapping" })).toHaveCount(0);
});

test.describe("touch palette views", () => {
  const phone = devices["iPhone 13"];
  test.use({
    viewport: phone.viewport,
    userAgent: phone.userAgent,
    deviceScaleFactor: phone.deviceScaleFactor,
    isMobile: phone.isMobile,
    hasTouch: phone.hasTouch,
  });

  test("switches in both directions with a background hold and keeps candidate holds for pins", async ({ page, context }) => {
    const palette = await openUsedPalette(page);
    const client = await context.newCDPSession(page);
    await palette.scrollIntoViewIfNeeded();
    const blueDot = palette
      .locator('g[data-lv="2"][aria-pressed="false"]')
      .filter({ has: page.locator('circle[fill="none"][stroke="#0040ff"]') });
    const dotPoint = await blueDot.evaluate((node) => {
      const circles = [...node.querySelectorAll("circle")];
      const box = circles[circles.length - 1].getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [dotPoint] });
    await page.waitForTimeout(100);
    await page.keyboard.press("v");
    await page.waitForTimeout(600);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByRole("listitem", { name: "L2", exact: true })).toHaveAttribute("data-locked", "false");
    await expect(page.getByRole("button", { name: "Level 2 color candidate #ff0000 0°", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.keyboard.press("v");
    const svg = palette.locator("svg");
    const svgBox = await svg.boundingBox();
    if (!svgBox) throw new Error("Hex diagram is not visible");
    await hold(page, client, { x: svgBox.x + 4, y: svgBox.y + 4 });
    const list = page.getByRole("list", { name: "Level color mapping" });
    await expect(list).toBeVisible();
    const blue = list.getByRole("button", { name: "Level 2 color candidate #0040ff 225°", exact: true });
    await hold(page, client, await centre(blue));
    await expect(list).toBeVisible();
    await expect(blue).toHaveAttribute("aria-pressed", "true");
    await expect(list.getByRole("listitem", { name: "L2", exact: true })).toHaveAttribute("data-locked", "true");
    await hold(page, client, await centre(list.getByRole("listitem", { name: "L2", exact: true }).locator(".hex-list-equation")));
    await expect(page.getByRole("group", { name: "Pure-hue loop color selection" })).toBeVisible();
    const selected = palette.locator('g[data-lv="2"][aria-pressed="true"]');
    await expect(selected).toHaveAttribute("aria-label", "Level 2 color candidate (#0040ff)");
    await expect(selected.locator(".hex-dot-selected-ring")).not.toHaveAttribute("stroke-dasharray", "2,2");
    await expect.poll(() => previewPixel(page)).toEqual([0, 64, 255, 255]);
  });

  test("leaves a hold on the original disabled die alone", async ({ page, context }) => {
    await page.goto("/#hex");
    const die = page.getByRole("button", { name: "Randomize palette" });
    await die.scrollIntoViewIfNeeded();
    await expect(die).toHaveAttribute("aria-disabled", "true");
    const client = await context.newCDPSession(page);
    await hold(page, client, await centre(die));
    await expect(page.getByRole("group", { name: "Pure-hue loop color selection" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Level color mapping" })).toHaveCount(0);
  });

  test("allows scrolling the background without switching views", async ({ page, context }) => {
    const palette = await openUsedPalette(page);
    await page.keyboard.press("v");
    const list = page.getByRole("list", { name: "Level color mapping" });
    await list.getByRole("listitem", { name: "L2", exact: true }).scrollIntoViewIfNeeded();
    const start = await centre(list.getByRole("listitem", { name: "L2", exact: true }).locator(".hex-list-equation"));
    const listView = palette.locator('.hex-palette-view[data-view="list"]');
    const before = { page: await page.evaluate(() => scrollY), list: await listView.evaluate((node) => node.scrollTop) };
    const client = await context.newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    for (const dy of [8, 20, 40, 70]) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x, y: start.y - dy }] });
    }
    await page.waitForTimeout(700);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(list).toBeVisible();
    await expect
      .poll(
        async () => (await page.evaluate(() => scrollY)) > before.page || (await listView.evaluate((node) => node.scrollTop)) > before.list,
      )
      .toBe(true);
    await expect(palette.locator('.hex-palette-view[data-active="true"]')).toContainText("Δ");
  });
});
