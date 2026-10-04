import { expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("./#source");
});

async function pixel(canvas: Locator, x: number, y: number) {
  return canvas.evaluate((el, point) => Array.from((el as HTMLCanvasElement).getContext("2d")!.getImageData(point.x, point.y, 1, 1).data), {
    x,
    y,
  });
}

async function point(canvas: Locator, x: number, y: number) {
  return canvas.evaluate(
    (el, point) => {
      const c = el as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      return { x: r.left + ((point.x + 0.5) / c.width) * r.width, y: r.top + ((point.y + 0.5) / c.height) * r.height };
    },
    { x, y },
  );
}

type FillGateWindow = typeof window & { keyboardFillGate: { requests: (() => void)[]; replies: number } };

async function holdCanvasFills(page: Page) {
  await page.addInitScript(() => {
    const gate = { requests: [] as (() => void)[], replies: 0 };
    (window as FillGateWindow).keyboardFillGate = gate;
    const postMessage = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: { kind?: string }, options?: Transferable[] | StructuredSerializeOptions) {
      if (message.kind !== "canvas") {
        Reflect.apply(postMessage, this, [message, options]);
        return;
      }
      gate.requests.push(() => {
        this.addEventListener("message", () => gate.replies++, { once: true });
        Reflect.apply(postMessage, this, [message, options]);
      });
    };
  });
  await page.reload();
}

test("paints all eight Source levels at the mouse cursor using the current brush size", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("3");
  await page.getByRole("button", { name: "Level 7 White", exact: true }).click();
  const zero = await point(canvas, 48, 160);
  await page.mouse.click(zero.x, zero.y);
  await expect.poll(() => pixel(canvas, 48, 160)).toEqual([255, 255, 255, 255]);

  const gray = [0, 36, 73, 109, 146, 182, 219, 255];
  for (let level = 0; level < 8; level++) {
    const position = await point(canvas, 48 + level * 24, 160);
    await page.mouse.move(position.x, position.y);
    await page.keyboard.press(String(level));
    await expect.poll(() => pixel(canvas, 48 + level * 24, 160)).toEqual([gray[level], gray[level], gray[level], 255]);
  }
  const patch = await canvas.evaluate((el) => {
    const data = (el as HTMLCanvasElement).getContext("2d")!.getImageData(95, 159, 3, 3).data;
    return Array.from({ length: 9 }, (_, i) => data[i * 4]);
  });
  expect(patch).toEqual([0, 73, 0, 73, 73, 73, 0, 73, 0]);
});

test("records each Source number-key brush stamp as one undoable action", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
  const position = await point(canvas, 160, 160);
  await page.mouse.move(position.x, position.y);
  await page.keyboard.press("2");
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([73, 73, 73, 255]);
  await page.keyboard.press("5");
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([182, 182, 182, 255]);
  await page.keyboard.press("Control+z");
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([73, 73, 73, 255]);
  await page.keyboard.press("Control+z");
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([0, 0, 0, 255]);
  await page.keyboard.press("Control+y");
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([73, 73, 73, 255]);
});

test("keeps the selected Source tool when a level is double-clicked", async ({ page }) => {
  for (const { tool, level } of [
    { tool: "Fill", level: "Level 2 Red" },
    { tool: "Brush", level: "Level 0 Black" },
    { tool: "Eraser", level: "Level 7 White" },
  ]) {
    const selectedTool = page.getByRole("radio", { name: new RegExp(tool) });
    await selectedTool.click();
    const levelButton = page.getByRole("button", { name: level, exact: true });
    await levelButton.dblclick();
    await expect(selectedTool).toBeChecked();
    await expect(levelButton).not.toHaveAttribute("title", /double.click/i);
  }
});

test("uses the cursor's canvas coordinates after Source zoom and pan", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  const workspace = page.locator('[role="tabpanel"]:visible .canvas-workspace');
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
  await workspace.focus();
  await workspace.press("+");
  await workspace.press("ArrowRight");
  const position = await point(canvas, 160, 160);
  await page.mouse.move(position.x, position.y);
  await page.keyboard.press("6");
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([219, 219, 219, 255]);
  await expect.poll(() => pixel(canvas, 159, 160)).toEqual([0, 0, 0, 255]);
});

