import { expect, test, type Locator, type Page } from "@playwright/test";

const STORAGE_KEY = "chromalum-flow-state-v1";
const LABELS = ["0", "1", "2", "3", "4", "5", "6", "7"];
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

function currentBoard(page: Page) {
  return page.locator(
    '.automata-panel[data-layout="single"] [data-testid="automata-board"], ' +
      '.automata-panel[data-layout="comparison"][data-mode="edit"] [data-testid="automata-initial-board"], ' +
      '.automata-panel[data-layout="comparison"][data-mode="read"] [data-testid="automata-board"]',
  );
}

async function openAutomata(page: Page, language: "en" | "ja" = "en") {
  await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#automata");
  await expect(currentBoard(page)).toBeVisible();
  await expect(currentBoard(page)).toHaveAttribute("data-columns", "49");
  await expect
    .poll(() =>
      currentBoard(page).evaluate((node) => {
        const canvas = node as HTMLCanvasElement;
        const pixels = Math.round(canvas.getBoundingClientRect().width * devicePixelRatio);
        return canvas.width === pixels && canvas.height === pixels;
      }),
    )
    .toBe(true);
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
  const board = currentBoard(page);
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

async function hoverCell(page: Page, board: Locator, x: number, y: number) {
  await board.scrollIntoViewIfNeeded();
  const rect = (await board.boundingBox())!;
  await page.mouse.move(rect.x + ((x + 0.5) * rect.width) / 49, rect.y + ((y + 0.5) * rect.height) / 49);
}

for (const width of [1280, 390]) {
  test(`shows the same cell outline before and during drawing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openAutomata(page);
    await blank(page);
    const initial = currentBoard(page);
    const cursor = initial.locator("..").locator(".automata-cell-cursor");
    await expect(initial).toHaveCSS("cursor", "none");
    const assertCursor = async (x: number, y: number) => {
      const tolerance = 1 / (await page.evaluate(() => devicePixelRatio));
      await expect
        .poll(async () => {
          const board = (await initial.boundingBox())!,
            frame = (await cursor.boundingBox())!;
          return Math.max(
            ...[frame.x - board.x, frame.y - board.y, frame.width, frame.height].map((value, index) =>
              Math.abs(value - [(x * board.width) / 49, (y * board.height) / 49, board.width / 49, board.height / 49][index]),
            ),
          );
        })
        .toBeLessThan(tolerance);
    };
    const before = await savedState(page);
    await hoverCell(page, initial, 5, 7);
    await expect(cursor).toHaveCSS("pointer-events", "none");
    await assertCursor(5, 7);
    expect(await savedState(page)).toEqual(before);
    expect(await renderedCell(initial, before.x, before.y)).toEqual([0, 0, 0, 255]);
    await page.mouse.down();
    await assertCursor(5, 7);
    await hoverCell(page, initial, 9, 7);
    await assertCursor(9, 7);
    await page.mouse.up();
    await assertCursor(9, 7);
    await hoverCell(page, initial, 12, 7);
    await page.keyboard.press("4");
    await assertCursor(12, 7);
    expect((await savedState(page)).seed[7 * 49 + 12]).toBe(4);
    await page.keyboard.press("ArrowDown");
    await assertCursor(12, 8);
    await page.keyboard.press("7");
    expect((await savedState(page)).seed[8 * 49 + 12]).toBe(7);
    await page.mouse.move(0, 0);
    await expect(cursor).toHaveCount(0);
    await page.keyboard.press("ArrowRight");
    await assertCursor(13, 8);
    if (width < 960) {
      await page.getByRole("button", { name: "Next generation", exact: true }).click();
      await expect(cursor).toHaveCount(0);
      await expect(initial).toHaveCSS("cursor", "default");
    } else await expect(page.getByTestId("automata-board").locator("..").locator(".automata-cell-cursor")).toHaveCount(0);
  });
}

test("uses only horizontal arrow keys on the generation slider", async ({ page }) => {
  await openAutomata(page);
  const slider = page.getByRole("slider");
  await slider.press("Home");
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await slider.press("ArrowUp");
  await expect(slider).toHaveValue("1");
  await slider.press("ArrowDown");
  await expect(slider).toHaveValue("1");
  await slider.press("ArrowLeft");
  await expect(slider).toHaveValue("0");
  await slider.press("End");
  await expect(slider).toHaveValue("64");
});

test("toggles Sound of change with M while Flow is active", async ({ page }) => {
  await openAutomata(page);
  const sound = page.getByRole("checkbox", { name: "Sound of change" });
  const board = currentBoard(page);
  await board.focus();
  await page.keyboard.down("m");
  await expect(sound).toBeChecked();
  await page.keyboard.down("m");
  await page.keyboard.up("m");
  await expect(sound).toBeChecked();
  await expect(board).toBeFocused();
  await expect(sound).toHaveAttribute("aria-keyshortcuts", "M");

  const slider = page.getByRole("slider");
  await slider.press("m");
  await expect(sound).not.toBeChecked();
  for (const chord of ["Shift+m", "Control+m", "Alt+m", "Meta+m"]) {
    await slider.press(chord);
    await expect(sound).not.toBeChecked();
  }
  await page.getByRole("combobox", { name: "Update rule", exact: true }).press("m");
  await expect(sound).not.toBeChecked();
  await page.getByRole("button", { name: "Shortcuts", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("Toggle sound of change", { exact: true })).toBeVisible();
  await page.keyboard.press("m");
  await page.keyboard.press("Escape");
  await expect(sound).not.toBeChecked();
  await page.getByRole("tab", { name: "Music", exact: true }).click();
  const mute = page.getByRole("button", { name: "Mute", exact: true });
  await expect(mute).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("m");
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Flow", exact: true }).click();
  await expect(sound).not.toBeChecked();
  await expect(slider).toHaveValue("0");
});

test("sustains the changing chord while dragging the slider forward and backward", async ({ page }) => {
  await openAutomata(page);
  await page.getByRole("combobox", { name: "Initial pattern", exact: true }).selectOption("phase-clock");
  await page.getByRole("combobox", { name: "Update rule", exact: true }).selectOption("life");
  await page.getByRole("checkbox", { name: "Sound of change" }).check();
  const slider = page.getByRole("slider");
  const playback = await slider.evaluateHandle((input: HTMLInputElement) => {
    const log = { voices: 0, ended: 0, changes: [] as number[], notes: [] as number[] };
    const startVoice = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      log.voices++;
      this.addEventListener("ended", () => log.ended++, { once: true });
      return startVoice.apply(this, args);
    };
    const target = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (...args) {
      if (args[0] > 0 && log.changes.at(-1) !== input.valueAsNumber) log.changes.push(input.valueAsNumber);
      return target.apply(this, args);
    };
    const startNote = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      log.notes.push(input.valueAsNumber);
      return startNote.apply(this, args);
    };
    return log;
  });
  await slider.scrollIntoViewIfNeeded();
  const box = (await slider.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 1, y);
  await page.mouse.down();
  const expected: number[] = [];
  for (const position of [0.1, 0.3, 0.15]) {
    await page.mouse.move(box.x + position * box.width, y);
    const generation = Number(await slider.inputValue());
    expect(generation).not.toBe(expected.at(-1) ?? 0);
    expected.push(generation);
    await expect.poll(() => playback.jsonValue()).toEqual({ voices: 14, ended: 0, changes: expected, notes: [] });
  }
  await page.mouse.up();
  await expect.poll(() => playback.evaluate((log) => log.ended)).toBe(14);
  await slider.press("ArrowRight");
  const step = expected.at(-1)! + 1;
  await expect.poll(() => playback.evaluate((log) => log.notes)).toEqual([step]);

  // A drag can also start on the track away from the thumb.
  await page.mouse.move(box.x + 0.55 * box.width, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 0.65 * box.width, y);
  await expect.poll(() => playback.evaluate((log) => log.voices)).toBe(28);
  await page.mouse.up();
  await page.mouse.click(box.x + 0.4 * box.width, y);
  const clicked = Number(await slider.inputValue());
  await expect.poll(() => playback.evaluate((log) => log.notes)).toEqual([step, clicked]);
});

test("sounds the changed color components when editing the initial board at a later generation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openAutomata(page);
  await blank(page);
  await selectColor(page, 2);
  await clickCell(page, 8, 8);
  await page.getByRole("slider").press("ArrowRight");
  const initial = page.getByTestId("automata-initial-board");
  const notes = await page.evaluateHandle(() => {
    const heard: { duration: number; fingerprint: number[] }[] = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.buffer) {
        const data = this.buffer.getChannelData(0);
        heard.push({ duration: this.buffer.duration, fingerprint: Array.from(data.filter((_, i) => i % 101 === 0)) });
      }
      return start.apply(this, args);
    };
    return heard;
  });
  const sound = page.getByRole("checkbox", { name: "Sound of change" });
  await hoverCell(page, initial, 5, 8);
  await page.keyboard.press("4"); // Muted edit.
  await sound.check();
  await selectColor(page, 4);
  await hoverCell(page, initial, 6, 8);
  await page.mouse.down();
  await page.mouse.up();
  await expect.poll(() => notes.evaluate((values) => values.length)).toBe(1);
  const [green] = await notes.jsonValue();
  expect(green.duration).toBeCloseTo(0.08, 4);
  expect(green.fingerprint.some((sample) => sample !== 0)).toBe(true);
  await page.keyboard.press("Enter"); // The cell is already green.
  await hoverCell(page, initial, 8, 8);
  await page.keyboard.press("6"); // Red to yellow also flips only green.
  await page.keyboard.press("2"); // Reversing the change gives the same chord.
  await page.keyboard.press("3"); // Red to magenta flips blue instead.
  await expect.poll(() => notes.evaluate((values) => values.length)).toBe(4);
  const [, yellow, reverse, blue] = await notes.jsonValue();
  expect(yellow).toEqual(green);
  expect(reverse).toEqual(green);
  expect(blue.fingerprint).not.toEqual(green.fingerprint);
  await expect(page.getByRole("slider")).toHaveValue("1");
  await page.getByTestId("automata-board").click();
  await page.getByRole("combobox", { name: "Initial pattern", exact: true }).selectOption("all-white");
  expect(await notes.evaluate((values) => values.length)).toBe(4);
});

test("sounds an opted-in generation change with a tail shaped by neighboring cells", async ({ page }) => {
  await openAutomata(page);
  const sound = page.getByRole("checkbox", { name: "Sound of change" });
  const slider = page.getByRole("slider");
  const step = page.getByRole("button", { name: "Next generation", exact: true });
  await expect(sound).not.toBeChecked();
  const notes = await page.evaluateHandle(() => {
    const recorded: { attack: number; tail: number }[] = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.buffer) {
        const samples = this.buffer.getChannelData(0);
        const rate = this.buffer.sampleRate;
        const energy = (from: number, to: number) =>
          samples.subarray(Math.round(from * rate), Math.round(to * rate)).reduce((sum, value) => sum + value * value, 0);
        recorded.push({ attack: energy(0, 0.05), tail: energy(0.18, 0.34) });
      }
      return start.apply(this, args);
    };
    return recorded;
  });
  const draw = async (cells: [number, number][]) => {
    await blank(page);
    for (const [x, y] of cells) await clickCell(page, x, y);
  };
  await page.getByRole("combobox", { name: "Update rule", exact: true }).selectOption("and");
  await draw([
    [8, 8],
    [9, 8],
    [8, 9],
    [9, 9],
  ]);
  await step.click();
  await slider.press("Home");
  expect(await notes.jsonValue()).toEqual([]);
  await sound.check();
  await slider.press("m");
  await expect(sound).not.toBeChecked();
  await slider.press("m");
  await expect(sound).toBeChecked();
  await step.click();
  await step.click();
  const [square] = await notes.jsonValue();
  expect(square.attack).toBeGreaterThan(0);
  expect(square.tail).toBeGreaterThan(0);
  // AND clears the four cells on the first step. The second step stays silent.
  expect(await notes.jsonValue()).toHaveLength(1);
  await slider.press("Home");
  await sound.uncheck();
  await draw([
    [8, 8],
    [12, 8],
    [8, 12],
    [12, 12],
  ]);
  await sound.check();
  await step.click();
  const [forward, backward, isolated] = await notes.jsonValue();
  expect(backward).toEqual(forward);
  expect(isolated.attack).toBe(square.attack);
  // The square exposes half as many changed-to-unchanged neighbor pairs.
  expect(square.tail / isolated.tail).toBeCloseTo(0.5, 5);
  await page.getByRole("tab", { name: "Hex", exact: true }).click();
  await page.getByRole("tab", { name: "Flow", exact: true }).click();
  await expect(sound).not.toBeChecked();
});

for (const width of [1280, 682]) {
  test(`steps generations from the focused board without moving the selected cell at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openAutomata(page);
    const slider = page.getByRole("slider");
    const boards = page.locator(".automata-board");
    await expect(boards).toHaveCount(width === 1280 ? 2 : 1);
    for (const board of await boards.all()) {
      await slider.press("Home");
      await board.press("ArrowDown");
      const initial = await savedState(page);
      await board.press("Shift+ArrowLeft");
      await expect(slider).toHaveValue("0");
      await board.press("Shift+ArrowRight");
      await expect(slider).toHaveValue("1");
      await expect(board).toBeFocused();
      expect(await savedState(page)).toEqual({ ...initial, time: 1 });
      await page.keyboard.press("Shift+ArrowLeft");
      await expect(slider).toHaveValue("0");
      await slider.press("End");
      await board.press("Shift+ArrowRight");
      await expect(slider).toHaveValue("64");
      await board.press("Shift+ArrowLeft");
      await expect(slider).toHaveValue("63");
      expect(await savedState(page)).toEqual({ ...initial, time: 63 });
    }
  });
}

