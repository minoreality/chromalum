import { expect, test, type Locator, type Page } from "@playwright/test";

const tabs = ["Source", "Glaze", "Hex", "Map"] as const;
type CanvasTab = (typeof tabs)[number];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
});

const workspace = (page: Page, tab: CanvasTab) => page.locator(`#tabpanel-${tab.toLowerCase()} .canvas-workspace`);
const image = (page: Page, tab: CanvasTab) => workspace(page, tab).locator("canvas").first();
const scale = (canvas: Locator) => canvas.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);

async function view(canvas: Locator) {
  return canvas.evaluate((el) => {
    const rectangle = (node: Element) => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    return { frame: rectangle(el.closest(".canvas-workspace")!), image: rectangle(el), transform: getComputedStyle(el).transform };
  });
}

async function centre(target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("Canvas workspace is not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function openSource(page: Page, width = 320, height = 320) {
  await page.goto("./#source");
  await expect(image(page, "Source")).toBeVisible();
  if (width !== 320 || height !== 320) {
    await page.getByRole("button", { name: "📐New", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "New Canvas" });
    await dialog.getByRole("spinbutton", { name: "Canvas width" }).fill(String(width));
    await dialog.getByRole("spinbutton", { name: "Canvas height" }).fill(String(height));
    await dialog.getByRole("button", { name: "Create", exact: true }).click();
  }
  await page.clock.runFor(500);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function zoomAndPan(page: Page, tab: CanvasTab = "Source") {
  const frame = workspace(page, tab);
  const at = await centre(frame);
  await page.mouse.move(at.x, at.y);
  await page.mouse.wheel(0, -120);
  await expect.poll(() => scale(image(page, tab))).toBeGreaterThan(1);
  const before = await view(image(page, tab));
  await page.clock.runFor(500);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(at.x + 35, at.y + 20, { steps: 3 });
  await page.mouse.up({ button: "middle" });
  await expect.poll(async () => (await view(image(page, tab))).image.x).toBeCloseTo(before.image.x + 35, 3);
  await page.clock.runFor(500);
}

for (const layout of [
  { name: "desktop square", viewport: { width: 1280, height: 900 }, width: 320, height: 320 },
  { name: "desktop landscape", viewport: { width: 1280, height: 900 }, width: 320, height: 160 },
  { name: "narrow screen", viewport: { width: 390, height: 844 }, width: 320, height: 320 },
  { name: "portrait canvas", viewport: { width: 900, height: 1000 }, width: 160, height: 320 },
]) {
  test(`keeps all four canvas frames and images aligned in ${layout.name}`, async ({ page }) => {
    await page.setViewportSize(layout.viewport);
    await openSource(page, layout.width, layout.height);
    const original = await view(image(page, "Source"));
    for (const tab of ["Glaze", "Hex", "Map"] as const) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expect.poll(() => view(image(page, tab))).toEqual(original);
    }
  });
}

for (const width of [1280, 390]) {
  test(`retains the same zoomed and panned canvas when switching all four tabs at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openSource(page);
    await zoomAndPan(page);
    const original = await view(image(page, "Source"));
    for (const tab of ["Glaze", "Hex", "Map", "Source"] as const) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expect.poll(() => view(image(page, tab))).toEqual(original);
    }
  });
}

for (const tab of tabs) {
  test(`resets the shared canvas from ${tab} with two middle clicks`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openSource(page);
    const original = await view(image(page, "Source"));
    await zoomAndPan(page);
    await page.getByRole("tab", { name: tab, exact: true }).click();
    const at = await centre(workspace(page, tab));
    await page.mouse.dblclick(at.x, at.y, { button: "middle", delay: 50 });
    for (const target of tabs) {
      await page.getByRole("tab", { name: target, exact: true }).click();
      await expect.poll(() => view(image(page, target))).toEqual(original);
    }
  });
}

for (const tab of ["Hex", "Map"] as const) {
  test(`shares wheel zoom and middle-button pan performed in ${tab} with Source and Glaze`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openSource(page);
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await zoomAndPan(page, tab);
    const changed = await view(image(page, tab));
    for (const target of ["Source", "Glaze"] as const) {
      await page.getByRole("tab", { name: target, exact: true }).click();
      await expect.poll(() => view(image(page, target))).toEqual(changed);
    }
  });

  test(`keeps the shared viewport when ${tab} receives a left-button double click`, async ({ page }) => {
    await openSource(page);
    await zoomAndPan(page);
    await page.getByRole("tab", { name: tab, exact: true }).click();
    const before = await view(image(page, tab));
    const at = await centre(workspace(page, tab));
    await page.mouse.dblclick(at.x, at.y);
    expect(await view(image(page, tab))).toEqual(before);
    await page.getByRole("tab", { name: "Source", exact: true }).click();
    await expect.poll(() => scale(image(page, "Source"))).toBeGreaterThan(1);
  });

  test(`settles a middle-button pan when leaving ${tab} with the button held`, async ({ page }) => {
    await openSource(page);
    await zoomAndPan(page);
    await page.getByRole("tab", { name: tab, exact: true }).click();
    const at = await centre(workspace(page, tab));
    const before = await view(image(page, tab));
    await page.mouse.move(at.x, at.y);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(at.x + 20, at.y);
    await expect.poll(async () => (await view(image(page, tab))).image.x).toBeCloseTo(before.image.x + 20, 3);
    const changed = await view(image(page, tab));
    await page.keyboard.press("Alt+3");
    await expect(image(page, "Source")).toBeVisible();
    await page.mouse.move(at.x + 60, at.y);
    await page.mouse.up({ button: "middle" });
    expect(await view(image(page, "Source"))).toEqual(changed);
  });
}

test("reads the same source pixel in Hex and Map after shared zoom and pan", async ({ page }) => {
  await openSource(page);
  const at = await centre(workspace(page, "Source"));
  await page.mouse.move(at.x, at.y);
  await page.keyboard.press("2");
  await zoomAndPan(page);
  for (const tab of ["Hex", "Map"] as const) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    const box = (await view(image(page, tab))).image;
    await page.mouse.move(box.x + (160.5 / 320) * box.width, box.y + (160.5 / 320) * box.height);
    const status = page.locator(`#tabpanel-${tab.toLowerCase()} .panel-canvas`).getByText(/\(160,160\)/);
    await expect(status).toContainText("L2");
  }
});

