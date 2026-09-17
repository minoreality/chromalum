import { expect, test, type Locator } from "@playwright/test";

for (const language of ["ja", "en"]) {
  test(`links cube selection and hue-edge views while keeping the consolidated panels responsive (${language})`, async ({ page }) => {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1039, height: 900 });
    await page.goto("theory-dev.html");
    const cube = page.locator(".theory-cube");
    await expect(cube.locator('[data-cube-active="true"]')).toHaveCount(0);
    await expect(cube.getByRole("status")).toHaveCount(0);
    await expect(cube.locator(".theory-cube-controls button")).toHaveCount(3);
    await expect(cube.locator("[data-cube-face]")).toHaveCount(6);
    const state = cube.locator('[data-level="1"]');
    await state.focus();
    await state.press("Enter");
    await expect(cube).toHaveAttribute("data-selected-level", "1");
    await expect(cube.locator('[data-cube-active="true"]')).toHaveCount(3);
    await cube.getByRole("button", { name: language === "ja" ? "ハッセ図" : "Hasse", exact: true }).click();
    await expect(cube).toHaveAttribute("data-selected-level", "1");
    await state.focus();
    await state.press("Space");
    await expect(cube.locator('[data-cube-active="true"]')).toHaveCount(0);

    const hue = page.locator(".theory-hue");
    const clockwise = hue.getByRole("button", { name: language === "ja" ? "時計回り" : "Clockwise", exact: true });
    const counterclockwise = hue.getByRole("button", { name: language === "ja" ? "反時計回り" : "Counter-clockwise", exact: true });
    const caption = hue.locator(".theory-hue-caption");
    const expectDifferences = async (labels: string[]) => {
      for (const selector of ["[data-cycle-delta]", "[data-zigzag-delta]", "[data-edge-row] td:nth-child(3)"]) {
        await expect(hue.locator(selector)).toHaveText(labels);
      }
    };
    await expect(caption).toHaveText("Each node represents a color state.");
    await expectDifferences(["Δ4", "Δ2", "Δ1", "Δ4", "Δ2", "Δ1"]);
    await expect(hue.locator("[data-hue-current-node]")).toHaveCount(0);
    await expect(hue.locator("[data-edge-row] td:first-child")).toHaveText(["R₂↔Y₆", "Y₆↔G₄", "G₄↔C₅", "C₅↔B₁", "B₁↔M₃", "M₃↔R₂"]);
    await expect(clockwise).toBeDisabled();
    await expect(counterclockwise).toBeDisabled();
    await expect(hue.locator('[data-cycle-node][role="button"]')).toHaveCount(6);
    await expect(hue.locator('[data-hue-selected="true"], [data-hue-action]')).toHaveCount(0);
    const start = hue.locator('[data-cycle-node="2"]');
    await start.focus();
    await start.press("Enter");
    await expect(start).toHaveAttribute("aria-current", "true");
    await expect(caption).toHaveText("The selected state is red.");
    await expectDifferences(["±4", "±2", "±1", "±4", "±2", "±1"]);
    await expect(hue.locator("[data-hue-current-node]")).toHaveAttribute("data-hue-current-node", "2");
    await expect(hue.locator('[data-hue-selected="true"], [data-hue-action]')).toHaveCount(0);
    await expect(clockwise).toBeEnabled();
    await expect(counterclockwise).toBeEnabled();
    await clockwise.click();
    await expect(hue.locator('[data-cycle-node="6"]')).toHaveAttribute("aria-current", "true");
    await expect(caption).toHaveText("The transition from red to yellow means adding green.");
    await expect(caption).toHaveAttribute("lang", "en");
    await expectDifferences(["+4", "±2", "±1", "±4", "±2", "±1"]);
    await expect(hue.locator("[data-hue-current-node]")).toHaveAttribute("data-hue-current-node", "6");
    await expect(
      hue.locator(".theory-hue-cycle-svg [role='button'], .theory-hue-cycle-svg [tabindex], .theory-zigzag-svg [tabindex]"),
    ).toHaveCount(0);
    for (let step = 0; step < 3; step++) await clockwise.click();
    await expect(hue.locator('[data-cycle-delta="3"]')).toHaveText("−4");
    await expect(caption).toHaveText("The transition from cyan to blue means removing green.");
    await expect(hue.locator("table button, table [role='button'], table [tabindex]")).toHaveCount(0);
    for (const attribute of ["data-cycle-edge", "data-hue-edge", "data-edge-row"]) {
      await expect(hue.locator(`[${attribute}="3"]`)).toHaveAttribute("data-hue-selected", "true");
    }
    await expect(hue.locator(".theory-hue-controls button")).toHaveCount(2);
    const idleRows = await hue.locator('[data-edge-row][data-hue-selected="false"]').allTextContents();
    await hue.getByRole("button", { name: language === "ja" ? "反時計回り" : "Counter-clockwise", exact: true }).click();
    expect(await hue.locator('[data-edge-row][data-hue-selected="false"]').allTextContents()).toEqual(idleRows);
    await expectDifferences(["±4", "±2", "±1", "+4", "±2", "±1"]);
    await expect(hue.getByRole("status")).toContainText("ΔL=+4");
    await expect(hue.locator('[data-cycle-delta="3"]')).toHaveText("+4");
    await expect(caption).toHaveText("The transition from blue to cyan means adding green.");
    await expect(hue.locator('[data-edge-row="3"]')).toContainText("B₁→C₅");
    await hue.getByRole("button", { name: language === "ja" ? "時計回り" : "Clockwise", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(hue.getByRole("status")).toContainText("ΔL=−4");
    await expect(hue.locator('[data-edge-row="3"]')).toContainText("C₅→B₁");
    await clockwise.click();
    await clockwise.click();
    await expect(hue.locator('[data-hue-edge="5"]')).toHaveAttribute("data-hue-selected", "true");
    const plot = hue.locator(".theory-zigzag-svg");
    await plot.scrollIntoViewIfNeeded();
    const point = await plot
      .locator('[data-hue-edge="2"] line')
      .last()
      .evaluate((line) => {
        const box = line.getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      });
    await page.mouse.click(point.x, point.y);
    await hue.locator('[data-cycle-node="1"]').click();
    await hue.locator('[data-cycle-delta="3"]').click();
    await expect(hue.locator('[data-cycle-edge="5"]')).toHaveAttribute("data-hue-selected", "true");
    await expect(hue.locator('[data-cycle-node="1"]')).toHaveCSS("cursor", "default");
    await expect(plot.locator("[data-tone-hover-layer]")).toHaveCSS("cursor", "default");
    await counterclockwise.focus();
    await page.keyboard.press("Tab");
    await expect(clockwise).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(hue.locator('[data-tone-level-control="0"]')).toBeFocused();
    for (let step = 0; step < 3; step++) await clockwise.click();
    await expect(hue.locator('[data-cycle-edge="2"]')).toHaveAttribute("data-hue-selected", "true");

    const checks = page.getByTestId("hamming-parity-sets");
    await expect(page.getByTestId("hamming-flow-operation-check").getByTestId("hamming-parity-sets")).toHaveCount(1);
    await checks.getByTestId("hamming-venn-check-4").click();
    await expect(page.getByTestId("hamming-stage-received").locator('[data-parity-member="true"]')).toHaveCount(4);
    let previousCycleSize = 0;
    for (const width of [
      320, 362, 452, 458, 479, 480, 534, 582, 600, 601, 739, 760, 761, 768, 865, 866, 867, 960, 1023, 1024, 1030, 1039, 1186, 1440,
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await hue.scrollIntoViewIfNeeded();
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const layout = await page.evaluate(() => {
        const selectors =
          ".theory-derivation, .theory-derivation-order, .theory-derivation-conclusion, .theory-cube, .theory-hue, .theory-hue-overview, .theory-hue-caption, .theory-hue table, .theory-hue td, .theory-hue-zigzag, .theory-hue-controls button, [data-tone-level-controls], [data-tone-level-control], .theory-hamming-flow, .theory-hamming-generation, .theory-hamming-stage, .theory-hamming-sets";
        const overflow = [...document.querySelectorAll(selectors)]
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return box.left < 0 || box.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 1;
          })
          .map((element) => ({
            tag: element.tagName,
            className: element.className,
            width: element.clientWidth,
            scrollWidth: element.scrollWidth,
            left: element.getBoundingClientRect().left,
            right: element.getBoundingClientRect().right,
          }));
        const paths = [...document.querySelectorAll(".theory-derivation-paths > figure")].map((element) => element.getBoundingClientRect());
        const cycle = document.querySelector(".theory-hue-cycle")!.getBoundingClientRect();
        const captionElement = document.querySelector(".theory-hue-caption")!;
        const caption = captionElement.getBoundingClientRect();
        const captionText = document.createRange();
        captionText.selectNodeContents(captionElement);
        const cycleSvg = document.querySelector<SVGSVGElement>(".theory-hue-cycle-svg")!;
        const cycleBox = cycleSvg.getBoundingClientRect();
        const deltaLabels = [...cycleSvg.querySelectorAll("[data-cycle-delta]")];
        const nodeBounds = [...cycleSvg.querySelectorAll("[data-cycle-node-dot]")].map((node) => node.getBoundingClientRect());
        const buttons = document.querySelector(".theory-hue-controls")!.getBoundingClientRect();
        const readout = document.querySelector(".theory-hue-readout")!.getBoundingClientRect();
        const directionButtons = [...document.querySelectorAll(".theory-hue-controls button")];
        const polygon = [...cycleSvg.querySelectorAll("[data-cycle-edge] line:first-child")].map((element) => {
          const line = element as SVGLineElement;
          return { x: line.x1.baseVal.value, y: line.y1.baseVal.value };
        });
        const inverse = cycleSvg.getScreenCTM()!.inverse();
        const insideCycle = (x: number, y: number) => {
          const point = cycleSvg.createSVGPoint();
          point.x = x;
          point.y = y;
          const local = point.matrixTransform(inverse);
          const crosses = polygon.map((a, index) => {
            const b = polygon[(index + 1) % polygon.length];
            return (b.x - a.x) * (local.y - a.y) - (b.y - a.y) * (local.x - a.x);
          });
          return crosses.every((cross) => cross >= 0) || crosses.every((cross) => cross <= 0);
        };
        const table = document.querySelector(".theory-hue table")!.getBoundingClientRect();
        const overview = document.querySelector(".theory-hue-overview")!.getBoundingClientRect();
        const captionArea = overview.bottom - Math.max(cycle.bottom, table.bottom);
        const captionGap = parseFloat(getComputedStyle(document.querySelector(".theory-hue-overview")!).rowGap);
        const zigzag = document.querySelector(".theory-hue-zigzag")!.getBoundingClientRect();
        const hue = document.querySelector(".theory-hue")!.getBoundingClientRect();
        const plot = document.querySelector<SVGSVGElement>(".theory-hue .theory-zigzag-svg")!;
        const levels = [...plot.querySelectorAll("[data-tone-level] > line")].map((line) => line.getBoundingClientRect().y);
        return {
          overflow,
          sideBySide: Math.abs(paths[0].top - paths[1].top) < 1,
          cycleLeftOfTable: cycle.right <= table.left && cycle.top < table.bottom && table.top < cycle.bottom,
          desktopOverviewHeight: window.innerWidth < 1186 || overview.height - captionArea <= 270,
          middleOverviewHeight: window.innerWidth < 480 || window.innerWidth > 867 || overview.height - captionArea <= 240,
          cycleSize: cycleBox.width,
          cycleUsesAvailableSpace:
            Math.max(...nodeBounds.map((box) => box.bottom)) - Math.min(...nodeBounds.map((box) => box.top)) >= cycleBox.height * 0.9 - 1,
          captionArea,
          captionBelowCycle: caption.top >= cycle.bottom && caption.top >= table.bottom,
          captionSpansOverview: Math.abs(caption.left - overview.left) < 1 && Math.abs(caption.right - overview.right) < 1,
          captionFits: captionElement.scrollHeight <= captionElement.clientHeight && caption.height <= 15,
          captionSingleLine: captionText.getClientRects().length === 1,
          desktopTotalHeight: window.innerWidth < 1186 || hue.height - captionArea <= 568,
          desktopPlotHeight: window.innerWidth < 1186 || plot.getBoundingClientRect().height <= 219,
          desktopLevelSpacing: window.innerWidth < 1186 || levels.slice(1).every((y, i) => Math.abs(y - levels[i]) >= 19.5),
          tableBelowCycle: table.top >= cycle.bottom,
          buttonsInsideCycle: directionButtons.every((button) => {
            const box = button.getBoundingClientRect();
            return [
              [box.left - 2, box.top - 2],
              [box.right + 2, box.top - 2],
              [box.right + 2, box.bottom + 2],
              [box.left - 2, box.bottom + 2],
            ].every(([x, y]) => insideCycle(x, y));
          }),
          buttonsClearOfReadout: buttons.top > readout.bottom,
          readoutInsideCycle: [...document.querySelectorAll(".theory-hue-readout > div")].every((line) => {
            const box = line.getBoundingClientRect();
            return [
              [box.left, box.top],
              [box.right, box.top],
              [box.left, box.bottom],
              [box.right, box.bottom],
            ].every(([x, y]) => insideCycle(x, y));
          }),
          nodeLabelsFit: [...cycleSvg.querySelectorAll("[data-cycle-node] > text")].every((label) => {
            const text = label.getBoundingClientRect();
            const node = label.parentElement!.querySelector("[data-cycle-node-dot]")!.getBoundingClientRect();
            return (
              /^[01]{3}$/.test(label.textContent!) &&
              text.height >= 7 &&
              text.left >= node.left &&
              text.right <= node.right &&
              text.top >= node.top &&
              text.bottom <= node.bottom
            );
          }),
          edgeLabelsFit:
            deltaLabels.length === 6 &&
            deltaLabels.every((label) => {
              const box = label.getBoundingClientRect();
              return (
                /^[±+−][124]$/.test(label.textContent!) &&
                box.height >= 7 &&
                box.left >= cycleBox.left &&
                box.right <= cycleBox.right &&
                box.top >= cycleBox.top &&
                box.bottom <= cycleBox.bottom &&
                !insideCycle(box.left + box.width / 2, box.top + box.height / 2) &&
                nodeBounds.every((node) => box.right < node.left || box.left > node.right || box.bottom < node.top || box.top > node.bottom)
              );
            }),
          deltaMatchesTable:
            cycleSvg.querySelector('[data-hue-selected="true"] [data-cycle-delta]')!.textContent ===
            document.querySelector('.theory-hue [data-edge-row][data-hue-selected="true"] td:nth-child(3)')!.textContent,
          buttonsCentered: Math.abs(buttons.left + buttons.width / 2 - (cycleBox.left + cycleBox.width / 2)) < 1,
          zigzagBelowOverview: zigzag.top >= overview.bottom,
          overviewGap: zigzag.top - overview.bottom,
          tableBottomGap: Math.abs(caption.top - captionGap - table.bottom),
          directionButtonSizes: directionButtons.map((button) => {
            const box = button.getBoundingClientRect();
            return Math.min(box.width, box.height);
          }),
          levelRows: new Set(
            [...document.querySelectorAll("[data-tone-level-control]")].map((button) => button.getBoundingClientRect().top),
          ).size,
          levelButtonHeights: [...document.querySelectorAll("[data-tone-level-control]")].map(
            (button) => button.getBoundingClientRect().height,
          ),
        };
      });
      expect(layout.overflow, `${language}, ${width}px`).toEqual([]);
      expect(layout.sideBySide).toBe(true);
      expect(layout.cycleLeftOfTable).toBe(true);
      expect(layout.desktopOverviewHeight).toBe(true);
      expect(layout.middleOverviewHeight, `${language}, ${width}px`).toBe(true);
      expect(layout.cycleSize, `cycle grows continuously at ${language}, ${width}px`).toBeGreaterThanOrEqual(previousCycleSize - 1);
      expect(layout.cycleUsesAvailableSpace).toBe(true);
      previousCycleSize = layout.cycleSize;
      expect(layout.captionArea).toBeGreaterThan(0);
      expect(layout.captionArea).toBeLessThanOrEqual(19);
      expect(layout.captionBelowCycle).toBe(true);
      expect(layout.captionSpansOverview).toBe(true);
      expect(layout.captionFits).toBe(true);
      expect(layout.captionSingleLine).toBe(true);
      expect(layout.desktopTotalHeight).toBe(true);
      expect(layout.desktopPlotHeight).toBe(true);
      expect(layout.desktopLevelSpacing).toBe(true);
      expect(layout.tableBelowCycle).toBe(false);
      expect(layout.buttonsInsideCycle).toBe(true);
      expect(layout.buttonsClearOfReadout).toBe(true);
      expect(layout.readoutInsideCycle).toBe(true);
      expect(layout.nodeLabelsFit).toBe(true);
      expect(layout.edgeLabelsFit, `${language}, ${width}px`).toBe(true);
      expect(layout.deltaMatchesTable).toBe(true);
      expect(layout.buttonsCentered).toBe(true);
      expect(layout.zigzagBelowOverview).toBe(true);
      expect(layout.overviewGap).toBeLessThanOrEqual(13);
      expect(layout.tableBottomGap).toBeLessThanOrEqual(1);
      expect(layout.levelRows).toBe(1);
      expect(layout.directionButtonSizes.every((size) => size >= 28)).toBe(true);
      expect(layout.levelButtonHeights.every((height) => height >= 24 && height <= 32)).toBe(true);
      if (width === 320 || width === 866 || width === 1186) {
        const levelControl = hue.locator('[data-tone-level-control="2"]');
        await levelControl.click();
        const hoverRow = hue.locator('[data-edge-row="4"]');
        await hoverRow.scrollIntoViewIfNeeded();
        const hoverCell = await hoverRow.locator("td").last().boundingBox();
        await page.mouse.move(hoverCell!.x + hoverCell!.width / 2, hoverCell!.y + hoverCell!.height / 2);
        await expect(hoverRow).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await expect(hoverRow).not.toHaveCSS("cursor", "pointer");
        await expect(hue.locator('[data-cycle-edge="2"]')).toHaveAttribute("data-hue-selected", "true");

        // Reading any table column leaves both the selected edge and pinned tone unchanged.
        for (let column = 0; column < 4; column++) {
          const row = hue.locator(`[data-edge-row="${column}"]`);
          await row.scrollIntoViewIfNeeded();
          const cell = await row.locator("td").nth(column).boundingBox();
          await page.mouse.click(cell!.x + cell!.width / 2, cell!.y + cell!.height / 2);
          for (const attribute of ["data-cycle-edge", "data-hue-edge", "data-edge-row"]) {
            await expect(hue.locator(`[${attribute}="2"]`)).toHaveAttribute("data-hue-selected", "true");
          }
          await expect(levelControl).toHaveAttribute("aria-pressed", "true");
          await expect(hue.locator(".theory-hue-action")).toHaveText("Add blue");
          await expect(hue.locator(".theory-hue-readout")).toHaveAttribute("lang", "en");
        }
        await levelControl.click();
        await clockwise.focus();
        await page.keyboard.press("Space");
        await expect(hue.locator('[data-edge-row="3"]')).toHaveAttribute("data-hue-selected", "true");
        await expect(hue.locator('[data-hue-edge="3"]')).toHaveAttribute("data-hue-selected", "true");
        await counterclockwise.focus();
        await page.keyboard.press("Space");
        await expect(hue.locator('[data-cycle-delta="3"]')).toHaveText("+4");
        await page.keyboard.press("Space");
        await expect(hue.locator('[data-cycle-delta="2"]')).toHaveText("−1");
        await clockwise.focus();
        await page.keyboard.press("Enter");
        await expect(hue.locator('[data-cycle-node="5"]')).toHaveAttribute("aria-current", "true");
        await expect(hue.locator(".theory-hue-transition")).toHaveText("G → C");
        await expect(hue.locator('[data-edge-row="2"]')).toHaveAttribute("data-hue-selected", "true");
      }
      if (width === 320 || width === 582) {
        await hue.getByRole("button", { name: language === "ja" ? "反時計回り" : "Counter-clockwise", exact: true }).click();
        await expect(hue.locator('[data-edge-row="2"]')).toContainText("C₅→G₄");
        await hue.getByRole("button", { name: language === "ja" ? "時計回り" : "Clockwise", exact: true }).click();
        await expect(hue.locator('[data-edge-row="2"]')).toContainText("G₄→C₅");
        for (const attribute of ["data-cycle-edge", "data-hue-edge", "data-edge-row"]) {
          await expect(hue.locator(`[${attribute}="2"]`)).toHaveAttribute("data-hue-selected", "true");
        }
      }
    }
  });
}

