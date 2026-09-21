import { expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function pasteBlackImage(page: Page, width: number, height: number) {
  await page.evaluate(
    async ({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!)));
      const clipboardData = new DataTransfer();
      clipboardData.items.add(new File([blob], "black.png", { type: "image/png" }));
      window.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
    },
    { width, height },
  );
  return page.getByRole("dialog", { name: "Crop image" });
}

test("tabs forward through crop controls after pasting an image", async ({ page }) => {
  await page.goto("./#source");
  const dialog = await pasteBlackImage(page, 64, 64);
  await expect(dialog.getByRole("group", { name: "Move crop area", exact: true })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("group", { name: "Resize crop from top left", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("group", { name: "Move crop area", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("keeps the final row and column black after a fractional crop resize", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("./#source");
  const dialog = await pasteBlackImage(page, 1000, 400);
  const handle = dialog.getByRole("group", { name: "Resize crop from top left", exact: true });
  const box = await handle.boundingBox();
  if (!box) throw new Error("Crop handle is not visible");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 2, y + 2);
  await page.mouse.up();
  await expect(dialog.getByText("997 × 397 px", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "OK", exact: true }).click();

  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await expect
    .poll(() => canvas.evaluate((el) => ({ width: (el as HTMLCanvasElement).width, height: (el as HTMLCanvasElement).height })))
    .toEqual({ width: 997, height: 397 });
  const corners = await canvas.evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    return [
      [0, 0],
      [canvas.width - 1, 0],
      [0, canvas.height - 1],
      [canvas.width - 1, canvas.height - 1],
    ].map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data));
  });
  expect(corners).toEqual(new Array(4).fill([0, 0, 0, 255]));
});

test.describe("crop pointer ownership", () => {
  test.use({ hasTouch: true, viewport: { width: 1280, height: 900 } });

  async function openCropResize(page: Page) {
    await page.goto("./#source");
    const dialog = await pasteBlackImage(page, 400, 300);
    const handle = dialog.getByRole("group", { name: "Resize crop from bottom right", exact: true });
    const box = await handle.boundingBox();
    if (!box) throw new Error("Crop handle is not visible");
    return { dialog, handle, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  test("ends a crop resize when the browser cancels the touch", async ({ page, context }) => {
    const { dialog, handle, x, y } = await openCropResize(page);
    const client = await context.newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 60, y: y - 40, id: 1 }] });
    await expect(dialog.getByText("340 × 260 px", { exact: true })).toBeVisible();

    await client.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await page.mouse.move(x - 110, y - 80);
    await expect(dialog.getByText("340 × 260 px", { exact: true })).toBeVisible();

    // Cancellation must also leave the handle ready for a new drag.
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(x - 80, y - 50);
    await page.mouse.up();
    await expect(dialog.getByText("320 × 250 px", { exact: true })).toBeVisible();
  });

  test("ends a crop resize when pointer capture is lost", async ({ page }) => {
    const { dialog, handle, x, y } = await openCropResize(page);
    await handle.evaluate((el) => {
      el.addEventListener("pointerdown", (event) => el.setAttribute("data-test-pointer-id", String((event as PointerEvent).pointerId)), {
        once: true,
      });
    });
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 60, y - 40);
    await expect(dialog.getByText("340 × 260 px", { exact: true })).toBeVisible();

    await handle.evaluate((el) => el.releasePointerCapture(Number(el.getAttribute("data-test-pointer-id"))));
    await page.mouse.move(x - 110, y - 80);
    await page.mouse.up();
    await expect(dialog.getByText("340 × 260 px", { exact: true })).toBeVisible();
  });

  test("keeps the first crop pointer in control while another finger moves and lifts", async ({ page, context }) => {
    const { dialog, x, y } = await openCropResize(page);
    const client = await context.newCDPSession(page);
    const first = { x: x - 60, y: y - 40, id: 1 };
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [first] });
    await expect(dialog.getByText("340 × 260 px", { exact: true })).toBeVisible();

    const otherHandle = dialog.getByRole("group", { name: "Resize crop from top left", exact: true });
    const box = await otherHandle.boundingBox();
    if (!box) throw new Error("Crop handle is not visible");
    const second = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 2 };
    const movedSecond = { ...second, x: second.x + 30, y: second.y + 20 };
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [first, second] });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [first, movedSecond],
    });
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(dialog.getByText("340 × 260 px", { exact: true })).toBeVisible();
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [movedSecond] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 80, y: y - 50, id: 1 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(dialog.getByText("320 × 250 px", { exact: true })).toBeVisible();
  });
});