test("moves the canvas selection diagonally while two arrow keys are held", async ({ page }) => {
  await openAutomata(page);
  await blank(page);
  const board = currentBoard(page);
  await board.focus();
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowUp");
  expect(await savedState(page)).toMatchObject({ x: 26, y: 23 });
  await page.keyboard.down("ArrowUp");
  expect(await savedState(page)).toMatchObject({ x: 27, y: 22 });
  await page.keyboard.up("ArrowUp");
  await page.keyboard.down("ArrowRight");
  expect(await savedState(page)).toMatchObject({ x: 28, y: 22 });
  await page.keyboard.up("ArrowRight");
  await page.keyboard.press("7");
  expect((await savedState(page)).seed[22 * 49 + 28]).toBe(7);
});

for (const width of [1280, 682]) {
  test(`draws with numeric keys at pointer and keyboard targets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openAutomata(page);
    await blank(page);
    const initial = width >= 960 ? page.getByTestId("automata-initial-board") : page.getByTestId("automata-board");
    // The first number paints without clicking the board to focus it.
    await hoverCell(page, initial, 5, 5);
    await page.keyboard.press("7");
    expect((await savedState(page)).seed[5 * 49 + 5]).toBe(7);
    for (let color = 0; color < 8; color++) {
      await hoverCell(page, initial, color + 5, 5);
      await page.keyboard.press(String(color));
      await expect(palette(page).getByRole("button").nth(color)).toHaveAttribute("aria-pressed", "true");
    }
    expect((await savedState(page)).seed.slice(5 * 49 + 5, 5 * 49 + 13)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    await expect(palette(page).getByRole("button")).toHaveText(LABELS);
    await expect(initial).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("4");
    expect((await savedState(page)).seed[6 * 49 + 12]).toBe(4);
    expect(await renderedCell(initial, 12, 6)).toEqual([0, 255, 0, 255]);

    await hoverCell(page, initial, 20, 5);
    await page.keyboard.down("2");
    await hoverCell(page, initial, 21, 5);
    await page.keyboard.down("2");
    await page.keyboard.up("2");
    expect((await savedState(page)).seed.slice(5 * 49 + 20, 5 * 49 + 22)).toEqual([2, 0]);

    const beforeResult = await savedState(page);
    const result = page.getByTestId("automata-board");
    if (width >= 960) {
      await hoverCell(page, result, 30, 5);
      await page.keyboard.press("6");
      await result.focus();
      await page.keyboard.press("6");
      expect(await savedState(page)).toEqual(beforeResult);
      await page.getByRole("combobox", { name: "Update rule", exact: true }).selectOption("5");
      await page.getByRole("slider").press("End");
      await hoverCell(page, initial, 30, 5);
      await page.keyboard.press("6");
      expect((await savedState(page)).seed[5 * 49 + 30]).toBe(6);
      expect(await renderedCell(result, 30, 5)).toEqual([255, 255, 0, 255]);
      await expect(page.getByRole("slider")).toHaveValue("64");
    } else {
      await page.getByRole("button", { name: "Next generation", exact: true }).click();
      await hoverCell(page, result, 30, 5);
      await page.keyboard.press("6");
      await result.focus();
      await page.keyboard.press("6");
      expect((await savedState(page)).seed).toEqual(beforeResult.seed);
      expect((await savedState(page)).color).toBe(beforeResult.color);
    }
    const saved = await savedState(page);
    await page.reload();
    await expect(page.getByTestId("automata-board")).toBeVisible();
    expect(await savedState(page)).toEqual(saved);
  });
}

test("keeps Flow numeric drawing out of controls, dialogs and other tabs", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openAutomata(page);
  await blank(page);
  await expect.poll(() => readSavedRecord(page)).not.toBe("null");
  const sourceBefore = await savedDrawing(page);
  const initial = page.getByTestId("automata-initial-board");
  await hoverCell(page, initial, 5, 5);
  await page.keyboard.press("4");
  const painted = await savedState(page);

  await page.getByRole("combobox", { name: "Update rule", exact: true }).focus();
  await hoverCell(page, initial, 6, 5);
  await page.keyboard.press("7");
  expect(await savedState(page)).toEqual(painted);

  await initial.focus();
  await page.keyboard.press("F1");
  const help = page.getByRole("dialog", { name: "Keyboard Shortcuts", exact: true });
  await expect(help).toBeVisible();
  await expect(help.getByText("Paint with the matching color", { exact: true })).toBeVisible();
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("7");
  expect(await savedState(page)).toEqual(painted);
  await page.keyboard.press("Escape");
  await expect(help).not.toBeVisible();

  await hoverCell(page, initial, 7, 5);
  for (const key of ["Control+7", "Meta+7", "Shift+7"]) await page.keyboard.press(key);
  expect(await savedState(page)).toEqual(painted);
  expect(await savedDrawing(page)).toEqual(sourceBefore);

  await page.keyboard.press("Alt+3");
  await expect(page.getByRole("tab", { name: "Source", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("7");
  expect(await savedState(page)).toEqual(painted);
  await page.keyboard.press("Alt+8");
  await page.keyboard.press("6");
  expect(await savedState(page)).toEqual(painted);
  await hoverCell(page, initial, 8, 5);
  await page.keyboard.press("6");
  expect((await savedState(page)).seed[5 * 49 + 8]).toBe(6);
});

test("keeps the keyboard cell through scrolling until the pointer actually moves", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 668 });
  await openAutomata(page);
  await blank(page);
  const initial = page.getByTestId("automata-initial-board");
  await hoverCell(page, initial, 48, 48);
  await initial.focus();
  await page.keyboard.press("ArrowRight");
  await page.mouse.wheel(0, 500);
  await expect.poll(() => initial.evaluate((el) => el.matches(":hover"))).toBe(false);
  await expect(initial).toBeFocused();
  await page.keyboard.press("7");
  expect((await savedState(page)).seed[24 * 49 + 25]).toBe(7);

  await page.keyboard.press("ArrowRight");
  const before = await savedState(page);
  await hoverCell(page, page.getByTestId("automata-board"), 40, 40);
  await page.keyboard.press("4");
  expect(await savedState(page)).toEqual(before);
});

for (const width of [1280, 390]) {
  test(`keeps palette colors visible and selection distinct from keyboard focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openAutomata(page);
    const colors = palette(page).getByRole("button");
    await palette(page).scrollIntoViewIfNeeded();
    const backgrounds = await colors.evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).backgroundColor));
    for (let color = 0; color < LABELS.length; color++) {
      const swatch = colors.nth(color);
      await swatch.hover();
      expect(await swatch.evaluate((button) => getComputedStyle(button).backgroundColor)).toBe(backgrounds[color]);
      await page.mouse.down();
      expect(await swatch.evaluate((button) => getComputedStyle(button).backgroundColor)).toBe(backgrounds[color]);
      await page.mouse.up();
    }
    const selected = colors.nth(3);
    const focused = colors.nth(4);
    await selected.click();
    const before = await savedState(page);
    await page.keyboard.press("Tab");
    await expect(focused).toBeFocused();
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    await expect(focused).toHaveAttribute("aria-pressed", "false");
    await expect(selected).toHaveCSS("outline-style", "none");
    await expect(focused).toHaveCSS("outline-style", "solid");
    expect(await savedState(page)).toEqual(before);
  });
}

