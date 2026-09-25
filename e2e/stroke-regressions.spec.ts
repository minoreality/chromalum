import { expect, test, type Locator } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1100 });
});

const canvasImage = (canvas: Locator) => canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());

type FillGateWindow = typeof window & { fillGate: { hold: boolean; requests: (() => void)[]; replies: number } };

for (const tab of ["Source", "Glaze"] as const) {
  for (const outcome of ["unchanged", "error"] as const) {
    test(`initializes Hex while a ${tab} fill awaits an ${outcome} reply`, async ({ page }) => {
      await page.addInitScript((outcome) => {
        const gate = { hold: false, requests: [] as (() => void)[], replies: 0 };
        (window as FillGateWindow).fillGate = gate;
        const postMessage = Worker.prototype.postMessage;
        Worker.prototype.postMessage = function (message: { kind?: string }, options?: Transferable[] | StructuredSerializeOptions) {
          if (!gate.hold || (message.kind !== "canvas" && message.kind !== "glaze")) {
            Reflect.apply(postMessage, this, [message, options]);
            return;
          }
          gate.requests.push(() => {
            if (outcome === "error") {
              this.dispatchEvent(new ErrorEvent("error", { message: "delayed fill failure" }));
              gate.replies++;
            } else {
              this.addEventListener("message", () => gate.replies++, { once: true });
              Reflect.apply(postMessage, this, [message, options]);
            }
          });
        };
      }, outcome);
      await page.goto("./#source");
      await page.getByRole("button", { name: "Level 2 Red", exact: true }).click();
      await page.getByRole("radio", { name: /Fill/ }).click();
      await page.getByRole("application", { name: "Drawing canvas (grayscale)" }).click();
      await expect(page.getByRole("button", { name: /Undo/ })).toBeEnabled();
      await page.getByRole("tab", { name: tab, exact: true }).click();
      const canvas = page.locator('[role="tabpanel"]:visible .canvas-workspace canvas').first();
      if (tab === "Glaze") {
        await page.getByRole("slider", { name: "Hue angle (0-359 degrees)", exact: true }).fill("225");
        await page.getByRole("radio", { name: /Fill/ }).click();
        const before = await canvasImage(canvas);
        await canvas.click();
        await expect.poll(() => canvasImage(canvas)).not.toBe(before);
      }
      await page.getByRole("tab", { name: "Hex", exact: true }).click();
      const hexCanvas = page.getByRole("img", { name: "Color preview canvas", exact: true });
      const committed = await canvasImage(hexCanvas);
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await page.evaluate(() => ((window as FillGateWindow).fillGate.hold = true));
      await canvas.click();
      expect(await page.evaluate(() => (window as FillGateWindow).fillGate.requests.length)).toBe(1);
      await page.keyboard.press("Alt+2");
      await expect
        .poll(() => hexCanvas.evaluate((el) => [(el as HTMLCanvasElement).width, (el as HTMLCanvasElement).height]), { timeout: 2000 })
        .toEqual([320, 320]);
      expect(await canvasImage(hexCanvas)).toBe(committed);
      await page.evaluate(() => (window as FillGateWindow).fillGate.requests.splice(0).forEach((send) => send()));
      await expect.poll(() => page.evaluate(() => (window as FillGateWindow).fillGate.replies)).toBe(1);
      expect(await canvasImage(hexCanvas)).toBe(committed);
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await page.keyboard.press("Control+z");
      await expect(page.getByRole("button", { name: /Redo/ })).toBeEnabled();
    });
  }
}

for (const tab of ["Source", "Color", "Glaze"] as const) {
  test(`commits an interrupted ${tab} stroke before switching tabs`, async ({ page }) => {
    await page.goto("./#source");
    await page.getByRole("button", { name: "Level 2 Red", exact: true }).click();
    await page.getByRole("radio", { name: /Fill/ }).click();
    await page.getByRole("application", { name: "Drawing canvas (grayscale)" }).click();
    await page.getByRole("radio", { name: /Brush/ }).click();
    await page.getByRole("button", { name: "Level 5 Cyan", exact: true }).click();
    await page.getByRole("tab", { name: tab, exact: true }).click();
    if (tab === "Glaze") await page.getByRole("slider", { name: "Hue angle (0-359 degrees)", exact: true }).fill("225");
    const canvas = page.locator('[role="tabpanel"]:visible .canvas-workspace canvas').first();
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas is not visible");
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4);
    const beforeStroke = await canvasImage(canvas);

    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.4);
    await page.keyboard.press("Alt+2");
    const hexCanvas = page.getByRole("img", { name: "Color preview canvas", exact: true });
    await expect
      .poll(() => hexCanvas.evaluate((el) => [(el as HTMLCanvasElement).width, (el as HTMLCanvasElement).height]))
      .toEqual([320, 320]);
    await page.mouse.move(5, 5);
    await page.mouse.up();
    await page.keyboard.press(tab === "Source" ? "Alt+3" : tab === "Color" ? "Alt+4" : "Alt+5");
    await expect.poll(() => canvasImage(canvas)).not.toBe(beforeStroke);
    const completedStroke = await canvasImage(canvas);
    const nextBox = await canvas.boundingBox();
    if (!nextBox) throw new Error("Canvas is not visible");
    await page.mouse.move(nextBox.x + nextBox.width * 0.15, nextBox.y + nextBox.height * 0.2);
    await page.mouse.move(nextBox.x + nextBox.width * 0.8, nextBox.y + nextBox.height * 0.8);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(await canvasImage(canvas)).toBe(completedStroke);
    await page.keyboard.press("Control+z");
    await expect.poll(() => canvasImage(canvas)).toBe(beforeStroke);
  });
}
