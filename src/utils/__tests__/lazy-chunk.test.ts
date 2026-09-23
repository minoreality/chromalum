import { describe, expect, it } from "vitest";
import { LazyChunkLoadError, loadLazyChunk } from "../lazy-chunk";

describe("loadLazyChunk", () => {
  it("returns the imported module unchanged", async () => {
    const module = { default: () => null };
    await expect(loadLazyChunk(() => Promise.resolve(module))).resolves.toBe(module);
  });

  it.each([new TypeError("Failed to fetch dynamically imported module"), new Error("Importing a module script failed"), "Load failed"])(
    "marks rejected imports without relying on browser-specific error messages: %s",
    async (cause) => {
      const result = loadLazyChunk(() => Promise.reject(cause));
      await expect(result).rejects.toBeInstanceOf(LazyChunkLoadError);
      await expect(result).rejects.toHaveProperty("cause", cause);
    },
  );
});