test("places generation controls between the palette and selectors in the single-board layout", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 678 });
  await openAutomata(page);
  const slider = page.getByRole("slider");
  const sound = page.getByRole("checkbox", { name: "Sound of change" });
  const actions = page.locator(".automata-actions");
  const settings = page.getByTestId("automata-controls");
  await expect(actions.getByRole("button")).toHaveText(["Return to generation 0", "Previous generation", "Next generation"]);
  let previous = (await palette(page).boundingBox())!;
  for (const section of [page.locator(".automata-time-heading"), slider, actions, settings]) {
    const current = (await section.boundingBox())!;
    expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height);
    previous = current;
  }
  const soundBox = (await sound.locator("..").boundingBox())!;
  const sliderBox = (await slider.boundingBox())!;
  expect(soundBox.y + soundBox.height).toBeLessThanOrEqual(sliderBox.y);
  expect(soundBox.x + soundBox.width).toBeCloseTo(sliderBox.x + sliderBox.width, 1);
  await slider.press("ArrowRight");
  await palette(page).getByRole("button").last().focus();
  for (const control of [sound, slider, ...(await actions.getByRole("button").all()), ...(await settings.getByRole("combobox").all())]) {
    await page.keyboard.press("Tab");
    await expect(control).toBeFocused();
  }
});