test("links all six cube faces and vertex incidence without losing the selected face", async ({ page }) => {
  for (const language of ["ja", "en"]) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1186, height: 698 });
    await page.goto("theory-dev.html");
    const cube = page.locator(".theory-cube");
    const plot = cube.locator(".theory-cube-svg");
    const faces = cube.locator("[data-cube-face]");
    const hasse = cube.getByRole("button", { name: language === "ja" ? "ハッセ図" : "Hasse", exact: true });
    await expect(faces).toHaveCount(6);
    for (const [index, id] of ["G-0", "G-1", "R-0", "R-1", "B-0", "B-1"].entries()) {
      const face = faces.nth(index);
      await face.hover();
      await expect(cube).toHaveAttribute("data-active-face", id);
      await expect(plot.locator('[data-cube-active="true"]')).toHaveCount(4);
      const weight = [4, 2, 1][Math.floor(index / 2)];
      const vertices = Array.from({ length: 8 }, (_, lv) => lv).filter((lv) => Number((lv & weight) !== 0) === index % 2);
      expect(
        await plot
          .locator('[data-cube-vertex-active="true"]')
          .evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute("data-level")))),
      ).toEqual(vertices);
      await face.click();
      await page.mouse.move(1, 1);
      await expect(cube).toHaveAttribute("data-selected-face", id);
      await expect(cube).toHaveAttribute("data-active-face", id);
      await expect(face).toHaveAttribute("aria-pressed", "true");
      const other = (index + 1) % 6;
      await faces.nth(other).hover();
      await expect(cube).toHaveAttribute("data-active-face", (await faces.nth(other).getAttribute("data-cube-face")) as string);
      await expect(cube).toHaveAttribute("data-selected-face", id);
      await page.mouse.move(1, 1);
      await expect(cube).toHaveAttribute("data-active-face", id);
      await face.focus();
      await face.press("Space");
      await expect(cube).not.toHaveAttribute("data-selected-face");
    }

    for (let level = 0; level < 8; level++) {
      await plot.locator(`[data-level="${level}"]`).hover();
      await expect(faces.locator('[data-face-vertex][data-highlighted="true"]')).toHaveCount(3);
      expect(
        await cube
          .locator('[data-cube-face][data-highlighted="true"]')
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-cube-face"))),
      ).toEqual(["G", "R", "B"].map((channel, i) => `${channel}-${(level >> (2 - i)) & 1}`));
    }
    await faces.first().focus();
    await faces.first().press("Enter");
    await hasse.click();
    await expect(cube).toHaveAttribute("data-selected-face", "G-0");
    await expect(plot.locator('[data-cube-active="true"]')).toHaveCount(4);
    await expect(hasse).toHaveAttribute("aria-pressed", "true");
    await hasse.click();

    for (const width of [320, 390, 580, 584, 585, 656, 739, 814, 866, 942, 1023, 1024, 1186, 1440]) {
      await page.setViewportSize({ width, height: 698 });
      await cube.scrollIntoViewIfNeeded();
      const layout = await cube.evaluate((root) => {
        const geometry = root.querySelector(".theory-cube-geometry")!.getBoundingClientRect();
        const plot = root.querySelector(".theory-cube-svg")!.getBoundingClientRect();
        const grid = root.querySelector(".theory-cube-faces")!.getBoundingClientRect();
        const cards = [...root.querySelectorAll("[data-cube-face]")].map((el) => el.getBoundingClientRect());
        const compact = root.clientWidth <= 540;
        return {
          placement: geometry.right <= grid.left && geometry.top < grid.bottom && grid.top < geometry.bottom,
          secondary: grid.width < plot.width && grid.height <= geometry.height,
          compactHeight: window.innerWidth < 640 || root.getBoundingClientRect().height <= 311,
          rows: new Set(cards.map((box) => box.top)).size === (compact ? 6 : 3),
          columns: new Set(cards.map((box) => box.left)).size === (compact ? 1 : 2),
          touchTargets: cards.every((box) => box.width >= 44 && box.height >= 24),
          fits: [...root.querySelectorAll("div, button, svg")].every((el) => {
            const box = el.getBoundingClientRect();
            return box.left >= 0 && box.right <= innerWidth + 1 && el.scrollWidth <= el.clientWidth + 1;
          }),
          labels: [...root.querySelectorAll(".theory-cube-face text")].flatMap((el) => {
            if (compact) return getComputedStyle(el).display === "none" ? [] : [`${el.textContent} visible while compact`];
            const box = el.getBoundingClientRect();
            const owner = el.closest("svg")!;
            const svg = owner.getBoundingClientRect();
            // Size the labels by what the layout controls: device px per viewBox unit
            // (Math.max mirrors preserveAspectRatio="slice") times the authored font-size.
            // Box height is ascent + descent, which spans 1.00em to 1.38em across fallback
            // faces, so a floor on it tracks whichever face the runner resolves rather than
            // the rendering. Keep a proportion guard so a squashed label still shows up.
            const viewBox = owner.viewBox.baseVal;
            const unit = viewBox.width > 0 && viewBox.height > 0 ? Math.max(svg.width / viewBox.width, svg.height / viewBox.height) : 0;
            const rendered = parseFloat(getComputedStyle(el).fontSize) * unit;
            const issues = [
              rendered >= 7.5 ? "" : `rendered ${rendered.toFixed(2)}`,
              box.height >= rendered * 0.6 ? "" : `squashed ${(box.height / rendered).toFixed(2)}em`,
              box.left < svg.left ? `left -${(svg.left - box.left).toFixed(2)}` : "",
              box.right > svg.right ? `right +${(box.right - svg.right).toFixed(2)}` : "",
            ].filter(Boolean);
            return issues.length ? [`${el.textContent} ${issues.join(", ")}`] : [];
          }),
          frameless: [...root.querySelectorAll("[data-cube-face]")].every((el) => {
            const style = getComputedStyle(el);
            return style.borderColor === "rgba(0, 0, 0, 0)" && style.backgroundColor === "rgba(0, 0, 0, 0)";
          }),
        };
      });
      expect(layout, `${language} ${width}px`).toEqual({
        placement: true,
        secondary: true,
        compactHeight: true,
        rows: true,
        columns: true,
        touchTargets: true,
        fits: true,
        labels: [],
        frameless: true,
      });
    }
    await faces.first().focus();
    await faces.first().press("Escape");
    await expect(cube).not.toHaveAttribute("data-selected-face");
    await expect(plot.locator('[data-cube-active="true"]')).toHaveCount(0);
    await faces.last().click();
    await plot.click({ position: { x: 8, y: 8 } });
    await expect(cube).not.toHaveAttribute("data-selected-face");
  }
});

test("keeps the cube scale and crossing depth continuous throughout both Hasse transitions", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("chromalum_lang", "ja"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("theory-dev.html");
  const cube = page.locator(".theory-cube");
  const plot = cube.locator(".theory-cube-svg");
  const hasse = cube.getByRole("button", { name: "ハッセ図", exact: true });

  for (const width of [320, 538, 1078, 1186]) {
    await page.setViewportSize({ width, height: 698 });
    await cube.scrollIntoViewIfNeeded();
    const baseline = await plot.evaluate((svg) => {
      const box = svg.getBoundingClientRect();
      return [...svg.querySelectorAll('[data-level] > circle[r="9"]')].map((node) => {
        const dot = node.getBoundingClientRect();
        return { x: dot.x + dot.width / 2 - box.x, y: dot.y + dot.height / 2 - box.y, diameter: dot.width };
      });
    });
    const height = (vertices: { y: number }[]) => Math.max(...vertices.map(({ y }) => y)) - Math.min(...vertices.map(({ y }) => y));

    for (const direction of ["hasse", "cube"]) {
      // Sample rendered frames with motion enabled, including the first and last
      // frames where a switch between SVG meet/slice used to change the scale.
      const recording = plot.evaluate(async (svg) => {
        const frames = [];
        for (let frame = 0; frame < 70; frame++) {
          const box = svg.getBoundingClientRect();
          frames.push({
            width: box.width,
            height: box.height,
            edgeOrder: [...svg.querySelectorAll("[data-cube-edge]")].map((edge) => edge.getAttribute("data-cube-edge")),
            vertices: [...svg.querySelectorAll('[data-level] > circle[r="9"]')].map((node) => {
              const dot = node.getBoundingClientRect();
              return { x: dot.x + dot.width / 2 - box.x, y: dot.y + dot.height / 2 - box.y, diameter: dot.width };
            }),
          });
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
        return frames;
      });
      await hasse.click();
      const frames = await recording;
      await expect(hasse).toHaveAttribute("aria-pressed", String(direction === "hasse"));
      if (direction === "hasse") await expect(plot.locator(".theory-cube-ranks")).toHaveAttribute("opacity", "1");
      else await expect(plot.locator(".theory-cube-ranks")).toHaveCount(0);
      for (const frame of frames) {
        expect(frame.width, `${width}px ${direction}`).toBeCloseTo(frames[0].width, 3);
        expect(frame.height, `${width}px ${direction}`).toBeCloseTo(frames[0].height, 3);
        expect(frame.edgeOrder.indexOf("2-3"), `${width}px ${direction}: left green edge is in front`).toBeLessThan(
          frame.edgeOrder.indexOf("1-5"),
        );
        expect(frame.edgeOrder.indexOf("2-6"), `${width}px ${direction}: right blue edge is in front`).toBeLessThan(
          frame.edgeOrder.indexOf("4-5"),
        );
        frame.vertices.forEach((vertex, index) => {
          expect(vertex.diameter, `${width}px ${direction}, vertex ${index}`).toBeCloseTo(baseline[index].diameter, 3);
          expect(vertex.x, `${width}px ${direction}, vertex ${index}`).toBeCloseTo(baseline[index].x, 3);
        });
      }
      expect(height(frames.at(-1)!.vertices)).toBeCloseTo(height(baseline), 3);
      expect(frames.some((frame) => Math.abs(frame.vertices[0].y - frames[0].vertices[0].y) > 1)).toBe(true);
      const labelsFit = await plot.evaluate((svg) => {
        const box = svg.getBoundingClientRect();
        return [...svg.querySelectorAll("text")].every((text) => {
          const label = text.getBoundingClientRect();
          return label.left >= box.left - 1 && label.right <= box.right + 1 && label.top >= box.top - 1 && label.bottom <= box.bottom + 1;
        });
      });
      expect(labelsFit, `${width}px ${direction}: labels fit at the original cube scale`).toBe(true);
      if (direction === "hasse" && width !== 538) {
        await cube.screenshot({ path: testInfo.outputPath(`hasse-${width}.png`) });
      }
    }
  }
});

test("shows gapless sums and compares K8 distance and rank in a compact responsive panel", async ({ page }) => {
  for (const language of ["ja", "en"]) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    const subset = page.getByTestId("subset-sum-derivation");
    await expect(subset.locator('[data-subset-weight="4"] [data-subset-value]')).toHaveText(["0", "1", "2", "3", "4", "5", "6", "7"]);
    await expect(subset.locator('[data-subset-weight="4"] [data-subset-translated="true"]')).toHaveText(["4", "5", "6", "7"]);
    const graph = page.locator("#theory-stella-view");
    const positions = () =>
      graph
        .locator("[data-stella-vertex] > circle:first-of-type")
        .evaluateAll((nodes) => nodes.map((node) => [node.getAttribute("cx"), node.getAttribute("cy")]));
    const before = await positions();
    const modes = page.locator(".theory-k8-controls").getByRole("group").first();
    const distance1 = modes.getByRole("button", { name: language === "ja" ? "距離1 12本" : "Distance 1 · 12 edges", exact: true });
    await expect(page.locator(".theory-k8-controls button")).toHaveCount(4);
    await modes.getByRole("button", { name: language === "ja" ? "ノードのみ" : "Nodes only", exact: true }).click();
    await expect(graph.locator('[data-stella-vertex][aria-disabled="true"]')).toHaveCount(8);
    await expect(page.locator(".theory-k8-comparison-metrics dd strong")).toHaveText(["—", "—"]);
    // Dispatch a DOM click too: the selection handler must reject disabled vertices.
    await graph.locator('[data-stella-vertex="0"]').dispatchEvent("click");
    await expect(graph.locator("[data-stella-comparison-role]")).toHaveCount(0);
    await distance1.click();
    const origin = graph.locator('[data-stella-vertex="0"]');
    await origin.focus();
    await origin.press("Enter");
    await expect(origin).toBeFocused();
    await expect(distance1).toHaveAttribute("aria-pressed", "true");
    await expect(graph).toHaveAttribute("data-stella-distances", "1");
    await expect(graph.locator("[data-k8-edge]")).toHaveCount(12);
    await expect(graph.locator('[data-k8-edge-active="true"]')).toHaveCount(3);
    await expect(graph.locator('[data-stella-vertex="3"]')).toBeDisabled();
    await graph.locator('[data-stella-vertex="3"]').dispatchEvent("click");
    await expect(graph.locator('[data-stella-comparison-role="b"]')).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(graph.locator('[data-stella-vertex="1"]')).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(graph.locator('[data-stella-vertex="2"]')).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(graph.locator('[data-stella-vertex="4"]')).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.locator("[data-pair-distance]")).toHaveText("1");
    await expect(page.locator("[data-pair-gap]")).toHaveText("4");
    expect(await positions()).toEqual(before);
    await origin.press("Space");
    await expect(graph.locator('[data-k8-edge-active="true"]')).toHaveCount(0);

    await expect(page.getByTestId("k8-distance-comparison")).toHaveCount(0);
    await expect(page.locator(".theory-k8-note")).toHaveCount(0);
    for (const distance of [2, 3]) {
      await modes
        .getByRole("button", {
          name:
            language === "ja" ? `距離${distance} ${distance === 3 ? 4 : 12}本` : `Distance ${distance} · ${distance === 3 ? 4 : 12} edges`,
          exact: true,
        })
        .click();
    }
    await expect(graph.locator("[data-k8-edge]")).toHaveCount(28);
    await expect(modes.locator('button[aria-pressed="true"]')).toHaveCount(3);
    for (const level of [3, 4]) {
      const vertex = graph.locator(`[data-stella-vertex="${level}"]`);
      await vertex.focus();
      await vertex.press("Enter");
    }
    await expect(graph.locator('[data-k8-edge-active="true"]')).toHaveCount(1);
    await expect(graph.locator('[data-k8-edge="3-4"]')).toHaveAttribute("data-k8-edge-active", "true");
    const comparison = page.getByTestId("stella-comparison-status");
    await expect(comparison.locator("[data-pair-distance]")).toHaveText("3");
    await expect(comparison.locator("[data-pair-gap]")).toHaveText("1");
    const details = page.locator(".theory-k8-comparison-details");
    await expect(details).toHaveRole("group");
    await expect(page.locator(".theory-k8-comparison details, .theory-k8-comparison summary")).toHaveCount(0);
    await expect(details.getByText("011 ⊕ 100 = 111", { exact: true })).toBeVisible();
    expect(await positions()).toEqual(before);
    await expect(page.getByTestId("tetra-face-duality")).toHaveCount(0);
    await expect(page.locator("#theory-k8").getByRole("combobox")).toHaveCount(0);
    await expect(page.locator("#theory-k8")).toContainText("d=a⊕b⊕c");

    for (const width of [320, 362, 395, 547, 640, 715, 761, 870, 1039]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator(".theory-k8-controls").scrollIntoViewIfNeeded();
      const layout = await page.evaluate(() => {
        const graphic = document.querySelector("#theory-stella-view")!.getBoundingClientRect();
        const modes = document.querySelector(".theory-k8-display-modes")!.getBoundingClientRect();
        const controls = document.querySelectorAll(".theory-k8-display-modes button");
        const metrics = [...document.querySelectorAll(".theory-k8-comparison-metrics > div")].map((node) => node.getBoundingClientRect());
        return {
          controlsBelow: modes.top >= graphic.bottom,
          controlCount: document.querySelectorAll(".theory-k8-controls button").length,
          metricsSideBySide: Math.abs(metrics[0].top - metrics[1].top) < 1 && metrics[0].right <= metrics[1].left,
          labelsInOneRow: [...controls].every((node) => {
            const label = node.querySelector("span")!.getBoundingClientRect();
            const count = node.querySelector("small")?.getBoundingClientRect();
            return !count || (label.right <= count.left && Math.abs(label.top + label.height / 2 - count.top - count.height / 2) < 1);
          }),
          compactButtons: [...controls].every((node) => {
            const box = node.getBoundingClientRect();
            return box.width >= 44 && box.height === 28;
          }),
          fits: [
            ...document.querySelectorAll(
              ".theory-subset, .theory-subset-values, .theory-subset p, .theory-k8-controls, .theory-k8-display-modes, .theory-k8-display-modes button, .theory-k8-summary, .theory-k8-summary > div, .theory-k8-summary code, .theory-k8-edge-legend, .theory-k8-comparison, .theory-k8-comparison-metrics > div, .theory-k8-comparison-metrics dt, .theory-k8-comparison code, .theory-k8-comparison p, .theory-k8-comparison-status",
            ),
          ].every((node) => {
            const box = node.getBoundingClientRect();
            return box.left >= 0 && box.right <= innerWidth && node.scrollWidth <= node.clientWidth + 1;
          }),
        };
      });
      expect(layout).toEqual({
        controlsBelow: true,
        controlCount: 4,
        metricsSideBySide: true,
        labelsInOneRow: true,
        compactButtons: true,
        fits: true,
      });
      const fanoControls = page.locator(".theory-fano-controls");
      await fanoControls.scrollIntoViewIfNeeded();
      const fanoLayout = await fanoControls.evaluate((root) => {
        const buttons = [...root.querySelectorAll("button")];
        return {
          fits: [root, ...buttons].every((node) => {
            const bounds = node.getBoundingClientRect();
            return bounds.left >= 0 && bounds.right <= innerWidth && node.scrollWidth <= node.clientWidth + 1;
          }),
        };
      });
      expect(fanoLayout).toEqual({ fits: true });
    }
    await distance1.click();
    await expect(graph.locator("[data-k8-edge]")).toHaveCount(16);
    await expect(comparison.locator("[data-pair-distance]")).toHaveText("3");
    await expect(details.getByText("011 ⊕ 100 = 111", { exact: true })).toBeVisible();
    const distance3 = modes.getByRole("button", { name: language === "ja" ? "距離3 4本" : "Distance 3 · 4 edges", exact: true });
    await distance3.click();
    await expect(graph.locator('[data-stella-comparison-role="a"]')).toHaveAttribute("data-stella-vertex", "3");
    await expect(graph.locator('[data-stella-comparison-role="b"]')).toHaveCount(0);
    await expect(graph.locator('[data-stella-vertex="4"]')).toBeDisabled();
    await expect(comparison.locator("dd strong")).toHaveText(["—", "—"]);
    await modes.getByRole("button", { name: language === "ja" ? "ノードのみ" : "Nodes only", exact: true }).click();
    await expect(graph.locator("[data-stella-comparison-role]")).toHaveCount(0);
    await expect(graph.locator('[data-stella-vertex][aria-disabled="true"]')).toHaveCount(8);
  }
});

