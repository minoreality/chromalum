import { devices, expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SAVED_STATE_VERSION } from "../src/utils/idb-persistence";

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

async function seedInvalidSavedRecord(page: Page, kind: "unsupported" | "malformed" | "null"): Promise<string> {
  // Populate this test's database on an inert same-origin page before the app mounts.
  await page.route("**/persistence-seed", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Seed</title>" }),
  );
  await page.goto("persistence-seed");
  return page.evaluate(
    ({ kind, version }) =>
      new Promise<string>((resolve, reject) => {
        const record =
          kind === "null"
            ? null
            : {
                version: kind === "unsupported" ? version + 1 : version,
                revision: kind === "unsupported" ? 7 : 0,
                width: kind === "malformed" ? 9 : 8,
                height: 8,
                levelData: new Uint8Array(64).fill(2),
                candidateIndexByLevel: new Array<number>(8).fill(0),
              };
        const openRequest = indexedDB.open("chromalum", 2);
        openRequest.onupgradeneeded = () => openRequest.result.createObjectStore("state");
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const db = openRequest.result;
          const tx = db.transaction("state", "readwrite");
          tx.objectStore("state").put(record, "current");
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
          tx.oncomplete = () => {
            db.close();
            resolve(JSON.stringify(record));
          };
        };
      }),
    { kind, version: SAVED_STATE_VERSION },
  );
}

async function readSavedRecord(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const openRequest = indexedDB.open("chromalum");
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const db = openRequest.result;
          const tx = db.transaction("state", "readonly");
          const getRequest = tx.objectStore("state").get("current");
          getRequest.onerror = () => reject(getRequest.error);
          getRequest.onsuccess = () => resolve(JSON.stringify(getRequest.result));
          tx.oncomplete = () => db.close();
        };
      }),
  );
}

async function expectReadableToast(page: Page, name: RegExp) {
  const toast = page.getByRole("alert", { name });
  await toast.evaluate((node) => Promise.all(node.getAnimations().map((animation) => animation.finished)));
  const bounds = await toast.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewport: innerWidth,
      clippedText: [...node.querySelectorAll("span")].some((span) => span.scrollWidth > span.clientWidth),
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
  expect(bounds.clippedText).toBe(false);
  const accessibility = await new AxeBuilder({ page }).include('[role="alert"]').analyze();
  expect(accessibility.violations).toEqual([]);
}

async function readRecoveryArchives(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const request = indexedDB.open("chromalum");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("state", "readonly");
          const cursor = tx.objectStore("state").openCursor();
          const archives: string[] = [];
          cursor.onsuccess = () => {
            if (!cursor.result) return;
            if (String(cursor.result.key).startsWith("recovery:")) archives.push(JSON.stringify(cursor.result.value.value));
            cursor.result.continue();
          };
          tx.oncomplete = () => {
            db.close();
            resolve(archives);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
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
  const canvas = stalePage.getByRole("application", { name: "Drawing canvas (grayscale)" });
  const before = await canvas.boundingBox();
  if (!before) throw new Error("Canvas is not visible");
  await stalePage.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await stalePage.mouse.down();
  const notice = stalePage.getByRole("alert", { name: /^Auto-save off/ });
  await expect(notice).toContainText("Saved data changed in another tab");
  // A delayed conflict must not move the canvas beneath an active brush stroke.
  expect(await canvas.boundingBox()).toEqual(before);
  await stalePage.mouse.move(before.x + before.width / 2 + 2, before.y + before.height / 2);
  await stalePage.mouse.up();
  await expect(notice).toHaveCount(0);
  await createCanvas(stalePage, 32);
  await stalePage.waitForTimeout(1300);
  await expect(notice).toHaveCount(0);
  await expect.poll(() => readSavedCanvas(page)).toMatchObject({ width: 8, height: 8, revision: 2 });
  await stalePage.close();
});