test("keeps the palette and pattern selectors in rows below large comparison boards", async ({ page }) => {
  await page.setViewportSize({ width: 1159, height: 668 });
  await openAutomata(page);
  const initial = page.getByTestId("automata-initial-board");
  await expect(initial).toBeVisible();
  const box = (await initial.boundingBox())!;
  const maximum = await page
    .locator(".automata-content")
    .evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--display-max")));
  expect(box.width).toBeCloseTo(maximum, 0);
  const initialTools = page.locator(".automata-initial-tools");
  await expect(page.locator(".automata-result-tools").getByRole("slider")).toBeVisible();
  for (const controls of [initialTools.getByRole("group", { name: "Palette" }).getByRole("button"), initialTools.getByRole("combobox")]) {
    const rows = await controls.evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().y));
    expect(new Set(rows).size).toBe(1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("places the selected pair's description below both comparison boards and their controls", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 678 });
  await openAutomata(page, "ja");
  const preset = page.getByRole("combobox", { name: "初期配置", exact: true });
  const rule = page.getByRole("combobox", { name: "更新規則", exact: true });
  const slider = page.getByRole("slider");
  const note = page.locator(".automata-viewing-note");
  const hint = page.locator(".automata-rule-hint");
  await preset.selectOption("corolla");
  await rule.selectOption("life");
  await expect(note).toContainText("黒い中心を囲む緑の4点");
  await expect(slider).toHaveAccessibleDescription("初期配置を編集できます");
  await expect(preset).toHaveAccessibleDescription((await note.textContent())!);
  await expect(rule).toHaveAccessibleDescription([await note.textContent(), await hint.textContent()].join(" "));
  const selectors = (await page.getByTestId("automata-controls").boundingBox())!;
  expect((await note.boundingBox())!.y).toBeGreaterThanOrEqual(selectors.y + selectors.height);
  for (const paragraph of [note, hint]) await expect(paragraph).toHaveCSS("text-align", /^(left|start)$/);
  await slider.press("ArrowRight");
  await expect(note).toContainText("黒い中心を囲む緑の4点");
  await rule.selectOption("or");
  await expect(note).toContainText("緑、黄、白");

  await page.setViewportSize({ width: 1159, height: 678 });
  const right = page.locator(".automata-result-tools");
  await expect(right.locator(".automata-actions button")).toHaveText(["第0世代に戻る", "1世代戻る", "1世代進む"]);
  await expect(note).toContainText("緑、黄、白");
  for (const paragraph of [note, hint]) await expect(paragraph).toHaveCSS("text-align", "center");
  const checkComparisonLayout = async () => {
    const layout = await page.locator(".automata-comparison").evaluate((root) => {
      const rect = (selector: string) => {
        const { left, right, top, bottom } = root.querySelector(selector)!.getBoundingClientRect();
        return { left, right, top, bottom };
      };
      const [initial, result] = root.querySelectorAll(".automata-board-frame");
      return {
        leftEdge: initial.getBoundingClientRect().left,
        rightEdge: result.getBoundingClientRect().right,
        caption: rect(".automata-description-text"),
        settings: rect(".automata-controls"),
        actions: rect(".automata-actions"),
        heading: rect(".automata-time-heading"),
        sound: rect(".automata-generation-sound"),
        track: rect(".automata-slider"),
      };
    });
    const { caption, settings, actions, heading, track } = layout;
    expect(caption.left).toBeCloseTo(layout.leftEdge, 1);
    expect(caption.right).toBeCloseTo(layout.rightEdge, 1);
    expect(caption.top).toBeGreaterThanOrEqual(Math.max(settings.bottom, actions.bottom));
    expect(track.top).toBeGreaterThanOrEqual(heading.bottom);
    expect(track.top).toBeGreaterThanOrEqual(layout.sound.bottom);
    expect(layout.sound.right).toBeCloseTo(track.right, 1);
    expect(track.left).toBeCloseTo(heading.left, 1);
    expect(track.right).toBeCloseTo(layout.rightEdge, 1);
    expect(actions.top).toBeGreaterThanOrEqual(track.bottom);
    return track.left;
  };
  const trackLeft = await checkComparisonLayout();
  await slider.press("End");
  expect((await slider.boundingBox())!.x).toBe(trackLeft);
  await page.getByTestId("automata-initial-board").press("7");
  await expect(preset).toHaveValue("edited");
  await expect(note).toHaveCount(0);
  await expect(rule).toHaveAccessibleDescription((await hint.textContent())!);

  await page.setViewportSize({ width: 1050, height: 450 });
  const compactActions = right.locator(".automata-actions");
  await checkComparisonLayout();
  await page.getByTestId("automata-board").focus();
  await page.keyboard.press("Tab");
  await expect(right.getByRole("checkbox", { name: "変化の響き" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(slider).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(compactActions.getByRole("button").first()).toBeFocused();
});

test("updates both boards at generation 64 before the drawing stroke ends", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openAutomata(page);
  await blank(page);
  await page.getByRole("combobox", { name: "Update rule", exact: true }).selectOption("5");
  await page.getByRole("slider").press("End");
  const initial = page.getByTestId("automata-initial-board");
  const result = page.getByTestId("automata-board");
  const box = (await initial.boundingBox())!;
  const point = (x: number) => ({ x: box.x + ((x + 0.5) * box.width) / 49, y: box.y + (5.5 * box.height) / 49 });
  const start = point(5);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const x of [10, 15, 20]) {
    const next = point(x);
    await page.mouse.move(next.x, next.y);
    expect(await renderedCell(initial, x, 5)).toEqual([255, 255, 255, 255]);
    // A center-including XOR at 64 steps reproduces the seed inside this viewing window.
    await expect.poll(() => renderedCell(result, x, 5)).toEqual([255, 255, 255, 255]);
    await expect(result).toHaveAttribute("aria-busy", "false");
  }
  await page.mouse.up();
  await expect(result).toHaveAttribute("aria-busy", "false");
  expect(await renderedCell(result, 10, 5)).toEqual([255, 255, 255, 255]);
  await expect(page.getByRole("slider")).toHaveValue("64");
  expect((await savedState(page)).seed.slice(5 * 49 + 5, 5 * 49 + 21)).toEqual(new Array(16).fill(7));
});