test("keeps number keys as level selection outside the Source canvas", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  const position = await point(canvas, 160, 160);
  await page.mouse.move(position.x, position.y);
  await page.getByRole("heading", { name: "CHROMALUM", exact: true }).hover();
  await page.keyboard.press("5");
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([0, 0, 0, 255]);
  await page.mouse.click(position.x, position.y);
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([182, 182, 182, 255]);
});

test("does not repeat a held Source number key at the next cursor position", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
  const first = await point(canvas, 140, 160);
  await page.mouse.move(first.x, first.y);
  await page.keyboard.down("2");
  await expect.poll(() => pixel(canvas, 140, 160)).toEqual([73, 73, 73, 255]);
  const second = await point(canvas, 180, 160);
  await page.mouse.move(second.x, second.y);
  await page.keyboard.down("2");
  await page.keyboard.up("2");
  expect(await pixel(canvas, 180, 160)).toEqual([0, 0, 0, 255]);
  await page.keyboard.press("2");
  await expect.poll(() => pixel(canvas, 180, 160)).toEqual([73, 73, 73, 255]);
});

test("paints the requested Source level with the brush even when the eraser is selected", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("3");
  const eraser = page.getByRole("radio", { name: /Eraser/ });
  await eraser.click();
  const position = await point(canvas, 160, 160);
  await page.mouse.move(position.x, position.y);
  await page.keyboard.press("4");
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([146, 146, 146, 255]);
  expect(await pixel(canvas, 162, 160)).toEqual([0, 0, 0, 255]);
  await expect(eraser).toBeChecked();
});

test("does not paint Source behind Help and resumes at the same pointer position", async ({ page }) => {
  const canvas = page.locator('#tabpanel-source canvas[role="application"]');
  const position = await point(canvas, 160, 160);
  await page.mouse.move(position.x, position.y);
  await page.keyboard.press("F1");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("5");
  expect(await pixel(canvas, 160, 160)).toEqual([0, 0, 0, 255]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("5");
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([182, 182, 182, 255]);
});

test("keeps Source number keys from painting in pan mode", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  const pan = page.getByRole("button", { name: /Pan/ });
  await pan.click();
  const position = await point(canvas, 160, 160);
  await page.mouse.move(position.x, position.y);
  await page.keyboard.press("3");
  expect(await pixel(canvas, 160, 160)).toEqual([0, 0, 0, 255]);
  await pan.click();
  await page.mouse.move(position.x, position.y);
  await page.keyboard.press("3");
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([109, 109, 109, 255]);
});

test("fills the pointed Source region with a number key as one undoable action", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
  await page.getByRole("button", { name: "Level 7 White", exact: true }).click();
  await page.getByRole("radio", { name: /Rect/ }).click();
  const start = await point(canvas, 120, 120);
  const end = await point(canvas, 200, 200);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y);
  await page.mouse.up();
  await expect.poll(() => pixel(canvas, 120, 160)).toEqual([255, 255, 255, 255]);
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("24");
  await page.getByRole("radio", { name: /Fill/ }).click();
  const inside = await point(canvas, 160, 160);
  await page.mouse.move(inside.x, inside.y);
  await page.keyboard.press("5");
  await expect.poll(() => pixel(canvas, 140, 140)).toEqual([182, 182, 182, 255]);
  expect(await pixel(canvas, 120, 160)).toEqual([255, 255, 255, 255]);
  expect(await pixel(canvas, 100, 160)).toEqual([0, 0, 0, 255]);
  await page.keyboard.press("Control+z");
  await expect.poll(() => pixel(canvas, 140, 140)).toEqual([0, 0, 0, 255]);
  expect(await pixel(canvas, 120, 160)).toEqual([255, 255, 255, 255]);
  await page.keyboard.press("Control+y");
  await expect.poll(() => pixel(canvas, 140, 140)).toEqual([182, 182, 182, 255]);
  await page.keyboard.press("0");
  await expect.poll(() => pixel(canvas, 140, 140)).toEqual([0, 0, 0, 255]);
  await page.keyboard.press("Control+z");
  await expect.poll(() => pixel(canvas, 140, 140)).toEqual([182, 182, 182, 255]);
});

