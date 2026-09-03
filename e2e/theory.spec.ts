import { expect, test } from "@playwright/test";

test("opens the Theory tab and renders the main sections", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "Theory" }).click();

  await expect(page.getByRole("heading", { name: /Discrete Algebraic Color Theory|離散代数的色彩理論/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Binary Levels|バイナリレベル/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Color Cube|カラーキューブ/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Hamming Code|ハミング符号/ })).toBeVisible();
});

test("opens the Theory tab directly from the URL hash", async ({ page }) => {
  await page.goto("/#theory");

  await expect(page.getByRole("tab", { name: /Theory/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: /Discrete Algebraic Color Theory|離散代数的色彩理論/ })).toBeVisible();
});

test("uses a wider reading measure on desktop without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#theory");

  const metrics = await page.locator(".theory-container").evaluate((container) => {
    const paragraph = container.querySelector<HTMLElement>(".theory-desc");
    const zigzagBlock = container.querySelector<HTMLElement>(".theory-zigzag-block");
    const zigzagSvg = zigzagBlock?.querySelector<SVGElement>(".theory-zigzag-svg");
    const zigzagTableWrap = zigzagBlock?.querySelector<HTMLElement>(".theory-zigzag-table-wrap");
    if (!paragraph) throw new Error("Theory paragraph not found");
    if (!zigzagBlock || !zigzagSvg || !zigzagTableWrap) throw new Error("Tone zigzag figure not found");

    return {
      containerWidth: container.getBoundingClientRect().width,
      paragraphWidth: paragraph.getBoundingClientRect().width,
      zigzagBlockWidth: zigzagBlock.getBoundingClientRect().width,
      zigzagSvgWidth: zigzagSvg.getBoundingClientRect().width,
      zigzagTableWrapWidth: zigzagTableWrap.getBoundingClientRect().width,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.containerWidth).toBeGreaterThanOrEqual(890);
  expect(metrics.paragraphWidth).toBeGreaterThanOrEqual(750);
  expect(metrics.paragraphWidth).toBeLessThanOrEqual(770);
  expect(metrics.zigzagBlockWidth).toBeGreaterThanOrEqual(690);
  expect(metrics.zigzagBlockWidth).toBeLessThanOrEqual(710);
  expect(metrics.zigzagSvgWidth).toBeLessThanOrEqual(710);
  expect(metrics.zigzagTableWrapWidth).toBeLessThanOrEqual(710);
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
});

test("links direct graph hover to the tone level while keeping all eight buttons", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#theory");

  const graphLevelFour = page.locator("[data-tone-level-hover='4']");
  const plottedLevelFour = page.locator("[data-tone-level='4'] line");

  await expect(page.locator("[data-tone-level-control]")).toHaveCount(8);
  await graphLevelFour.hover();
  await expect(page.locator("[data-active-fiber='4']")).toBeVisible();
  await expect(plottedLevelFour).toHaveAttribute("stroke-width", "1.8");

  await page.getByRole("heading", { name: /Discrete Algebraic Color Theory|離散代数的色彩理論/ }).hover();
  await expect(page.locator("[data-active-fiber]")).toHaveCount(0);
  await expect(plottedLevelFour).toHaveAttribute("stroke-width", "0.6");
});

test("keeps the English Theory title on one line on narrow mobile viewports", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("chromalum_lang", "en");
  });
  await page.goto("/#theory");

  const title = page.getByRole("heading", { name: "Discrete Algebraic Color Theory" });
  await expect(title).toBeVisible();

  const metrics = await title.evaluate((node) => {
    const el = node as HTMLElement;
    const style = window.getComputedStyle(el);
    return {
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      whiteSpace: style.whiteSpace,
    };
  });

  expect(metrics.whiteSpace).toBe("nowrap");
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
});
