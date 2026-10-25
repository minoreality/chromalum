import { expect, test, type Locator, type Page } from "@playwright/test";

const STORAGE_KEY = "chromalum-flow-state-v1";
const LABELS = ["K", "B", "R", "M", "G", "C", "Y", "W"];
type SavedAutomata = {
  version: number;
  seed: number[];
  preset: string;
  rule: number | string;
  time: number;
  x: number;
  y: number;
  color: number;
};

async function openAutomata(page: Page, language: "en" | "ja" = "en") {
  await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#automata");
  await expect(page.getByTestId("automata-board")).toBeVisible();
  await expect(page.getByTestId("automata-board")).toHaveAttribute("data-columns", "49");
  await expect.poll(() => page.getByTestId("automata-board").getAttribute("width")).not.toBe("300");
}

async function savedState(page: Page): Promise<SavedAutomata> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
}

function palette(page: Page) {
  return page.locator(".automata-palette");
}

async function selectColor(page: Page, color: number) {
  await palette(page).getByRole("button").nth(color).click();
}

async function blank(page: Page) {
  await page.getByRole("combobox", { name: "Initial pattern", exact: true }).selectOption("black");
  await selectColor(page, 7);
}

async function point(page: Page, x: number, y: number) {
  const board = page.getByTestId("automata-board");
  await board.scrollIntoViewIfNeeded();
  const rect = await board.boundingBox();
  if (!rect) throw new Error("The Automata board must be visible");
  const width = Number(await board.getAttribute("data-columns")),
    height = Number(await board.getAttribute("data-rows"));
  return { x: rect.x + ((x + 0.5) * rect.width) / width, y: rect.y + ((y + 0.5) * rect.height) / height };
}

async function clickCell(page: Page, x: number, y: number) {
  const target = await point(page, x, y);
  await page.mouse.click(target.x, target.y);
}

async function stroke(page: Page, from: [number, number], to: [number, number]) {
  const a = await point(page, ...from),
    b = await point(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  // A single distant move exercises interpolation, not a trail of nearby events.
  await page.mouse.move(b.x, b.y);
  await page.mouse.up();
}

async function renderedCell(board: Locator, x: number, y: number) {
  return board.evaluate(
    (node, cell) => {
      const canvas = node as HTMLCanvasElement;
      const context = canvas.getContext("2d")!;
      return Array.from(
        context.getImageData(
          Math.floor(((cell.x + 0.5) * canvas.width) / Number(canvas.dataset.columns)),
          Math.floor(((cell.y + 0.5) * canvas.height) / Number(canvas.dataset.rows)),
          1,
          1,
        ).data,
      );
    },
    { x, y },
  );
}

async function readSavedRecord(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open("chromalum");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("state", "readonly");
          const get = tx.objectStore("state").get("current");
          get.onerror = () => reject(get.error);
          get.onsuccess = () => resolve(JSON.stringify(get.result ?? null));
          tx.oncomplete = () => db.close();
        };
      }),
  );
}

async function savedDrawing(page: Page) {
  const record = JSON.parse(await readSavedRecord(page)) as Record<string, unknown>;
  return Object.fromEntries(
    ["width", "height", "levelData", "pixelCandidateOverrideMap", "candidateIndexByLevel", "lockedLevels"].map((key) => [key, record[key]]),
  );
}