test("sounds changes to the displayed generation while the drawing stroke is still held", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openAutomata(page);
  const initial = page.getByTestId("automata-initial-board");
  const result = page.getByTestId("automata-board");
  const levels = await page.evaluateHandle(() => {
    const heard: number[] = [];
    const target = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (...args) {
      if (args[0] > 0) heard.push(args[0]);
      return target.apply(this, args);
    };
    return heard;
  });
  const sound = page.getByRole("checkbox", { name: "Sound of change" });
  for (const rule of ["and", "or"]) {
    await blank(page);
    await page.getByRole("combobox", { name: "Update rule", exact: true }).selectOption(rule);
    await page.getByRole("slider").press("Home");
    await page.getByRole("slider").press("ArrowRight");
    await sound.check();
    await hoverCell(page, initial, 5, 10);
    await page.mouse.down();
    await expect(result).toHaveAttribute("aria-busy", "false");
    await hoverCell(page, initial, 6, 10);
    await expect(result).toHaveAttribute("aria-busy", "false");
    const first = await levels.jsonValue();
    await hoverCell(page, initial, 8, 10);
    await expect(result).toHaveAttribute("aria-busy", "false");
    if (rule === "and") {
      // The seed changed, but an isolated line under AND leaves the generation black.
      expect(await levels.jsonValue()).toEqual([]);
    } else {
      expect(first.length).toBeGreaterThan(0);
      const second = (await levels.jsonValue()).slice(first.length);
      // OR lights three new result cells, then six. Normalized powers have ratio (6/7)/(3/4).
      expect(Math.max(...second) / Math.max(...first)).toBeCloseTo(8 / 7, 5);
    }
    await page.mouse.up();
    await sound.uncheck();
  }
});

for (const language of ["ja", "en"] as const) {
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 1280, height: 480 },
    { width: 1280, height: 360 },
  ]) {
    test(`keeps ${language} Flow controls inside short ${viewport.width}x${viewport.height} viewports`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openAutomata(page, language);
      // Classic scrollbars consume layout width; Latin monospace glyphs can also be wider than Consolas.
      await page.addStyleTag({ content: "html { scrollbar-gutter: stable; } .automata-panel * { font-family: monospace !important; }" });
      const controls = page.getByRole("combobox");
      await controls.nth(0).selectOption("all-white");
      await controls.nth(1).selectOption("life");
      const before = await rectangles(page);
      const paletteFits = await palette(page).evaluate((node) => {
        const bounds = node.parentElement!.getBoundingClientRect();
        return Array.from(node.querySelectorAll("button")).every((button) => {
          const box = button.getBoundingClientRect();
          return box.left >= bounds.left && box.right <= bounds.right;
        });
      });
      expect(paletteFits, "palette fits its parent, not just its own overflowing grid").toBe(true);
      for (const control of await controls.all()) {
        const count = await control.getByRole("option", { disabled: false }).count();
        for (let option = 0; option < count; option++) {
          await control.selectOption({ index: option });
          const label = await control.evaluate((node) => {
            const range = document.createRange();
            range.selectNodeContents(node.querySelector("button > span")!);
            return { text: node.textContent, lines: range.getClientRects().length, fits: node.scrollWidth <= node.clientWidth };
          });
          expect(label.lines, label.text ?? "selected label").toBeLessThanOrEqual(2);
          expect(label.fits).toBe(true);
          expect(await rectangles(page)).toEqual(before);
        }
      }
    });
  }
}

