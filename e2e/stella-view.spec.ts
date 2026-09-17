import { expect, test, type Locator, type Page } from "@playwright/test";

async function geometry(graph: Locator) {
  return graph.locator("[data-stella-vertex]").evaluateAll((nodes) =>
    Object.fromEntries(
      nodes.map((node) => {
        const circle = node.querySelector("circle")!;
        return [
          node.getAttribute("data-stella-vertex")!,
          {
            x: Number(circle.getAttribute("cx")),
            y: Number(circle.getAttribute("cy")),
            depth: Number(node.getAttribute("data-stella-depth")),
          },
        ];
      }),
    ),
  );
}

async function edgeAppearance(graph: Locator) {
  return graph
    .locator("[data-k8-edge]")
    .evaluateAll((edges) =>
      edges
        .map((edge) => ["data-k8-edge", "stroke", "stroke-width", "opacity"].map((attribute) => edge.getAttribute(attribute)))
        .sort((a, b) => a[0]!.localeCompare(b[0]!)),
    );
}

function geometryDistance(a: Awaited<ReturnType<typeof geometry>>, b: Awaited<ReturnType<typeof geometry>>) {
  return Object.entries(a).reduce(
    (sum, [level, point]) => sum + (point.x - b[level].x) ** 2 + (point.y - b[level].y) ** 2 + (point.depth - b[level].depth) ** 2,
    0,
  );
}

function expectShortestRotation(before: Awaited<ReturnType<typeof geometry>>, after: Awaited<ReturnType<typeof geometry>>, level: number) {
  const basis = (points: typeof before) =>
    [4, 2, 1].map((level) => [points[level].x - points[0].x, points[level].y - points[0].y, points[level].depth - points[0].depth]);
  const a = basis(before),
    b = basis(after);
  const reference = [...a].sort((a, b) => b[0] ** 2 + b[1] ** 2 - a[0] ** 2 - a[1] ** 2)[0];
  const scale = Math.sqrt((reference[0] ** 2 + reference[1] ** 2) / (1 - reference[2] ** 2));
  const trace = a.reduce((sum, edge, i) => sum + (edge[0] * b[i][0] + edge[1] * b[i][1]) / scale ** 2 + edge[2] * b[i][2], 0);
  const acos = (value: number) => Math.acos(Math.max(-1, Math.min(1, value)));
  const vertex = before[level];
  const radius = Math.hypot((vertex.x - 90) / scale, (vertex.y - 63) / scale, vertex.depth);
  expect(acos((trace - 1) / 2)).toBeCloseTo(acos(-vertex.depth / radius), 6);
}

async function doublePress(page: Page, graph: Locator, input: "mouse" | "touch", level: number | null, tapDelay = 80) {
  await graph.scrollIntoViewIfNeeded();
  const target = level === null ? graph : graph.locator('[data-stella-vertex="' + level + '"] [data-stella-hit]');
  const box = (await target.boundingBox())!;
  const x = box.x + (level === null ? 10 : box.width / 2);
  const y = box.y + (level === null ? 10 : box.height / 2);
  if (input === "mouse") {
    await page.mouse.dblclick(x, y);
    await page.mouse.move(0, 0);
  } else {
    await page.touchscreen.tap(x, y);
    if (tapDelay > 0) await page.clock.runFor(tapDelay);
    await page.touchscreen.tap(x, y);
  }
}

async function expectNodeView(graph: Locator, level: number, initial = false) {
  await expect(graph).toHaveAttribute("data-stella-front", String(level));
  await expect(graph).toHaveAttribute("data-stella-turn", "1");
  const points = await geometry(graph);
  expect(points[level].x).toBe(90);
  expect(points[level].y).toBe(63);
  expect(points[level].depth).toBe(Math.min(...Object.values(points).map((point) => point.depth)));
  const red = points[level ^ 2],
    cyan = points[level ^ 5];
  expect(red.x + cyan.x).toBeCloseTo(180, 10);
  expect(red.y + cyan.y).toBeCloseTo(126, 10);
  if (initial) {
    expect(red.x).toBe(90);
    expect(red.y).toBeLessThan(63);
    expect(cyan.x).toBe(90);
    expect(cyan.y).toBeGreaterThan(63);
  }
  for (const mask of [2, 6, 4, 5, 1, 3]) {
    const point = points[level ^ mask];
    const slot = (Math.atan2(point.y - 63, point.x - 90) + Math.PI / 2) / (Math.PI / 3);
    expect(slot).toBeCloseTo(Math.round(slot), 10);
  }
  await expect(graph.locator("[data-stella-vertex]").last()).toHaveAttribute("data-stella-vertex", String(level));
  const edges = await graph.locator("[data-k8-edge]").evaluateAll((nodes) =>
    nodes.map((node) => ({
      pair: node.getAttribute("data-k8-edge")!.split("-").map(Number),
      color: node.getAttribute("stroke"),
    })),
  );
  expect(edges.find((edge) => edge.pair.includes(level) && edge.pair.includes(level ^ 2))?.color).toBe("#ff0000");
  expect(edges.find((edge) => edge.pair.includes(level) && edge.pair.includes(level ^ 5))?.color).toBe("#00ffff");
}