async function importImage(page: Page, width: number, height: number) {
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  await page.evaluate(() => Object.defineProperty(window, "showOpenFilePicker", { configurable: true, value: undefined }));
  const chosen = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open image file", exact: true }).click();
  await (
    await chosen
  ).setFiles({
    name: "flow-image.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="black"/><rect width="${Math.floor(width / 2)}" height="${Math.floor(height / 2)}" fill="white"/></svg>`,
    ),
  });
  await page.getByRole("dialog", { name: "Crop image" }).getByRole("button", { name: "OK", exact: true }).click();
  await page.getByRole("tab", { name: "Flow", exact: true }).click();
  await expect(page.getByTestId("automata-board")).toHaveAttribute("data-columns", "49");
  await expect(page.getByTestId("automata-board")).toHaveAttribute("data-rows", "49");
}

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 840, height: 720 },
  { width: 390, height: 844 },
]) {
  for (const [width, height] of [
    [80, 30],
    [30, 80],
    [1, 2048],
    [2, 2048],
  ]) {
    test("keeps Flow independent of a " + width + "x" + height + " Source import at " + viewport.width + "px", async ({ page }) => {
      await page.setViewportSize(viewport);
      await openAutomata(page);
      await blank(page);
      await selectColor(page, 3);
      await clickCell(page, 48, 48);
      await page.getByRole("slider").press("End");
      const edited = await savedState(page);
      const originalBox = (await page.getByTestId("automata-board").boundingBox())!;
      await importImage(page, width, height);
      const board = page.getByTestId("automata-board");
      await expect(board).toBeVisible();
      const box = (await board.boundingBox())!;
      expect(box.width / box.height).toBeCloseTo(1, 2);
      expect(box.width).toBeCloseTo(originalBox.width, 0);
      expect(box.height).toBeCloseTo(originalBox.height, 0);
      await expect(page.getByRole("slider")).toHaveValue("20");
      await expect(page.getByRole("button", { name: "Advance one step", exact: true })).toBeDisabled();
      await expect(page.getByRole("combobox", { name: "Initial pattern", exact: true }).getByRole("option")).toHaveCount(12);
      expect(await savedState(page)).toEqual(edited);
      await expect.poll(async () => JSON.parse(await readSavedRecord(page))?.width).toBe(width);
      const sourceRecord = await savedDrawing(page);
      await page.reload();
      await expect(board).toHaveAttribute("data-columns", "49");
      await expect(board).toHaveAttribute("data-rows", "49");
      await expect(page.getByRole("slider")).toHaveValue("20");
      expect(await savedState(page)).toEqual(edited);
      await page.getByRole("button", { name: "Return to initial pattern", exact: true }).click();
      expect((await savedState(page)).seed).toEqual(edited.seed);
      expect(await savedDrawing(page)).toEqual(sourceRecord);
      await board.press("ArrowRight");
      await board.press("ArrowDown");
      expect(await savedState(page)).toMatchObject({ x: 48, y: 48 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

test("opens the eighth tab directly with the complete native controls", async ({ page }) => {
  await openAutomata(page);
  await expect(page).toHaveTitle("CHROMALUM - Flow");
  await expect(page.getByRole("tab")).toHaveText(["Gallery", "Hex", "Source", "Glaze", "Map", "Theory", "Music", "Flow"]);
  await expect(page.getByRole("combobox")).toHaveCount(2);
  await expect(page.getByRole("combobox").nth(0).getByRole("option")).toHaveCount(8);
  await expect(page.getByRole("combobox").nth(1).getByRole("option")).toHaveCount(12);
  await expect(palette(page).getByRole("button")).toHaveText(LABELS);
  await expect(palette(page).getByRole("button").nth(4)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("automata-board")).toHaveCount(1);
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Return to initial pattern", exact: true })).toBeDisabled();
});

for (const viewport of [
  { width: 714, height: 668 },
  { width: 320, height: 900 },
]) {
  test(`opens both Automata selectors downward at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openAutomata(page);
    for (const [index, lastIndex, firstValue] of [
      [0, 7, "4"],
      [1, 11, "rosette"],
    ] as const) {
      const select = page.getByRole("combobox").nth(index);
      await select.selectOption({ index: lastIndex });
      await select.scrollIntoViewIfNeeded();
      await select.click();
      const option = select.getByRole("option", { selected: true });
      await expect(option).toBeVisible();
      const control = (await select.boundingBox())!;
      const selected = (await option.boundingBox())!;
      expect(selected.y).toBeGreaterThanOrEqual(control.y + control.height);
      expect(selected.y + selected.height).toBeLessThanOrEqual(viewport.height);
      await page.keyboard.press("Home");
      await page.keyboard.press("Enter");
      await expect(select).toHaveValue(firstValue);
      await expect.poll(() => select.evaluate((el) => el.matches(":open"))).toBe(false);
    }
  });
}

test("renders all eight colors, erases with K, and fills fast straight and diagonal strokes", async ({ page }) => {
  await openAutomata(page);
  await blank(page);
  const expected = new Array<number>(2401).fill(0);
  for (let color = 0; color < 8; color++) {
    await selectColor(page, color);
    await clickCell(page, 4 + 3 * color, 8);
    expected[8 * 49 + 4 + 3 * color] = color;
  }
  await selectColor(page, 7);
  await clickCell(page, 45, 5);
  await selectColor(page, 0);
  await clickCell(page, 45, 5);
  await clickCell(page, 45, 45); // Move the selection outline away from the sampled colors.
  const rgba = [
    [0, 0, 0, 255],
    [0, 0, 255, 255],
    [255, 0, 0, 255],
    [255, 0, 255, 255],
    [0, 255, 0, 255],
    [0, 255, 255, 255],
    [255, 255, 0, 255],
    [255, 255, 255, 255],
  ];
  for (let color = 0; color < 8; color++)
    expect(await renderedCell(page.getByTestId("automata-board"), 4 + 3 * color, 8)).toEqual(rgba[color]);
  await selectColor(page, 7);
  await stroke(page, [4, 12], [40, 12]);
  await stroke(page, [40, 15], [40, 40]);
  await stroke(page, [4, 16], [28, 40]);
  for (let x = 4; x <= 40; x++) expected[12 * 49 + x] = 7;
  for (let y = 15; y <= 40; y++) expected[y * 49 + 40] = 7;
  for (let i = 0; i <= 24; i++) expected[(16 + i) * 49 + 4 + i] = 7;
  expect((await savedState(page)).seed).toEqual(expected);
});

for (const width of [320, 1280]) {
  for (const dpr of [1, 1.25, 2]) {
    test.describe(`Automata pixel boundaries at ${width}px and DPR ${dpr}`, () => {
      test.use({ viewport: { width, height: 900 }, deviceScaleFactor: dpr });
      test("keeps every unselected pixel opaque and exact through selection and color changes", async ({ page }) => {
        await page.addInitScript((key) => {
          localStorage.setItem(
            key,
            JSON.stringify({ version: 1, seed: new Array(2401).fill(7), preset: "black", rule: 4, time: 0, x: 48, y: 48, color: 7 }),
          );
        }, STORAGE_KEY);
        await openAutomata(page);
        expect(await page.evaluate(() => window.devicePixelRatio)).toBe(dpr);
        const board = page.getByTestId("automata-board");
        const inspect = (value: number, x: number, y: number) =>
          board.evaluate(
            (node, expected) => {
              const canvas = node as HTMLCanvasElement;
              const { data, width, height } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
              // The contrasting selection outline is deliberate. Include all other cells and their boundaries.
              const left = Math.floor((expected.x * width) / 49) - 1,
                right = Math.ceil(((expected.x + 1) * width) / 49) + 1,
                top = Math.floor((expected.y * height) / 49) - 1,
                bottom = Math.ceil(((expected.y + 1) * height) / 49) + 1;
              for (let py = 0; py < height; py++) {
                for (let px = 0; px < width; px++) {
                  if (px >= left && px < right && py >= top && py < bottom) continue;
                  const i = (py * width + px) * 4;
                  if (data[i] !== expected.value || data[i + 1] !== expected.value || data[i + 2] !== expected.value || data[i + 3] !== 255)
                    return { x: px, y: py, rgba: Array.from(data.slice(i, i + 4)) };
                }
              }
              return null;
            },
            { value, x, y },
          );
        expect(await inspect(255, 48, 48)).toBeNull();
        await board.press("ArrowLeft");
        expect((await savedState(page)).seed).toEqual(new Array(2401).fill(7));
        expect(await inspect(255, 47, 48)).toBeNull();
        await page.getByRole("combobox", { name: "Initial pattern", exact: true }).selectOption("black");
        expect(await inspect(0, 24, 24)).toBeNull();
      });
    });
  }
}

test("keeps the edited seed through 0 → 1 → 20 → 0 and makes results read-only", async ({ page }) => {
  await openAutomata(page);
  await blank(page);
  await clickCell(page, 20, 20);
  const seed = (await savedState(page)).seed;
  await page.getByRole("button", { name: "Advance one step", exact: true }).click();
  await clickCell(page, 20, 20);
  await expect(page.getByTestId("automata-live")).toHaveText("Cell (20, 20): initial W White · GRB 111 → t=1 K Black · GRB 000");
  await stroke(page, [5, 5], [40, 40]);
  expect((await savedState(page)).seed).toEqual(seed);
  await page.getByRole("slider").press("End");
  await expect(page.getByRole("button", { name: "Advance one step", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Return to initial pattern", exact: true }).click();
  expect((await savedState(page)).seed).toEqual(seed);
  await expect(page.getByRole("slider")).toHaveValue("0");
  await page.getByRole("combobox", { name: "Rule", exact: true }).selectOption("life");
  await selectColor(page, 3);
  await page.getByRole("slider").press("End");
  await page.getByRole("combobox", { name: "Initial pattern", exact: true }).selectOption("white");
  expect(await savedState(page)).toMatchObject({ time: 0, x: 24, y: 24, rule: "life", color: 3 });
});

test("does not bridge outside excursions or resume after an outside release", async ({ page }) => {
  await openAutomata(page);
  await blank(page);
  const a = await point(page, 5, 15),
    b = await point(page, 10, 15),
    c = await point(page, 35, 15);
  const rect = (await page.getByTestId("automata-board").boundingBox())!;
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y);
  await page.mouse.move(rect.x + rect.width + 20, b.y);
  await page.mouse.move(c.x, c.y);
  await page.mouse.up();
  const expected = new Array<number>(2401).fill(0);
  for (let x = 5; x <= 10; x++) expected[15 * 49 + x] = 7;
  expected[15 * 49 + 35] = 7;
  expect((await savedState(page)).seed).toEqual(expected);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(rect.x - 20, a.y);
  await page.mouse.up();
  await page.mouse.move(b.x, b.y);
  expect((await savedState(page)).seed).toEqual(expected);
});

for (const interruption of ["tab", "rule", "color", "time", "blur", "resize"] as const) {
  test(`ends a held stroke on ${interruption} without resurrecting it`, async ({ page }) => {
    await openAutomata(page);
    await blank(page);
    const a = await point(page, 10, 10);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    if (interruption === "tab") {
      await page.keyboard.press("Alt+7");
      await expect(page.getByRole("tab", { name: "Music", exact: true })).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("Alt+8");
    } else if (interruption === "rule") await page.getByRole("combobox", { name: "Rule", exact: true }).selectOption("5");
    else if (interruption === "color") await palette(page).getByRole("button").nth(2).press("Space");
    else if (interruption === "time") {
      await page.getByRole("slider").press("End");
      await page.getByRole("slider").press("Home");
    } else if (interruption === "blur") await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    else await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("automata-board")).toBeVisible();
    const b = await point(page, 40, 40);
    await page.mouse.move(b.x, b.y);
    await page.mouse.up();
    await page.mouse.move(a.x, a.y);
    const expected = new Array<number>(2401).fill(0);
    expected[10 * 49 + 10] = 7;
    expect((await savedState(page)).seed).toEqual(expected);
  });
}

test("ends a held stroke when Help takes focus instead of painting behind the dialog", async ({ page }) => {
  await openAutomata(page);
  await blank(page);
  const a = await point(page, 10, 10),
    b = await point(page, 40, 40);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.keyboard.press("F1");
  await expect(page.getByRole("dialog", { name: "Keyboard Shortcuts", exact: true })).toBeVisible();
  await page.mouse.move(b.x, b.y);
  await page.mouse.up();
  await page.keyboard.press("Escape");
  const expected = new Array<number>(2401).fill(0);
  expected[10 * 49 + 10] = 7;
  expect((await savedState(page)).seed).toEqual(expected);
});

test("retains state after reload and language changes, independently of Source and Glaze", async ({ page }) => {
  await openAutomata(page);
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  const source = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await expect(source).toBeVisible();
  await expect.poll(async () => JSON.parse(await readSavedRecord(page))).not.toBeNull();
  const oldRevision = JSON.parse(await readSavedRecord(page)).revision;
  await page.getByRole("button", { name: "Level 2 Red", exact: true }).click();
  await source.click();
  await expect.poll(async () => JSON.parse(await readSavedRecord(page)).revision).toBeGreaterThan(oldRevision);
  const sourceRecord = await savedDrawing(page);
  await page.getByRole("tab", { name: "Flow", exact: true }).click();
  await blank(page);
  await clickCell(page, 12, 18);
  await page.getByRole("combobox", { name: "Rule", exact: true }).selectOption("diagonal-center");
  await page.getByRole("slider").press("End");
  const before = await savedState(page);
  await page.reload();
  await expect(page.getByTestId("automata-board")).toBeVisible();
  expect(await savedState(page)).toEqual(before);
  await page.getByRole("button", { name: "Switch to Japanese", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "規則", exact: true })).toHaveValue("diagonal-center");
  expect(await savedState(page)).toEqual(before);
  expect(await savedDrawing(page)).toEqual(sourceRecord);
  await page.getByRole("button", { name: "英語に切り替え", exact: true }).click();
  await page.getByRole("tab", { name: "Glaze", exact: true }).click();
  const glaze = page.getByRole("img", { name: "HUE GLAZE OVERLAY", exact: true });
  await expect(glaze).toBeVisible();
  await glaze.click();
  await page.getByRole("tab", { name: "Flow", exact: true }).click();
  expect((await savedState(page)).seed).toEqual(before.seed);
});

test("keeps edits across tabs when Automata storage is blocked", async ({ page }) => {
  await page.addInitScript((key) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Blocked test storage", "SecurityError");
      return setItem.call(this, name, value);
    };
  }, STORAGE_KEY);
  await openAutomata(page);
  await blank(page);
  await clickCell(page, 12, 18);
  await expect(page.locator(".automata-panel").getByRole("status")).toHaveText("Flow edits cannot be restored after reloading.");
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  await page.getByRole("tab", { name: "Flow", exact: true }).click();
  await expect(page.getByTestId("automata-live")).toHaveText("Cell (12, 18): initial W White · GRB 111 → t=0 W White · GRB 111");
  await page.getByRole("button", { name: "Advance one step", exact: true }).click();
  await page.getByRole("button", { name: "Return to initial pattern", exact: true }).click();
  await expect(page.getByTestId("automata-live")).toContainText("initial W White · GRB 111");
});

test("navigates all tabs and paints with the keyboard without leaking drawing keys", async ({ page }) => {
  await openAutomata(page);
  const tab = page.getByRole("tab", { name: "Flow", exact: true });
  await tab.press("Home");
  await expect(page.getByRole("tab", { name: "Gallery", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(tab).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Gallery", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(tab).toBeFocused();
  await page.keyboard.press("Enter");
  await blank(page);
  await palette(page).getByRole("button").last().focus();
  await page.keyboard.press("Space");
  await tab.focus();
  await page.keyboard.press("Tab");
  const board = page.getByTestId("automata-board");
  await expect(board).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  expect(await savedState(page)).toMatchObject({ x: 25, y: 25, color: 7 });
  expect((await savedState(page)).seed[25 * 49 + 25]).toBe(7);
  for (let i = 0; i < 50; i++) await page.keyboard.press("ArrowRight");
  for (let i = 0; i < 50; i++) await page.keyboard.press("ArrowDown");
  expect(await savedState(page)).toMatchObject({ x: 48, y: 48 });
  for (let color = 0; color < 8; color++) {
    await page.keyboard.press("Tab");
    await expect(palette(page).getByRole("button").nth(color)).toBeFocused();
  }
  for (const name of ["Rule", "Initial pattern"]) {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("combobox", { name, exact: true })).toBeFocused();
  }
  await page.keyboard.press("Tab");
  await expect(page.getByRole("slider")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Advance one step", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("slider")).toHaveValue("1");
  await page.keyboard.press("Alt+3");
  await expect(page).toHaveURL(/#source$/);
  await page.keyboard.press("Alt+8");
  await expect(page).toHaveURL(/#automata$/);
  await page.goBack();
  await expect(page).toHaveURL(/#source$/);
  await page.goForward();
  await expect(page).toHaveURL(/#automata$/);
});

test.describe("native touch", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("interpolates a touch owner and ignores a second finger's release", async ({ page, context }) => {
    await openAutomata(page);
    await blank(page);
    const a = await point(page, 5, 10),
      b = await point(page, 40, 10),
      c = await point(page, 40, 30);
    const cdp = await context.newCDPSession(page);
    const touch = (id: number, p: { x: number; y: number }) => ({ id, ...p, radiusX: 1, radiusY: 1, force: 1 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch(1, a)] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [touch(1, b)] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch(1, b), touch(2, c)] });
    // Removing only the second point generates its pointerup. touchEnd ends all contacts.
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [touch(1, b)] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [touch(1, c)] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const expected = new Array<number>(2401).fill(0);
    for (let x = 5; x <= 40; x++) expected[10 * 49 + x] = 7;
    for (let y = 10; y <= 30; y++) expected[y * 49 + 40] = 7;
    expect((await savedState(page)).seed).toEqual(expected);
    await cdp.detach();
  });

  test("draws a fast diagonal and restarts after reentering from outside", async ({ page, context }) => {
    await openAutomata(page);
    await blank(page);
    const a = await point(page, 5, 5),
      b = await point(page, 20, 20),
      c = await point(page, 35, 35);
    const rect = (await page.getByTestId("automata-board").boundingBox())!;
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, ...a }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ id: 1, ...b }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ id: 1, x: rect.x + rect.width + 10, y: b.y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ id: 1, ...c }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const expected = new Array<number>(2401).fill(0);
    for (let i = 5; i <= 20; i++) expected[i * 49 + i] = 7;
    expected[35 * 49 + 35] = 7;
    expect((await savedState(page)).seed).toEqual(expected);
    await cdp.detach();
  });

  test("ends on touchcancel and permits scrolling outside the board", async ({ page, context }) => {
    await openAutomata(page);
    await blank(page);
    const a = await point(page, 5, 10);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, ...a }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    const seed = (await savedState(page)).seed;
    await page.mouse.move(a.x + 60, a.y + 60);
    expect((await savedState(page)).seed).toEqual(seed);
    await page.evaluate(() => window.scrollTo(0, 0));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 3, x: 4, y: 600 }] });
    for (const y of [580, 550, 510, 460, 400, 300])
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ id: 3, x: 4, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await cdp.detach();
  });
});

async function rectangles(page: Page) {
  return page.evaluate(() =>
    [".automata-controls", ".automata-palette", ".automata-board", ".automata-notice-space"].map((selector) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
    }),
  );
}

for (const language of ["ja", "en"] as const) {
  for (const viewport of [
    { width: 1280, height: 900, paletteRows: 1, controlRows: 1 },
    { width: 682, height: 668, paletteRows: 1, controlRows: 1 },
    { width: 390, height: 844, paletteRows: 2, controlRows: 2 },
    { width: 320, height: 900, paletteRows: 2, controlRows: 2 },
  ]) {
    for (const wideGlyphs of [false, true]) {
      test(`keeps ${language} Automata geometry stable at ${viewport.width}px${wideGlyphs ? " with MS Gothic" : ""}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openAutomata(page, language);
        if (wideGlyphs)
          await page.addStyleTag({ content: '.automata-panel *, .app-tab-label { font-family: "MS Gothic", monospace !important; }' });
        const board = page.getByTestId("automata-board");
        const placement = await board.evaluate((node) => {
          const box = node.getBoundingClientRect();
          return { x: box.x + scrollX, y: box.y + scrollY, width: box.width };
        });
        for (const tab of ["Hex", "Source", "Glaze", "Map"]) {
          await page.getByRole("tab", { name: tab, exact: true }).click();
          const canvas = page.getByRole("tabpanel", { name: tab, exact: true }).locator("canvas").first();
          await expect(canvas).toBeVisible();
          const reference = await canvas.evaluate((node) => {
            const box = node.getBoundingClientRect();
            return { x: box.x + scrollX, y: box.y + scrollY, width: box.width };
          });
          expect(placement.x, `${tab} canvas left`).toBeCloseTo(reference.x, 2);
          expect(placement.y, `${tab} canvas top`).toBeCloseTo(reference.y, 2);
          expect(placement.width, `${tab} canvas width`).toBeCloseTo(reference.width, 2);
        }
        await page.getByRole("tab", { name: "Flow", exact: true }).click();
        await clickCell(page, 48, 48);
        await selectColor(page, 3);
        const before = await rectangles(page);
        const step = page.getByRole("button", { name: language === "ja" ? "1ステップ進む" : "Advance one step", exact: true });
        const reset = page.getByRole("button", { name: language === "ja" ? "初期配置に戻る" : "Return to initial pattern", exact: true });
        await step.click();
        expect(await rectangles(page)).toEqual(before);
        await page.getByRole("slider").press("End");
        expect(await rectangles(page)).toEqual(before);
        await reset.click();
        expect(await rectangles(page)).toEqual(before);
        await expect(board).toHaveCount(1);
        const buttons = await palette(page)
          .getByRole("button")
          .evaluateAll((elements) =>
            elements.map((el) => {
              const r = el.getBoundingClientRect();
              return { x: r.x, y: r.y, width: r.width, height: r.height };
            }),
          );
        expect(new Set(buttons.map((r) => r.y)).size).toBe(viewport.paletteRows);
        for (const button of buttons) {
          expect(button.width).toBeGreaterThanOrEqual(36);
          expect(button.height).toBeGreaterThanOrEqual(36);
        }
        const controlRows = await page.getByRole("combobox").evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().y));
        expect(new Set(controlRows).size).toBe(viewport.controlRows);
        for (const [control, count] of [
          [0, 8],
          [1, 12],
        ]) {
          for (let i = 0; i < count; i++) {
            await page.getByRole("combobox").nth(control).selectOption({ index: i });
            const fits = await page
              .getByRole("combobox")
              .nth(control)
              .evaluate((node) => {
                const select = node as HTMLSelectElement;
                const label = select.querySelector("button > span")!;
                const range = document.createRange();
                range.selectNodeContents(label);
                const text = range.getBoundingClientRect();
                const bounds = select.getBoundingClientRect();
                return {
                  text: select.selectedOptions[0].text,
                  label: label.textContent,
                  fits: text.left >= bounds.left && text.right <= bounds.right && text.top >= bounds.top && text.bottom <= bounds.bottom,
                };
              });
            expect(fits.label).toBe(fits.text);
            expect(fits.fits, fits.text).toBe(true);
          }
        }
        const nav = await page.getByRole("tab").evaluateAll((tabs) =>
          tabs.map((tab) => {
            const box = tab.getBoundingClientRect();
            const label = tab.querySelector("span")!;
            const range = document.createRange();
            range.selectNodeContents(label);
            const text = range.getBoundingClientRect();
            return {
              height: box.height,
              lines: range.getClientRects().length,
              fits: text.left >= box.left && text.right <= box.right && text.top >= box.top && text.bottom <= box.bottom,
            };
          }),
        );
        expect(new Set(nav.map((tab) => tab.height)).size).toBe(1);
        expect(nav.every((tab) => tab.fits)).toBe(true);
        expect(nav.at(-1)?.lines).toBe(1);
        if (viewport.width === 1280) expect(nav.map((tab) => tab.lines)).toEqual(new Array(8).fill(1));
        const navigationHeight = (await page
          .getByRole("tablist", { name: language === "ja" ? "メインナビゲーション" : "Main navigation" })
          .boundingBox())!.height;
        for (const label of ["Gallery", "Hex", "Source", "Glaze", "Map", "Theory", "Music", "Flow"]) {
          await page.getByRole("tab", { name: label, exact: true }).click();
          const navigation = page.getByRole("tablist", { name: language === "ja" ? "メインナビゲーション" : "Main navigation" });
          expect((await navigation.boundingBox())!.height, `${label} navigation height`).toBe(navigationHeight);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      });
    }
  }
}
