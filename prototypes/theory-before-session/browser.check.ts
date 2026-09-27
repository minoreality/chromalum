import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

test("preserves the six-chapter working tree captured before the swap", () => {
  const manifest = JSON.parse(readFileSync(new URL("./snapshot.json", import.meta.url), "utf8")) as {
    baseCommit: string;
    sourceState: string;
    runtimeSourceFiles: number;
    files: { path: string; blob: string }[];
  };
  expect(manifest.baseCommit).toBe("e2cba60b259be600d3c278f736e67c5a64ab449d");
  expect(manifest.sourceState).toBe("working-tree");
  expect(manifest.runtimeSourceFiles).toBe(51);
  expect(manifest.files).toHaveLength(60);
  for (const file of manifest.files) {
    const bytes = readFileSync(new URL(`./snapshot/${file.path}`, import.meta.url));
    const blob = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    expect(blob, file.path).toBe(file.blob);
  }
});

for (const language of ["ja", "en"] as const) {
  for (const width of [320, 1280]) {
    test(`operates the six-chapter prototype and returns to the original Theory in ${language} at ${width}px`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      const liveSourceImports: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("request", (request) => {
        if (/^\/(?:chromalum\/)?src\//.test(new URL(request.url()).pathname)) liveSourceImports.push(request.url());
      });
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((lang) => {
        if (localStorage.getItem("chromalum_lang") === null) localStorage.setItem("chromalum_lang", lang);
      }, language);
      await page.goto("prototypes/theory-before-session/");
      await expect(page).toHaveTitle("CHROMALUM Theory Prototype — 六章構成");
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await expect(page.locator(".theory-chapter > h3")).toHaveCount(11);
      expect(await page.locator(".theory-chapter").evaluateAll((sections) => sections.map((section) => section.id))).toEqual([
        "theory-algebra",
        "theory-boolean-operations",
        "theory-cube-cycle",
        "theory-rank",
        "theory-rank-operations",
        "theory-geometry",
        "theory-k8",
        "theory-fano-hamming",
        "theory-polyhedra",
        "theory-scope",
        "theory-reference",
      ]);
      await expect(page.locator("#theory-cube-heading")).toHaveText(language === "ja" ? "ハッセ図" : "Hasse Diagram");
      await expect(page.locator('#theory-cube-cycle > aside[aria-labelledby="theory-algebra-note-label"]')).toHaveCount(1);
      await expect(page.locator("#theory-rank-operations")).toHaveCount(1);

      const generation = page.getByTestId("primary-generation");
      await expect(generation.locator("[data-generation-result]")).toHaveAttribute("data-generation-result", "0");
      await generation.locator(".theory-generation-inputs button").first().click();
      await expect(generation.locator("[data-generation-result]")).toHaveAttribute("data-generation-result", "4");
      await generation.screenshot({ path: testInfo.outputPath("generation.png") });

      const sets = page.locator(".theory-set-operations");
      const union = sets.locator('[data-set-operation="union"] [data-subset]');
      const intersection = sets.locator('[data-set-operation="intersection"] [data-subset]');
      await expect(union).toHaveText("{G,R,B}");
      await expect(intersection).toHaveText("{R}");
      const blueInput = sets.locator('[data-set-input="T"]').getByRole("button", { name: "B", exact: true });
      await blueInput.focus();
      await blueInput.press("Space");
      await expect(union).toHaveText("{G,R}");
      await expect(intersection).toHaveText("{R}");
      await sets.screenshot({ path: testInfo.outputPath("set-operations.png") });

      const mixing = page.locator("#theory-mixing");
      const grb = mixing.getByRole("figure", { name: language === "ja" ? "GRBの論理和" : "GRB Logical OR" });
      const mcy = mixing.getByRole("figure", { name: language === "ja" ? "MCYの論理積" : "MCY Logical AND" });
      await expect(grb.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", "7");
      await expect(mcy.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", "0");
      const blue = grb.getByRole("button", { name: language === "ja" ? "入力B、ビット001" : "Input B, bits 001", exact: true });
      await blue.focus();
      await blue.press("Space");
      await expect(grb.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", "6");
      await expect(mcy.locator("[data-mixing-result]")).toHaveAttribute("data-mixing-result", "0");

      const cube = page.locator("#theory-cube");
      await expect(cube.locator(".theory-cube-ranks")).toHaveAttribute("opacity", "1");
      const cubeToggle = cube.getByRole("button", { name: language === "ja" ? "カラーキューブ" : "Color Cube", exact: true });
      await expect(cubeToggle).toHaveAttribute("aria-pressed", "false");
      await cubeToggle.click();
      await expect(cubeToggle).toHaveAttribute("aria-pressed", "true");
      await expect(cube.locator(".theory-cube-ranks")).toHaveCount(0);
      await expect(cube.locator(".theory-cube-geometry > figcaption")).toHaveText(language === "ja" ? "カラーキューブ" : "Color Cube");
      await cubeToggle.click();
      await expect(cube.locator(".theory-cube-ranks")).toHaveAttribute("opacity", "1");
      await cube.screenshot({ path: testInfo.outputPath("hasse.png") });

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.locator(".theory-dev-header button").click();
      await expect(page.locator("html")).toHaveAttribute("lang", language === "ja" ? "en" : "ja");
      await expect(page.locator("#theory-cube-heading")).toHaveText(language === "ja" ? "Hasse Diagram" : "ハッセ図");
      expect(liveSourceImports).toEqual([]);

      await page.getByRole("link", { name: "通常のTHEORY" }).click();
      await expect(page).toHaveURL(/\/theory-dev\.html$/);
      await expect(page.locator(".theory-chapter > h3")).toHaveCount(9);
      await expect(page.locator("#theory-cube-heading")).toHaveText(language === "ja" ? "Color Cube" : "カラーキューブ");
      await expect(page.locator(".theory-set-operations, #theory-rank-operations")).toHaveCount(0);
      await expect(page.locator("#theory-boolean-operations > .theory-algebra-note")).toHaveCount(1);
      expect(errors).toEqual([]);
    });
  }
}