for (const shape of [
  { name: "Line", key: "2", gray: 73, sample: { x: 150, y: 150 } },
  { name: "Rect", key: "6", gray: 219, sample: { x: 150, y: 120 } },
  { name: "Ellipse", key: "4", gray: 146, sample: { x: 150, y: 120 } },
]) {
  test(`previews a Source ${shape.name} while its number key is held and commits on release`, async ({ page }) => {
    const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
    await page.getByRole("slider", { name: "Brush size", exact: true }).fill("3");
    await page.getByRole("radio", { name: new RegExp(shape.name) }).click();
    const start = await point(canvas, 100, 120);
    const end = await point(canvas, 200, 180);
    await page.mouse.move(start.x, start.y);
    await page.keyboard.down(shape.key);
    await page.mouse.move(end.x, end.y);
    await expect.poll(() => pixel(canvas, shape.sample.x, shape.sample.y)).toEqual([shape.gray, shape.gray, shape.gray, 255]);
    await expect(page.getByRole("button", { name: /Undo/ })).toBeDisabled();
    await page.keyboard.up("7");
    await expect(page.getByRole("button", { name: /Undo/ })).toBeDisabled();
    await page.keyboard.up(shape.key);
    await expect(page.getByRole("button", { name: /Undo/ })).toBeEnabled();
    await page.keyboard.press("Control+z");
    await expect.poll(() => pixel(canvas, shape.sample.x, shape.sample.y)).toEqual([0, 0, 0, 255]);
    expect(await pixel(canvas, 100, 120)).toEqual([0, 0, 0, 255]);
    await page.keyboard.press("Control+y");
    await expect.poll(() => pixel(canvas, shape.sample.x, shape.sample.y)).toEqual([shape.gray, shape.gray, shape.gray, 255]);
  });
}

test("replaces the previous Source keyboard shape preview and cancels it with Escape", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
  await page.getByRole("radio", { name: /Line/ }).click();
  const start = await point(canvas, 100, 120);
  const first = await point(canvas, 200, 180);
  const second = await point(canvas, 200, 160);
  await page.mouse.move(start.x, start.y);
  await page.keyboard.down("2");
  await page.mouse.move(first.x, first.y);
  await expect.poll(() => pixel(canvas, 150, 150)).toEqual([73, 73, 73, 255]);
  await page.mouse.move(second.x, second.y);
  await expect.poll(() => pixel(canvas, 150, 140)).toEqual([73, 73, 73, 255]);
  expect(await pixel(canvas, 150, 150)).toEqual([0, 0, 0, 255]);
  await page.keyboard.press("Escape");
  await expect.poll(() => pixel(canvas, 150, 140)).toEqual([0, 0, 0, 255]);
  await page.keyboard.up("2");
  await expect(page.getByRole("button", { name: /Undo/ })).toBeDisabled();
});

for (const interruption of ["tab", "Help", "blur"] as const) {
  test(`cancels a Source keyboard shape on ${interruption} without leaving a stuck gesture`, async ({ page }) => {
    let canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
    await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
    await page.getByRole("radio", { name: /Line/ }).click();
    const start = await point(canvas, 100, 120);
    const end = await point(canvas, 200, 180);
    await page.mouse.move(start.x, start.y);
    await page.keyboard.down("2");
    await page.mouse.move(end.x, end.y);
    await expect.poll(() => pixel(canvas, 150, 150)).toEqual([73, 73, 73, 255]);
    if (interruption === "tab") {
      await page.keyboard.press("Alt+2");
      await page.keyboard.up("2");
      await page.keyboard.press("Alt+3");
      canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
    } else if (interruption === "Help") {
      await page.keyboard.press("F1");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.up("2");
      await page.keyboard.press("Escape");
    } else {
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await page.keyboard.up("2");
    }
    await expect.poll(() => pixel(canvas, 150, 150)).toEqual([0, 0, 0, 255]);
    await expect(page.getByRole("button", { name: /Undo/ })).toBeDisabled();
    await page.keyboard.press("b");
    const next = await point(canvas, 160, 160);
    await page.mouse.move(next.x, next.y);
    await page.keyboard.press("5");
    await expect.poll(() => pixel(canvas, 160, 160)).toEqual([182, 182, 182, 255]);
  });
}