for (const language of ["ja", "en"]) {
  test(`links Fano points and lines to H without shifting the ${language} explorer`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("theory-dev.html");
    const explorer = page.getByTestId("fano-hamming-correspondence");
    const checks = explorer.getByTestId("fano-hamming-checks");
    const background = explorer.locator(".theory-fano-plot");
    const clear = () => background.click({ position: { x: 4, y: 4 } });
    const leaveSelection = () => background.hover({ position: { x: 4, y: 4 } });
    const column = (point: number) => explorer.locator(`[data-h-column="${point}"]`);
    const activeColumns = () =>
      explorer
        .locator('[data-h-column][data-active="true"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-h-column")));
    const layout = () =>
      explorer.evaluate((root) => {
        const origin = root.getBoundingClientRect();
        const nodes = [
          root,
          ...root.querySelectorAll(
            ".theory-fano-geometry, .theory-fano-geometry > svg, .theory-fano-controls, .theory-fano-matrix, .theory-fano-checks, .theory-fano-syndrome, .theory-fano-line-choices",
          ),
          document.querySelector("#theory-hamming")!,
        ];
        return nodes.map((node) => {
          const bounds = node.getBoundingClientRect();
          return [bounds.x - origin.x, bounds.y - origin.y, bounds.width, bounds.height].map((value) => Math.round(value * 10) / 10);
        });
      });

    await expect(page.getByTestId("hamming-fano-bridge")).toHaveCount(0);
    await expect(explorer.locator("[data-fano-point]")).toHaveCount(7);
    await expect(explorer.locator("[data-fano-line]")).toHaveCount(7);
    await expect(explorer.locator("[data-fano-line-choice]")).toHaveCount(7);
    await expect(explorer.locator("[data-h-column]")).toHaveCount(7);

    for (const width of [320, 390, 447, 564, 600, 642, 673, 674, 702, 722, 768, 843, 844, 1043, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      await clear();
      await expect(checks).toHaveAttribute("data-word", "");
      const initial = await layout();
      const frame = await explorer.evaluate((root) => {
        const geometry = root.querySelector(".theory-fano-geometry")!.getBoundingClientRect();
        const matrix = root.querySelector(".theory-fano-matrix")!.getBoundingClientRect();
        const footer = root.querySelector(".theory-fano-matrix-footer")!.getBoundingClientRect();
        const choices = root.querySelector(".theory-fano-line-choices")!.getBoundingClientRect();
        const matrixSections = [...root.querySelector(".theory-fano-matrix")!.children].map((section) => section.getBoundingClientRect());
        const bits = [...root.querySelectorAll('.theory-fano-matrix-column[data-h-column="1"] [data-bit]')];
        return {
          panelWidth: root.getBoundingClientRect().width,
          panelHeight: root.getBoundingClientRect().height,
          sideBySide: matrix.left >= geometry.right,
          plotWidth: root.querySelector(".theory-fano-plot")!.getBoundingClientRect().width,
          checkRowsHeight: root.querySelector(".theory-fano-check-rows")!.getBoundingClientRect().height,
          checksHeight: root.querySelector(".theory-fano-checks")!.getBoundingClientRect().height,
          footerBottomInset: root.getBoundingClientRect().bottom - footer.bottom,
          footerControlsGap: Math.abs(footer.bottom - choices.bottom),
          largestSectionGap: Math.max(...matrixSections.slice(1).map((section, index) => section.top - matrixSections[index].bottom)),
          lineChoiceRows: new Set([...root.querySelectorAll("[data-fano-line-choice]")].map((node) => node.getBoundingClientRect().top))
            .size,
          topGap: Math.abs(matrix.top - geometry.top),
          stackedGap: matrix.top - geometry.bottom,
          rowGap: bits[1].getBoundingClientRect().top - bits[0].getBoundingClientRect().top,
        };
      });
      expect(frame.sideBySide, `${language}, ${width}px`).toBe(frame.panelWidth >= 540);
      expect(frame.lineChoiceRows).toBe(1);
      expect(frame.plotWidth).toBeLessThanOrEqual(270);
      expect(frame.checkRowsHeight).toBeLessThanOrEqual(42);
      expect(frame.footerBottomInset).toBeLessThanOrEqual(5);
      expect(frame.largestSectionGap).toBeLessThanOrEqual(18);
      if (frame.sideBySide) {
        expect(frame.topGap).toBeLessThanOrEqual(1);
        expect(frame.footerControlsGap).toBeLessThanOrEqual(1);
        expect(frame.plotWidth).toBeGreaterThanOrEqual(240);
        expect(frame.rowGap).toBeGreaterThanOrEqual(22);
        expect(frame.rowGap).toBeLessThanOrEqual(24);
        expect(frame.panelHeight).toBeLessThanOrEqual(380);
      } else {
        expect(frame.stackedGap).toBeGreaterThanOrEqual(0);
        expect(frame.rowGap).toBeLessThanOrEqual(20);
        expect(frame.checkRowsHeight).toBeLessThanOrEqual(22);
        expect(frame.checksHeight).toBeLessThanOrEqual(111);
      }
      const filters = explorer.locator("[data-fano-filter]");
      await expect(filters).toHaveCount(3);
      expect(await filters.evaluateAll((buttons) => new Set(buttons.map((button) => button.getBoundingClientRect().top)).size)).toBe(1);
      const blue = explorer.locator('[data-fano-point="1"]');
      await blue.focus();
      await blue.press("Enter");
      await expect(column(1)).toHaveAttribute("aria-pressed", "true");
      await expect(checks).toHaveAttribute("data-word", "1000000");
      await expect(checks).toHaveAttribute("data-syndrome", "001");
      expect(await layout()).toEqual(initial);

      const line = explorer.locator('[data-fano-line-choice="1-2-3"]');
      await line.focus();
      await line.press("Enter");
      await leaveSelection();
      expect(await activeColumns()).toEqual(["1", "2", "3"]);
      await expect(checks).toHaveAttribute("data-word", "1110000");
      await expect(checks).toHaveAttribute("data-syndrome", "000");
      await expect(line).toHaveAttribute("aria-pressed", "true");
      expect(await layout()).toEqual(initial);

      await column(5).hover();
      expect(await activeColumns()).toEqual(["5"]);
      await expect(checks).toHaveAttribute("data-syndrome", "101");
      expect(await layout()).toEqual(initial);
      await leaveSelection();
      expect(await activeColumns()).toEqual(["1", "2", "3"]);

      const circle = explorer.locator('[data-fano-line-hit="3-5-6"] circle');
      await circle.scrollIntoViewIfNeeded();
      const hit = await circle.evaluate((element) => {
        const circle = element as SVGCircleElement;
        const point = new DOMPoint(circle.cx.baseVal.value - circle.r.baseVal.value, circle.cy.baseVal.value);
        const screen = point.matrixTransform(circle.getScreenCTM()!);
        return { x: screen.x, y: screen.y };
      });
      await page.mouse.click(hit.x, hit.y);
      await leaveSelection();
      expect(await activeColumns()).toEqual(["3", "5", "6"]);
      await expect(checks).toHaveAttribute("data-word", "0010110");
      await expect(checks).toHaveAttribute("data-syndrome", "000");
      await expect(explorer.locator('[data-fano-line-choice="3-5-6"]')).toHaveAttribute("aria-pressed", "true");
      expect(await layout()).toEqual(initial);

      await column(4).focus();
      await column(4).press("Enter");
      await expect(checks).toHaveAttribute("data-word", "0001000");
      await expect(checks).toHaveAttribute("data-syndrome", "100");
      await column(4).press("Escape");
      await expect(checks).toHaveAttribute("data-word", "");
      expect(await layout()).toEqual(initial);

      for (const point of [3, 5]) {
        await explorer.locator(`[data-fano-point="${point}"]`).click();
        expect(await layout()).toEqual(initial);
      }
      await expect(explorer.locator('[data-fano-point="6"]')).toHaveAttribute("data-fano-selection-role", "c");
      await expect(checks).toHaveAttribute("data-syndrome", "000");
      await line.hover();
      expect(await activeColumns()).toEqual(["3", "5", "6"]);
      await column(4).hover();
      expect(await activeColumns()).toEqual(["3", "5", "6"]);
      await clear();
      expect(await layout()).toEqual(initial);

      for (const [filter, count] of [
        ["primary", 4],
        ["complement", 1],
        ["secondary", 0],
        ["primary", 3],
        ["secondary", 4],
        ["complement", 7],
      ] as const) {
        await explorer.locator(`[data-fano-filter="${filter}"]`).click();
        await expect(explorer.locator("[data-fano-line]")).toHaveCount(count);
        expect(await layout()).toEqual(initial);
      }
      const overflow = await explorer.evaluate((root) =>
        [...root.querySelectorAll("div, p, button, code, span")]
          .filter((node) => {
            const bounds = node.getBoundingClientRect();
            return node.clientWidth > 0 && (node.scrollWidth > node.clientWidth + 1 || bounds.left < 0 || bounds.right > innerWidth + 1);
          })
          .map((node) => ({ tag: node.tagName, class: node.className, text: node.textContent })),
      );
      expect(overflow, `${language}, ${width}px`).toEqual([]);
    }
  });
}

test.describe("Fano on touch screens", () => {
  test.use({ hasTouch: true });
  test("selects and clears points and lines without leaving a hover result behind", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("theory-dev.html");
    const panel = page.getByTestId("fano-hamming-correspondence");
    const checks = panel.getByTestId("fano-hamming-checks");
    for (const [selector, word] of [
      ['[data-h-column="2"]', "0100000"],
      ['[data-fano-point="1"]', "1000000"],
      ['[data-fano-line-choice="3-5-6"]', "0010110"],
    ]) {
      const target = panel.locator(selector);
      await target.tap();
      await expect(checks).toHaveAttribute("data-word", word);
      await expect(target).toHaveAttribute("aria-pressed", "true");
      await target.tap();
      await expect(checks).toHaveAttribute("data-word", "");
      await expect(target).toHaveAttribute("aria-pressed", "false");
    }
    await panel.locator('[data-fano-line-choice="3-5-6"]').tap();
    const cyan = panel.locator('[data-fano-point="5"]');
    await cyan.tap();
    await expect(checks).toHaveAttribute("data-word", "0000100");
    await cyan.tap();
    await expect(checks).toHaveAttribute("data-word", "");
    await panel.locator('[data-h-column="7"]').tap();
    await expect(checks).toHaveAttribute("data-word", "0000001");

    const background = panel.locator(".theory-fano-plot");
    await background.tap({ position: { x: 4, y: 4 } });
    for (const point of [3, 5]) await panel.locator(`[data-fano-point="${point}"]`).tap();
    await expect(checks).toHaveAttribute("data-word", "0010110");
    await expect(panel.locator('[data-fano-point="6"]')).toHaveAttribute("data-fano-selection-role", "c");
    await background.tap({ position: { x: 4, y: 4 } });
    await expect(checks).toHaveAttribute("data-word", "");
    await expect(panel.locator('[data-fano-point][aria-pressed="true"]')).toHaveCount(0);
    for (const category of ["primary", "complement", "secondary"]) await panel.locator(`[data-fano-filter="${category}"]`).tap();
    await expect(panel.locator("[data-fano-line]")).toHaveCount(0);
    await expect(panel.locator("[data-fano-point]")).toHaveCount(7);
    await panel.locator('[data-fano-filter="primary"]').tap();
    await expect(panel.locator("[data-fano-line]")).toHaveCount(3);
  });
});

