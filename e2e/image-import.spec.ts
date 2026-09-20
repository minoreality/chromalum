import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// Original 16x8 fixtures: black left half, white right half. Encoded with Pillow
// at quality=100 (AVIF 4:4:4, JPEG subsampling=0); no third-party image assets.
const avif = readFileSync(new URL("./fixtures/import-halves.avif", import.meta.url));
const jpeg = readFileSync(new URL("./fixtures/import-halves.jpg", import.meta.url));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="8" viewBox="0 0 16 8">
  <rect width="8" height="8" fill="black"/>
  <rect x="8" width="8" height="8" fill="white"/>
</svg>`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("chromalum_lang", "en");
    // Exercise the cross-browser file input; the picker test overrides this.
    Object.defineProperty(window, "showOpenFilePicker", { value: undefined, configurable: true });
  });
  await page.goto("./#source");
});

async function confirmImport(page: Page) {
  const crop = page.getByRole("dialog", { name: "Crop image" });
  await expect(crop).toBeVisible();
  await crop.getByRole("button", { name: "OK", exact: true }).click();
  await expect(crop).not.toBeVisible();
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  await expect
    .poll(() =>
      canvas.evaluate((node: HTMLCanvasElement) => {
        const ctx = node.getContext("2d")!;
        return {
          size: [node.width, node.height],
          left: Array.from(ctx.getImageData(2, 4, 1, 1).data),
          right: Array.from(ctx.getImageData(13, 4, 1, 1).data),
        };
      }),
    )
    .toEqual({ size: [16, 8], left: [0, 0, 0, 255], right: [255, 255, 255, 255] });
}

for (const file of [
  { name: "halves.avif", mimeType: "image/avif", buffer: avif },
  { name: "halves.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svg) },
  { name: "halves.jfif", mimeType: "image/jpeg", buffer: jpeg },
  { name: "halves.jpe", mimeType: "", buffer: jpeg },
]) {
  test(`Open imports ${file.name} through real image decoding and cropping`, async ({ page }) => {
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Open image file" }).click();
    const chooser = await chooserPromise;
    const accept = await chooser.element().getAttribute("accept");
    for (const extension of [".avif", ".svg", ".jfif", ".jpe"]) expect(accept?.split(",")).toContain(extension);
    await chooser.setFiles(file);
    await confirmImport(page);
  });
}

test("the native picker offers the same new formats and imports AVIF", async ({ page }) => {
  await page.evaluate((base64) => {
    const file = new File([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], "halves.avif", { type: "image/avif" });
    Object.defineProperty(window, "showOpenFilePicker", {
      configurable: true,
      value: async (options: { types: { accept: Record<string, string[]> }[] }) => {
        (window as Window & { imagePickerAccept?: Record<string, string[]> }).imagePickerAccept = options.types[0].accept;
        return [{ getFile: async () => file }];
      },
    });
  }, avif.toString("base64"));
  await page.getByRole("button", { name: "Open image file" }).click();
  expect(await page.evaluate(() => (window as Window & { imagePickerAccept?: Record<string, string[]> }).imagePickerAccept)).toMatchObject({
    "image/avif": [".avif"],
    "image/svg+xml": [".svg"],
    "image/jpeg": [".jpg", ".jpeg", ".jfif", ".jpe"],
  });
  await confirmImport(page);
});

test("dropped SVG stays in an image context with no scripts or external requests", async ({ page }) => {
  const externalRequests: string[] = [];
  const dialogs: string[] = [];
  await page.route("**/__import_external.png", (route) => {
    externalRequests.push(route.request().url());
    return route.abort();
  });
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  const source = svg
    .replace("<svg ", '<svg data-imported="true" onload="alert(\'svg onload\')" ')
    .replace("</svg>", `<script>alert('svg script')</script><image href="/__import_external.png" width="1" height="1"/></svg>`);
  const transfer = await page.evaluateHandle((source) => {
    const transfer = new DataTransfer();
    // No MIME metadata, as can happen with dragged files on some platforms.
    transfer.items.add(new File([source], "drawing.svg"));
    return transfer;
  }, source);
  await page.getByRole("application", { name: "Drawing canvas (grayscale)" }).dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await confirmImport(page);
  expect(externalRequests).toEqual([]);
  expect(dialogs).toEqual([]);
  await expect(page.locator("svg[data-imported]")).toHaveCount(0);
});

test("pasted SVG imports through the same rasterization and crop flow", async ({ page }) => {
  await page.evaluate((source) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([source], "pasted.svg", { type: "image/svg+xml" }));
    window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
  }, svg);
  await confirmImport(page);
});

for (const entry of ["open", "drop", "paste"] as const) {
  test(`unsupported ${entry} shows a short toast and preserves the canvas`, async ({ page }) => {
    const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
    const before = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
    if (entry === "open") {
      const chooserPromise = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Open image file" }).click();
      await (await chooserPromise).setFiles({ name: "photo.heic", mimeType: "image/heic", buffer: Buffer.from("unsupported") });
    } else {
      await page.evaluate((entry) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File(["unsupported"], "photo.heic", { type: "image/heic" }));
        if (entry === "paste") {
          window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
        } else {
          document
            .querySelector(".canvas-workspace")!
            .dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true }));
        }
      }, entry);
    }
    await expect(page.getByText("This file format is not supported", { exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Crop image" })).not.toBeVisible();
    expect(await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL())).toBe(before);
  });
}

test("an unreadable AVIF reports decode failure without replacing the canvas", async ({ page }) => {
  const canvas = page.getByRole("application", { name: "Drawing canvas (grayscale)" });
  const before = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open image file" }).click();
  await (await chooserPromise).setFiles({ name: "broken.avif", mimeType: "image/avif", buffer: Buffer.from("not an image") });
  await expect(page.getByText("Failed to load image", { exact: true })).toBeVisible();
  expect(await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL())).toBe(before);
});
