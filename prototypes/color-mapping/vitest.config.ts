import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["prototypes/color-mapping/*.unit.tsx"],
    setupFiles: ["./src/__tests__/setup.ts"],
  },
});