for (const language of ["ja", "en"]) {
  test(`keeps the inline Cayley table compact and stable during ${language} selection`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    const explorer = page.getByTestId("toggle-action-explorer");
    await expect(page.locator("#theory-cube-cycle #theory-toggle-table")).toBeVisible();
    await expect(page.locator("#theory-toggle-appendix")).toHaveCount(0);
    const distances = page.locator(".theory-k8-display-modes button");
    for (const index of [1, 2, 3]) await expect(distances.nth(index)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-k8-edge]")).toHaveCount(28);
    await expect(explorer.locator('.theory-cayley-table button[aria-disabled="true"]')).toHaveCount(0);
    const readout = page.getByTestId("toggle-action-readout");
    const cell = (row: number, mask: number) => explorer.locator(`button[data-row="${row}"][data-mask="${mask}"]`);
    const clear = () => explorer.locator(".theory-toggle-hint").click();
    const layout = () =>
      explorer.evaluate((root) => {
        const origin = root.getBoundingClientRect();
        return [root, ...root.querySelectorAll(".theory-cayley-table, .theory-toggle-readout, .theory-toggle-hint")].map((element) => {
          const box = element.getBoundingClientRect();
          return [box.x - origin.x, box.y - origin.y, box.width, box.height];
        });
      });
    await expect(explorer.locator("td button")).toHaveCount(64);
    for (const width of [320, 390, 494, 543, 544, 779, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      await clear();
      await expect(readout).toHaveAttribute("data-state", "");
      const initial = await layout();
      const readoutFrame = await readout.evaluate((root) => {
        const values = root.querySelector(".theory-toggle-values")!.getBoundingClientRect();
        const metrics = root.querySelector(".theory-k8-comparison-metrics")!.getBoundingClientRect();
        return {
          width: root.getBoundingClientRect().width,
          height: root.getBoundingClientRect().height,
          valuesHeight: values.height,
          metricsBelow: metrics.top >= values.bottom,
        };
      });
      expect(readoutFrame.metricsBelow).toBe(readoutFrame.width < 500);
      if (readoutFrame.metricsBelow) {
        expect(readoutFrame.height).toBeLessThanOrEqual(210);
        expect(readoutFrame.valuesHeight).toBeLessThanOrEqual(40);
      }
      await explorer.locator('[data-toggle-state="6"]').click();
      await expect(readout).toHaveAttribute("data-state", "6");
      await expect(readout).toHaveAttribute("data-mask", "");
      await expect(explorer.locator('td button[data-axis="true"]')).toHaveCount(8);
      expect(await layout()).toEqual(initial);

      await cell(6, 2).hover();
      await expect(readout).toHaveAttribute("data-result", "4");
      await cell(6, 2).click();
      await expect(readout).toHaveAttribute("data-pinned", "true");
      await expect(page.locator('[data-stella-comparison-role="a"]')).toHaveAttribute("data-stella-vertex", "6");
      await expect(page.locator('[data-stella-comparison-role="b"]')).toHaveAttribute("data-stella-vertex", "4");
      await expect(explorer.locator('td button[data-active="true"]')).toHaveCount(2);
      await cell(1, 7).hover();
      await expect(readout).toHaveAttribute("data-state", "6");
      await expect(readout).toHaveAttribute("data-mask", "2");
      expect(await layout()).toEqual(initial);

      await cell(6, 2).focus();
      await cell(6, 2).press("ArrowRight");
      await expect(cell(6, 3)).toBeFocused();
      await expect(readout).toHaveAttribute("data-result", "4");
      await cell(6, 3).press("Enter");
      await expect(readout).toHaveAttribute("data-result", "5");
      await cell(6, 3).press("Escape");
      await expect(readout).toHaveAttribute("data-result", "");
      expect(await layout()).toEqual(initial);

      await cell(0, 0).focus();
      await cell(0, 0).press("Control+End");
      await expect(cell(7, 7)).toBeFocused();
      await expect(readout).toHaveAttribute("data-result", "0");
      await cell(7, 7).press("Enter");
      await cell(7, 7).press("Enter");
      await expect(readout).toHaveAttribute("data-result", "");
      expect(await layout()).toEqual(initial);
      await clear();

      await explorer.locator('[data-toggle-mask="5"]').click();
      await expect(readout).toHaveAttribute("data-mask", "5");
      await expect(readout).toHaveAttribute("data-result", "");
      await expect(page.locator('[data-k8-edge-active="true"][data-k8-mask="5"]')).toHaveCount(4);
      await expect(explorer.locator('td button[data-active="true"]')).toHaveCount(8);
      expect(await layout()).toEqual(initial);
      await page.locator('[data-stella-vertex="0"]').click();
      await page.locator('[data-stella-vertex="7"]').click();
      await expect(cell(0, 7)).toHaveAttribute("data-active", "true");
      await expect(cell(7, 7)).toHaveAttribute("data-active", "true");
      await expect(readout).toHaveAttribute("data-result", "7");
      expect(await layout()).toEqual(initial);
      await distances.nth(3).click();
      await expect(explorer.locator('[data-toggle-mask="7"]')).toHaveAttribute("aria-disabled", "true");
      await expect(readout).toHaveAttribute("data-result", "");
      expect(await layout()).toEqual(initial);
      await distances.nth(3).click();
      await clear();
      const overflow = await explorer.evaluate((root) =>
        [...root.querySelectorAll("*")]
          .filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
          .map((el) => ({ tag: el.tagName, text: el.textContent })),
      );
      expect(overflow, `${language}, ${width}px`).toEqual([]);
      expect(await explorer.locator('td button[tabindex="0"]').count()).toBe(1);
    }
  });
}

test.describe("Cayley table on touch screens", () => {
  test.use({ hasTouch: true });
  test("pins and clears transitions without a lingering touch hover", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.goto("theory-dev.html");
    const explorer = page.getByTestId("toggle-action-explorer");
    const readout = page.getByTestId("toggle-action-readout");
    await explorer.locator('[data-toggle-state="3"]').tap();
    await expect(readout).toHaveAttribute("data-state", "3");
    const cell = explorer.locator('[data-row="3"][data-mask="5"]');
    await cell.tap();
    await expect(readout).toHaveAttribute("data-result", "6");
    await expect(readout).toHaveAttribute("data-pinned", "true");
    await cell.tap();
    await expect(readout).toHaveAttribute("data-result", "");
    await cell.tap();
    await explorer.locator(".theory-toggle-hint").tap();
    await expect(readout).toHaveAttribute("data-state", "");
    await expect(explorer.locator('[aria-pressed="true"]')).toHaveCount(0);
  });
});

test("reveals Hamming results in sequence and discards calculations from superseded inputs", async ({ page }) => {
  await page.setViewportSize({ width: 534, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
  await page.clock.install({ time: new Date("2026-09-06T00:00:00Z") });
  await page.goto("theory-dev.html");
  await expect(page.getByTestId("hamming-stage-output").locator("[data-bit-string]")).toHaveAttribute("data-bit-string", "0000");
  await page.clock.pauseAt(new Date("2026-09-06T01:00:00Z"));
  for (const index of [1, 3, 4]) await page.getByTestId(`hamming-data-${index}`).click();
  await page.clock.runFor(1800);
  await expect(page.getByTestId("hamming-stage-output").locator("[data-bit-string]")).toHaveAttribute("data-bit-string", "1011");
  const encoded = page.getByTestId("hamming-stage-encoded");
  const received = page.getByTestId("hamming-stage-received");
  const syndrome = page.getByTestId("hamming-stage-syndrome");
  const corrected = page.getByTestId("hamming-stage-corrected");
  const output = page.getByTestId("hamming-stage-output");
  const checks = page.getByTestId("hamming-parity-check-card");
  const generation = page.getByTestId("hamming-parity-generation");
  const generationFormulas = generation.locator(".theory-hamming-generation-formula");
  await expect(generation.locator(".theory-hamming-generation-heading")).toHaveText(["D₁ D₂ D₄ P₁", "D₁ D₃ D₄ P₂", "D₂ D₃ D₄ P₄"]);
  await expect(generationFormulas).toHaveText(["1 ⊕ 0 ⊕ 1 = 0", "1 ⊕ 1 ⊕ 1 = 1", "0 ⊕ 1 ⊕ 1 = 0"]);
  const generationColumns = await generation.evaluate((root) => {
    const textCenter = (element: Element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const box = range.getBoundingClientRect();
      return box.x + box.width / 2;
    };
    return [...root.children].flatMap((card) => {
      const heading = card.querySelector(".theory-hamming-generation-heading")!;
      const formula = card.querySelector(".theory-hamming-generation-formula")!;
      return [0, 2, 4, 6].map((column) => [textCenter(heading.children[column]), textCenter(formula.children[column])]);
    });
  });
  // Text-derived centres shift by fractions of a pixel between font stacks, so
  // assert the alignment the reader can actually perceive rather than exact equality.
  generationColumns.forEach(([label, value], index) => expect(Math.abs(value - label), `generation column ${index}`).toBeLessThan(1.5));
  const readGenerationLayout = () =>
    generation.evaluate((root) => {
      const origin = root.getBoundingClientRect();
      return [root, ...root.querySelectorAll("div, span, strong")].map((element) => {
        const box = element.getBoundingClientRect();
        return [box.x - origin.x, box.y - origin.y, box.width, box.height];
      });
    });
  const readFormulaLayout = () =>
    checks.locator(".theory-hamming-check-formula").evaluateAll((formulas) =>
      formulas.map((formula) => {
        const origin = formula.getBoundingClientRect();
        return {
          slots: [...formula.children].map((slot) => {
            const box = slot.getBoundingClientRect();
            return [box.x - origin.x, box.y - origin.y, box.width, box.height];
          }),
          xorSymbols: [...formula.querySelectorAll(".theory-hamming-check-operator")]
            .filter((operator) => operator.textContent?.includes("⊕"))
            .map((operator) => {
              const node = operator.firstChild!;
              const offset = node.textContent!.indexOf("⊕");
              const range = document.createRange();
              range.setStart(node, offset);
              range.setEnd(node, offset + 1);
              const box = range.getBoundingClientRect();
              return [box.x - origin.x, box.y - origin.y];
            }),
        };
      }),
    );

  const initialGenerationLayout = await readGenerationLayout();
  await page.getByTestId("hamming-data-2").click();
  await expect(encoded).toHaveAttribute("aria-busy", "true");
  await expect(generation.locator("strong")).toHaveText(["P₁", "P₂", "P₄"]);
  await expect(generationFormulas).toHaveText(["D₁ ⊕ D₂ ⊕ D₄ = P₁", "D₁ ⊕ D₃ ⊕ D₄ = P₂", "D₂ ⊕ D₃ ⊕ D₄ = P₄"]);
  expect(await readGenerationLayout()).toEqual(initialGenerationLayout);
  await expect(encoded.locator("[data-bit-string]")).toHaveCount(0);
  await expect(output.locator("[data-bit-string]")).toHaveCount(0);
  await expect(page.getByTestId("hamming-status")).toContainText("Calculating");
  await page.clock.runFor(360);
  await expect(encoded.locator("[data-bit-string]")).toHaveAttribute("data-bit-string", "1111111");
  await expect(generation.locator("strong")).toHaveText(["1", "1", "1"]);
  await expect(generationFormulas).toHaveText(["1 ⊕ 1 ⊕ 1 = 1", "1 ⊕ 1 ⊕ 1 = 1", "1 ⊕ 1 ⊕ 1 = 1"]);
  expect(await readGenerationLayout()).toEqual(initialGenerationLayout);
  await expect(received.locator("[data-bit-string]")).toHaveCount(0);
  await page.clock.runFor(360);
  await expect(received.locator("[data-bit-string]")).toHaveAttribute("data-bit-string", "1111111");
  await expect(checks.locator("[data-parity-check-result]")).toHaveCount(0);
  await expect(checks.locator('[data-parity-check-channel="sG"]')).toContainText("r₄ ⊕ r₅ ⊕ r₆ ⊕ r₇");
  await expect(checks.locator('[data-parity-check-channel="sR"]')).toContainText("r₂ ⊕ r₃ ⊕ r₆ ⊕ r₇");
  await expect(checks.locator('[data-parity-check-channel="sB"]')).toContainText("r₁ ⊕ r₃ ⊕ r₅ ⊕ r₇");
  const pendingFormulaLayout = await readFormulaLayout();
  await page.clock.runFor(180);
  await expect(checks.locator("[data-parity-check-result]")).toHaveCount(1);
  await expect(checks.locator('[data-parity-check-channel="sG"]')).toHaveAttribute("data-parity-check-result", "0");
  await expect(checks.locator('[data-parity-check-channel="sG"]')).toContainText("1 ⊕ 1 ⊕ 1 ⊕ 1 = 0");
  await expect(checks.locator('[data-parity-check-channel="sR"]')).toContainText("r₂ ⊕ r₃ ⊕ r₆ ⊕ r₇");
  await expect(checks.locator('[data-parity-check-channel="sB"]')).toContainText("r₁ ⊕ r₃ ⊕ r₅ ⊕ r₇");
  expect(await readFormulaLayout()).toEqual(pendingFormulaLayout);
  await expect(syndrome.locator("[data-syndrome-bits]")).toHaveCount(0);
  await page.clock.runFor(360);
  await expect(syndrome.locator("[data-syndrome-bits]")).toHaveAttribute("data-syndrome-bits", "000");
  await expect(corrected.locator("[data-bit-string]")).toHaveCount(0);
  await page.clock.runFor(540);
  await expect(output.locator("[data-bit-string]")).toHaveAttribute("data-bit-string", "1111");
  expect(await readFormulaLayout()).toEqual(pendingFormulaLayout);

  await page.getByTestId("hamming-error-5").click();
  expect(await readFormulaLayout()).toEqual(pendingFormulaLayout);
  await expect(encoded.locator("[data-bit-string]")).toHaveAttribute("data-bit-string", "1111111");
  await expect(received.locator("[data-bit-string]")).toHaveCount(0);
  await page.clock.runFor(180);
  await expect(received.locator("[data-bit-string]")).toHaveAttribute("data-bit-string", "1111011");
  await page.clock.runFor(540);
  await expect(syndrome.locator("[data-syndrome-bits]")).toHaveAttribute("data-syndrome-bits", "101");
  await page.getByTestId("hamming-data-2").click();
  await expect(syndrome.locator("[data-syndrome-bits]")).toHaveCount(0);
  await page.clock.runFor(540);
  await expect(output.locator("[data-bit-string]")).toHaveCount(0);
  await page.clock.runFor(1260);
  await expect(output.locator("[data-bit-string]")).toHaveAttribute("data-bit-string", "1011");
  await expect(page.getByTestId("hamming-status")).toContainText("position 5");
});

test("reports a codeword-shaped error pattern as undetected instead of a flip at position 0", async ({ page }) => {
  for (const language of ["ja", "en"] as const) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    for (const position of [1, 2, 3]) await page.getByTestId(`hamming-error-${position}`).click();
    await expect(page.getByTestId("hamming-stage-syndrome").locator("[data-syndrome-bits]")).toHaveAttribute("data-syndrome-bits", "000");
    await expect(page.getByTestId("hamming-stage-corrected").locator("[data-bit-string]")).toHaveAttribute("data-bit-string", "1110000");
    await expect(page.getByTestId("hamming-stage-output").locator("[data-bit-string]")).toHaveAttribute("data-bit-string", "1000");
    await expect(page.getByTestId("hamming-flow-operation-correction")).toContainText(
      language === "ja" ? "j=0 → 反転しない（eが符号語のため検出不能）" : "j=0 → Keep RECEIVED unchanged (e is a codeword, undetected)",
    );
    await expect(page.getByTestId("hamming-status")).toContainText(language === "ja" ? "それ自体符号語" : "itself a codeword");
    await expect(page.getByTestId("hamming-status")).not.toContainText(language === "ja" ? "位置0" : "position 0");
  }
});

test("connects accessible parity-set controls to four positions, live equations, and delayed error toggles", async ({ page }) => {
  for (const language of ["ja", "en"]) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    const sets = page.getByTestId("hamming-parity-sets");
    const blueCheck = page.getByTestId("hamming-venn-check-1");
    const node = page.getByTestId("hamming-venn-position-5");
    await expect(page.getByTestId("hamming-venn-detail")).toHaveCount(0);
    await expect(sets.locator('svg [role="button"]')).toHaveCount(7);
    await blueCheck.click();
    await expect(sets.locator('[data-check-member="true"]')).toHaveCount(4);
    await expect(blueCheck).toContainText("0 ⊕ 0 ⊕ 0 ⊕ 0 = 0");
    await expect(blueCheck.locator(".theory-hamming-check-reason")).toHaveText(language === "ja" ? "1が0個（偶数）" : "0 ones (even)");
    await node.focus();
    await node.press("Enter");
    await expect(node).toHaveAttribute("aria-pressed", "true");
    await expect(node).toBeFocused();
    await expect(page.getByTestId("hamming-error-5")).toHaveAttribute("aria-pressed", "true");
    await expect(blueCheck.locator("[data-check-value]")).toHaveAttribute("data-check-value", "1");
    await expect(blueCheck).toContainText("0 ⊕ 0 ⊕ 1 ⊕ 0 = 1");
    await expect(blueCheck.locator(".theory-hamming-check-reason")).toHaveText(language === "ja" ? "1が1個（奇数）" : "1 one (odd)");
    const receivedError = page.getByTestId("hamming-error-5");
    await expect(receivedError).toHaveCSS("border-color", "rgb(255, 64, 96)");
    await expect(receivedError.locator("[data-bit-value]")).toHaveCSS("text-decoration-line", "underline");
    await page.getByTestId("hamming-venn-check-2").click();
    await expect(receivedError).toHaveAttribute("data-parity-member", "false");
    await expect(receivedError).toHaveCSS("opacity", "1");
    await expect(receivedError).toHaveCSS("border-color", "rgb(255, 64, 96)");
    await expect(receivedError.locator("[data-bit-value]")).toHaveCSS("text-decoration-line", "none");
    await blueCheck.click();
    await node.press("Space");
    await expect(node).toHaveAttribute("aria-pressed", "false");
    await expect(blueCheck.locator("[data-check-value]")).toHaveAttribute("data-check-value", "0");
    await expect(node).toBeFocused();
    await blueCheck.click();
    await expect(sets.locator('[data-check-member="true"]')).toHaveCount(7);
    for (const width of [320, 362, 395, 448, 527, 547, 639, 640, 715, 814, 866, 1039]) {
      await page.setViewportSize({ width, height: 900 });
      await sets.scrollIntoViewIfNeeded();
      if ((await blueCheck.getAttribute("aria-pressed")) === "true") await blueCheck.click();
      const readPositions = () =>
        sets.evaluate((root) =>
          [root, ...root.querySelectorAll(".theory-hamming-sets-figure, .theory-hamming-check-choice")].map((element) => {
            const box = element.getBoundingClientRect();
            return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height };
          }),
        );
      const initialPositions = await readPositions();
      for (const parity of [4, 2, 1, 1]) {
        await sets.getByTestId(`hamming-venn-check-${parity}`).click();
        const positions = await readPositions();
        positions.forEach((box, index) => {
          for (const dimension of ["x", "y", "width", "height"] as const) {
            expect(box[dimension], `${language} ${width}px P${parity}: fixed ${dimension}`).toBeCloseTo(
              initialPositions[index][dimension],
              1,
            );
          }
        });
      }
      await blueCheck.click();
      const layout = await sets.evaluate((root) => {
        const layoutBox = root.querySelector(".theory-hamming-sets-layout")!.getBoundingClientRect();
        const figure = root.querySelector("figure")!.getBoundingClientRect();
        const inspector = root.querySelector(".theory-hamming-check-choices")!.getBoundingClientRect();
        const legend = root.querySelector(".theory-hamming-sets-legend-row")!;
        const legendBox = legend.getBoundingClientRect();
        return {
          legendFitsOneLine:
            legendBox.left >= figure.left &&
            legendBox.right <= figure.right &&
            [...legend.children].every((item) => {
              const box = item.getBoundingClientRect();
              return Math.abs(box.top + box.height / 2 - (legendBox.top + legendBox.height / 2)) < 1;
            }),
          touchTargets: [...root.querySelectorAll(".theory-hamming-node-target, button")].every((element) => {
            const box = element.getBoundingClientRect();
            const minimum = element.tagName === "BUTTON" ? 44 : 24;
            return box.width >= minimum && box.height >= minimum;
          }),
          fits: [
            ...root.querySelectorAll(
              "svg, button, p, .theory-hamming-check-identity, .theory-hamming-check-formula, .theory-hamming-check-reason",
            ),
          ].every((element) => {
            const box = element.getBoundingClientRect();
            return box.left >= 0 && box.right <= window.innerWidth && element.scrollWidth <= element.clientWidth + 1;
          }),
          sideBySide: figure.right <= inspector.left && figure.top < inspector.bottom && inspector.top < figure.bottom,
          headingFits: [...root.querySelectorAll(".theory-hamming-check-heading")].every((heading) => {
            const identity = heading.querySelector(".theory-hamming-check-identity")!.getBoundingClientRect();
            const state = heading.querySelector(".theory-hamming-check-state")!.getBoundingClientRect();
            return identity.right <= state.left;
          }),
          formulaAndReasonShareRow: [...root.querySelectorAll(".theory-hamming-check-choice")].every((button) => {
            const formula = button.querySelector(".theory-hamming-check-formula")!.getBoundingClientRect();
            const reason = button.querySelector(".theory-hamming-check-reason")!.getBoundingClientRect();
            return formula.right <= reason.left && formula.top < reason.bottom && reason.top < formula.bottom;
          }),
          fullLabelsVisible: [...root.querySelectorAll(".theory-hamming-check-state-label, .theory-hamming-check-reason")].every(
            (label) => {
              const box = label.getBoundingClientRect();
              return box.width > 0 && box.height > 0 && getComputedStyle(label).visibility === "visible";
            },
          ),
          compactHeight: Math.abs(layoutBox.bottom - Math.max(figure.bottom, inspector.bottom)) < 1,
        };
      });
      expect(layout).toEqual({
        legendFitsOneLine: true,
        touchTargets: true,
        fits: true,
        sideBySide: true,
        headingFits: true,
        formulaAndReasonShareRow: true,
        fullLabelsVisible: true,
        compactHeight: true,
      });
    }
  }
});

