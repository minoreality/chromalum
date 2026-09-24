import { expect, test, type Page } from "@playwright/test";

// Expected orders and ties are rebuilt from subsets of {G,R,B}, independently of the page's model.
const SETS = [[], ["B"], ["R"], ["R", "B"], ["G"], ["G", "B"], ["G", "R"], ["G", "R", "B"]];
const NAMES = "KBRMGCYW";
const sigma = (w: number[], level: number) => SETS[level].reduce((sum, c) => sum + w[["G", "R", "B"].indexOf(c)], 0);
const PAGE = "prototypes/weight-chambers/";
const marks = (page: Page, list: string) =>
  page
    .locator(`${list} .mark`)
    .allTextContents()
    .then((all) => all.join(""));

function reversedExtensions() {
  const subset = (a: number, b: number) => SETS[a].every((c) => SETS[b].includes(c));
  const complement = (a: number) => SETS.findIndex((s) => s.length === 3 - SETS[a].length && s.every((c) => !SETS[a].includes(c)));
  const out: string[] = [];
  const walk = (prefix: number[]) => {
    if (prefix.length === 8) {
      if (prefix.every((x, i) => prefix[7 - i] === complement(x))) out.push(prefix.map((x) => NAMES[x]).join(""));
      return;
    }
    for (let x = 0; x < 8; x++)
      if (!prefix.includes(x) && SETS.every((_, y) => y === x || !subset(y, x) || prefix.includes(y))) walk([...prefix, x]);
  };
  walk([]);
  return out.sort();
}

test("starts at 4:2:1 in the chamber where all three conditions hold", async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator(".order code")).toHaveText("K<B<R<M<G<C<Y<W");
  await expect(page.locator(".weights-value")).toHaveText(" 96 :  48 :  24");
  await expect(page.locator(".ratio")).toHaveText("= 4 : 2 : 1");
  expect(await marks(page, ".conditions")).toBe("✓✓✓");
  expect(await marks(page, ".funnel")).toBe("✓✓✓✓");
  await expect(page.locator(".funnel .count")).toHaveText(["48", "12", "6", "1"]);
  await expect(page.locator(".chamber[data-current]")).toHaveAttribute("data-a1", "");
  await expect(page.locator(".half-labels [aria-hidden=false]")).toHaveAttribute("data-half", "G");
  await expect(page.locator(".hasse-node[data-upper]")).toHaveCount(4);
  await expect(page).toHaveURL(/\?w=96,48,24$/);
});

test("gives the twelve chambers the twelve inclusion orders that complement reverses", async ({ page }) => {
  await page.goto(PAGE);
  const orders = await page.locator(".chamber").evaluateAll((paths) => paths.map((path) => path.getAttribute("data-order")!));
  expect(orders.sort()).toEqual(reversedExtensions());
  const halves = await page.locator(".chamber").evaluateAll((paths) => paths.map((path) => path.getAttribute("data-half")).sort());
  expect(halves).toEqual(["B", "B", "G", "G", "R", "R", ...Array(6).fill("majority")].sort());
});

test("crossing the G–M wall ties G with M, then hands the upper half to majority", async ({ page }) => {
  await page.goto(PAGE);
  const handle = page.getByRole("slider");
  await handle.focus();
  for (let i = 0; i < 6; i++) await handle.press("ArrowDown");
  await expect(page.locator(".weights-value")).toHaveText(" 84 :  54 :  30");
  await expect(page.locator(".order code")).toHaveText("K<B<R<M=G<C<Y<W");
  await expect(page.locator(".walls tbody tr[data-on] th")).toHaveText(["wG = wR + wB"]);
  await expect(page.locator(".wall[data-on]")).toHaveCount(1);
  await expect(page.locator(".chamber[data-current]")).toHaveCount(0);
  await expect(page.locator(".half-labels [aria-hidden=false]")).toHaveAttribute("data-half", "none");
  expect(await marks(page, ".conditions")).toBe("✓✓✗");
  expect(await marks(page, ".funnel")).toBe("————");
  await handle.press("ArrowDown");
  await expect(page.locator(".order code")).toHaveText("K<B<R<G<M<C<Y<W");
  await expect(page.locator(".half-labels [aria-hidden=false]")).toHaveAttribute("data-half", "majority");
  expect(await marks(page, ".funnel")).toBe("✓✓✗✗");
  await expect(handle).toBeFocused();
  await handle.press("Home");
  await expect(page.locator(".order code")).toHaveText("K<B<R<M<G<C<Y<W");
});