for (const language of ["ja", "en"] as const) {
  test(`compares the editable initial pattern with its generation in ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openAutomata(page, language);
    const initial = page.getByTestId("automata-initial-board");
    const result = page.getByTestId("automata-board");
    await expect(initial).toBeVisible();
    await expect(page.getByRole("application")).toHaveCount(2);
    const left = (await initial.boundingBox())!;
    const right = (await result.boundingBox())!;
    const boardPositions = () =>
      page.locator(".automata-board").evaluateAll((boards) =>
        boards.map((board) => {
          const bounds = board.getBoundingClientRect();
          return { x: bounds.x + scrollX, y: bounds.y + scrollY, width: bounds.width, height: bounds.height };
        }),
      );
    const originalPositions = await boardPositions();
    expect(right.x).toBeGreaterThan(left.x + left.width);
    expect(right.y).toBeCloseTo(left.y, 1);
    expect(right.width).toBeCloseTo(left.width, 1);
    for (const [selector, board] of [
      [".automata-initial-tools", left],
      [".automata-result-tools", right],
    ] as const) {
      const tools = (await page.locator(selector).boundingBox())!;
      expect(tools.y).toBeGreaterThanOrEqual(board.y + board.height);
      expect(tools.x + tools.width / 2).toBeCloseTo(board.x + board.width / 2, 1);
    }
    await initial.press("ArrowLeft");
    const seedBeforeResultInput = (await savedState(page)).seed;
    await result.click();
    await result.press("Enter");
    expect((await savedState(page)).seed).toEqual(seedBeforeResultInput);
    await page.getByRole("combobox").nth(0).selectOption("black");
    await selectColor(page, 7);
    await initial.press("Enter");
    const preset = page.getByRole("combobox").nth(0);
    await expect(preset.getByRole("option", { selected: true })).toHaveText(language === "ja" ? "編集済み" : "Edited pattern");
    expect(await renderedCell(result, 24, 24)).toEqual([255, 255, 255, 255]);
    const step = page.getByRole("button", { name: language === "ja" ? "1世代進む" : "Next generation", exact: true });
    await step.click();
    expect(await renderedCell(initial, 24, 24)).toEqual([255, 255, 255, 255]);
    expect(await renderedCell(result, 24, 24)).toEqual([0, 0, 0, 255]);
    expect(await renderedCell(result, 24, 23)).toEqual([255, 255, 255, 255]);
    await initial.press("ArrowLeft");
    await initial.press("Enter");
    await expect(page.getByRole("slider")).toHaveValue("1");
    expect((await savedState(page)).seed[24 * 49 + 23]).toBe(7);
    expect(await renderedCell(result, 22, 24)).toEqual([255, 255, 255, 255]);
    await page.getByRole("combobox").nth(1).selectOption("5");
    await page.getByRole("combobox").nth(0).selectOption("all-white");
    await expect(page.getByRole("slider")).toHaveValue("1");
    expect(await renderedCell(result, 24, 24)).toEqual([255, 255, 255, 255]);
    expect(await boardPositions()).toEqual(originalPositions);

    await selectColor(page, 3);
    // Resizing during an initial-pattern stroke must finish it and keep the observed time.
    const currentLeft = (await initial.boundingBox())!;
    const p = { x: currentLeft.x + (currentLeft.width * 5.5) / 49, y: currentLeft.y + (currentLeft.height * 5.5) / 49 };
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.mouse.up();
    await expect(initial).toHaveCount(0);
    await expect(page.getByRole("application")).toHaveCount(1);
    await expect(page.getByRole("slider")).toHaveValue("1");
    const saved = await savedState(page);
    expect(saved.seed[5 * 49 + 5]).toBe(3);
    await result.press("Enter");
    expect((await savedState(page)).seed).toEqual(saved.seed);
    await page.reload();
    await expect(result).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(initial).toBeVisible();
    expect(await savedState(page)).toEqual(saved);
    await expect(preset.getByRole("option", { selected: true })).toHaveText(language === "ja" ? "編集済み" : "Edited pattern");
    const previous = page.getByRole("button", { name: language === "ja" ? "1世代戻る" : "Previous generation", exact: true });
    await previous.click();
    await expect(page.getByRole("slider")).toHaveValue("0");
    await expect(previous).toBeDisabled();
    expect((await savedState(page)).seed).toEqual(saved.seed);
    await step.click();
    await expect(page.getByRole("slider")).toHaveValue("1");
    await preset.selectOption("all-white");
    await expect(preset).toHaveValue("all-white");
    await expect(page.getByRole("slider")).toHaveValue("1");
    await page.getByRole("button", { name: language === "ja" ? "第0世代に戻る" : "Return to generation 0", exact: true }).click();
    await expect(page.getByRole("slider")).toHaveValue("0");
    expect(await renderedCell(result, 24, 24)).toEqual(await renderedCell(initial, 24, 24));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
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
  await expect(currentBoard(page)).toHaveAttribute("data-columns", "49");
  await expect(currentBoard(page)).toHaveAttribute("data-rows", "49");
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
      const originalBox = (await currentBoard(page).boundingBox())!;
      await importImage(page, width, height);
      const board = currentBoard(page);
      await expect(board).toBeVisible();
      const box = (await board.boundingBox())!;
      expect(box.width / box.height).toBeCloseTo(1, 2);
      expect(box.width).toBeCloseTo(originalBox.width, 0);
      expect(box.height).toBeCloseTo(originalBox.height, 0);
      await expect(page.getByRole("slider")).toHaveValue("64");
      await expect(page.getByRole("button", { name: "Next generation", exact: true })).toBeDisabled();
      const presets = page.getByRole("combobox", { name: "Initial pattern", exact: true });
      await expect(presets.getByRole("option", { disabled: false })).toHaveCount(11);
      await expect(presets.getByRole("option", { selected: true, disabled: true })).toHaveText("Edited pattern");
      expect(await savedState(page)).toEqual(edited);
      await expect.poll(async () => JSON.parse(await readSavedRecord(page))?.width).toBe(width);
      const sourceRecord = await savedDrawing(page);
      await page.reload();
      await expect(board).toHaveAttribute("data-columns", "49");
      await expect(board).toHaveAttribute("data-rows", "49");
      await expect(page.getByRole("slider")).toHaveValue("64");
      expect(await savedState(page)).toEqual(edited);
      await page.getByRole("button", { name: "Return to generation 0", exact: true }).click();
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
  const presets = page.getByRole("combobox").nth(0);
  await expect(presets.getByRole("option")).toHaveCount(11);
  await expect(presets).toHaveValue("overlapping-squares");
  await expect(page.getByRole("combobox").nth(1).getByRole("option")).toHaveCount(14);
  await expect(palette(page).getByRole("button")).toHaveText(LABELS);
  await expect(palette(page).getByRole("button").nth(4)).toHaveAttribute("aria-pressed", "true");
  await expect(currentBoard(page)).toHaveCount(1);
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Return to generation 0", exact: true })).toBeDisabled();
});

test("opens both Flow pickers near the footer without moving the page or its controls", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 678 });
  await openAutomata(page, "ja");
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const controls = page.getByRole("combobox");
  const layout = () =>
    controls.evaluateAll((els) => [scrollY, document.documentElement.scrollHeight, ...els.map((el) => el.getBoundingClientRect().top)]);
  const before = await layout();
  for (const [index, select] of (await controls.all()).entries()) {
    if (index === 0) await select.click();
    else await select.press("Space");
    await expect.poll(() => select.evaluate((el) => el.matches(":open"))).toBe(true);
    expect(await layout()).toEqual(before);
    await page.keyboard.press("End");
    const last = select.getByRole("option").last();
    await expect(last).toBeFocused();
    const row = (await last.boundingBox())!;
    expect(row.y).toBeGreaterThanOrEqual(0);
    expect(row.y + row.height).toBeLessThanOrEqual((await select.boundingBox())!.y);
    expect(await layout()).toEqual(before);
    await page.keyboard.press("Escape");
    await expect.poll(() => select.evaluate((el) => el.matches(":open"))).toBe(false);
    expect(await layout()).toEqual(before);
  }
});

for (const viewport of [
  { width: 714, height: 668 },
  { width: 360, height: 844 },
  { width: 320, height: 900 },
]) {
  test(`keeps both Automata menus and the chosen option inside the viewport at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openAutomata(page);
    for (const [index, lastIndex, firstValue] of [
      [0, 10, "overlapping-squares"],
      [1, 13, "4"],
    ] as const) {
      const select = page.getByRole("combobox").nth(index);
      await select.selectOption({ index: lastIndex });
      await select.scrollIntoViewIfNeeded();
      await select.click();
      const option = select.getByRole("option", { selected: true });
      await expect(option).toBeVisible();
      const control = (await select.boundingBox())!;
      const selected = (await option.boundingBox())!;
      expect(selected.y >= control.y + control.height || selected.y + selected.height <= control.y).toBe(true);
      expect(selected.y).toBeGreaterThanOrEqual(0);
      expect(selected.y + selected.height).toBeLessThanOrEqual(viewport.height);
      await page.keyboard.press("Home");
      await page.keyboard.press("Enter");
      await expect(select).toHaveValue(firstValue);
      await expect.poll(() => select.evaluate((el) => el.matches(":open"))).toBe(false);
    }
  });
}