test("previews parity checks on hover and keyboard focus without replacing the clicked selection", async ({ page }) => {
  await page.setViewportSize({ width: 1030, height: 698 });
  await page.goto("theory-dev.html");
  const sets = page.getByTestId("hamming-parity-sets");
  const green = sets.getByTestId("hamming-venn-check-4");
  const red = sets.getByTestId("hamming-venn-check-2");
  const blue = sets.getByTestId("hamming-venn-check-1");
  const expectActive = async (parity: number) => {
    await expect(sets.locator('[data-active="true"]')).toHaveCount(1);
    await expect(sets.getByTestId(`hamming-parity-set-${parity}`)).toHaveAttribute("data-active", "true");
    await expect(sets.locator('[data-check-member="true"]')).toHaveCount(4);
    await expect(page.getByTestId("hamming-stage-received").locator('[data-parity-member="true"]')).toHaveCount(4);
  };

  await green.hover();
  await expectActive(4);
  await expect(green).toHaveAttribute("aria-pressed", "false");
  await sets.locator("header").hover();
  await expect(sets.locator('[data-active="true"]')).toHaveCount(0);
  await expect(sets.locator('[data-check-member="true"]')).toHaveCount(7);

  await green.click();
  await red.hover();
  await expectActive(2);
  await expect(green).toHaveAttribute("aria-pressed", "true");
  await expect(red).toHaveAttribute("aria-pressed", "false");
  await expect(red).toContainText("0 ⊕ 0 ⊕ 0 ⊕ 0 = 0");
  await sets.locator("header").hover();
  await expectActive(4);

  await green.focus();
  await page.keyboard.press("Tab");
  await expect(red).toBeFocused();
  await expectActive(2);
  await page.keyboard.press("Tab");
  await expect(blue).toBeFocused();
  await expectActive(1);
  await expect(green).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  await expectActive(4);
});

test.describe("parity inspection dismissal", () => {
  test.use({ hasTouch: true });

  test("clears inspection from empty space while keeping data, errors, results, and layout", async ({ page }) => {
    for (const language of ["ja", "en"]) {
      for (const width of [1030, 447]) {
        await page.setViewportSize({ width, height: 698 });
        await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
        await page.goto("theory-dev.html");
        const action = width === 447 ? "tap" : "click";
        const sets = page.getByTestId("hamming-parity-sets");
        const green = sets.getByTestId("hamming-venn-check-4");
        const error = page.getByTestId("hamming-error-4");
        await green[action]();
        await page.getByTestId("hamming-data-1")[action]();
        await error[action]();
        await expect(green).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByTestId("hamming-stage-output").locator("[data-bit-string]")).toHaveAttribute("data-bit-string", "1000");
        await expect(page.getByTestId("hamming-stage-syndrome").locator("[data-syndrome-bits]")).toHaveAttribute(
          "data-syndrome-bits",
          "100",
        );
        const stages = page.locator('[data-testid^="hamming-stage-"]');
        const simulation = await stages.allTextContents();
        const readLayout = () =>
          sets.evaluate((root) =>
            [root, ...root.querySelectorAll("figure, button")].map((element) => {
              const rect = element.getBoundingClientRect();
              return [rect.x + scrollX, rect.y + scrollY, rect.width, rect.height];
            }),
          );

        for (const blank of ["panel", "diagram", "page"]) {
          if ((await green.getAttribute("aria-pressed")) !== "true") await green[action]();
          const layout = await readLayout();
          if (blank === "page") {
            await sets.scrollIntoViewIfNeeded();
            const box = (await sets.boundingBox())!;
            const surface = (await page.locator(".theory-reset-surface").boundingBox())!;
            const y = Math.max(20, Math.min(678, box.y + box.height / 2));
            if (action === "tap") await page.touchscreen.tap(surface.x + 2, y);
            else await page.mouse.click(surface.x + 2, y);
          } else {
            const target = blank === "diagram" ? sets.locator("svg") : sets;
            await target[action]({ position: { x: 2, y: 2 } });
          }
          await expect(sets.locator('button[aria-pressed="true"]'), `${language} ${width}px ${blank}`).toHaveCount(0);
          await expect(sets.locator('[data-active="true"]')).toHaveCount(0);
          await expect(sets.locator('[data-check-member="true"]')).toHaveCount(7);
          await expect(page.getByTestId("hamming-stage-received").locator("[data-parity-member]")).toHaveCount(0);
          await expect(error).toHaveAttribute("aria-pressed", "true");
          await expect(error).toHaveCSS("border-color", "rgb(255, 64, 96)");
          await expect(error.locator("[data-bit-value]")).toHaveCSS("text-decoration-line", "none");
          expect(await stages.allTextContents()).toEqual(simulation);
          const resetLayout = await readLayout();
          resetLayout.forEach((rect, index) => {
            rect.forEach((value, dimension) => expect(value, `${language} ${width}px ${blank}`).toBeCloseTo(layout[index][dimension], 1));
          });
        }
        await green[action]();
        await green[action]();
        await expect(sets.locator('[data-active="true"]')).toHaveCount(0);
      }
    }
  });
});

test("integrates compact rank relationships below the binary table without extra controls", async ({ page }) => {
  for (const language of ["ja", "en"]) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    const diagram = page.getByTestId("valuation-diagram");
    expect(await diagram.evaluate((node) => node.closest(".theory-chapter")?.id)).toBe("theory-rank");
    await expect(diagram.locator("select, button, details")).toHaveCount(0);
    await expect(diagram.locator("[data-complement-pair]")).toHaveCount(4);
    await expect(diagram.locator("table")).toHaveCount(0);
    await expect(diagram).toContainText("L(a∨b)+L(a∧b)=L(a)+L(b)");
    await expect(diagram).toContainText("L(a⊕b)=L(a)+L(b)−2L(a∧b)");
    for (const width of [320, 534, 583, 584, 585, 716, 728, 746, 747, 888, 1043, 1186]) {
      await page.setViewportSize({ width, height: 698 });
      await diagram.scrollIntoViewIfNeeded();
      const layout = await diagram.evaluate((root) => {
        const table = document.querySelector(".theory-binary-svg")!.getBoundingClientRect();
        const box = root.getBoundingClientRect();
        return {
          belowTable: box.top >= table.bottom,
          height: box.height,
          compactPairs: root.clientWidth < 540 || root.querySelector(".theory-valuation-pairs")!.getBoundingClientRect().height <= 24,
          pairContentFits: [...root.querySelectorAll(".theory-valuation-pair")].every((pair) => {
            const bounds = pair.getBoundingClientRect();
            const children = [...pair.children].map((child) => child.getBoundingClientRect());
            return children.every(
              (child, index) =>
                child.left >= bounds.left && child.right <= bounds.right && (index === 0 || child.left >= children[index - 1].right),
            );
          }),
          overflow: [...root.querySelectorAll("*")]
            .filter((el) => {
              const child = el.getBoundingClientRect();
              return child.left < 0 || child.right > innerWidth + 1 || (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1);
            })
            .map((el) => el.className),
        };
      });
      expect(layout.belowTable).toBe(true);
      expect(layout.compactPairs).toBe(true);
      expect(layout.pairContentFits).toBe(true);
      expect(layout.overflow, language + ", " + width + "px").toEqual([]);
      expect(layout.height).toBeLessThan(500);
    }
  }
});

async function expectGeneralOctahedron(octahedron: Locator) {
  await expect(octahedron.locator('[aria-pressed="true"], [data-edge-face-role], [data-edge-node-role]')).toHaveCount(0);
  const xor = octahedron.locator('[data-edge-result="xor"]');
  const complement = octahedron.locator('[data-edge-result="complement"]');
  await expect(xor).toBeVisible();
  await expect(complement).toBeVisible();
  await expect(xor).toContainText("a ⊕ b = c");
  await expect(complement).toContainText("¬(a ⊕ b) = ¬c");
  await expect(octahedron.locator("[data-edge-result] .theory-octahedron-swatch")).toHaveCount(0);
}

test("shows general octahedron formulas and previews an edge without moving the diagram or controls", async ({ page }, testInfo) => {
  for (const language of ["ja", "en"]) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    const octahedron = page.getByTestId("chromatic-octahedron");
    const results = octahedron.getByTestId("octahedron-selection");
    const frame = () =>
      octahedron.evaluate((root) => {
        const origin = root.getBoundingClientRect();
        return [...root.querySelectorAll("svg, .theory-octahedron-choices button")].map((node) => {
          const box = node.getBoundingClientRect();
          return [box.left - origin.left, box.top - origin.top, box.width, box.height].map((value) => Math.round(value * 10) / 10);
        });
      });
    for (const width of [320, 390, 564, 747, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.mouse.move(0, 0);
      await octahedron.scrollIntoViewIfNeeded();
      await expectGeneralOctahedron(octahedron);
      const initial = await frame();
      if (language === "ja" && [390, 564, 1440].includes(width)) {
        await octahedron.screenshot({ path: testInfo.outputPath(`octahedron-general-${width}.png`) });
      }
      await octahedron.locator(".theory-octahedron-choices button").first().hover();
      await expect(results.locator("[data-edge-result]")).toHaveCount(2);
      await expect(results).toHaveAttribute("data-empty", "false");
      await expect(results.locator(".theory-octahedron-edge-results")).toBeVisible();
      await expect(results).toContainText("001 ⊕ 010 = 011");
      expect(await frame(), `${language}, ${width}px first preview`).toEqual(initial);
      await page.mouse.move(0, 0);
      await expectGeneralOctahedron(octahedron);
      expect(await frame(), `${language}, ${width}px after preview`).toEqual(initial);
    }
  }
});

for (const input of ["mouse", "touch"] as const) {
  test.describe(`${input} octahedron selection`, () => {
    test.use({
      hasTouch: input === "touch",
      isMobile: input === "touch",
      viewport: input === "touch" ? { width: 390, height: 844 } : { width: 1075, height: 900 },
    });

    test("toggles edges and pair buttons and clears on background or vertex presses", async ({ page }) => {
      await page.goto("theory-dev.html");
      const octahedron = page.getByTestId("chromatic-octahedron");
      const graph = octahedron.locator("svg");
      const pair = octahedron.locator(".theory-octahedron-choices button").nth(1);
      const other = octahedron.locator(".theory-octahedron-choices button").nth(5);
      const press = (target: Locator) => (input === "touch" ? target.tap() : target.click());
      // The figure only draws the solid, so pressing a painted edge releases the
      // choice rather than making one.
      const pressPaintedEdge = async () => {
        await graph.scrollIntoViewIfNeeded();
        // A vertical SVG line has a zero-width bounding box, so press the
        // painted stroke's midpoint using its actual screen transform.
        const point = await octahedron.locator('[data-octa-edge="1-3"]').evaluate((node) => {
          const line = node as SVGLineElement;
          const point = new DOMPoint(
            (line.x1.baseVal.value + line.x2.baseVal.value) / 2,
            (line.y1.baseVal.value + line.y2.baseVal.value) / 2,
          ).matrixTransform(line.getScreenCTM()!);
          return { x: point.x, y: point.y };
        });
        if (input === "touch") await page.touchscreen.tap(point.x, point.y);
        else await page.mouse.click(point.x, point.y);
      };
      await expectGeneralOctahedron(octahedron);
      await pressPaintedEdge();
      await expectGeneralOctahedron(octahedron);
      // Keep the pointer on the target: deselection must not reappear as hover.
      await press(pair);
      await expect(pair).toHaveAttribute("aria-pressed", "true");
      await press(pair);
      await expectGeneralOctahedron(octahedron);
      await press(pair);
      await pressPaintedEdge();
      await expectGeneralOctahedron(octahedron);
      await press(pair);
      await press(other);
      await expect(pair).toHaveAttribute("aria-pressed", "false");
      await expect(other).toHaveAttribute("aria-pressed", "true");
      await expect(octahedron.locator('[data-edge-result="xor"]')).toContainText("010 ⊕ 100 = 110");
      await graph.scrollIntoViewIfNeeded();
      const box = (await graph.boundingBox())!;
      const position = { x: box.width / 2, y: box.height / 2 };
      if (input === "touch") await graph.tap({ position });
      else await graph.click({ position });
      await expectGeneralOctahedron(octahedron);
      await press(pair);
      await press(octahedron.locator('[data-octa-vertex="3"]'));
      await expectGeneralOctahedron(octahedron);
      if (input === "mouse") {
        await press(pair);
        await other.hover();
        await page.mouse.move(0, 0);
        await expect(pair).toHaveAttribute("aria-pressed", "true");
        await expect(octahedron.locator('[data-edge-result="xor"]')).toContainText("001 ⊕ 011 = 010");
      }
    });
  });
}