test("releases the Gallery preview keyboard trap when Alt+3 switches to Source", async ({ page }) => {
  await page.goto("./#source");
  await page.getByRole("button", { name: "Level 2 Red", exact: true }).click();
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await canvas.click();
  await page.keyboard.press("e");
  await expect(page.getByRole("radio", { name: /Eraser/ })).toBeChecked();
  await page.getByRole("tab", { name: "Gallery", exact: true }).click();
  await page
    .getByRole("button", { name: /Click to preview/ })
    .first()
    .click();
  await expect(page.getByRole("dialog", { name: "Pattern preview" })).toBeVisible();

  await page.keyboard.press("Alt+3");
  await expect(page.getByRole("tab", { name: "Source", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("dialog", { includeHidden: true })).toHaveCount(0);
  await page.keyboard.press("b");
  await expect(page.getByRole("radio", { name: /Brush/ })).toBeChecked();
  const brush = page.getByRole("radio", { name: /Brush/ });
  await brush.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: /Eraser/ })).toBeFocused();
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+1");
  await expect(page.getByRole("dialog", { includeHidden: true })).toHaveCount(0);
});

test("cycles Glaze candidates without scrolling the page", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 600 });
  await page.goto("./#glaze");
  const swatch = page.getByRole("button", { name: /^Level 2 #[0-9a-f]+ \(/i }).nth(1);
  await swatch.hover();
  const before = { label: await swatch.getAttribute("aria-label"), scrollY: await page.evaluate(() => window.scrollY) };
  expect(before.scrollY).toBeGreaterThan(10);

  await page.mouse.wheel(0, -10);

  await expect.poll(() => swatch.getAttribute("aria-label")).not.toBe(before.label);
  // Wait for the wheel's compositor scroll as well as React's candidate update.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await page.evaluate(() => window.scrollY)).toBe(before.scrollY);
});

async function octahedronPoints(graph: Locator) {
  return graph.locator("[data-octa-vertex]").evaluateAll((nodes) =>
    Object.fromEntries(
      nodes.map((node) => {
        const circle = node.querySelector("circle")!;
        return [node.getAttribute("data-octa-vertex")!, { x: Number(circle.getAttribute("cx")), y: Number(circle.getAttribute("cy")) }];
      }),
    ),
  );
}

async function octahedronDragPoints(graph: Locator, radiusFraction: number) {
  return graph.evaluate((el, fraction) => {
    // The drawing's centre is (200, 200), and its six vertices sit on a radius-110 sphere.
    const matrix = (el as SVGSVGElement).getScreenCTM()!;
    const from = new DOMPoint(200, 200).matrixTransform(matrix);
    const to = new DOMPoint(200 + 110 * fraction, 200).matrixTransform(matrix);
    return { from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } };
  }, radiusFraction);
}