for (const language of ["ja", "en"] as const) {
  for (const width of [1280, 390]) {
    test(`demonstrates all four color rules in ${language} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await openAutomata(page, language);
      const preset = page.getByRole("combobox").nth(0);
      const rule = page.getByRole("combobox").nth(1);
      const slider = page.getByRole("slider");
      await expect(rule.locator("optgroup")).toHaveCount(4);
      await expect(rule.locator('optgroup[label="XOR"] option')).toHaveCount(6);
      await expect(preset.locator("optgroup")).toHaveCount(0);
      // A fresh visit is saved only after editing or choosing a setting.
      await preset.selectOption("black");
      const rgba = (color: number) => [color & 2 ? 255 : 0, color & 4 ? 255 : 0, color & 1 ? 255 : 0, 255];
      const examples = [
        {
          rule: "or",
          preset: "rosette",
          time: 1,
          cells: [
            [24, 23, 0, 7],
            [24, 21, 0, 4],
          ],
        },
        {
          rule: "and",
          preset: "luminous",
          time: 1,
          cells: [
            [24, 24, 7, 4],
            [24, 23, 4, 0],
          ],
        },
        {
          rule: "majority",
          preset: "corolla",
          time: 1,
          cells: [
            [24, 24, 0, 4],
            [24, 23, 4, 0],
          ],
        },
        {
          rule: "hamming",
          preset: "rosette",
          time: 1,
          cells: [
            [24, 23, 0, 5],
            [22, 24, 4, 4],
          ],
        },
      ];
      for (const example of examples) {
        const before = await savedState(page);
        await rule.selectOption(example.rule);
        expect((await savedState(page)).seed).toEqual(before.seed);
        await preset.selectOption(example.preset);
        await expect(rule).toHaveValue(example.rule);
        await expect(slider).toHaveValue(String(width >= 960 ? before.time : 0));
        const description = page.locator(".automata-description-text p");
        await expect(rule).toHaveAccessibleDescription((await description.allTextContents()).join(" "));
        await slider.press("Home");
        await currentBoard(page).press("ArrowRight"); // Keep the selection outline outside the sampled cells.
        for (const [x, y, initial] of example.cells) expect(await renderedCell(currentBoard(page), x, y)).toEqual(rgba(initial));
        for (let t = 0; t < example.time; t++) await slider.press("ArrowRight");
        for (const [x, y, initial, evolved] of example.cells) {
          expect(await renderedCell(currentBoard(page), x, y)).toEqual(rgba(evolved));
          if (width >= 960) expect(await renderedCell(page.getByTestId("automata-initial-board"), x, y)).toEqual(rgba(initial));
        }
        if (language === "ja" && width === 1280) {
          await page.screenshot({ path: testInfo.outputPath(`flow-${example.rule}.png`), fullPage: true });
        }
      }
      const saved = await savedState(page);
      await page.reload();
      await expect(rule).toHaveValue("hamming");
      await expect(preset).toHaveValue("rosette");
      await expect(slider).toHaveValue("1");
      expect(await savedState(page)).toEqual(saved);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
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
  for (let color = 0; color < 8; color++) expect(await renderedCell(currentBoard(page), 4 + 3 * color, 8)).toEqual(rgba[color]);
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
        const board = currentBoard(page);
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

test.describe("result cell selection", () => {
  test.use({ hasTouch: true });
  for (const [width, input] of [
    [390, "touch"],
    [1280, "mouse"],
  ] as const) {
    test(`dismisses the result cell outline on an outside ${input} press`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await openAutomata(page);
      await blank(page);
      await page.getByRole("button", { name: "Next generation", exact: true }).click();
      const board = currentBoard(page);
      // The empty board makes the white outline distinguishable from every cell.
      const hasOutline = (x: number, y: number) =>
        board.evaluate(
          (el, cell) => {
            const canvas = el as HTMLCanvasElement;
            const edge = (n: number) => Math.round((n * canvas.width) / Number(canvas.dataset.columns));
            const pixels = canvas
              .getContext("2d")!
              .getImageData(edge(cell.x), edge(cell.y), edge(cell.x + 1) - edge(cell.x), edge(cell.y + 1) - edge(cell.y)).data;
            return pixels.some((value, index) => index % 4 === 0 && value > 0);
          },
          { x, y },
        );
      const target = await point(page, 10, 12);
      if (input === "touch") await page.touchscreen.tap(target.x, target.y);
      else await page.mouse.click(target.x, target.y);
      await expect.poll(() => hasOutline(10, 12)).toBe(true);
      const selected = await savedState(page);
      const heading = page.locator(".automata-heading");
      if (input === "touch") await heading.tap();
      else {
        await heading.hover();
        expect(await hasOutline(10, 12)).toBe(true);
        await heading.click();
      }
      await expect.poll(() => hasOutline(10, 12)).toBe(false);
      expect(await savedState(page)).toEqual(selected);
      await board.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => hasOutline(11, 12)).toBe(true);
      await page.keyboard.press("Tab");
      await expect.poll(() => hasOutline(11, 12)).toBe(false);
      await page.keyboard.press("Shift+Tab");
      await expect(board).toBeFocused();
      await expect.poll(() => hasOutline(11, 12)).toBe(true);
    });
  }
});

test("keeps the edited seed through 0 → 1 → 64 → 0 and makes results read-only", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAutomata(page);
  await blank(page);
  await clickCell(page, 20, 20);
  const seed = (await savedState(page)).seed;
  await page.getByRole("button", { name: "Next generation", exact: true }).click();
  await clickCell(page, 20, 20);
  await expect(page.getByTestId("automata-live")).toHaveText("Cell (20, 20): initial W White · GRB 111 → t=1 K Black · GRB 000");
  await stroke(page, [5, 5], [40, 40]);
  expect((await savedState(page)).seed).toEqual(seed);
  await page.getByRole("slider").press("End");
  await expect(page.getByRole("slider")).toHaveValue("64");
  await expect(page.getByRole("button", { name: "Next generation", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Return to generation 0", exact: true }).click();
  expect((await savedState(page)).seed).toEqual(seed);
  await expect(page.getByRole("slider")).toHaveValue("0");
  await page.getByRole("combobox", { name: "Update rule", exact: true }).selectOption("life");
  await selectColor(page, 3);
  await page.getByRole("slider").press("End");
  await page.getByRole("combobox", { name: "Initial pattern", exact: true }).selectOption("all-white");
  expect(await savedState(page)).toMatchObject({ time: 0, x: 24, y: 24, rule: "life", color: 3 });
});

for (const width of [390, 1280]) {
  test(`keeps an edge Life blinker through generation 64 and reload at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openAutomata(page);
    await blank(page);
    await page.getByRole("combobox", { name: "Update rule", exact: true }).selectOption("life");
    await stroke(page, [0, 23], [0, 25]);
    const seed = (await savedState(page)).seed;
    const board = currentBoard(page);
    const size = await board.evaluate((node) => [node.getBoundingClientRect().width, node.getBoundingClientRect().height]);
    const step = page.getByRole("button", { name: "Next generation", exact: true });
    await step.click();
    await step.click();
    // The missing left-hand cell in generation one must still revive the vertical blinker.
    expect(await renderedCell(board, 0, 24)).toEqual([255, 255, 255, 255]);
    expect(await renderedCell(board, 0, 23)).toEqual([255, 255, 255, 255]);
    await page.getByRole("slider").press("End");
    await expect(page.getByRole("slider")).toHaveValue("64");
    await expect(step).toBeDisabled();
    await page.getByRole("slider").press("ArrowLeft");
    await expect(page.getByRole("slider")).toHaveValue("63");
    await expect(step).toBeEnabled();
    await step.click();
    await expect(page.getByRole("slider")).toHaveValue("64");
    expect(await renderedCell(board, 0, 24)).toEqual([255, 255, 255, 255]);
    expect((await savedState(page)).seed).toEqual(seed);
    await page.reload();
    await expect(page.getByRole("slider")).toHaveValue("64");
    await expect(board).toHaveAttribute("data-columns", "49");
    await expect(board).toHaveAttribute("data-rows", "49");
    expect(await board.evaluate((node) => [node.getBoundingClientRect().width, node.getBoundingClientRect().height])).toEqual(size);
    expect(await renderedCell(board, 0, 24)).toEqual([255, 255, 255, 255]);
    await page.getByRole("button", { name: "Return to generation 0", exact: true }).click();
    await expect(page.getByRole("slider")).toHaveValue("0");
    expect((await savedState(page)).seed).toEqual(seed);
  });
}