test("ignores vertex hover while the camera turns and previews again once settled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("theory-dev.html");
  const graph = page.locator("#theory-stella-view");
  await graph.scrollIntoViewIfNeeded();
  const hover = async (level: number) => {
    const box = (await graph.locator(`[data-stella-vertex="${level}"] [data-stella-hit]`).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  };
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await doublePress(page, graph, "mouse", 7);
  await page.clock.runFor(240);
  expect(Number(await graph.getAttribute("data-stella-turn"))).toBeGreaterThan(0);
  expect(Number(await graph.getAttribute("data-stella-turn"))).toBeLessThan(1);

  await hover(3);
  expect(await graph.locator('[data-stella-hovered="true"], [data-k8-edge-preview="true"]').count()).toBe(0);
  await page.mouse.move(0, 0);

  await page.clock.runFor(700);
  await expect(graph).toHaveAttribute("data-stella-turn", "1");
  await hover(3);
  await expect(graph.locator('[data-stella-vertex="3"]')).toHaveAttribute("data-stella-hovered", "true");
});

for (const input of ["mouse", "touch"] as const) {
  test.describe(input, () => {
    test.use({
      hasTouch: input === "touch",
      isMobile: input === "touch",
      viewport: input === "touch" ? { width: 390, height: 844 } : { width: 1075, height: 698 },
      contextOptions: { reducedMotion: "reduce" },
    });

    test("aims at each node, preserves the comparison, holds a repeated node and resets only off the nodes", async ({ page }, testInfo) => {
      await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
      await page.goto("theory-dev.html");
      const graph = page.locator("#theory-stella-view");
      const initial = await geometry(graph);
      await graph.locator('[data-stella-vertex="2"]').click();
      await graph.locator('[data-stella-vertex="5"]').click();
      await page.mouse.move(0, 0);
      const readout = page.getByTestId("stella-comparison-status");
      const comparison = await readout.textContent();
      const summary = await page.locator(".theory-k8-summary").textContent();
      const appearance = await edgeAppearance(graph);
      const box = await graph.boundingBox();
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      for (const level of [0, 1, 2, 3, 4, 5, 6, 7]) {
        await doublePress(page, graph, input, level);
        await expectNodeView(graph, level, true);
        const aimed = await geometry(graph);
        expect(await edgeAppearance(graph)).toEqual(appearance);
        expect(await readout.textContent()).toBe(comparison);
        expect(await page.locator(".theory-k8-summary").textContent()).toBe(summary);
        expect((await graph.boundingBox())!.width).toBe(box!.width);
        expect((await graph.boundingBox())!.height).toBe(box!.height);
        await doublePress(page, graph, input, level);
        await expectNodeView(graph, level);
        expect(await geometry(graph)).toEqual(aimed);
        const other = level ^ 1;
        await doublePress(page, graph, input, other);
        await expectNodeView(graph, other);
        const otherView = await geometry(graph);
        expectShortestRotation(aimed, otherView, other);
        expect(await readout.textContent()).toBe(comparison);
        if (level === 6) await graph.screenshot({ path: testInfo.outputPath("white-front-shortest-" + input + ".png") });
        await doublePress(page, graph, input, null);
        await expect(graph).toHaveAttribute("data-stella-view", "default");
        expect(await geometry(graph)).toEqual(initial);
        expect(await readout.textContent()).toBe(comparison);
        await doublePress(page, graph, input, null);
        await expectNodeView(graph, other);
        expect(await geometry(graph)).toEqual(otherView);
        expect(await edgeAppearance(graph)).toEqual(appearance);
        expect(await readout.textContent()).toBe(comparison);
        await doublePress(page, graph, input, null);
        await expect.poll(() => geometry(graph)).toEqual(initial);
      }
      await expect(page.locator(".theory-k8-controls button")).toHaveCount(4);
      await expect(page.locator(".theory-k8-graph button")).toHaveCount(0);
      expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test("retains distance filters and lets dimmed or nodes-only vertices control the view", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
      await page.goto("theory-dev.html");
      const graph = page.locator("#theory-stella-view");
      const controls = page.locator(".theory-k8-display-modes button");
      await controls.nth(2).click();
      await controls.nth(3).click();
      await graph.locator('[data-stella-vertex="0"]').click();
      await graph.locator('[data-stella-vertex="1"]').click();
      const comparison = await page.getByTestId("stella-comparison-status").textContent();
      await expect(graph.locator('[data-stella-vertex="3"]')).toHaveAttribute("aria-disabled", "true");
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      await doublePress(page, graph, input, 3);
      await expect(graph).toHaveAttribute("data-stella-front", "3");
      await expect(graph).toHaveAttribute("data-stella-distances", "1");
      await expect(graph.locator("[data-k8-edge]")).toHaveCount(12);
      expect(await page.getByTestId("stella-comparison-status").textContent()).toBe(comparison);
      await controls.nth(0).click();
      await doublePress(page, graph, input, 5);
      await expect(graph).toHaveAttribute("data-stella-front", "5");
      await expect(graph.locator("[data-k8-edge]")).toHaveCount(0);
      await expect(graph.locator("[data-stella-comparison-role]")).toHaveCount(0);
      await doublePress(page, graph, input, null);
      await expect(graph).toHaveAttribute("data-stella-view", "default");
      await expect(graph).toHaveAttribute("data-stella-distances", "none");
      await doublePress(page, graph, input, null);
      await expect(graph).toHaveAttribute("data-stella-front", "5");
      await expect(graph.locator("[data-k8-edge]")).toHaveCount(0);
    });

    test("requires two presses on the same target and keeps slower presses as normal selections", async ({ page }) => {
      await page.goto("theory-dev.html");
      const graph = page.locator("#theory-stella-view");
      const vertex = graph.locator('[data-stella-vertex="5"] [data-stella-hit]');
      await vertex.scrollIntoViewIfNeeded();
      const box = (await vertex.boundingBox())!;
      const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      const press = async (clickCount: number, px = x, py = y) => {
        if (input === "touch") await page.touchscreen.tap(px, py);
        else {
          await page.mouse.move(px, py);
          await page.mouse.down({ clickCount });
          await page.mouse.up({ clickCount });
        }
      };
      await press(1);
      await expect(graph.locator('[data-stella-vertex="5"]')).toHaveAttribute("data-stella-comparison-role", "a");
      await page.clock.runFor(280);
      await press(2);
      await expect(graph).toHaveAttribute("data-stella-view", "default");
      await expect(graph.locator("[data-stella-comparison-role]")).toHaveCount(0);
      await page.clock.runFor(600);
      await press(1);
      await page.clock.runFor(80);
      const other = (await graph.locator('[data-stella-vertex="4"] [data-stella-hit]').boundingBox())!;
      await press(2, other.x + other.width / 2, other.y + other.height / 2);
      await expect(graph).toHaveAttribute("data-stella-view", "default");
      await page.clock.runFor(600);
      await doublePress(page, graph, input, 5);
      await expect(graph).toHaveAttribute("data-stella-front", "5");
    });
  });
}

for (const input of ["mouse", "touch"] as const) {
  test.describe(`${input} animated rotation`, () => {
    test.use({
      hasTouch: input === "touch",
      isMobile: input === "touch",
      viewport: input === "touch" ? { width: 390, height: 844 } : { width: 1075, height: 698 },
    });

    test("locks node turns and the first return, then restores the red-up first view after a reset", async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("theory-dev.html");
      const graph = page.locator("#theory-stella-view");
      await graph.scrollIntoViewIfNeeded();
      const initial = await geometry(graph);
      const appearance = await edgeAppearance(graph);
      const comparison = await page.getByTestId("stella-comparison-status").textContent();
      const box = await graph.boundingBox();
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      await doublePress(page, graph, input, 7);
      await page.clock.runFor(240);
      const middle = await geometry(graph);
      expect(middle).not.toEqual(initial);
      expect(Number(await graph.getAttribute("data-stella-turn"))).toBeGreaterThan(0);
      expect(Number(await graph.getAttribute("data-stella-turn"))).toBeLessThan(1);
      // Keep time paused between both presses so the moving target stays under
      // the pointer and the complete double gesture reaches the rotation lock.
      await doublePress(page, graph, input, 3, 0);
      await expect(graph).toHaveAttribute("data-stella-front", "7");
      expect(await geometry(graph)).toEqual(middle);
      await doublePress(page, graph, input, null, 0);
      await expect(graph).toHaveAttribute("data-stella-front", "7");
      await page.clock.runFor(700);
      await expectNodeView(graph, 7, true);
      const settled = await geometry(graph);
      await graph.screenshot({ path: testInfo.outputPath(`first-red-up-${input}.png`) });
      await page.clock.runFor(1000);
      expect(await geometry(graph)).toEqual(settled);
      expect(await edgeAppearance(graph)).toEqual(appearance);
      expect(await graph.boundingBox()).toEqual(box);
      await expect(graph.locator("[data-k8-edge]")).toHaveCount(28);
      expect(await page.getByTestId("stella-comparison-status").textContent()).toBe(comparison);

      await doublePress(page, graph, input, 5);
      await page.clock.runFor(700);
      await expectNodeView(graph, 5);
      const next = await geometry(graph);
      expectShortestRotation(settled, next, 5);
      // The second view is still upright, but red now points down naturally.
      expect(next[5 ^ 2].y).toBeGreaterThan(63);

      await doublePress(page, graph, input, null);
      await page.clock.runFor(240);
      const returning = await geometry(graph);
      await doublePress(page, graph, input, 2, 0);
      await doublePress(page, graph, input, null, 0);
      await expect(graph).toHaveAttribute("data-stella-view", "default");
      expect(await geometry(graph)).toEqual(returning);
      await page.clock.runFor(700);
      expect(await geometry(graph)).toEqual(initial);
      await doublePress(page, graph, input, 3);
      await page.clock.runFor(700);
      await expectNodeView(graph, 3, true);
      expect(await edgeAppearance(graph)).toEqual(appearance);
    });

    test("reverses established round trips without losing the saved pose and replaces it after a new node turn", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("theory-dev.html");
      const graph = page.locator("#theory-stella-view");
      await graph.locator('[data-stella-vertex="2"]').click();
      await graph.locator('[data-stella-vertex="5"]').click();
      await page.mouse.move(0, 0);
      const comparison = await page.getByTestId("stella-comparison-status").textContent();
      const appearance = await edgeAppearance(graph);
      const initial = await geometry(graph);
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      // Without a saved node view, double-pressing the background holds default.
      await doublePress(page, graph, input, null);
      expect(await geometry(graph)).toEqual(initial);
      await expect(graph).toHaveAttribute("data-stella-turn", "1");

      await doublePress(page, graph, input, 7);
      await page.clock.runFor(700);
      await doublePress(page, graph, input, 5);
      await page.clock.runFor(700);
      await expectNodeView(graph, 5);
      const saved = await geometry(graph);
      // Restore this exact roll rather than constructing a red-up view of 5.
      expect(saved[5 ^ 2].y).toBeGreaterThan(63);
      await doublePress(page, graph, input, null);
      await page.clock.runFor(700);
      expect(await geometry(graph)).toEqual(initial);

      await doublePress(page, graph, input, null);
      await page.clock.runFor(240);
      const outward = await geometry(graph);
      expect(outward).not.toEqual(initial);
      expect(outward).not.toEqual(saved);
      await expect(graph).toHaveAttribute("data-stella-front", "5");
      // Node selection stays locked even while background reversals are enabled.
      await doublePress(page, graph, input, 3, 0);
      expect(await geometry(graph)).toEqual(outward);
      await expect(graph).toHaveAttribute("data-stella-front", "5");
      await doublePress(page, graph, input, null, 0);
      await expect(graph).toHaveAttribute("data-stella-view", "default");
      expect(await geometry(graph)).toEqual(outward);
      await page.clock.runFor(160);
      const backward = await geometry(graph);
      expect(geometryDistance(backward, initial)).toBeLessThan(geometryDistance(outward, initial));
      await doublePress(page, graph, input, null, 0);
      await expect(graph).toHaveAttribute("data-stella-front", "5");
      expect(await geometry(graph)).toEqual(backward);
      await page.clock.runFor(160);
      expect(geometryDistance(await geometry(graph), saved)).toBeLessThan(geometryDistance(backward, saved));
      await page.clock.runFor(700);
      await expectNodeView(graph, 5);
      expect(await geometry(graph)).toEqual(saved);

      // Also reverse a return that started at the saved endpoint.
      await doublePress(page, graph, input, null);
      await page.clock.runFor(320);
      const returning = await geometry(graph);
      await doublePress(page, graph, input, null, 0);
      expect(await geometry(graph)).toEqual(returning);
      await page.clock.runFor(700);
      expect(await geometry(graph)).toEqual(saved);
      await doublePress(page, graph, input, null);
      await page.clock.runFor(700);
      expect(await geometry(graph)).toEqual(initial);
      await doublePress(page, graph, input, null);
      await page.clock.runFor(700);
      expect(await geometry(graph)).toEqual(saved);

      // A new node starts a fresh locked turn and a fresh first return.
      await doublePress(page, graph, input, 3);
      await page.clock.runFor(240);
      const newTurn = await geometry(graph);
      await doublePress(page, graph, input, null, 0);
      expect(await geometry(graph)).toEqual(newTurn);
      await expect(graph).toHaveAttribute("data-stella-front", "3");
      await page.clock.runFor(700);
      await expectNodeView(graph, 3);
      const replacement = await geometry(graph);
      expectShortestRotation(saved, replacement, 3);
      await doublePress(page, graph, input, null);
      await page.clock.runFor(240);
      const firstReturn = await geometry(graph);
      await doublePress(page, graph, input, null, 0);
      await expect(graph).toHaveAttribute("data-stella-view", "default");
      expect(await geometry(graph)).toEqual(firstReturn);
      await page.clock.runFor(700);
      expect(await geometry(graph)).toEqual(initial);
      await doublePress(page, graph, input, null);
      await page.clock.runFor(240);
      // Changing the device motion preference completes the correct endpoint.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expectNodeView(graph, 3);
      expect(await geometry(graph)).toEqual(replacement);
      await doublePress(page, graph, input, null);
      expect(await geometry(graph)).toEqual(initial);
      await doublePress(page, graph, input, null);
      expect(await geometry(graph)).toEqual(replacement);
      await page.clock.runFor(1000);
      expect(await geometry(graph)).toEqual(replacement);
      expect(await edgeAppearance(graph)).toEqual(appearance);
      expect(await page.getByTestId("stella-comparison-status").textContent()).toBe(comparison);
    });
  });
}