test("keeps initial Source keyboard shape parameters after zoom and pan", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  const workspace = page.locator('[role="tabpanel"]:visible .canvas-workspace');
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("3");
  await page.getByRole("radio", { name: /Line/ }).click();
  await workspace.focus();
  await workspace.press("+");
  await workspace.press("ArrowRight");
  const start = await point(canvas, 140, 160);
  const end = await point(canvas, 200, 160);
  await page.mouse.move(start.x, start.y);
  await page.keyboard.down("2");
  await page.keyboard.press("]");
  await page.keyboard.press("5");
  await page.mouse.move(end.x, end.y);
  await page.keyboard.up("2");
  await expect.poll(() => pixel(canvas, 180, 160)).toEqual([73, 73, 73, 255]);
  expect(await pixel(canvas, 180, 161)).toEqual([73, 73, 73, 255]);
  expect(await pixel(canvas, 180, 162)).toEqual([0, 0, 0, 255]);
  await expect(page.getByRole("slider", { name: "Brush size", exact: true })).toHaveValue("4");
});

test("clips Source keyboard shapes from an endpoint outside the canvas", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
  await page.getByRole("radio", { name: /Line/ }).click();
  const start = await point(canvas, 160, 160);
  const end = await point(canvas, 360, 180);
  await page.mouse.move(start.x, start.y);
  await page.keyboard.down("2");
  await page.mouse.move(end.x, end.y);
  await page.keyboard.up("2");
  await expect.poll(() => pixel(canvas, 319, 176)).toEqual([73, 73, 73, 255]);
  expect(await pixel(canvas, 319, 180)).toEqual([0, 0, 0, 255]);
});

test("discards a Source keyboard preview when Undo replaces the canvas", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
  const seed = await point(canvas, 50, 50);
  await page.mouse.move(seed.x, seed.y);
  await page.keyboard.press("3");
  await expect.poll(() => pixel(canvas, 50, 50)).toEqual([109, 109, 109, 255]);
  await page.getByRole("radio", { name: /Line/ }).click();
  const start = await point(canvas, 100, 120);
  const end = await point(canvas, 200, 180);
  await page.mouse.move(start.x, start.y);
  await page.keyboard.down("2");
  await page.mouse.move(end.x, end.y);
  await expect.poll(() => pixel(canvas, 150, 150)).toEqual([73, 73, 73, 255]);
  await page.getByRole("button", { name: /Undo/ }).click();
  await page.keyboard.up("2");
  await expect.poll(() => pixel(canvas, 150, 150)).toEqual([0, 0, 0, 255]);
  expect(await pixel(canvas, 50, 50)).toEqual([0, 0, 0, 255]);
  await expect(page.getByRole("button", { name: /Undo/ })).toBeDisabled();
});

test("ignores a canceled Source keyboard fill when its worker reply arrives", async ({ page }) => {
  await holdCanvasFills(page);
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
  const seed = await point(canvas, 50, 50);
  await page.mouse.move(seed.x, seed.y);
  await page.keyboard.press("7");
  await expect.poll(() => pixel(canvas, 50, 50)).toEqual([255, 255, 255, 255]);
  await page.getByRole("radio", { name: /Fill/ }).click();
  const center = await point(canvas, 160, 160);
  await page.mouse.move(center.x, center.y);
  await page.keyboard.press("5");
  await expect.poll(() => page.evaluate(() => (window as FillGateWindow).keyboardFillGate.requests.length)).toBe(1);
  await page.keyboard.press("6");
  expect(await page.evaluate(() => (window as FillGateWindow).keyboardFillGate.requests.length)).toBe(1);
  await page.keyboard.press("Escape");
  await page.evaluate(() => (window as FillGateWindow).keyboardFillGate.requests.splice(0).forEach((send) => send()));
  await expect.poll(() => page.evaluate(() => (window as FillGateWindow).keyboardFillGate.replies)).toBe(1);
  expect(await pixel(canvas, 160, 160)).toEqual([0, 0, 0, 255]);
  expect(await pixel(canvas, 50, 50)).toEqual([255, 255, 255, 255]);
  await page.keyboard.press("Control+z");
  await expect.poll(() => pixel(canvas, 50, 50)).toEqual([0, 0, 0, 255]);
  await expect(page.getByRole("button", { name: /Undo/ })).toBeDisabled();
});