test("shows a symmetric six-pointed octahedron with red above cyan and accessible edge selection", async ({ page }) => {
  for (const language of ["ja", "en"]) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    const section = page.locator("#theory-octahedron");
    await expect(section.getByRole("heading", { name: language === "ja" ? "双対八面体" : "The Dual Octahedron" })).toBeVisible();
    const octahedron = section.getByTestId("chromatic-octahedron");
    await expect(octahedron.locator("svg")).toHaveCount(1);
    await expect(octahedron.locator("[data-cube-edge], [data-die-vertex]")).toHaveCount(0);
    await expect(octahedron.locator("[data-octa-vertex]")).toHaveCount(6);
    await expect(octahedron.locator('[data-octa-edge][data-hidden="true"]')).toHaveCount(3);
    // Every control is in the list; the figure holds none.
    await expect(octahedron.locator("svg [role='button']")).toHaveCount(0);
    await expect(octahedron.locator(".theory-octahedron-choices button")).toHaveCount(12);
    await expectGeneralOctahedron(octahedron);
    const choice = (...bits: string[]) =>
      octahedron.locator(".theory-octahedron-choices button" + bits.map((value) => `[aria-label*="${value}"]`).join(""));
    const edge = choice("001", "010");
    await edge.focus();
    await edge.press("Enter");
    await expect(edge).toHaveAttribute("aria-pressed", "true");
    await expect(octahedron.locator('[data-edge-result="xor"]')).toContainText("001 ⊕ 010 = 011");
    await expect(octahedron.locator('[data-octa-surface-face][data-active="true"]')).toHaveCount(2);
    await edge.press("Enter");
    await expectGeneralOctahedron(octahedron);
    await choice("010", "100").click();
    await expect(octahedron.locator('[data-edge-result="complement"]')).toContainText("¬(010 ⊕ 100) = 001");
    const fanoNote = section.locator("p#theory-octa-face-algebra");
    await expect(fanoNote).toContainText("Fano");
    // The surrounding prose is blank space: a click there releases the pinned edge.
    await fanoNote.click();
    await expectGeneralOctahedron(octahedron);
    await choice("010", "100").focus();
    await page.keyboard.press("Enter");
    await expect(octahedron.locator('[data-edge-result="xor"]')).toContainText("010 ⊕ 100 = 110");
    await expect(fanoNote).toContainText("000");
    await expect(fanoNote).toContainText("111");
    let stackedDiagramWidth = 0;
    for (const width of [
      320, 390, 403, 404, 447, 464, 487, 488, 499, 500, 501, 534, 608, 746, 747, 788, 798, 888, 922, 1023, 1024, 1043, 1186, 1440,
    ]) {
      await page.setViewportSize({ width, height: 900 });
      const diagramWidth = await octahedron.locator("svg").evaluate((svg) => svg.getBoundingClientRect().width);
      if (width === 746) stackedDiagramWidth = diagramWidth;
      if (width === 747) expect(Math.abs(diagramWidth - stackedDiagramWidth), "Diagram size at the stacking breakpoint").toBeLessThan(2);
      const layout = await octahedron.evaluate((el) => {
        const points = [...el.querySelectorAll("[data-octa-vertex] text")].map((node) => ({
          label: node.textContent,
          box: node.getBoundingClientRect(),
        }));
        const red = points.find(({ label }) => label === "R")!.box;
        const cyan = points.find(({ label }) => label === "C")!.box;
        const centers = Object.fromEntries(
          [...el.querySelectorAll("[data-octa-vertex]")].map((node) => {
            const box = node.querySelector("circle:last-of-type")!.getBoundingClientRect();
            return [node.getAttribute("data-octa-vertex")!, { x: box.x + box.width / 2, y: box.y + box.height / 2 }] as const;
          }),
        );
        const center = { x: centers[2].x, y: (centers[2].y + centers[5].y) / 2 };
        const radius = center.y - centers[2].y;
        const xor = el.querySelector('[data-edge-result="xor"]')!.getBoundingClientRect();
        const complement = el.querySelector('[data-edge-result="complement"]')!.getBoundingClientRect();
        const figure = el.querySelector(".theory-octahedron-figure")!.getBoundingClientRect();
        const status = el.querySelector(".theory-octahedron-status")!.getBoundingClientRect();
        const controls = el.querySelector(".theory-octahedron-inspector")!.getBoundingClientRect();
        const choices = el.querySelector(".theory-octahedron-choices")!.getBoundingClientRect();
        const results = el.querySelector(".theory-octahedron-edge-results")!.getBoundingClientRect();
        const svg = el.querySelector("svg")!.getBoundingClientRect();
        const vertexBounds = [...el.querySelectorAll("[data-octa-vertex] circle")].map((node) => node.getBoundingClientRect());
        const panel = el.getBoundingClientRect();
        const panelWidth = panel.width;
        const panelCenter = (panel.left + panel.right) / 2;
        const choiceColumns = window.innerWidth >= 1024 || (panelWidth >= 360 && panelWidth < 600) ? 3 : 2;
        return {
          oriented: points.every(({ box }) => box.top >= red.top && box.top <= cyan.top),
          symmetric:
            Math.abs(centers[2].x - centers[5].x) < 1 &&
            [
              [3, 6],
              [1, 4],
            ].every(([a, b]) => Math.abs(centers[a].y - centers[b].y) < 1 && Math.abs(centers[a].x + centers[b].x - 2 * center.x) < 1) &&
            Object.values(centers).every((point) => Math.abs(Math.hypot(point.x - center.x, point.y - center.y) - radius) < 1),
          resultsStacked: xor.bottom <= complement.top && Math.abs(xor.left - complement.left) < 1,
          columnsAligned:
            Math.abs(controls.width - status.width) < 1 &&
            Math.abs(controls.top - status.top) < 1 &&
            Math.abs(controls.bottom - status.bottom) < 1 &&
            Math.abs(choices.top - results.top) < 1 &&
            Math.abs(choices.bottom - results.bottom) < 1,
          diagramPadding:
            Math.min(...vertexBounds.map((box) => box.top)) >= svg.top &&
            Math.max(...vertexBounds.map((box) => box.bottom)) <= svg.bottom &&
            Math.min(...vertexBounds.map((box) => box.top)) - svg.top <= 18 &&
            svg.bottom - Math.max(...vertexBounds.map((box) => box.bottom)) <= 18,
          diagramSize:
            svg.width >= Math.min(panelWidth, 260) - 1 && svg.width <= (panelWidth < 600 || window.innerWidth >= 1186 ? 280 : 340) + 1,
          desktopHeight: window.innerWidth < 1186 || panel.height <= 302,
          stackedControlsHeight: panelWidth >= 600 || controls.height <= (panelWidth >= 360 ? 285 : 400),
          centered:
            Math.abs((figure.left + figure.right) / 2 - panelCenter) < 1 &&
            Math.abs((controls.left + status.right) / 2 - panelCenter) < 1 &&
            (panelWidth < 600 || Math.abs(figure.left - controls.right - (status.left - figure.right)) < 1),
          responsivePlacement:
            panelWidth >= 600
              ? controls.right <= figure.left &&
                figure.right <= status.left &&
                controls.top >= figure.top - 1 &&
                controls.bottom <= figure.bottom + 1 &&
                status.top >= figure.top - 1 &&
                status.bottom <= figure.bottom + 1
              : figure.bottom <= Math.min(controls.top, status.top) &&
                Math.abs(controls.top - status.top) < 1 &&
                controls.right <= status.left,
          controlsFit:
            new Set([...el.querySelectorAll(".theory-octahedron-choices button")].map((node) => node.getBoundingClientRect().left)).size ===
              choiceColumns &&
            new Set([...el.querySelectorAll(".theory-octahedron-choices button")].map((node) => node.getBoundingClientRect().top)).size ===
              12 / choiceColumns,
          formulasReadable: [...el.querySelectorAll(".theory-octahedron-equation")].every((node) => {
            const [operation, result] = [...node.children];
            const left = operation.getBoundingClientRect();
            const right = result.getBoundingClientRect();
            return (
              parseFloat(getComputedStyle(node).fontSize) >= 12 &&
              [...node.children].every((part) => part.getClientRects().length === 1 && part.scrollWidth <= part.clientWidth + 1) &&
              (Math.abs(left.top - right.top) < 1 || (panelWidth < 360 && Math.abs(left.left - right.left) < 1 && left.bottom <= right.top))
            );
          }),
          fits: [...el.querySelectorAll("svg, button, p, figcaption")].every((node) => {
            const box = node.getBoundingClientRect();
            return box.left >= 0 && box.right <= window.innerWidth && node.scrollWidth <= node.clientWidth + 1;
          }),
          targets: [...el.querySelectorAll("button")].every((node) => node.getBoundingClientRect().height >= 44),
        };
      });
      expect(layout, language + ", " + width + "px").toEqual({
        oriented: true,
        symmetric: true,
        resultsStacked: true,
        columnsAligned: true,
        diagramPadding: true,
        diagramSize: true,
        desktopHeight: true,
        stackedControlsHeight: true,
        centered: true,
        responsivePlacement: true,
        controlsFit: true,
        formulasReadable: true,
        fits: true,
        targets: true,
      });
      const frame = () =>
        octahedron.evaluate((root) => {
          const origin = root.getBoundingClientRect();
          return [...root.querySelectorAll(".theory-octahedron-figure, .theory-octahedron-status, .theory-octahedron-inspector")].map(
            (node) => {
              const box = node.getBoundingClientRect();
              return [box.left - origin.left, box.top - origin.top, box.width, box.height].map((value) => Math.round(value * 10) / 10);
            },
          );
        });
      const initial = await frame();
      const choices = octahedron.locator(".theory-octahedron-choices button");
      await choices.nth(0).hover();
      await expect(octahedron.locator('[data-edge-result="xor"]')).toContainText("001 ⊕ 010 = 011");
      expect(await frame()).toEqual(initial);
      await choices.nth(5).click();
      await choices.nth(0).click();
      await choices.nth(5).hover();
      expect(await frame()).toEqual(initial);
      await fanoNote.click();
      await expectGeneralOctahedron(octahedron);
      expect(await frame()).toEqual(initial);
    }
  }
});