test("does not treat touch drags or synthesized mouse events as another camera gesture", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/chromalum/theory-dev.html");
  const graph = page.locator("#theory-stella-view");
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await doublePress(page, graph, "touch", 7);
  const focused = await geometry(graph);
  await graph.dispatchEvent("click", { detail: 2 });
  await graph.dispatchEvent("dblclick", { detail: 2 });
  await expect(graph).toHaveAttribute("data-stella-front", "7");
  const box = (await graph.boundingBox())!;
  const x = box.x + 10,
    y = box.y + 10;
  // No button is held, so this is a pointer passing over the figure rather than
  // a drag. A real touch drag turns the graph; the test below covers that one.
  await graph.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true, clientX: x, clientY: y });
  await graph.dispatchEvent("pointermove", { pointerType: "touch", isPrimary: true, clientX: x, clientY: y + 40 });
  await graph.dispatchEvent("pointerup", { pointerType: "touch", isPrimary: true, clientX: x, clientY: y + 40 });
  await page.touchscreen.tap(x, y);
  expect(await geometry(graph)).toEqual(focused);
  await page.clock.runFor(80);
  await page.touchscreen.tap(x, y);
  await expect(graph).toHaveAttribute("data-stella-view", "default");
  expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1);
  await context.close();
});

test("turns from a touch drag instead of letting the page scroll away with it", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/chromalum/theory-dev.html");
  const graph = page.locator("#theory-stella-view");
  await graph.scrollIntoViewIfNeeded();
  await expect(graph).toHaveAttribute("data-stella-view", "default");

  const box = (await graph.boundingBox())!;
  const before = await geometry(graph);
  const scrolled = await page.evaluate(() => window.scrollY);

  // Real touch input, so the browser's own gesture handling decides whether the
  // figure or the page gets the movement. A vertical drag is the one a scroll
  // would steal.
  const client = await context.newCDPSession(page);
  const x = box.x + box.width / 2;
  const top = box.y + box.height * 0.25;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: top }] });
  for (const step of [0.1, 0.2, 0.3, 0.4]) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: top + box.height * step }] });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  await expect(graph).toHaveAttribute("data-stella-view", "free");
  expect(geometryDistance(before, await geometry(graph))).toBeGreaterThan(1);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
  await context.close();
});
