import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  test: {
    globals: true,
    include: ["snapshot/**/*.check.{ts,tsx}"],
    setupFiles: ["./snapshot/src/__tests__/setup.ts"],
    testTimeout: 15_000,
  },
});