for (const language of ["ja", "en"]) {
  test(`connects primary selection and the eight-state list with readable responsive controls (${language})`, async ({ page }) => {
    // This scenario checks 26 layouts and 68 linked click/hover transitions.
    // Keep individual assertion deadlines while allowing the full sequence.
    test.setTimeout(60_000);
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    const generation = page.getByTestId("primary-generation");
    const layers = generation.getByTestId("generation-layers");
    const inputs = generation.locator(".theory-generation-inputs button");
    const venn = generation.locator(".theory-venn-svg");
    await expect(generation.locator(".theory-generation-state-hint")).toHaveCount(0);
    await expect(layers.getByRole("button")).toHaveCount(8);
    const black = layers.locator('[data-level="0"]');
    await expect(black).toHaveAttribute("aria-pressed", "true");
    await expect(generation.locator("[data-generation-result]")).toHaveAttribute("data-generation-result", "0");
    await expect(generation.getByRole("status")).toContainText("∅ → K");
    await expect(generation.locator('.theory-generation-inputs button[aria-pressed="true"]')).toHaveCount(0);
    await expect(venn).toHaveAttribute("data-selected-level", "0");
    await expect(venn.locator('[data-venn-primary][data-active="true"]')).toHaveCount(0);
    await expect(venn.locator("[data-venn-outline]")).toHaveCount(3);
    await inputs.nth(0).click();
    await expect(generation.locator("[data-generation-result]")).toHaveAttribute("data-generation-result", "4");
    await black.focus();
    await black.press("Enter");
    await expect(black).toBeFocused();
    await expect(generation.locator("[data-generation-result]")).toHaveAttribute("data-generation-result", "0");
    await expect(generation.getByRole("status")).toContainText("∅ → K");
    await expect(generation.locator('.theory-generation-inputs button[aria-pressed="true"]')).toHaveCount(0);
    const cyan = layers.locator('[data-level="5"]');
    await cyan.focus();
    await cyan.press("Space");
    await expect(generation.locator("[data-generation-result]")).toHaveAttribute("data-generation-result", "5");
    await expect(inputs.nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(inputs.nth(1)).toHaveAttribute("aria-pressed", "false");
    await expect(inputs.nth(2)).toHaveAttribute("aria-pressed", "true");
    await inputs.nth(1).click();
    await expect(layers.locator('[data-level="7"]')).toHaveAttribute("aria-pressed", "true");
    await expect(generation.getByRole("status")).toContainText("4+2+1=7");
    const illuminatedPrimaries = () =>
      venn
        .locator('[data-venn-primary][data-active="true"]')
        .evaluateAll((circles) => circles.map((circle) => circle.getAttribute("data-venn-primary")));
    await expect(venn).toHaveAttribute("data-selected-level", "7");
    for (const width of [
      320, 362, 395, 480, 538, 564, 583, 584, 585, 640, 716, 728, 747, 748, 749, 760, 770, 771, 814, 822, 866, 971, 990, 991, 1158, 1186,
    ]) {
      await page.setViewportSize({ width, height: 698 });
      await generation.scrollIntoViewIfNeeded();
      const layout = await generation.evaluate((root) => {
        const diagram = root.querySelector(".theory-generation-diagram")!.getBoundingClientRect();
        const builder = root.querySelector(".theory-generation-builder")!.getBoundingClientRect();
        const states = root.querySelector(".theory-generation-states")!.getBoundingClientRect();
        const buttons = [...root.querySelectorAll("button")];
        return {
          diagramPlacement: builder.right <= diagram.left && diagram.right <= states.left && Math.abs(diagram.top - builder.top) < 1,
          statePlacement: builder.right <= states.left,
          sameRow: Math.abs(builder.top - states.top) < 1,
          compactHeight: root.getBoundingClientRect().height <= (window.innerWidth < 748 ? 380 : 330),
          compactDiagram: window.innerWidth >= 748 || root.querySelector(".theory-venn")!.getBoundingClientRect().width <= 264,
          fits: [...root.querySelectorAll("button, .theory-generation-heading, p, [role='status']")].every((el) => {
            const box = el.getBoundingClientRect();
            return box.left >= 0 && box.right <= window.innerWidth && el.scrollWidth <= el.clientWidth + 1;
          }),
          touchTargets: buttons.every((el) => {
            const box = el.getBoundingClientRect();
            return box.width >= 24 && box.height >= 32;
          }),
          readable: buttons.every((el) => Number.parseFloat(getComputedStyle(el).fontSize) >= 11),
          diagramLabels: [...root.querySelectorAll(".theory-venn-svg text")].every((el) => {
            const box = el.getBoundingClientRect();
            const svg = el.closest("svg")!.getBoundingClientRect();
            return box.height >= Math.min(10, svg.width * 0.04) && box.left >= svg.left && box.right <= svg.right;
          }),
        };
      });
      expect(layout).toEqual({
        diagramPlacement: true,
        statePlacement: true,
        sameRow: true,
        compactHeight: true,
        compactDiagram: true,
        fits: true,
        touchTargets: true,
        readable: true,
        diagramLabels: true,
      });
    }

    for (const width of [1186, 728, 564, 320]) {
      await page.setViewportSize({ width, height: 698 });
      await venn.scrollIntoViewIfNeeded();
      for (const [region, level] of [
        [0, 0],
        [2, 2],
        [4, 6],
        [2, 4],
        [1, 5],
        [2, 7],
        [4, 3],
        [2, 1],
        [1, 0],
        [6, 6],
        [6, 0],
        [7, 7],
        [7, 0],
        [6, 6],
        [3, 7],
        [6, 1],
        [0, 0],
      ]) {
        const label = (await generation.getByTestId(`venn-region-${region}`).boundingBox())!;
        await page.mouse.click(label.x + label.width / 2, label.y + label.height / 2);
        await expect(venn).toHaveAttribute("data-selected-level", String(level));
        await expect(generation.locator("[data-generation-result]")).toHaveAttribute("data-generation-result", String(level));
        await expect(layers.locator(`[data-level="${level}"]`)).toHaveAttribute("aria-pressed", "true");
        const enabled = [[], ["B"], ["R"], ["R", "B"], ["G"], ["G", "B"], ["R", "G"], ["R", "G", "B"]][level];
        expect(await illuminatedPrimaries()).toEqual(enabled);
        await expect(venn.locator("[data-venn-outline]")).toHaveCount(3 - enabled.length);
        for (const [index, weight] of [4, 2, 1].entries()) {
          await expect(inputs.nth(index)).toHaveAttribute("aria-pressed", String((level & weight) !== 0));
        }
        const frame = await generation.boundingBox();
        const preview = (region + 1) % 8;
        const hoveredLabel = (await generation.getByTestId(`venn-region-${preview}`).boundingBox())!;
        await page.mouse.move(hoveredLabel.x + hoveredLabel.width / 2, hoveredLabel.y + hoveredLabel.height / 2);
        await expect(venn).toHaveAttribute("data-highlighted-level", String(preview));
        expect(await illuminatedPrimaries()).toEqual(enabled);
        await expect(generation.locator("[data-generation-result]")).toHaveAttribute("data-generation-result", String(level));
        await expect(layers.locator(`[data-level="${preview}"]`)).toHaveAttribute("data-highlighted", "true");
        await page.mouse.move(1, 1);
        await expect(venn).not.toHaveAttribute("data-highlighted-level");
        await expect(venn).toHaveAttribute("data-selected-level", String(level));
        expect(await generation.boundingBox()).toEqual(frame);
      }
      await cyan.focus();
      await cyan.press("Space");
      await expect(venn).toHaveAttribute("data-selected-level", "5");
      await inputs.nth(1).click();
      await expect(venn).toHaveAttribute("data-selected-level", "7");
      await expect(venn).toHaveAttribute("data-highlighted-level", "7");
      await page.mouse.click(1, 1);
      await expect(venn).not.toHaveAttribute("data-highlighted-level");
      await expect(generation.locator("[data-generation-result]")).toHaveAttribute("data-generation-result", "7");
      await generation.locator(".theory-generation-diagram").click({ position: { x: 2, y: 2 } });
      await expect(venn).toHaveAttribute("data-selected-level", "0");
      await expect(venn.locator('[data-venn-primary][data-active="true"]')).toHaveCount(0);
      await expect(venn.locator("[stroke-dasharray]")).toHaveCount(0);
      await expect(generation.locator('.theory-generation-inputs button[aria-pressed="true"]')).toHaveCount(0);
      await expect(generation.getByRole("status")).toContainText("∅ → K");
    }
  });
}

test("keeps mixing in its dedicated diagrams and groups the hue net with complementary die ranks", async ({ page }) => {
  for (const language of ["ja", "en"]) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    const die = page.getByRole("region", {
      name: language === "ja" ? "カラーダイスの面配置" : "Face Arrangement of the Color Die",
      exact: true,
    });
    const net = die.getByTestId("hue-order-net");
    const ranks = die.getByTestId("color-die-rank-structure");
    await expect(net.getByRole("button")).toHaveCount(6);
    await expect(net.locator("svg path, svg marker")).toHaveCount(0);
    await expect(die).not.toContainText("ΔL");
    await expect(die.getByTestId("hue-net-fold")).toHaveCount(0);
    await expect(ranks).toContainText("L(c) + L(c̄) = 7");
    await expect(die).not.toContainText(/mixing|混色|XNOR/i);
    await expect(page.getByTestId("color-die-view-grid")).toHaveCount(0);
    const cube = page.locator("#theory-cube-cycle");
    await expect(cube.getByRole("button", { name: language === "ja" ? "混色" : "Mixing", exact: true })).toHaveCount(0);
    await expect(cube).not.toContainText(language === "ja" ? "「混色」モード" : "Mixing mode");
    await expect(page.locator("#theory-algebra")).toContainText("XNOR(a,b)=¬(a⊕b)");
    const hasse = cube.getByRole("button", { name: language === "ja" ? "ハッセ図" : "Hasse", exact: true });
    await hasse.click();
    await expect(hasse).toHaveAttribute("aria-pressed", "true");
    await expect(cube.getByRole("group", { name: language === "ja" ? "カラーキューブ" : "Color Cube", exact: true })).toContainText(
      "Pascal",
    );
    await expect(net.locator("svg text")).toHaveCount(0);
    await expect(net.locator("[data-hue-net-pip]")).toHaveCount(21);
    for (const width of [319, 320, 362, 390, 427, 452, 479, 480, 488, 489, 534, 608, 736, 737, 746, 760, 761, 888, 1186, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await ranks.scrollIntoViewIfNeeded();
      const layout = await die.evaluate((section) => {
        const figure = section.querySelector(".theory-die-figure")!;
        const figureBox = figure.getBoundingClientRect();
        const netFrame = section.querySelector('[data-testid="hue-order-net"]')!.getBoundingClientRect();
        const netBox = section.querySelector('[data-testid="hue-order-net"] svg')!.getBoundingClientRect();
        const ranksBox = section.querySelector('[data-testid="color-die-rank-structure"]')!.getBoundingClientRect();
        const sequenceBox = section.querySelector(".theory-die-net-sequence")!.getBoundingClientRect();
        const cutBox = section.querySelector(".theory-die-net-cut")!.getBoundingClientRect();
        const netCenter = netBox.x + netBox.width / 2;
        return {
          ordered: netBox.right <= ranksBox.left && Math.abs(netFrame.y + netFrame.height / 2 - ranksBox.y - ranksBox.height / 2) < 1,
          balanced:
            (figureBox.width < 592 || Math.abs(netFrame.height - ranksBox.height) < 12) && Math.abs(netBox.width - ranksBox.width) < 1,
          stableScale: Math.abs(netBox.width - Math.min(280, (figureBox.width - parseFloat(getComputedStyle(figure).columnGap)) / 2)) < 1,
          readable: [...section.querySelectorAll<SVGCircleElement>("[data-hue-net-pip]")].every((pip) => {
            const box = pip.getBoundingClientRect();
            const face = pip.closest("[data-hue-net-face]")!;
            const faceBox = face.getBoundingClientRect();
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;
            const faceX = faceBox.x + faceBox.width / 2;
            const faceY = faceBox.y + faceBox.height / 2;
            const radius = box.width / 2;
            return (
              box.width >= 4 &&
              Math.abs(centerX - faceX) + Math.abs(centerY - faceY) + radius * Math.SQRT2 < faceBox.width / 2 &&
              [...face.querySelectorAll("[data-hue-net-pip]")].every((other) => {
                if (other === pip) return true;
                const otherBox = other.getBoundingClientRect();
                return Math.hypot(centerX - otherBox.x - otherBox.width / 2, centerY - otherBox.y - otherBox.height / 2) > box.width + 1;
              })
            );
          }),
          touchTargets: [...section.querySelectorAll("[data-hue-net-face]")].every((el) => {
            const box = el.getBoundingClientRect();
            return box.width >= 32 && box.height >= 32;
          }),
          captionsAroundNet:
            sequenceBox.bottom <= netBox.top &&
            cutBox.top >= netBox.bottom &&
            Math.abs(sequenceBox.x + sequenceBox.width / 2 - netCenter) < 1 &&
            Math.abs(cutBox.x + cutBox.width / 2 - netCenter) < 1,
          fits: [...section.querySelectorAll("svg, p, h4, [data-testid='color-die-rank-structure']")].every((el) => {
            const box = el.getBoundingClientRect();
            return box.left >= 0 && box.right <= window.innerWidth && el.scrollWidth <= el.clientWidth + 1;
          }),
        };
      });
      expect(layout, `${language}, ${width}px`).toEqual({
        ordered: true,
        balanced: true,
        stableScale: true,
        readable: true,
        touchTargets: true,
        captionsAroundNet: true,
        fits: true,
      });
    }
  }
});

test("links complementary die rows and faces through hover, keyboard selection, and pin restoration", async ({ page }) => {
  test.setTimeout(60_000);
  for (const language of ["ja", "en"]) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    const figure = page.locator(".theory-die-figure");
    const blueYellow = figure.locator('[data-complement-pair="B1-Y6"]');
    const redCyan = figure.locator('[data-complement-pair="R2-C5"]');
    const greenMagenta = figure.locator('[data-complement-pair="G4-M3"]');
    const highlighted = () =>
      figure
        .locator('[data-hue-net-highlighted="true"]')
        .evaluateAll((faces) => faces.map((face) => Number(face.getAttribute("data-hue-net-face"))).sort());
    for (const width of [319, 410, 1186]) {
      await page.setViewportSize({ width, height: 698 });
      await figure.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      const frame = await figure.boundingBox();
      for (const [row, levels] of [
        [blueYellow, [1, 6]],
        [redCyan, [2, 5]],
        [greenMagenta, [3, 4]],
      ] as const) {
        const box = (await row.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(24);
        await row.hover();
        await expect(row).toHaveAttribute("data-highlighted", "true");
        await expect.poll(highlighted).toEqual(levels);
        expect(await figure.boundingBox()).toEqual(frame);
        await page.mouse.move(0, 0);
        await expect.poll(highlighted).toEqual([]);
      }

      await blueYellow.click();
      await page.mouse.move(0, 0);
      await redCyan.hover();
      await expect.poll(highlighted).toEqual([2, 5]);
      await expect(blueYellow).toHaveAttribute("aria-pressed", "true");
      await page.mouse.move(0, 0);
      await expect.poll(highlighted).toEqual([1, 6]);

      await redCyan.focus();
      await redCyan.press("Enter");
      await expect(redCyan).toHaveAttribute("aria-pressed", "true");
      await expect(blueYellow).toHaveAttribute("aria-pressed", "false");
      await redCyan.press("Space");
      await expect.poll(highlighted).toEqual([]);

      await figure.locator('[data-hue-net-face="5"]').click();
      await page.mouse.move(0, 0);
      await expect(redCyan).toHaveAttribute("data-highlighted", "true");
      await expect(redCyan).toHaveAttribute("aria-pressed", "true");
      await redCyan.click();
      await expect.poll(highlighted).toEqual([]);
      await expect(figure.locator('[data-hue-net-face="5"]')).toHaveAttribute("aria-pressed", "false");
      expect(await figure.boundingBox()).toEqual(frame);

      await greenMagenta.click();
      await page.locator("#theory-color-die-heading").click();
      await expect(greenMagenta).toHaveAttribute("aria-pressed", "false");
      await expect.poll(highlighted).toEqual([]);
    }
  }
});

for (const language of ["ja", "en"]) {
  for (const width of [320, 572, 710, 1280]) {
    test(`keeps linked hue controls and the color-die net stationary on hover and focus (${language}, ${width}px)`, async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width, height: 698 });
      await page.goto("theory-dev.html");

      const measure = () =>
        page.evaluate(() => ({
          scrollY: window.scrollY,
          documentHeight: document.documentElement.scrollHeight,
          boxes: [
            ...document.querySelectorAll(
              "#theory-fano-hamming, .theory-hue-zigzag, .theory-zigzag-level-controls, [data-tone-level-control], .theory-zigzag-summary, .theory-zigzag-summary > span, .theory-die-net, .theory-die-net svg, .theory-die-net p, [data-hue-net-face]",
            ),
          ].map((element) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height };
          }),
        }));

      for (const [surface, attribute, levels] of [
        [".theory-zigzag-level-controls", "data-tone-level-control", [0, 1, 2, 3, 4, 5, 6, 7]],
        [".theory-die-net svg", "data-hue-net-face", [2, 6, 4, 5, 1, 3]],
      ] as const) {
        await page.locator(surface).scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0);
        await expect(page.locator("[data-active-fiber]")).toHaveCount(0);
        const before = await measure();

        for (const level of levels) {
          const control = page.locator(`[${attribute}="${level}"]`);
          await control.hover();
          await expect(page.locator(`[data-active-fiber="${level}"]`)).toBeVisible();
          await expect(control).toHaveAttribute("aria-pressed", "false");
          expect(await measure(), `${attribute}=${level}, hover`).toEqual(before);
        }

        await page.mouse.move(0, 0);
        await expect(page.locator("[data-active-fiber]")).toHaveCount(0);
        expect(await measure(), `${attribute}, leave`).toEqual(before);

        const control = page.locator(`[${attribute}="4"]`);
        await control.focus();
        await expect(page.locator('[data-active-fiber="4"]')).toBeVisible();
        expect(await measure(), `${attribute}, focus`).toEqual(before);
        await control.press("Enter");
        await expect(control).toHaveAttribute("aria-pressed", "true");
        expect(await measure(), `${attribute}, pin`).toEqual(before);
        await control.press("Space");
        await expect(control).toHaveAttribute("aria-pressed", "false");
        expect(await measure(), `${attribute}, unpin`).toEqual(before);
        await control.evaluate((element) => (element as HTMLElement | SVGElement).blur());
      }
    });
  }
}