for (const width of [1280, 390]) {
  test(`keeps an octahedron horizontal centre drag on its horizontal axis at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("theory-dev.html");
    const graph = page.getByTestId("chromatic-octahedron").locator("svg");
    await graph.scrollIntoViewIfNeeded();
    const before = await octahedronPoints(graph);
    const { from, to } = await octahedronDragPoints(graph, 0.5);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y);
    await page.mouse.up();

    const after = await octahedronPoints(graph);
    expect(Object.keys(before).some((level) => Math.abs(after[level].x - before[level].x) > 1)).toBe(true);
    for (const level of Object.keys(before)) expect(after[level].y).toBeCloseTo(before[level].y, 6);
  });
}

test("does not start octahedron auto-spin while the middle-button drag is inside the sphere", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("theory-dev.html");
  const graph = page.getByTestId("chromatic-octahedron").locator("svg");
  await graph.scrollIntoViewIfNeeded();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const { from, to } = await octahedronDragPoints(graph, 0.85);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(to.x, to.y);
  const held = await octahedronPoints(graph);
  await page.clock.runFor(400);
  expect(await octahedronPoints(graph)).toEqual(held);
  await page.mouse.up({ button: "middle" });
});

async function fillSourceRedLevel(page: Page) {
  await page.goto("./#source");
  await page.getByRole("button", { name: "Level 2 Red", exact: true }).click();
  await page.getByRole("radio", { name: /Fill/ }).click();
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await canvas.click();
  await expect.poll(() => canvasPixel(canvas, 0, 0)).toEqual([73, 73, 73, 255]);
  await page.getByRole("radio", { name: /Brush/ }).click();
  return canvas;
}

function canvasPixel(canvas: Locator, x: number, y: number) {
  return canvas.evaluate((el, point) => Array.from((el as HTMLCanvasElement).getContext("2d")!.getImageData(point.x, point.y, 1, 1).data), {
    x,
    y,
  });
}

function canvasImage(canvas: Locator) {
  return canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
}

async function canvasPoint(canvas: Locator, x: number, y: number) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Drawing canvas is not visible");
  return { x: box.x + box.width * x, y: box.y + box.height * y };
}

for (const tab of ["Source", "Glaze"] as const) {
  test(`does not repaint a discarded ${tab} stroke after Undo`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    const source = await fillSourceRedLevel(page);
    if (tab === "Glaze") {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await page.getByRole("slider", { name: "Hue angle (0-359 degrees)", exact: true }).fill("225");
    } else {
      await page.getByRole("button", { name: "Level 5 Cyan", exact: true }).click();
    }
    const canvas = tab === "Source" ? source : page.getByRole("img", { name: "HUE GLAZE OVERLAY", exact: true });
    const beforeStroke = await canvasImage(canvas);
    await canvas.click({ position: { x: 100, y: 100 } });
    await expect.poll(() => canvasImage(canvas)).not.toBe(beforeStroke);
    await canvas.scrollIntoViewIfNeeded();
    const from = await canvasPoint(canvas, 0.45, 0.45);
    const to = await canvasPoint(canvas, 0.6, 0.45);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y);
    // A second pointer can press Undo while the drawing pointer is held.
    await page.getByRole("button", { name: /Undo/ }).evaluate((el) => (el as HTMLButtonElement).click());
    expect(await canvasImage(canvas)).toBe(beforeStroke);

    await page.clock.runFor(32);
    expect(await canvasImage(canvas)).toBe(beforeStroke);
    await page.mouse.up();
    expect(await canvasImage(canvas)).toBe(beforeStroke);
  });
}

test("keeps the Hex palette unchanged while Help is open", async ({ page }) => {
  await fillSourceRedLevel(page);
  await page.getByRole("tab", { name: "Hex", exact: true }).click();
  await page.getByRole("button", { name: "R — Level 2", exact: true }).click();
  const canvas = page.getByRole("img", { name: "Color preview canvas", exact: true });
  const before = await canvasImage(canvas);
  await page.keyboard.press("F1");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("2");
  expect(await canvasImage(canvas)).toBe(before);
  await page.keyboard.press("Escape");
  await page.keyboard.press("2");
  await expect.poll(() => canvasImage(canvas)).not.toBe(before);
});

for (const tab of ["Color", "Glaze"] as const) {
  test(`selects level zero without resetting the ${tab} viewport`, async ({ page }) => {
    const source = await fillSourceRedLevel(page);
    await page.getByRole("tab", { name: tab, exact: true }).click();
    const workspace = page.locator('[role="tabpanel"]:visible .canvas-workspace');
    await workspace.focus();
    await workspace.press("=");
    await workspace.press("ArrowRight");
    const canvas = workspace.getByRole("img");
    const transform = await canvas.evaluate((el) => (el as HTMLElement).style.transform);
    await workspace.press("0");
    expect(await canvas.evaluate((el) => (el as HTMLElement).style.transform)).toBe(transform);

    await page.getByRole("tab", { name: "Source", exact: true }).click();
    await page.getByRole("button", { name: /Reset zoom/ }).click();
    await source.click();
    await expect.poll(() => canvasPixel(source, 160, 160)).toEqual([0, 0, 0, 255]);
  });
}

test("applies each Glaze brush-size shortcut once", async ({ page }) => {
  await page.goto("./#glaze");
  const workspace = page.locator('[role="tabpanel"]:visible .canvas-workspace');
  const size = page.getByRole("slider", { name: "Brush size", exact: true });
  await expect(size).toHaveValue("12");
  await workspace.focus();
  await workspace.press("]");
  await expect(size).toHaveValue("13");
  await workspace.press("[");
  await expect(size).toHaveValue("12");
});

test("keeps drawing a Glaze stroke when E and F are pressed before release", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await fillSourceRedLevel(page);
  await page.getByRole("tab", { name: "Glaze", exact: true }).click();
  await page.getByRole("slider", { name: "Hue angle (0-359 degrees)", exact: true }).fill("225");
  const canvas = page.getByRole("img", { name: "HUE GLAZE OVERLAY", exact: true });
  const workspace = page.locator('[role="tabpanel"]:visible .canvas-workspace');
  await canvas.scrollIntoViewIfNeeded();
  await workspace.focus();
  const from = await canvasPoint(canvas, 0.35, 0.45);
  const middle = await canvasPoint(canvas, 0.65, 0.45);
  const to = await canvasPoint(canvas, 0.8, 0.45);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(middle.x, middle.y, { steps: 8 });
  await workspace.press("e");
  await page.mouse.move(from.x, from.y, { steps: 8 });
  await workspace.press("f");
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();

  expect(await canvasPixel(canvas, 112, 144)).toEqual([0, 64, 255, 255]);
  expect(await canvasPixel(canvas, 240, 144)).toEqual([0, 64, 255, 255]);
  await page.getByRole("button", { name: /Undo/ }).click();
  expect(await canvasPixel(canvas, 112, 144)).toEqual([255, 0, 0, 255]);
  expect(await canvasPixel(canvas, 240, 144)).toEqual([255, 0, 0, 255]);
});