for (const kind of ["unsupported", "malformed", "null"] as const) {
  test(`recovers autosave by archiving ${kind} data and keeping the current canvas`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const original = await seedInvalidSavedRecord(page, kind);
    await gotoSource(page);
    const status = page.getByRole("button", { name: "Auto-save off", exact: true });
    await expect(status).toBeVisible();
    await createCanvas(page, 8);
    const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
    await drawAtCenter(page, canvas);
    await expect.poll(() => canvasPixel(canvas, 4, 4)).toEqual([255, 255, 255, 255]);
    await status.click();
    const dialog = page.getByRole("dialog", { name: "Auto-save off", exact: true });
    await expect(dialog).toContainText("Keep the unreadable saved data separately in this browser");
    await page.keyboard.press("Escape");
    await expect(status).toBeFocused();
    expect(await readSavedRecord(page)).toBe(original);
    expect(await readRecoveryArchives(page)).toEqual([]);
    await status.click();

    if (kind === "malformed") {
      // Fail the backup write once, then verify both preservation and an explicit retry.
      await page.evaluate(() => {
        const originalAdd = IDBObjectStore.prototype.add;
        IDBObjectStore.prototype.add = function (value: unknown, key?: IDBValidKey) {
          if (typeof key === "string" && key.startsWith("recovery:")) {
            IDBObjectStore.prototype.add = originalAdd;
            throw new DOMException("Synthetic quota exhaustion", "QuotaExceededError");
          }
          return originalAdd.call(this, value, key);
        };
      });
      await dialog.getByRole("button", { name: "Archive original and resume saving" }).click();
      await expect(dialog.getByRole("alert")).toContainText("Could not resume saving");
      expect(await readSavedRecord(page)).toBe(original);
      expect(await readRecoveryArchives(page)).toEqual([]);
      await expect(status).toBeVisible();
    }

    await dialog.getByRole("button", { name: "Archive original and resume saving" }).click();
    await expect(status).toHaveCount(0);
    await expect(dialog).toHaveCount(0);
    await expect.poll(() => readSavedCanvas(page)).toMatchObject({ width: 8, height: 8, revision: kind === "unsupported" ? 8 : 1 });
    expect(await readRecoveryArchives(page)).toEqual([original]);
    await page.reload();
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvasPixel(canvas, 4, 4)).toEqual([255, 255, 255, 255]);
    await expect(status).toHaveCount(0);
    await createCanvas(page, 16);
    await expect.poll(() => readSavedCanvas(page)).toMatchObject({ width: 16, height: 16, revision: kind === "unsupported" ? 9 : 2 });
    expect(await readRecoveryArchives(page)).toEqual([original]);
  });

  test(`preserves ${kind} saved data while editing and exporting with autosave off`, async ({ page }) => {
    await page.setViewportSize(kind === "malformed" ? { width: 320, height: 800 } : { width: 1280, height: 900 });
    const savedRecord = await seedInvalidSavedRecord(page, kind);
    await gotoSource(page);

    const notice = page.getByRole("alert", { name: /^Auto-save off/ });
    await expect(notice).toContainText("Invalid or unsupported data");
    await expect(notice).toContainText("Edits are unsaved.");
    await expectReadableToast(page, /^Auto-save off/);
    await expect(notice).toHaveCount(0);

    const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
    await drawAtCenter(page, canvas);
    await expect.poll(() => canvasPixel(canvas, 160, 160)).toEqual([255, 255, 255, 255]);
    await page.getByRole("tab", { name: "Color" }).click();
    await expect(notice).toHaveCount(0);
    await page.getByRole("tab", { name: "Source" }).click();

    await page.getByRole("button", { name: /Save Gray/ }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("dialog", { name: "Save grayscale image?" }).getByRole("button", { name: "Yes" }).click();
    await expect((await downloadPromise).suggestedFilename()).toMatch(/^chromalum_gray_.+\.png$/);

    await page.waitForTimeout(1300);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    expect(await readSavedRecord(page)).toBe(savedRecord);
    await page.reload();
    await expect(notice).toBeVisible();
    expect(await readSavedRecord(page)).toBe(savedRecord);

    if (kind === "malformed") {
      await page.getByRole("button", { name: "Switch to Japanese" }).click();
      // A fresh tab reads the selected language without this page's English init script.
      const japanesePage = await page.context().newPage();
      await japanesePage.setViewportSize({ width: 320, height: 800 });
      await gotoSource(japanesePage);
      const japaneseToast = japanesePage.getByRole("alert", { name: /^自動保存停止/ });
      await expect(japaneseToast).toContainText("変更は未保存です。");
      const phraseLineCounts = () =>
        japaneseToast.evaluate((node) => {
          return ["未対応です。", "未保存です。", "書き出してください。"].map((phrase) => {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            for (let text = walker.nextNode(); text; text = walker.nextNode()) {
              const start = text.textContent?.indexOf(phrase) ?? -1;
              if (start < 0) continue;
              const range = document.createRange();
              range.setStart(text, start);
              range.setEnd(text, start + phrase.length);
              return new Set([...range.getClientRects()].map((rect) => rect.top)).size;
            }
            return 0;
          });
        });
      expect(await phraseLineCounts()).toEqual([1, 1, 1]);
      await japaneseToast.evaluate((node) => {
        node.style.fontFamily = '"MS Gothic", monospace';
      });
      expect(await phraseLineCounts()).toEqual([1, 1, 1]);
      await expectReadableToast(japanesePage, /^自動保存停止/);
      await japanesePage.close();
    }
  });
}

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

  const hexPreview = page.getByRole("img", { name: "Color preview canvas" });
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
  await expect(page.getByRole("radio", { name: "Chromatic" })).toHaveAttribute("aria-checked", "true");
});