test("does not bridge outside excursions or resume after an outside release", async ({ page }) => {
  await openAutomata(page);
  await blank(page);
  const a = await point(page, 5, 15),
    b = await point(page, 10, 15),
    c = await point(page, 35, 15);
  const rect = (await currentBoard(page).boundingBox())!;
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
    } else if (interruption === "rule") await page.getByRole("combobox", { name: "Update rule", exact: true }).selectOption("5");
    else if (interruption === "color") await palette(page).getByRole("button").nth(2).press("Space");
    else if (interruption === "time") {
      await page.getByRole("slider").press("End");
      await page.getByRole("slider").press("Home");
    } else if (interruption === "blur") await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    else await page.setViewportSize({ width: 390, height: 844 });
    await expect(currentBoard(page)).toBeVisible();
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
  await page.getByRole("combobox", { name: "Update rule", exact: true }).selectOption("diagonal-center");
  await page.getByRole("slider").press("End");
  const before = await savedState(page);
  await page.reload();
  await expect(currentBoard(page)).toBeVisible();
  expect(await savedState(page)).toEqual(before);
  await page.getByRole("button", { name: "JA: Switch to Japanese", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "更新規則", exact: true })).toHaveValue("diagonal-center");
  expect(await savedState(page)).toEqual(before);
  expect(await savedDrawing(page)).toEqual(sourceRecord);
  await page.getByRole("button", { name: "EN: 英語に切り替え", exact: true }).click();
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
  await page.getByRole("button", { name: "Next generation", exact: true }).click();
  await page.getByRole("button", { name: "Return to generation 0", exact: true }).click();
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
  const board = currentBoard(page);
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
  for (const name of ["Initial pattern", "Update rule"]) {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("combobox", { name, exact: true })).toBeFocused();
  }
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("automata-board")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("checkbox", { name: "Sound of change" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("slider")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Next generation", exact: true })).toBeFocused();
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
    const rect = (await currentBoard(page).boundingBox())!;
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
    [
      '[data-testid="automata-controls"]',
      ".automata-palette",
      ".automata-board",
      ".automata-notice-space",
      ".automata-time-heading",
      ".automata-mode",
      ".automata-actions",
      ".automata-description",
    ].flatMap((selector) => {
      const r = document.querySelector(selector)?.getBoundingClientRect();
      return r ? [{ x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }] : [];
    }),
  );
}

for (const language of ["ja", "en"] as const) {
  for (const viewport of [
    { width: 1280, height: 900, controlRows: 1 },
    { width: 682, height: 668, controlRows: 1 },
    { width: 566, height: 668, controlRows: 1 },
    { width: 390, height: 844, controlRows: 1 },
    { width: 360, height: 844, controlRows: 1 },
    { width: 320, height: 900, controlRows: 2 },
  ]) {
    for (const wideGlyphs of [false, true]) {
      test(`keeps ${language} Automata geometry stable at ${viewport.width}px${wideGlyphs ? " with MS Gothic" : ""}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openAutomata(page, language);
        if (wideGlyphs)
          await page.addStyleTag({ content: '.automata-panel *, .app-tab-label { font-family: "MS Gothic", monospace !important; }' });
        const board = currentBoard(page);
        const placement = await board.evaluate((node) => {
          const box = node.getBoundingClientRect();
          return { x: box.x + scrollX, y: box.y + scrollY, width: box.width };
        });
        for (const tab of viewport.width < 1024 ? ["Hex", "Source", "Glaze", "Map"] : []) {
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
        const step = page.getByRole("button", { name: language === "ja" ? "1世代進む" : "Next generation", exact: true });
        const reset = page.getByRole("button", { name: language === "ja" ? "第0世代に戻る" : "Return to generation 0", exact: true });
        const editLabel = language === "ja" ? "初期配置を編集できます" : "Pattern is editable";
        const resultLabel = language === "ja" ? "結果を表示" : "View result";
        const assertGeneration = async (generation: number) => {
          const editing = viewport.width < 1024 && generation === 0;
          await expect(page.getByRole("slider")).toHaveAccessibleName(
            language === "ja" ? `世代：${generation} / 64` : `Generation: ${generation} / 64`,
          );
          await expect(page.getByRole("slider")).toHaveAccessibleDescription(editing ? editLabel : "");
          const modeLabel = page.getByText(editLabel, { exact: true });
          if (editing) {
            await expect(modeLabel).toBeVisible();
            expect(
              await modeLabel.evaluate((el) => {
                const range = document.createRange();
                range.selectNodeContents(el);
                return range.getClientRects().length;
              }),
            ).toBe(1);
          } else await expect(modeLabel).not.toBeVisible();
          await expect(page.getByText(resultLabel, { exact: true })).toHaveCount(0);
          const fits = await page.locator(".automata-time-heading").evaluate((heading) => {
            const bounds = heading.getBoundingClientRect();
            return Array.from(heading.querySelectorAll("span:not([aria-hidden='true'])"))
              .filter((element) => element.children.length === 0)
              .every((element) => {
                const range = document.createRange();
                range.selectNodeContents(element);
                return Array.from(range.getClientRects()).every(
                  (rect) =>
                    rect.left >= bounds.left && rect.right <= bounds.right && rect.top >= bounds.top && rect.bottom <= bounds.bottom,
                );
              });
          });
          expect(fits).toBe(true);
        };
        await assertGeneration(0);
        await step.click();
        await assertGeneration(1);
        expect(await rectangles(page)).toEqual(before);
        for (let generation = 2; generation <= 9; generation++) await page.getByRole("slider").press("ArrowRight");
        await assertGeneration(9);
        expect(await rectangles(page)).toEqual(before);
        await page.getByRole("slider").press("ArrowRight");
        await assertGeneration(10);
        expect(await rectangles(page)).toEqual(before);
        await page.getByRole("slider").press("End");
        await assertGeneration(64);
        expect(await rectangles(page)).toEqual(before);
        await reset.click();
        await assertGeneration(0);
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
        expect(new Set(buttons.map((r) => r.y)).size, "palette colors stay on one row").toBe(1);
        const paletteBounds = (await palette(page).boundingBox())!;
        for (const button of buttons) {
          expect(button.width).toBeGreaterThanOrEqual(24);
          expect(button.height).toBeGreaterThanOrEqual(24);
          expect(button.x).toBeGreaterThanOrEqual(paletteBounds.x);
          expect(button.x + button.width).toBeLessThanOrEqual(paletteBounds.x + paletteBounds.width);
        }
        const controlRows = await page.getByRole("combobox").evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().y));
        expect(new Set(controlRows).size).toBe(viewport.controlRows);
        const actionRows = await page
          .locator(".automata-actions button")
          .evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().y));
        expect(new Set(actionRows).size, "generation buttons stay on one row").toBe(1);
        const actionsFit = await page.locator(".automata-actions").evaluate((actions) => {
          const bounds = actions.getBoundingClientRect();
          return Array.from(actions.querySelectorAll("button")).every((button) => {
            const box = button.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(button);
            return (
              box.left >= bounds.left &&
              box.right <= bounds.right &&
              Array.from(range.getClientRects()).every(
                (text) => text.left >= box.left && text.right <= box.right && text.top >= box.top && text.bottom <= box.bottom,
              )
            );
          });
        });
        expect(actionsFit).toBe(true);
        for (const control of await page.getByRole("combobox").all()) {
          const count = await control.getByRole("option", { disabled: false }).count();
          for (let i = 0; i < count; i++) {
            await control.selectOption({ index: i });
            const fits = await control.evaluate((node) => {
              const select = node as HTMLSelectElement;
              const label = select.querySelector("button > span")!;
              const range = document.createRange();
              range.selectNodeContents(label);
              const text = range.getBoundingClientRect();
              const bounds = select.getBoundingClientRect();
              return {
                text: select.selectedOptions[0].text,
                label: label.textContent,
                lines: range.getClientRects().length,
                noHorizontalOverflow: select.scrollWidth <= select.clientWidth,
                fits: text.left >= bounds.left && text.right <= bounds.right && text.top >= bounds.top && text.bottom <= bounds.bottom,
              };
            });
            expect(fits.label).toBe(fits.text);
            expect(fits.fits, fits.text).toBe(true);
            expect(fits.lines, fits.text).toBeLessThanOrEqual(2);
            expect(fits.noHorizontalOverflow, fits.text).toBe(true);
            expect(await rectangles(page)).toEqual(before);
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