for (const tab of ["Hex", "Map"] as const) {
  test(`updates ${tab} pixel information after panning with a stationary pointer`, async ({ page }) => {
    await openSource(page);
    await zoomAndPan(page);
    await page.getByRole("tab", { name: tab, exact: true }).click();
    const at = await centre(workspace(page, tab));
    await page.mouse.move(at.x, at.y);
    const before = await view(image(page, tab));
    await page.mouse.wheel(35, 20);
    await expect.poll(async () => (await view(image(page, tab))).image.x).toBeCloseTo(before.image.x - 35, 3);
    const box = (await view(image(page, tab))).image;
    const x = Math.floor(((at.x - box.x) / box.width) * 320);
    const y = Math.floor(((at.y - box.y) / box.height) * 320);
    const status = page.locator(`#tabpanel-${tab.toLowerCase()} .panel-canvas`).getByText(new RegExp(`\\(${x},${y}\\)`));
    await expect(status).toBeVisible();
  });
}

test("keeps Hex pixel information current on the final middle-drag move", async ({ page }) => {
  await openSource(page);
  await zoomAndPan(page);
  await page.getByRole("tab", { name: "Hex", exact: true }).click();
  const at = await centre(workspace(page, "Hex"));
  const before = await view(image(page, "Hex"));
  const x = Math.floor(((at.x - before.image.x) / before.image.width) * 320);
  const y = Math.floor(((at.y - before.image.y) / before.image.height) * 320);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(at.x + 35, at.y + 20);
  await page.mouse.up({ button: "middle" });
  await expect.poll(async () => (await view(image(page, "Hex"))).image.x).toBeCloseTo(before.image.x + 35, 3);
  await expect(page.locator("#tabpanel-hex .panel-canvas").getByText(new RegExp(`\\(${x},${y}\\)`))).toBeVisible();
});

