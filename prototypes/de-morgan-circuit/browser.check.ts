import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("prototypes/de-morgan-circuit/?layout=parallel");
});

test("three inputs show both laws and keep separate two-input selections", async ({ page }) => {
  const or = page.locator("#law-or");
  const and = page.locator("#law-and");
  await or.getByRole("group", { name: "入力 a", exact: true }).getByRole("radio", { name: "W 111", exact: true }).check();
  await page.getByRole("button", { name: "3入力", exact: true }).click();
  await expect(page).toHaveURL(/arity=3/);
  await expect(or.locator(".identity")).toHaveText("¬(a ∨ b ∨ c) = ¬a ∧ ¬b ∧ ¬c");
  await expect(and.locator(".identity")).toHaveText("¬(a ∧ b ∧ c) = ¬a ∨ ¬b ∨ ¬c");
  for (const law of [or, and]) {
    await expect(law.locator("fieldset")).toHaveCount(3);
    await expect(law.locator("[data-route=right] [data-gate=NOT]")).toHaveCount(3);
  }
  await expect(or.locator("[data-combined]")).toHaveAttribute("data-level", "7");
  await expect(or.locator("[data-path-result=left]")).toHaveAttribute("data-level", "0");
  await expect(or.locator("[data-path-result=right]")).toHaveAttribute("data-level", "0");
  await expect(and.locator("[data-combined]")).toHaveAttribute("data-level", "0");
  await expect(and.locator("[data-path-result=left]")).toHaveAttribute("data-level", "7");
  await expect(and.locator("[data-path-result=right]")).toHaveAttribute("data-level", "7");
  const orC = or.getByRole("group", { name: "入力 c", exact: true });
  await orC.getByRole("radio", { name: "B 001", exact: true }).focus();
  await orC.getByRole("radio", { name: "B 001", exact: true }).press("ArrowLeft");
  await expect(orC.getByRole("radio", { name: "K 000", exact: true })).toBeChecked();
  await expect(or.locator("[data-path-result=left]")).toHaveAttribute("data-level", "1");
  await expect(and.locator("[data-path-result=left]")).toHaveAttribute("data-level", "7");
  await page.getByRole("button", { name: "2入力", exact: true }).click();
  await expect(or.getByRole("group", { name: "入力 a", exact: true }).getByRole("radio", { name: "W 111", exact: true })).toBeChecked();
  await expect(or.locator("fieldset")).toHaveCount(2);
  await page.getByRole("button", { name: "3入力", exact: true }).click();
  await expect(orC.getByRole("radio", { name: "K 000", exact: true })).toBeChecked();
  await and.getByRole("group", { name: "入力 c", exact: true }).getByRole("radio", { name: "K 000", exact: true }).check();
  await and.getByRole("button", { name: "M・C・Yに戻す" }).click();
  await expect(and.getByRole("group", { name: "入力 c", exact: true }).getByRole("radio", { name: "Y 110", exact: true })).toBeChecked();
  await expect(orC.getByRole("radio", { name: "K 000", exact: true })).toBeChecked();
  await or.getByRole("button", { name: "G・R・Bに戻す" }).click();
  await expect(orC.getByRole("radio", { name: "B 001", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "入力を中央", exact: true }).click();
  await expect(or.locator("[data-shared-input]")).toHaveCount(3);
  await page.reload();
  await expect(page.getByRole("button", { name: "3入力", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(or.locator("[data-shared-input]")).toHaveCount(3);
});

for (const layout of ["parallel", "outputs", "inputs"] as const) {
  test(`three-input ${layout} circuits agree with set complements for all 512 triples`, async ({ page }) => {
    await page.goto(`prototypes/de-morgan-circuit/?layout=${layout}&arity=3`);
    await expect(page.locator("#law-or fieldset")).toHaveCount(3);
    const errors = await page.evaluate((currentLayout) => {
      const subsets = [[], ["B"], ["R"], ["R", "B"], ["G"], ["G", "B"], ["G", "R"], ["G", "R", "B"]];
      const failures: string[] = [];
      for (const operation of ["or", "and"]) {
        const root = document.querySelector(`#law-${operation}`)!;
        for (let a = 0; a < 8; a++)
          for (let b = 0; b < 8; b++)
            for (let c = 0; c < 8; c++) {
              const values = [a, b, c];
              ["a", "b", "c"].forEach((label, index) => {
                const input = root.querySelector<HTMLInputElement>(`input[data-input=${label}][value="${values[index]}"]`)!;
                if (input.checked) return;
                input.checked = true;
                input.dispatchEvent(new Event("change", { bubbles: true }));
              });
              const result = ["G", "R", "B"].filter((primary) =>
                operation === "or"
                  ? values.every((value) => !subsets[value].includes(primary))
                  : values.some((value) => !subsets[value].includes(primary)),
              );
              const expected = subsets.findIndex(
                (subset) => subset.length === result.length && subset.every((primary) => result.includes(primary)),
              );
              for (const route of ["left", "right"]) {
                const selector = currentLayout === "parallel" ? "data-path-result" : "data-route-result";
                if (root.querySelector(`[${selector}=${route}]`)?.getAttribute("data-level") !== String(expected))
                  failures.push(`${operation} ${route}: ${values}`);
              }
            }
      }
      return failures;
    }, layout);
    expect(errors).toEqual([]);
  });
}

test("three-input diagrams preserve readable labels and controls across layouts and widths", async ({ page }) => {
  await page.goto("prototypes/de-morgan-circuit/?arity=3");
  for (const layout of ["parallel", "outputs", "inputs"]) {
    await page.locator(`[data-layout=${layout}]`).click();
    for (const width of [320, 390, 576, 834, 1186]) {
      await page.setViewportSize({ width, height: 760 });
      await expect
        .poll(() =>
          page.evaluate(() =>
            [...document.querySelectorAll<SVGSVGElement>("svg[role=img]")].every(
              (svg) => Math.abs(svg.viewBox.baseVal.width - svg.getBoundingClientRect().width) < 1,
            ),
          ),
        )
        .toBe(true);
      const state = await page.evaluate(() => ({
        fits: document.documentElement.scrollWidth <= innerWidth,
        labels: [...document.querySelectorAll<SVGTextElement>("svg[role=img] text")].every((label) => {
          const r = label.getBoundingClientRect();
          const box = label.ownerSVGElement!.getBoundingClientRect();
          const matrix = label.getScreenCTM()!;
          return (
            r.left >= box.left - 1 &&
            r.right <= box.right + 1 &&
            r.top >= box.top - 1 &&
            r.bottom <= box.bottom + 1 &&
            matrix.a > 0 &&
            matrix.d > 0 &&
            Math.abs(matrix.b) < 0.01 &&
            Math.abs(matrix.c) < 0.01
          );
        }),
        tapTargets: [...document.querySelectorAll<HTMLInputElement>("input[type=radio]")].every((input) => {
          const r = input.getBoundingClientRect();
          return r.width >= 24 && r.height >= 40;
        }),
      }));
      expect(state, `${layout} ${width}px`).toEqual({ fits: true, labels: true, tapTargets: true });
    }
  }
});

test("OR and AND have separate pairs of equivalent circuits and separate outputs", async ({ page }) => {
  const or = page.locator("#law-or");
  const and = page.locator("#law-and");
  for (const law of [or, and]) {
    await expect(law).toBeVisible();
    await expect(law.locator("svg[role=img]")).toHaveCount(2);
    await expect(law.locator("[data-path-result]")).toHaveCount(2);
    await expect(law.locator(".equivalence")).toHaveText("=");
  }
  expect((await or.boundingBox())!.y).toBeLessThan((await and.boundingBox())!.y);
  await expect(or.locator("[data-combined]")).toHaveAttribute("data-level", "6");
  await expect(or.locator("[data-complement-a]")).toHaveAttribute("data-level", "3");
  await expect(or.locator("[data-complement-b]")).toHaveAttribute("data-level", "5");
  await expect(or.locator("[data-path-result='left']")).toHaveAttribute("data-level", "1");
  await expect(or.locator("[data-path-result='right']")).toHaveAttribute("data-level", "1");
  await expect(and.locator("[data-combined]")).toHaveAttribute("data-level", "1");
  await expect(and.locator("[data-complement-a]")).toHaveAttribute("data-level", "4");
  await expect(and.locator("[data-complement-b]")).toHaveAttribute("data-level", "2");
  await expect(and.locator("[data-path-result='left']")).toHaveAttribute("data-level", "6");
  await expect(and.locator("[data-path-result='right']")).toHaveAttribute("data-level", "6");
  await expect(or.locator(".identity")).toHaveText("¬(a ∨ b) = ¬a ∧ ¬b");
  await expect(and.locator(".identity")).toHaveText("¬(a ∧ b) = ¬a ∨ ¬b");
  await expect(or.locator("[data-route=left] [data-gate]")).toHaveCount(2);
  await expect(or.locator("[data-route=right] [data-gate]")).toHaveCount(3);
});

test("inputs and resets are independent, including keyboard selection", async ({ page }) => {
  const or = page.locator("#law-or");
  const and = page.locator("#law-and");
  const green = or.getByRole("group", { name: "入力 a", exact: true }).getByRole("radio", { name: "G 100", exact: true });
  await green.focus();
  await green.press("ArrowRight");
  await expect(or.getByRole("radio", { name: "C 101", exact: true }).first()).toBeChecked();
  await expect(or.locator("[data-path-result='left']")).toHaveAttribute("data-level", "0");
  await expect(and.locator("[data-path-result='left']")).toHaveAttribute("data-level", "6");
  await and.getByRole("group", { name: "入力 a", exact: true }).getByRole("radio", { name: "Y 110", exact: true }).check();
  await and.getByRole("button", { name: "M・Cに戻す" }).click();
  await expect(and.getByRole("group", { name: "入力 a", exact: true }).getByRole("radio", { name: "M 011", exact: true })).toBeChecked();
  await expect(or.locator("[data-path-result='left']")).toHaveAttribute("data-level", "0");
  await or.getByRole("button", { name: "G・Rに戻す" }).click();
  await expect(or.locator("[data-path-result='left']")).toHaveAttribute("data-level", "1");
});

for (const operation of ["or", "and"] as const) {
  test(`${operation.toUpperCase()} circuits agree with the set operation for all 64 pairs`, async ({ page }) => {
    const law = page.locator(`#law-${operation}`);
    const subsets = [[], ["B"], ["R"], ["R", "B"], ["G"], ["G", "B"], ["G", "R"], ["G", "R", "B"]];
    const names = ["K", "B", "R", "M", "G", "C", "Y", "W"];
    for (let a = 0; a < 8; a++) {
      await law
        .getByRole("group", { name: "入力 a", exact: true })
        .getByRole("radio", { name: new RegExp(`^${names[a]} `) })
        .check();
      for (let b = 0; b < 8; b++) {
        await law
          .getByRole("group", { name: "入力 b", exact: true })
          .getByRole("radio", { name: new RegExp(`^${names[b]} `) })
          .check();
        const absent = ["G", "R", "B"].filter((primary) =>
          operation === "or"
            ? !subsets[a].includes(primary) && !subsets[b].includes(primary)
            : !subsets[a].includes(primary) || !subsets[b].includes(primary),
        );
        const expected = subsets.findIndex(
          (subset) => subset.length === absent.length && subset.every((primary) => absent.includes(primary)),
        );
        await expect(law.locator("[data-path-result='left']")).toHaveAttribute("data-level", String(expected));
        await expect(law.locator("[data-path-result='right']")).toHaveAttribute("data-level", String(expected));
      }
    }
  });
}

test("circuits reflow without horizontal overflow or shrinking their text", async ({ page }) => {
  for (const width of [320, 390, 576, 834, 1186]) {
    await page.setViewportSize({ width, height: 760 });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const diagrams = [...document.querySelectorAll<SVGSVGElement>(".circuit-svg")];
          return (
            diagrams.length === 4 && diagrams.every((svg) => Math.abs(svg.viewBox.baseVal.width - svg.getBoundingClientRect().width) < 1)
          );
        }),
      )
      .toBe(true);
    const layout = await page.evaluate(() => ({
      fits: document.documentElement.scrollWidth <= innerWidth,
      labelsFit: [...document.querySelectorAll<SVGTextElement>(".circuit-svg text")].every((label) => {
        const rect = label.getBoundingClientRect();
        const parent = label.ownerSVGElement!.getBoundingClientRect();
        return (
          rect.left >= parent.left - 1 && rect.right <= parent.right + 1 && rect.top >= parent.top - 1 && rect.bottom <= parent.bottom + 1
        );
      }),
      tapTargets: [...document.querySelectorAll<HTMLInputElement>("input[type=radio]")].every((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width >= 24 && rect.height >= 40;
      }),
    }));
    expect(layout, `${width}px`).toEqual({ fits: true, labelsFit: true, tapTargets: true });
  }
});

test("the earlier AND URL still leads to the AND example", async ({ page }) => {
  await page.goto("prototypes/de-morgan-circuit/?operation=and");
  await expect(page.locator("#law-and h2")).toBeInViewport();
  await expect(page.locator("#law-or")).toBeAttached();
});

test("facing layouts share the center, keep labels upright, and preserve inputs when switching", async ({ page }) => {
  await page.goto("prototypes/de-morgan-circuit/?layout=outputs");
  const or = page.locator("#law-or");
  await expect(or.locator("[data-shared-output]")).toHaveAttribute("data-level", "1");
  await expect(or.locator("[data-flow=left]")).toHaveAttribute("data-direction", "1");
  await expect(or.locator("[data-flow=right]")).toHaveAttribute("data-direction", "-1");
  await or.getByRole("group", { name: "入力 a", exact: true }).getByRole("radio", { name: "W 111", exact: true }).check();
  await page.getByRole("button", { name: "入力を中央", exact: true }).click();
  await expect(or.locator("[data-shared-input]")).toHaveCount(2);
  await expect(or.locator("[data-shared-output]")).toHaveCount(0);
  await expect(or.locator("[data-flow=left]")).toHaveAttribute("data-direction", "-1");
  await expect(or.locator("[data-flow=right]")).toHaveAttribute("data-direction", "1");
  await expect(or.getByRole("group", { name: "入力 a", exact: true }).getByRole("radio", { name: "W 111", exact: true })).toBeChecked();
  await expect(or.locator("[data-path-result=left]")).toHaveAttribute("data-level", "0");
  await expect(or.locator("[data-path-result=right]")).toHaveAttribute("data-level", "0");
  await page.getByRole("button", { name: "並列（元の配置）", exact: true }).click();
  await expect(or.locator("svg[role=img]")).toHaveCount(2);
  await expect(or.locator("[data-path-result=left]")).toHaveAttribute("data-level", "0");
});

for (const layout of ["outputs", "inputs"] as const) {
  for (const operation of ["or", "and"] as const) {
    test(`${layout} ${operation} agrees with set complements for all 64 pairs`, async ({ page }) => {
      await page.goto(`prototypes/de-morgan-circuit/?layout=${layout}`);
      const law = page.locator(`#law-${operation}`);
      const subsets = [[], ["B"], ["R"], ["R", "B"], ["G"], ["G", "B"], ["G", "R"], ["G", "R", "B"]];
      const names = ["K", "B", "R", "M", "G", "C", "Y", "W"];
      for (let a = 0; a < 8; a++) {
        await law
          .getByRole("group", { name: "入力 a", exact: true })
          .getByRole("radio", { name: new RegExp(`^${names[a]} `) })
          .check();
        for (let b = 0; b < 8; b++) {
          await law
            .getByRole("group", { name: "入力 b", exact: true })
            .getByRole("radio", { name: new RegExp(`^${names[b]} `) })
            .check();
          const result = ["G", "R", "B"].filter((primary) =>
            operation === "or"
              ? !subsets[a].includes(primary) && !subsets[b].includes(primary)
              : !subsets[a].includes(primary) || !subsets[b].includes(primary),
          );
          const expected = subsets.findIndex(
            (subset) => subset.length === result.length && subset.every((primary) => result.includes(primary)),
          );
          for (const route of ["left", "right"]) {
            await expect(law.locator(`[data-route-result=${route}]`)).toHaveAttribute("data-level", String(expected));
          }
        }
      }
    });
  }

  test(`${layout} keeps connected circuits and upright text at narrow and wide widths`, async ({ page }) => {
    await page.goto(`prototypes/de-morgan-circuit/?layout=${layout}`);
    for (const width of [320, 390, 576, 834, 1186]) {
      await page.setViewportSize({ width, height: 760 });
      await expect
        .poll(() =>
          page.evaluate(() => {
            const diagrams = [...document.querySelectorAll<SVGSVGElement>(".joined-svg")];
            return (
              diagrams.length === 2 && diagrams.every((svg) => Math.abs(svg.viewBox.baseVal.width - svg.getBoundingClientRect().width) < 1)
            );
          }),
        )
        .toBe(true);
      const state = await page.evaluate(() => ({
        fits: document.documentElement.scrollWidth <= innerWidth,
        labels: [...document.querySelectorAll<SVGTextElement>(".joined-svg text")].every((label) => {
          const r = label.getBoundingClientRect();
          const box = label.ownerSVGElement!.getBoundingClientRect();
          const matrix = label.getScreenCTM()!;
          return (
            r.left >= box.left - 1 &&
            r.right <= box.right + 1 &&
            r.top >= box.top - 1 &&
            r.bottom <= box.bottom + 1 &&
            matrix.a > 0 &&
            matrix.d > 0 &&
            Math.abs(matrix.b) < 0.01 &&
            Math.abs(matrix.c) < 0.01
          );
        }),
      }));
      expect(state, `${width}px`).toEqual({ fits: true, labels: true });
    }
  });
}
