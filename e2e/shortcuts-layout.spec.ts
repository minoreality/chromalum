import { expect, test } from "@playwright/test";

for (const language of ["ja", "en"] as const) {
  for (const { width, wideGlyphs } of [
    { width: 580, wideGlyphs: false },
    { width: 320, wideGlyphs: false },
    { width: 320, wideGlyphs: true },
  ]) {
    test(`keeps every ${language} shortcut list on single lines without scrolling at ${width}px${wideGlyphs ? " with wide glyphs" : ""}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 668 });
      await page.addInitScript((lang) => localStorage.setItem("chromalum_lang", lang), language);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("./#source");
      if (wideGlyphs) await page.addStyleTag({ content: '[role="dialog"] span { font-family: "MS Gothic", monospace !important; }' });

      for (const tab of ["Source", "Glaze", "Hex", "Map", "Gallery", "Theory", "Music"]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        await page.getByRole("button", { name: "Shortcuts", exact: true }).click();
        const dialog = page.getByRole("dialog", { name: language === "ja" ? "ショートカット一覧" : "Keyboard Shortcuts" });
        await expect(dialog).toBeVisible();
        const measurements = await dialog.evaluate((el) => {
          const box = el.getBoundingClientRect();
          const rows = Array.from(el.children).filter((child) => getComputedStyle(child).display === "grid");
          const wrapped = rows
            .map((row) => row.children[1])
            .filter((label) => label.getBoundingClientRect().height > parseFloat(getComputedStyle(label).lineHeight) * 1.2)
            .map((label) => label.textContent);
          const overlaps = rows
            .filter((row) => {
              const key = document.createRange();
              key.selectNodeContents(row.children[0]);
              const label = document.createRange();
              label.selectNodeContents(row.children[1]);
              return key.getBoundingClientRect().right > label.getBoundingClientRect().left;
            })
            .map((row) => row.textContent);
          return {
            fitsHeight: el.scrollHeight <= el.clientHeight + 1,
            fitsWidth: el.scrollWidth <= el.clientWidth + 1,
            withinScreen: box.left >= 0 && box.right <= window.innerWidth && box.top >= 0 && box.bottom <= window.innerHeight,
            wrapped,
            overlaps,
          };
        });
        expect(measurements, `${tab} shortcuts`).toEqual({
          fitsHeight: true,
          fitsWidth: true,
          withinScreen: true,
          wrapped: [],
          overlaps: [],
        });
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
      }
    });
  }
}