test("keeps the Magma tone map and omits the GRB code-score mode", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Map" }).click();

  await expect(page.getByRole("button", { name: "Tone", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "GRB Code Score", exact: true })).toHaveCount(0);
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

  /**
   * The Hex diagram's pin, driven by real touch. A pin is placed by a long press
   * where there is no right button, and the timer that stands in for one only
   * runs for a pointer the browser calls a touch - so a synthesized pointer event
   * cannot tell us whether the gesture works, and neither can a mouse.
   */
  async function gotoHexWithLevel2(page: Page) {
    await gotoSource(page);
    // A pin only holds a level the canvas uses, so level 2 has to be on it.
    await selectLevel(page, 2, "Red");
    await drawAtCenter(page, page.getByRole("application", { name: "Drawing canvas (grayscale)" }));
    await page.getByRole("tab", { name: "Hex" }).click();
    const diagram = page.getByRole("group", { name: "Pure-hue loop color selection" });
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toBeVisible();
    return diagram;
  }

  /** A dot's own circle is the last one in its group, after any rings. */
  const dotCentre = (dot: Locator) =>
    dot.evaluate((g) => {
      const circles = [...g.querySelectorAll("circle")];
      const box = circles[circles.length - 1].getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });

  const selectedDot = (diagram: Locator, level: number) => diagram.locator(`g[data-lv="${level}"][aria-pressed="true"]`);
  const looseDot = (diagram: Locator, level: number, nth = 0) => diagram.locator(`g[data-lv="${level}"][aria-pressed="false"]`).nth(nth);
  const selectedRingDash = (diagram: Locator, level: number) =>
    selectedDot(diagram, level).locator(".hex-dot-selected-ring").getAttribute("stroke-dasharray");

  test("pins a Hex level with a long press and releases it with another", async ({ page, context }) => {
    const diagram = await gotoHexWithLevel2(page);
    const client = await context.newCDPSession(page);
    const press = async (at: { x: number; y: number }, holdMs: number) => {
      await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at] });
      await page.waitForTimeout(holdMs);
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(150);
    };

    const target = looseDot(diagram, 2);
    const targetLabel = await target.getAttribute("aria-label");
    await press(await dotCentre(target), 700);

    // The press both selects the dot and holds the level there.
    const pinned = selectedDot(diagram, 2);
    await expect(pinned).toHaveAttribute("aria-label", targetLabel!);
    // Pinned reads as a solid ring; merely selected keeps the dashes.
    expect(await selectedRingDash(diagram, 2)).toBeNull();

    // What the pin means: a tap on another of the level's dots does nothing.
    const other = looseDot(diagram, 2);
    await press(await dotCentre(other), 60);
    await expect(selectedDot(diagram, 2)).toHaveAttribute("aria-label", targetLabel!);

    // The same dot again releases it.
    await press(await dotCentre(pinned), 700);
    expect(await selectedRingDash(diagram, 2)).toBe("2,2");

    // ...and the level answers to a tap once more.
    const freed = looseDot(diagram, 2);
    const freedLabel = await freed.getAttribute("aria-label");
    await press(await dotCentre(freed), 60);
    await expect(selectedDot(diagram, 2)).toHaveAttribute("aria-label", freedLabel!);
  });

  test("reads a press that wanders as a scroll rather than a pin", async ({ page, context }) => {
    const diagram = await gotoHexWithLevel2(page);
    const client = await context.newCDPSession(page);
    const start = await dotCentre(looseDot(diagram, 2));

    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    // Sideways, past LONG_PRESS_SLOP_PX but still inside the dot, and well
    // before the timer is due. The other two ways a press can end would
    // otherwise answer first and prove nothing: a downward wander is taken as a
    // scroll and cancels the pointer, and a wander past the dot's 15.7px hit
    // radius raises pointerleave. Between 10 and 15.7 the slop check is the
    // only guard there is.
    for (const dx of [4, 8, 11, 13]) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x + dx, y: start.y }] });
    }
    await page.waitForTimeout(700);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(150);

    expect(await selectedRingDash(diagram, 2)).toBe("2,2");
  });

  /**
   * The hue wheel under a finger. Real touch input, so the browser's own gesture
   * arbitration decides whether the figure or the page gets the movement — the
   * one thing a synthesized pointer event cannot tell us.
   */
  async function openWheel(page: Page) {
    await page.goto("/");
    await page.getByRole("tab", { name: "Music" }).click();
    const figure = page.locator(".linked-viz-root svg").first();
    await figure.scrollIntoViewIfNeeded();
    await expect(figure).toBeVisible();
    await page.evaluate(() => {
      (window as unknown as { __cancels: number }).__cancels = 0;
      document
        .querySelector(".linked-viz-root svg")!
        .addEventListener("pointercancel", () => (window as unknown as { __cancels: number }).__cancels++, { capture: true });
    });
    return figure;
  }

  /**
   * The wheel's own hit area: the transparent disc that is a direct child of the
   * grabbable group. The dots carry transparent circles of their own, so a
   * plainer selector picks one of those and every drag reads as a few pixels
   * around the wrong centre.
   */
  const wheelCentre = (figure: Locator) =>
    figure.evaluate((svg) => {
      const box = svg.querySelector('g[style*="grab"] > circle[fill="transparent"]')!.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2, r: box.width / 2 };
    });

  const alphaReadout = async (page: Page) => Number(await page.getByRole("slider", { name: "Hue phase", exact: true }).inputValue());
  const cancels = (page: Page) => page.evaluate(() => (window as unknown as { __cancels: number }).__cancels);
  /** Shortest signed distance from `from` to `to` on the circle. */
  const turnedBy = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;
  /** How far each dispatched touch moves along the rim. */
  const STEP_DEG = 15;

  /**
   * A flick: a short sweep along the rim that lifts while still moving. Driven
   * from inside the page, a frame apart, because what a coast answers to is the
   * gap between the last move and the lift - and over CDP that gap is round-trip
   * latency, which drifted to 137ms here and read, correctly, as a finger that
   * had already stopped.
   */
  async function flick(page: Page, wheel: { x: number; y: number; r: number }) {
    await page.evaluate(
      async ({ cx, cy, r }) => {
        const svg = document.querySelector(".linked-viz-root svg")!;
        const grab = svg.querySelector('g[style*="grab"]')!;
        const at = (deg: number) => ({
          clientX: cx + r * 0.8 * Math.cos((deg * Math.PI) / 180),
          clientY: cy + r * 0.8 * Math.sin((deg * Math.PI) / 180),
        });
        const send = (target: Element, type: string, deg: number) =>
          target.dispatchEvent(
            new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", isPrimary: true, ...at(deg) }),
          );
        const frame = () => new Promise((done) => setTimeout(done, 16));
        send(grab, "pointerdown", 0);
        for (let deg = 12; deg <= 120; deg += 12) {
          await frame();
          send(svg, "pointermove", deg);
        }
        send(svg, "pointerup", 120);
      },
      { cx: wheel.x, cy: wheel.y, r: wheel.r },
    );
    return alphaReadout(page);
  }

  test("carries the hue wheel on after a flick, and stops it when a finger lands again", async ({ page }) => {
    const figure = await openWheel(page);
    const wheel = await wheelCentre(figure);

    const atRelease = await flick(page, wheel);
    // The coast is the whole point, so it has to show as travel the finger did
    // not make. A 120 deg sweep over ten frames is roughly 750 deg/s, which
    // exp(-t / 0.5) carries a few hundred degrees further.
    await expect.poll(() => alphaReadout(page).then((a) => Math.abs(turnedBy(atRelease, a))), { timeout: 3000 }).toBeGreaterThan(40);

    // ...and it has to settle rather than turn for ever.
    await expect
      .poll(
        async () => {
          const first = await alphaReadout(page);
          await page.waitForTimeout(250);
          return first === (await alphaReadout(page));
        },
        { timeout: 6000 },
      )
      .toBe(true);

    // A hand on the platter stops it, the way it stops a record.
    await flick(page, wheel);
    await page.waitForTimeout(60);
    const moving = await alphaReadout(page);
    await page.evaluate(
      ({ cx, cy, r }) => {
        const grab = document.querySelector('.linked-viz-root svg g[style*="grab"]')!;
        grab.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            cancelable: true,
            pointerId: 9,
            pointerType: "touch",
            isPrimary: true,
            clientX: cx + r * 0.8,
            clientY: cy,
          }),
        );
      },
      { cx: wheel.x, cy: wheel.y, r: wheel.r },
    );
    const grabbed = await alphaReadout(page);
    await page.waitForTimeout(400);
    expect(Math.abs(turnedBy(grabbed, await alphaReadout(page)))).toBeLessThanOrEqual(1);
    expect(Math.abs(turnedBy(atRelease, moving))).toBeGreaterThan(0);

    expect(await cancels(page)).toBe(0);
  });

  test("leaves the hue wheel where the finger left it when motion is not wanted", async ({ page }) => {
    // e2e runs at the browser default, so the reduced-motion path is only ever
    // exercised where a test asks for it. A coast that ignored the preference
    // would pass every other test in this file.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const figure = await openWheel(page);
    const wheel = await wheelCentre(figure);

    const atRelease = await flick(page, wheel);
    await page.waitForTimeout(800);

    expect(Math.abs(turnedBy(atRelease, await alphaReadout(page)))).toBeLessThanOrEqual(1);
  });

  test("turns the hue wheel from a touch drag instead of letting the page scroll away with it", async ({ page, context }) => {
    const figure = await openWheel(page);
    const wheel = await wheelCentre(figure);
    const scrolled = await page.evaluate(() => window.scrollY);
    const before = await alphaReadout(page);

    // A quarter turn swept along the rim. Most of that travel is vertical,
    // which is exactly the movement a scroll would claim.
    const client = await context.newCDPSession(page);
    const at = (deg: number) => ({
      x: wheel.x + wheel.r * 0.8 * Math.cos((deg * Math.PI) / 180),
      y: wheel.y + wheel.r * 0.8 * Math.sin((deg * Math.PI) / 180),
    });
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at(0)] });
    for (let deg = 15; deg <= 90; deg += 15) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [at(deg)] });
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    expect(Math.abs(turnedBy(before, await alphaReadout(page)))).toBeGreaterThan(80);
    expect(await cancels(page)).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
  });

  test("holds the hue wheel through three turns and through a second finger landing", async ({ page, context }) => {
    const figure = await openWheel(page);
    const wheel = await wheelCentre(figure);
    const scrolled = await page.evaluate(() => window.scrollY);
    const before = await alphaReadout(page);

    const client = await context.newCDPSession(page);
    const at = (deg: number) => ({
      x: wheel.x + wheel.r * 0.8 * Math.cos((deg * Math.PI) / 180),
      y: wheel.y + wheel.r * 0.8 * Math.sin((deg * Math.PI) / 180),
      id: 0,
    });
    // A second finger landing on the platter must not move the turn under the
    // first: a single drag slot let whichever pointer touched down last reset
    // the origin, so contact alone shifted alpha and every turn after it drifted
    // further. It has to land on the wheel, because that is the handler that
    // takes the origin.
    const resting = { x: wheel.x - wheel.r * 0.5, y: wheel.y + wheel.r * 0.5, id: 1 };
    let secondDown = false;

    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at(0)] });
    const sampled: { swept: number; turned: number }[] = [];
    for (let deg = STEP_DEG; deg <= 1080; deg += STEP_DEG) {
      if (deg > 360 && !secondDown) {
        await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at(deg), resting] });
        secondDown = true;
      }
      const points = secondDown ? [at(deg), resting] : [at(deg)];
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points });
      if (deg % 90 === 0) sampled.push({ swept: deg, turned: turnedBy(before, await alphaReadout(page)) });
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    // Every quarter of every turn has to land on the finger, not merely the end
    // of the sweep: alpha that never moved would return to its start too, and a
    // second finger that stole the origin drifted further with every turn. The
    // sample is read without waiting for React to commit, so it can trail the
    // dispatch by one step and no more.
    for (const { swept, turned } of sampled) {
      expect(Math.abs(turnedBy(swept, turned)), `at ${swept} deg swept`).toBeLessThanOrEqual(STEP_DEG);
    }
    expect(sampled).toHaveLength(12);
    await expect.poll(async () => Math.abs(turnedBy(before, await alphaReadout(page)))).toBeLessThanOrEqual(STEP_DEG);
    expect(await cancels(page)).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
  });
});