test("on each wall exactly the pairs listed for it tie", async ({ page }) => {
  const points = [
    [84, 50, 34],
    [50, 84, 34],
    [50, 34, 84],
    [60, 60, 48],
    [60, 48, 60],
    [80, 44, 44],
  ];
  await page.goto(PAGE);
  await expect(page.locator(".walls tbody tr")).toHaveCount(points.length);
  for (const [i, w] of points.entries()) {
    await page.goto(`${PAGE}?w=${w.join(",")}`);
    await expect(page.locator(".walls tbody tr[data-on]")).toHaveCount(1);
    await expect(page.locator(".walls tbody tr").nth(i)).toHaveAttribute("data-on", "");
    const ties = SETS.flatMap((_, x) => SETS.map((_, y) => [x, y]).filter(([, y]) => x < y && sigma(w, x) === sigma(w, y)))
      .map(([x, y]) => [NAMES[x], NAMES[y]].sort().join(""))
      .sort();
    const listed = (await page.locator(".walls tbody tr").nth(i).locator("td").textContent())!
      .split("、")
      .map((pair) => pair.split(" ↔ ").sort().join(""))
      .sort();
    expect(listed).toEqual(ties);
    const shown = (await page.locator(".order code").textContent())!.match(/\w(=\w)+/g)!.map((run) => run.split("=").sort().join(""));
    expect(shown.sort()).toEqual(ties);
  }
});

test("clicking inside a chamber moves the point into it", async ({ page }) => {
  await page.goto(PAGE);
  const centroids = await page.locator(".chamber").evaluateAll((paths) =>
    paths.map((path) => {
      const [x0, y0, x1, y1, x2, y2] = path
        .getAttribute("d")!
        .match(/-?[\d.]+/g)!
        .map(Number);
      const box = path.closest("svg")!.getBoundingClientRect();
      return { order: path.getAttribute("data-order")!, x: box.left + (x0 + x1 + x2) / 3, y: box.top + (y0 + y1 + y2) / 3 };
    }),
  );
  for (const { order, x, y } of centroids) {
    await page.mouse.click(x, y);
    await expect(page.locator(".chamber[data-current]")).toHaveAttribute("data-order", order);
    const text = (await page.locator(".weights-value").textContent())!;
    expect(text.split(":").reduce((sum, v) => sum + Number(v), 0)).toBe(168);
  }
  await expect(page.getByRole("slider")).toBeFocused();
});

test("falls back to 4:2:1 when the URL weights are off the lattice", async ({ page }) => {
  for (const bad of ["1,2,3", "96,48", "96,-1,73", "a,b,c"]) {
    await page.goto(`${PAGE}?w=${bad}`);
    await expect(page.locator(".weights-value")).toHaveText(" 96 :  48 :  24");
  }
  await page.goto(`${PAGE}?w=0,0,168`);
  await expect(page.locator(".order code")).toHaveText("K=R=G=Y<B=M=C=W");
  await expect(page.locator(".half-labels [aria-hidden=false]")).toHaveAttribute("data-half", "B");
});

test("keeps every readout in place and every label inside its figure across states and widths", async ({ page }) => {
  const states = ["96,48,24", "84,54,30", "82,55,31", "82,0,86", "56,56,56", "0,168,0"];
  for (const width of [320, 390, 576, 834, 1186]) {
    await page.setViewportSize({ width, height: 800 });
    const layouts = new Set<string>();
    for (const w of states) {
      await page.goto(`${PAGE}?w=${w}`);
      await expect
        .poll(() =>
          page.evaluate(() =>
            [...document.querySelectorAll<SVGSVGElement>(".triangle-svg, .strip-svg")].every(
              (svg) => Math.abs(svg.viewBox.baseVal.width - svg.getBoundingClientRect().width) < 1,
            ),
          ),
        )
        .toBe(true);
      const state = await page.evaluate(() => ({
        fits: document.documentElement.scrollWidth <= innerWidth,
        labels: [...document.querySelectorAll<SVGTextElement>("svg text")].every((label) => {
          const r = label.getBoundingClientRect();
          const box = label.ownerSVGElement!.getBoundingClientRect();
          return r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1;
        }),
        layout: [...document.querySelectorAll(".triangle, .readouts > *, .walls-section, footer")]
          .map((el) => {
            const r = el.getBoundingClientRect();
            return `${Math.round(r.left)},${Math.round(r.top + scrollY)},${Math.round(r.width)},${Math.round(r.height)}`;
          })
          .join(" "),
      }));
      expect(state.fits && state.labels, `${w} at ${width}px`).toBe(true);
      layouts.add(state.layout);
    }
    expect(layouts.size, `${width}px`).toBe(1);
  }
});