test.describe("touch navigation", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  for (const tab of ["Hex", "Map"] as const) {
    test(`resets the shared canvas from ${tab} with a double tap`, async ({ page }) => {
      await openSource(page);
      const original = await view(image(page, "Source"));
      await zoomAndPan(page);
      await page.getByRole("tab", { name: tab, exact: true }).click();
      const at = await centre(workspace(page, tab));
      await page.touchscreen.tap(at.x, at.y);
      await page.clock.runFor(50);
      await page.touchscreen.tap(at.x, at.y);
      for (const target of tabs) {
        await page.getByRole("tab", { name: target, exact: true }).click();
        await expect.poll(() => view(image(page, target))).toEqual(original);
      }
    });

    test(`pans ${tab} with touch without treating a drag after a tap as a reset`, async ({ page }) => {
      await openSource(page);
      await zoomAndPan(page);
      await page.getByRole("tab", { name: tab, exact: true }).click();
      const at = await centre(workspace(page, tab));
      await page.touchscreen.tap(at.x, at.y);
      await page.clock.runFor(50);
      const before = await view(image(page, tab));
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: at.x + 40, y: at.y + 20 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => scale(image(page, tab))).toBeGreaterThan(1);
      await expect.poll(async () => (await view(image(page, tab))).image.x).toBeCloseTo(before.image.x + 40, 3);
      const changed = await view(image(page, tab));
      await page.getByRole("tab", { name: "Source", exact: true }).click();
      await expect.poll(() => view(image(page, "Source"))).toEqual(changed);
    });

    test(`shares a ${tab} pinch and settles touch cancellation after one finger remains`, async ({ page }) => {
      await openSource(page);
      await page.getByRole("tab", { name: tab, exact: true }).click();
      const at = await centre(workspace(page, tab));
      const cdp = await page.context().newCDPSession(page);
      const first = { id: 1, x: at.x - 50, y: at.y };
      const second = { id: 2, x: at.x + 50, y: at.y };
      const movedSecond = { ...second, x: second.x + 10 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [first, second] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...first, x: first.x - 10 }, movedSecond] });
      await expect.poll(() => scale(image(page, tab))).toBeCloseTo(1.2, 3);
      // CDP's nonempty touchEnd list selects the contacts to lift.
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [{ ...first, x: first.x - 10 }] });
      const before = await view(image(page, tab));
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...movedSecond, x: movedSecond.x + 20 }] });
      await expect.poll(async () => (await view(image(page, tab))).image.x).toBeCloseTo(before.image.x + 20, 3);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
      const changed = await view(image(page, tab));
      await page.mouse.move(at.x + 60, at.y);
      expect(await view(image(page, tab))).toEqual(changed);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("tab", { name: "Source", exact: true }).click();
      await expect.poll(() => view(image(page, "Source"))).toEqual(changed);
    });
  }

  test("keeps Map long-press saving without resetting or retaining a touch pan", async ({ page }) => {
    await openSource(page);
    await zoomAndPan(page);
    await page.getByRole("tab", { name: "Map", exact: true }).click();
    const at = await centre(workspace(page, "Map"));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at] });
    await page.clock.runFor(1100);
    await expect(page.getByRole("dialog")).toBeVisible();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1000 });
    await page.getByRole("dialog").getByRole("button", { name: "No", exact: true }).click();
    await expect.poll(() => scale(image(page, "Map"))).toBeGreaterThan(1);
    const before = await view(image(page, "Map"));
    await page.mouse.move(at.x + 30, at.y);
    expect(await view(image(page, "Map"))).toEqual(before);
  });

  test("keeps a small Map pinch separate from long-press saving", async ({ page }) => {
    await openSource(page);
    await page.getByRole("tab", { name: "Map", exact: true }).click();
    const at = await centre(workspace(page, "Map"));
    const cdp = await page.context().newCDPSession(page);
    const first = { id: 1, x: at.x - 40, y: at.y };
    const second = { id: 2, x: at.x + 40, y: at.y };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [first, second] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [first, { ...second, x: second.x + 5 }] });
    await expect.poll(() => scale(image(page, "Map"))).toBeGreaterThan(1);
    await page.clock.runFor(1100);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const changed = await view(image(page, "Map"));
    await page.getByRole("tab", { name: "Source", exact: true }).click();
    await expect.poll(() => view(image(page, "Source"))).toEqual(changed);
  });

  test("cancels Map saving when the second finger lands on exposed workspace background", async ({ page }) => {
    await openSource(page);
    await page.getByRole("tab", { name: "Map", exact: true }).click();
    const at = await centre(workspace(page, "Map"));
    await page.mouse.move(at.x, at.y);
    await page.mouse.wheel(0, 240);
    await expect.poll(() => scale(image(page, "Map"))).toBeLessThan(1);
    const { frame, image: box } = await view(image(page, "Map"));
    const background = { id: 2, x: (box.x + box.width + frame.x + frame.width) / 2, y: at.y };
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, ...at }, background] });
    await page.clock.runFor(1100);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => scale(image(page, "Map"))).toBeLessThan(1);
  });
});