test("compares fixed GRB join and MCY meet with compact nodes and responsive independent controls", async ({ page }) => {
  for (const language of ["ja", "en"]) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    const diagrams = page.locator("#theory-mixing");
    const grb = diagrams.getByRole("figure", { name: language === "ja" ? "GRBの論理和" : "GRB Logical OR" });
    const mcy = diagrams.getByRole("figure", { name: language === "ja" ? "MCYの論理積" : "MCY Logical AND" });
    await expect(grb.locator("svg").getByRole("button")).toHaveCount(3);
    await expect(mcy.locator("svg").getByRole("button")).toHaveCount(3);
    await expect(diagrams.locator("button")).toHaveCount(0);
    await expect(grb.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", "7");
    await expect(mcy.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", "0");
    const blue = grb.getByRole("button", { name: language === "ja" ? "入力B、ビット001" : "Input B, bits 001", exact: true });
    const yellow = mcy.getByRole("button", { name: language === "ja" ? "入力Y、ビット110" : "Input Y, bits 110", exact: true });
    await blue.focus();
    await blue.press("Space");
    await expect(blue).toBeFocused();
    await expect(blue).toHaveAttribute("aria-pressed", "false");
    await expect(blue.locator(".theory-mixing-focus-ring")).toHaveCSS("opacity", "1");
    await expect(grb.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", "6");
    await blue.press("Enter");
    await expect(grb.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", "7");
    await blue.press("Space");
    await expect(mcy.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", "0");
    await yellow.click();
    await expect(mcy.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", "1");

    for (const width of [320, 395, 538, 639, 760, 761, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await diagrams.scrollIntoViewIfNeeded();
      const layout = await diagrams.evaluate((root) => {
        const figures = [...root.querySelectorAll("figure")];
        const bounds = figures.map((figure) => figure.getBoundingClientRect());
        const overflow = figures.some((figure) => {
          const area = figure.getBoundingClientRect();
          return [...figure.querySelectorAll("svg, table, button, p, figcaption")].some((node) => {
            const box = node.getBoundingClientRect();
            return box.left < area.left - 1 || box.right > area.right + 1 || node.scrollWidth > node.clientWidth + 1;
          });
        });
        const invalidNodes = [...root.querySelectorAll("[data-mixing-color]")].filter((node) => {
          const circle = node.querySelector("circle")!;
          const label = node.querySelector("text")!.getBBox();
          return [label.x, label.x + label.width].some((x) =>
            [label.y, label.y + label.height].some(
              (y) => Math.hypot(x - circle.cx.baseVal.value, y - circle.cy.baseVal.value) > circle.r.baseVal.value,
            ),
          );
        });
        const clippedLabels = [...root.querySelectorAll("svg text")].filter((node) => {
          const label = node as SVGTextElement;
          const box = label.getBBox();
          const view = label.ownerSVGElement!.viewBox.baseVal;
          return box.x < 0 || box.y < 0 || box.x + box.width > view.width || box.y + box.height > view.height;
        });
        const invalidGates = figures.filter((figure) => {
          const gate = figure.querySelector<SVGPathElement>("[data-mixing-gate]")!;
          const label = figure.querySelector<SVGTextElement>("[data-mixing-operator]")!;
          const box = label.getBBox();
          const toGate = gate.getCTM()!.inverse().multiply(label.getCTM()!);
          return [box.x, box.x + box.width].some((x) =>
            [box.y, box.y + box.height].some((y) => !gate.isPointInFill(new DOMPoint(x, y).matrixTransform(toGate))),
          );
        });
        const diagonalWires = [...root.querySelectorAll<SVGPolylineElement>("[data-mixing-wire]")].filter((wire) =>
          [...wire.points].slice(1).some((point, index) => {
            const previous = wire.points.getItem(index);
            return point.x !== previous.x && point.y !== previous.y;
          }),
        );
        return {
          overflow,
          invalidNodes: invalidNodes.length,
          clippedLabels: clippedLabels.length,
          invalidGates: invalidGates.length,
          diagonalWires: diagonalWires.length,
          sameRow: Math.abs(bounds[0].top - bounds[1].top) < 1,
          alignedContents: ["svg", ".theory-mixing-equation", "table"].every((selector) => {
            const rows = figures.map((figure) => figure.querySelector(selector)!.getBoundingClientRect());
            return Math.abs(rows[0].top - rows[1].top) < 1;
          }),
        };
      });
      expect(layout).toEqual({
        overflow: false,
        invalidNodes: 0,
        clippedLabels: 0,
        invalidGates: 0,
        diagonalWires: 0,
        sameRow: true,
        alignedContents: true,
      });
    }
    await expect(grb.locator('path[data-mixing-gate="or"]')).toHaveCount(1);
    await expect(mcy.locator('path[data-mixing-gate="and"]')).toHaveCount(1);
    await expect(diagrams.locator("path:not([data-mixing-gate])")).toHaveCount(0);
    await expect(diagrams).not.toContainText("theory_mixing_");
  }
});

test.describe("mixing nodes on touch screens", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 320, height: 698 } });

  test("toggles both side-by-side graphs by tapping the input nodes", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
    await page.goto("theory-dev.html");
    const diagrams = page.locator("#theory-mixing");
    for (const [family, label, result, secondLabel, singleResult] of [
      ["rgb", "Input B, bits 001", "6", "Input R, bits 010", "4"],
      ["cmy", "Input Y, bits 110", "1", "Input C, bits 101", "3"],
    ]) {
      const figure = diagrams.locator(`[data-mixing-family="${family}"]`);
      const node = figure.getByRole("button", { name: label, exact: true });
      await node.tap();
      await expect(node).toHaveAttribute("aria-pressed", "false");
      await expect(figure.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", result);
      const hit = await node.locator("[data-mixing-hit]").boundingBox();
      expect(hit!.width).toBeGreaterThanOrEqual(24);
      expect(hit!.height).toBeGreaterThanOrEqual(24);
      await figure.getByRole("button", { name: secondLabel, exact: true }).tap();
      await expect(figure.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", singleResult);
      const remaining = figure.getByRole("button").first();
      await remaining.tap();
      await expect(figure.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", "pending");
      await expect(figure.getByRole("status")).toHaveText("Select an input color");
      await remaining.tap();
      await expect(figure.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", singleResult);
    }
  });
});

test("keeps the three-bit labels inside compact nodes in every Stella mode", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
  await page.goto("theory-dev.html");
  const diagram = page.locator("#theory-stella-view");

  const layout = () =>
    page.locator(".theory-k8-explorer").evaluate((root) => {
      const base = root.getBoundingClientRect();
      return ["#theory-stella-view", ".theory-k8-summary", ".theory-k8-controls", ".theory-k8-comparison"].map((selector) => {
        const rect = root.querySelector(selector)!.getBoundingClientRect();
        return [rect.x - base.x, rect.y - base.y, rect.width, rect.height].map((value) => Math.round(value * 10) / 10);
      });
    });
  await expect(page.locator(".theory-k8-color-key > span")).toHaveText(["G", "R", "B", "Y", "C", "M", "W"]);
  for (const width of [534, 320, 722, 822, 1134]) {
    await page.setViewportSize({ width, height: 698 });
    await page.getByRole("button", { name: "Nodes only", exact: true }).click();
    const initialLayout = await layout();
    for (const distances of [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]]) {
      await page.getByRole("button", { name: "Nodes only", exact: true }).click();
      for (const distance of distances) {
        await page.getByRole("button", { name: `Distance ${distance} · ${distance === 3 ? 4 : 12} edges`, exact: true }).click();
      }
      const nodes = await diagram.locator("[data-stella-vertex]").evaluateAll((vertices) =>
        vertices.map((vertex) => {
          const circle = vertex.querySelector<SVGCircleElement>('circle[fill]:not([fill="transparent"]):not([fill="none"])')!;
          const label = vertex.querySelector<SVGTextElement>("text")!;
          const { x, y, width, height } = label.getBBox();
          const cx = circle.cx.baseVal.value;
          const cy = circle.cy.baseVal.value;
          return {
            level: Number(vertex.getAttribute("data-stella-vertex")),
            text: label.textContent,
            radius: circle.r.baseVal.value,
            cornerDistances: [
              Math.hypot(x - cx, y - cy),
              Math.hypot(x + width - cx, y - cy),
              Math.hypot(x - cx, y + height - cy),
              Math.hypot(x + width - cx, y + height - cy),
            ],
          };
        }),
      );
      expect(nodes).toHaveLength(8);
      await expect(diagram.locator("polygon, path")).toHaveCount(0);
      for (const node of nodes) {
        expect(node.text).toBe(node.level.toString(2).padStart(3, "0"));
        expect(Math.max(...node.cornerDistances)).toBeLessThanOrEqual(node.radius);
      }
      expect(await layout()).toEqual(initialLayout);
    }
    for (const level of [0, 7]) await diagram.locator(`[data-stella-vertex="${level}"]`).click();
    expect(await layout()).toEqual(initialLayout);
    const details = page.locator(".theory-k8-comparison-details");
    await expect(details.getByText("000 ⊕ 111 = 111", { exact: true })).toBeVisible();
    for (const distance of [3, 2, 1]) {
      await page.getByRole("button", { name: `Distance ${distance} · ${distance === 3 ? 4 : 12} edges`, exact: true }).click();
      await expect(details).toBeVisible();
      expect(await layout()).toEqual(initialLayout);
    }
    await expect(details.locator("dd code")).toHaveText(["—", "—", "—"]);
  }
});

test("uses straight K8 edges clear of unrelated nodes and separates the 100–011 complement pair", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
  await page.goto("theory-dev.html");
  const diagram = page.locator("#theory-stella-view");
  await expect(diagram.locator('[data-k8-edge="3-4"]')).toHaveCount(1);
  await expect(diagram.locator("path")).toHaveCount(0);
  const routes = await diagram.evaluate((svg) => {
    const nodes = [...svg.querySelectorAll<SVGGElement>("[data-stella-vertex]")].map((node) => {
      const circle = node.querySelector<SVGCircleElement>("circle")!;
      return { level: Number(node.dataset.stellaVertex), x: circle.cx.baseVal.value, y: circle.cy.baseVal.value };
    });
    return [...svg.querySelectorAll<SVGLineElement>("line[data-k8-edge]")].map((edge) => {
      const pair = edge.dataset.k8Edge!;
      const [a, b] = pair.split("-").map(Number);
      const length = edge.getTotalLength();
      const start = edge.getPointAtLength(0);
      const end = edge.getPointAtLength(length);
      const from = nodes.find((node) => node.level === a)!;
      const to = nodes.find((node) => node.level === b)!;
      let clearance = Infinity;
      for (let i = 0; i <= 100; i++) {
        const point = edge.getPointAtLength((i / 100) * length);
        for (const node of nodes) {
          if (node.level !== a && node.level !== b) clearance = Math.min(clearance, Math.hypot(point.x - node.x, point.y - node.y));
        }
      }
      return {
        pair,
        coordinates: ["x1", "y1", "x2", "y2"].map((attribute) => edge.getAttribute(attribute)!),
        startError: Math.hypot(start.x - from.x, start.y - from.y),
        endError: Math.hypot(end.x - to.x, end.y - to.y),
        clearance,
      };
    });
  });
  expect(routes).toHaveLength(28);
  for (const route of routes) {
    expect(route.startError, route.pair).toBeLessThan(0.01);
    expect(route.endError, route.pair).toBeLessThan(0.01);
    // Leave a gap around visible nodes instead of appearing connected.
    expect(route.clearance, route.pair).toBeGreaterThan(9);
  }

  await page.getByRole("button", { name: "Distance 1 · 12 edges", exact: true }).click();
  await page.getByRole("button", { name: "Distance 2 · 12 edges", exact: true }).click();
  await expect(diagram.locator("[data-k8-edge]")).toHaveCount(4);
  await expect(diagram.locator('[data-k8-edge="3-4"]')).toHaveAttribute("stroke", "#ffffff");
  for (const pair of ["3-4", "2-5"]) {
    const coordinates = routes.find((route) => route.pair === pair)!.coordinates;
    for (const [index, attribute] of ["x1", "y1", "x2", "y2"].entries()) {
      await expect(diagram.locator(`[data-k8-edge="${pair}"]`)).toHaveAttribute(attribute, String(coordinates[index]));
    }
  }
});

test("restores the Theory development page position after reloading", async ({ page }) => {
  await page.setViewportSize({ width: 534, height: 698 });
  await page.goto("theory-dev.html");
  await page.locator("#theory-stella-view").scrollIntoViewIfNeeded();

  const savedY = await page.evaluate(() => window.scrollY);
  expect(savedY).toBeGreaterThan(1000);
  await page.reload();
  await expect(page.locator("#theory-stella-view")).toBeVisible();
  await expect.poll(() => page.evaluate((y) => Math.abs(window.scrollY - y), savedY)).toBeLessThanOrEqual(1);

  // The next reload must use the new position, including an explicit return to the top.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem(`chromalum_theory_dev_scroll:${location.pathname}${location.hash}`)))
    .toBe("0");
  await page.reload();
  await expect(page.getByText("THEORY DEVELOPMENT", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("opens the Theory tab and renders the main sections", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "Theory" }).click();

  await expect(page.getByRole("heading", { name: /Discrete Algebraic Color Theory|離散代数的色彩理論/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Color Order and Binary Rank|色順と二進順位/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Toggle Action and Distance Structure|反転作用と距離構造/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Hamming \[7,4,3\] (?:Code|符号)/ })).toBeVisible();
});

test("opens the Theory tab directly from the URL hash", async ({ page }) => {
  await page.goto("/#theory");

  await expect(page.getByRole("tab", { name: /Theory/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: /Discrete Algebraic Color Theory|離散代数的色彩理論/ })).toBeVisible();
});

test("shares a fluid reading measure across Theory prose and major figures without horizontal overflow", async ({ page }) => {
  test.setTimeout(60_000);
  for (const language of ["ja", "en"]) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    for (const entry of ["/#theory", "theory-dev.html"]) {
      await page.goto(entry);
      const container = page.locator(".theory-container");
      await expect(container).toBeVisible();
      let widthBeforeDesktop = 0;
      for (const width of [320, 390, 534, 779, 900, 1023, 1024, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        const metrics = await container.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const left = box.left + parseFloat(style.paddingLeft);
          const right = box.right - parseFloat(style.paddingRight);
          const selectors = [
            ".theory-desc",
            ".theory-generation",
            ".theory-derivation",
            ".theory-binary-table",
            ".theory-valuation",
            ".theory-cube",
            ".theory-k8-explorer",
            ".theory-toggle-figure",
            ".theory-fano-correspondence",
            ".theory-hamming-flow",
            ".theory-octahedron",
            ".theory-octahedron-layout",
            ".theory-mixing-pair",
            ".theory-zigzag-block",
            ".theory-hue-overview",
            ".theory-zigzag-level-controls",
          ];
          const misaligned = selectors.flatMap((selector) => {
            const matches = [...element.querySelectorAll(selector)];
            if (!matches.length) return [`Missing ${selector}`];
            return matches.flatMap((match) => {
              const item = match.getBoundingClientRect();
              return Math.abs(item.left - left) > 1 || Math.abs(item.right - right) > 1
                ? [`${selector}: ${item.left - left}, ${item.right - right}`]
                : [];
            });
          });
          const overflow = [...element.querySelectorAll<HTMLElement>("div, p, table, button, ol, ul")]
            // Exclude clipped 1 px live regions used only by screen readers.
            .filter((item) => {
              if (item.clientWidth <= 1) return false;
              // The enlarged mobile Venn crops blank SVG margins. Its circles
              // and labels must still fit completely inside the visible area.
              if (item.matches(".theory-venn") && ["hidden", "clip"].includes(getComputedStyle(item).overflowX)) {
                const frame = item.getBoundingClientRect();
                return [...item.querySelectorAll('[data-venn-primary], [data-testid^="venn-region-"]')].some((node) => {
                  const box = node.getBoundingClientRect();
                  return (
                    box.left < frame.left - 1 || box.right > frame.right + 1 || box.top < frame.top - 1 || box.bottom > frame.bottom + 1
                  );
                });
              }
              return item.scrollWidth > item.clientWidth + 1;
            })
            .map((item) => `${item.tagName}.${item.className} (scroll ${item.scrollWidth} > client ${item.clientWidth})`);
          const dieFigure = element.querySelector(".theory-die-figure")!.getBoundingClientRect();
          return {
            width: right - left,
            misaligned,
            overflow,
            dieCentered:
              dieFigure.left >= left - 1 && dieFigure.right <= right + 1 && Math.abs(dieFigure.left + dieFigure.right - left - right) < 1,
            toneWidth: element.querySelector(".theory-zigzag-svg")!.getBoundingClientRect().width,
            documentWidth: document.documentElement.scrollWidth,
          };
        });
        const context = `${language}, ${entry}, ${width}px`;
        expect(metrics.misaligned, context).toEqual([]);
        expect(metrics.overflow, context).toEqual([]);
        expect(metrics.dieCentered, context).toBe(true);
        expect(metrics.documentWidth, context).toBeLessThanOrEqual(width);
        expect(Math.abs(metrics.toneWidth - metrics.width)).toBeLessThan(1);
        if (width === 1023) {
          expect(metrics.width).toBeGreaterThanOrEqual(820);
          expect(metrics.width).toBeLessThanOrEqual(840);
          widthBeforeDesktop = metrics.width;
        }
        if (width === 1024) expect(Math.abs(metrics.width - widthBeforeDesktop)).toBeLessThan(2);
        if (width === 1280) {
          expect(metrics.width).toBeGreaterThanOrEqual(880);
          expect(metrics.width).toBeLessThanOrEqual(900);
          expect(metrics.toneWidth).toBeGreaterThanOrEqual(880);
        }
      }
    }
  }
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

test("spreads binary columns on desktop and preserves selection during linked hover without shifting layout", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const language of ["ja", "en"]) {
    await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
    await page.goto("theory-dev.html");
    const table = page.locator(".theory-binary-table");
    const plot = table.locator("svg");
    const rows = plot.getByRole("button");
    await expect(rows).toHaveCount(8);
    for (const width of [320, 390, 716, 779, 822, 1024, 1186, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await table.scrollIntoViewIfNeeded();
      const metrics = await plot.evaluate((svg) => {
        const box = svg.getBoundingClientRect();
        const header = [...svg.querySelectorAll<SVGTextElement>(".theory-binary-header")];
        const visualRows = [
          header,
          ...[...svg.querySelectorAll("[data-binary-level]")].map((row) => [
            ...row.querySelectorAll("text, circle, .theory-binary-tone-bar"),
          ]),
        ];
        const collisions: string[] = [];
        for (const elements of visualRows) {
          elements.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          elements.forEach((element, index) => {
            const item = element.getBoundingClientRect();
            const next = elements[index + 1]?.getBoundingClientRect();
            if (item.left < box.left - 0.5 || item.right > box.right + 0.5 || (next && item.right > next.left + 0.5))
              collisions.push(element.textContent || element.tagName);
          });
        }
        return {
          width: box.width,
          proseWidth: document.querySelector(".theory-desc")!.getBoundingClientRect().width,
          height: box.height,
          font: parseFloat(getComputedStyle(header[0]).fontSize),
          circle: svg.querySelector(".theory-binary-color")!.getBoundingClientRect().width,
          collisions,
        };
      });
      expect(metrics.collisions, `${language} ${width}px`).toEqual([]);
      expect(metrics.width).toBeLessThan(width);
      expect(Math.abs(metrics.width - metrics.proseWidth)).toBeLessThan(1);
      expect(metrics.height).toBeLessThanOrEqual(260);
      if (width >= 1024) {
        expect(metrics.width).toBeGreaterThan(820);
        expect(metrics.font).toBeLessThanOrEqual(12.5);
        expect(metrics.circle).toBeLessThanOrEqual(20);
      }
      const originalBox = await table.boundingBox();
      await page.mouse.move(1, 1);
      await rows.nth(2).hover();
      await expect(page.locator('.theory-generation-state[data-level="2"]')).toHaveAttribute("data-highlighted", "true");
      await rows.nth(2).click();
      await expect(rows.nth(2)).toHaveAttribute("aria-pressed", "true");
      await rows.nth(5).hover();
      await expect(rows.nth(5)).toHaveAttribute("data-highlighted", "true");
      await expect(rows.nth(2)).toHaveAttribute("aria-pressed", "true");
      await page.mouse.move(1, 1);
      await expect(rows.nth(2)).toHaveAttribute("aria-pressed", "true");
      expect(await table.boundingBox()).toEqual(originalBox);
      await rows.nth(2).click();
      await expect(rows.nth(2)).toHaveAttribute("aria-pressed", "false");
    }
    await rows.first().focus();
    await page.keyboard.press("ArrowDown");
    await expect(rows.nth(1)).toBeFocused();
    await page.keyboard.press("Space");
    await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("End");
    await expect(rows.nth(7)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(rows.nth(1)).toHaveAttribute("aria-pressed", "false");
    await expect(rows.nth(7)).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(plot.locator('[aria-pressed="true"]')).toHaveCount(0);
    await rows.nth(3).click();
    await plot.click({ position: { x: 2, y: 2 } });
    await expect(plot.locator('[aria-pressed="true"]')).toHaveCount(0);
    await rows.nth(3).click();
    await table.locator(".theory-binary-notes").click();
    await expect(plot.locator('[aria-pressed="true"]')).toHaveCount(0);
  }
});