test("cancels a Source keyboard shape when save confirmation opens", async ({ page }) => {
  const canvas = page.locator('#tabpanel-source canvas[role="application"]');
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
  await page.getByRole("radio", { name: /Line/ }).click();
  const start = await point(canvas, 100, 120);
  const end = await point(canvas, 200, 180);
  await page.mouse.move(start.x, start.y);
  await page.keyboard.down("2");
  await page.mouse.move(end.x, end.y);
  await expect.poll(() => pixel(canvas, 150, 150)).toEqual([73, 73, 73, 255]);
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.up("2");
  await expect.poll(() => pixel(canvas, 150, 150)).toEqual([0, 0, 0, 255]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Undo/ })).toBeDisabled();
});

test("cancels a pending Source keyboard fill when save confirmation opens", async ({ page }) => {
  await holdCanvasFills(page);
  const canvas = page.locator('#tabpanel-source canvas[role="application"]');
  await page.getByRole("radio", { name: /Fill/ }).click();
  const center = await point(canvas, 160, 160);
  await page.mouse.move(center.x, center.y);
  await page.keyboard.press("5");
  await expect.poll(() => page.evaluate(() => (window as FillGateWindow).keyboardFillGate.requests.length)).toBe(1);
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => (window as FillGateWindow).keyboardFillGate.requests.splice(0).forEach((send) => send()));
  await expect.poll(() => page.evaluate(() => (window as FillGateWindow).keyboardFillGate.replies)).toBe(1);
  expect(await pixel(canvas, 160, 160)).toEqual([0, 0, 0, 255]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Undo/ })).toBeDisabled();
});

test("cancels a Source keyboard shape for middle-button pan and releases pan normally", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
  await page.getByRole("radio", { name: /Line/ }).click();
  const start = await point(canvas, 100, 120);
  const end = await point(canvas, 200, 180);
  await page.mouse.move(start.x, start.y);
  await page.keyboard.down("2");
  await page.mouse.move(end.x, end.y);
  await expect.poll(() => pixel(canvas, 150, 150)).toEqual([73, 73, 73, 255]);
  const before = await canvas.evaluate((el) => (el as HTMLElement).style.transform);
  await page.mouse.click(end.x, end.y, { button: "middle" });
  await page.keyboard.up("2");
  await page.mouse.move(end.x + 25, end.y);
  expect(await canvas.evaluate((el) => (el as HTMLElement).style.transform)).toBe(before);
  expect(await pixel(canvas, 150, 150)).toEqual([0, 0, 0, 255]);
  await page.keyboard.press("b");
  const next = await point(canvas, 160, 160);
  await page.mouse.move(next.x, next.y);
  await page.keyboard.press("5");
  await expect.poll(() => pixel(canvas, 160, 160)).toEqual([182, 182, 182, 255]);
});

test.describe("keyboard drawing with touch", () => {
  test.use({ hasTouch: true });

  test("cancels a Source keyboard shape when a stationary touch contact starts", async ({ page }) => {
    const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
    await page.getByRole("slider", { name: "Brush size", exact: true }).fill("1");
    await page.getByRole("radio", { name: /Line/ }).click();
    const start = await point(canvas, 100, 120);
    const end = await point(canvas, 200, 180);
    await page.mouse.move(start.x, start.y);
    await page.keyboard.down("2");
    await page.mouse.move(end.x, end.y);
    await expect.poll(() => pixel(canvas, 150, 150)).toEqual([73, 73, 73, 255]);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: end.x, y: end.y }] });
    await page.keyboard.up("2");
    await expect.poll(() => pixel(canvas, 150, 150)).toEqual([0, 0, 0, 255]);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByRole("button", { name: /Undo/ })).toBeDisabled();
  });
});
