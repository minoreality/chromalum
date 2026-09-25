import { expect, test } from "@playwright/test";
import { FANO_LINES } from "../src/data/theory-data";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chromalum_lang", "en"));
  await page.goto("/chromalum/");
  await page.getByRole("tab", { name: "Music", exact: true }).click();
});

test("mini Fano curves pass through exactly the three points on each line", async ({ page }) => {
  const distances = await page.locator('svg[viewBox="0 0 180 162"]').evaluate((svg) => {
    const points = Array.from(svg.querySelectorAll("text"), (label) => {
      const circle = label.parentElement!.querySelector("circle")!;
      return {
        level: Number(label.textContent),
        x: circle.cx.baseVal.value,
        y: circle.cy.baseVal.value,
      };
    });
    return Array.from(svg.querySelectorAll<SVGPathElement>('path[pointer-events="none"]'), (path) => {
      const length = path.getTotalLength();
      const steps = Math.ceil(length / 0.25);
      const samples = Array.from({ length: steps + 1 }, (_, i) => path.getPointAtLength((i * length) / steps));
      return points.map(({ level, x, y }) => ({
        level,
        distance: Math.min(...samples.map((sample) => Math.hypot(sample.x - x, sample.y - y))),
      }));
    });
  });
  expect(distances).toHaveLength(FANO_LINES.length);
  for (const [index, line] of distances.entries()) {
    for (const { level, distance } of line) {
      if (FANO_LINES[index].includes(level)) {
        expect(distance, `line ${index} must meet point ${level}`).toBeLessThan(0.25);
      } else {
        // Keep unrelated points clear of the nodes' 14-unit hit areas.
        expect(distance, `line ${index} must avoid point ${level}`).toBeGreaterThan(14);
      }
    }
  }
});

test("Stop All ends a moving Music wheel and Escape leaves it stopped", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const phase = page.getByRole("slider", { name: "Hue phase", exact: true });
  await page.locator(".linked-viz-root svg").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const svg = document.querySelector(".linked-viz-root svg")!;
    const wheel = svg.querySelector('g[style*="grab"]')!;
    const rect = wheel.querySelector('circle[fill="transparent"]')!.getBoundingClientRect();
    // The coast reads the flick's pace from each event's timeStamp and keeps
    // only samples within 90 ms of the last move. Stamped by the real clock, a
    // runner stall before the last step left one sample and parked the wheel at
    // 90, so the stamps are fixed: 90 degrees over 96 ms, lifted 16 ms later.
    const start = performance.now();
    const send = (target: Element, type: string, degrees: number, atMs: number) => {
      const event = new PointerEvent(type, {
        bubbles: true,
        pointerId: 71,
        pointerType: "touch",
        clientX: rect.x + rect.width / 2 + rect.width * 0.4 * Math.cos((degrees * Math.PI) / 180),
        clientY: rect.y + rect.height / 2 + rect.width * 0.4 * Math.sin((degrees * Math.PI) / 180),
      });
      Object.defineProperty(event, "timeStamp", { value: start + atMs });
      target.dispatchEvent(event);
    };
    send(wheel, "pointerdown", 0, 0);
    for (let degrees = 15; degrees <= 90; degrees += 15) send(svg, "pointermove", degrees, (degrees / 15) * 16);
    send(svg, "pointerup", 90, 7 * 16);
  });
  const released = await phase.inputValue();
  await expect.poll(() => phase.inputValue()).not.toBe(released);
  await page.getByRole("button", { name: "Stop All", exact: true }).click();
  const stopped = await phase.inputValue();
  await page.waitForTimeout(250);
  expect(await phase.inputValue()).toBe(stopped);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  expect(await phase.inputValue()).toBe(stopped);
});

test("Music mute shortcuts respect the open keyboard help dialog", async ({ page }) => {
  const mute = page.getByRole("button", { name: "Mute", exact: true });
  await page.keyboard.press("F1");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("m");
  await expect(mute).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("m");
  await expect(mute).toHaveAttribute("aria-pressed", "true");
});

test("changing Cayley row stops its loop and resets the playback control", async ({ page }) => {
  await page.getByRole("button", { name: "▶ Row", exact: true }).click();
  await expect(page.getByRole("button", { name: "⏹ Row", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Cayley row" }).selectOption("2");
  await expect(page.getByRole("button", { name: "▶ Row", exact: true })).toBeVisible();
  await page.waitForTimeout(650);
  await expect(page.getByRole("button", { name: "▶ Row", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "▶ Row", exact: true }).click();
  await expect(page.getByRole("button", { name: "⏹ Row", exact: true })).toBeVisible();
});
