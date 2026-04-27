/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const reactVendorPackages = ["/node_modules/react/", "/node_modules/react-dom/"];

export default defineConfig({
  base: "/chromalum/",
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");
          if (reactVendorPackages.some((pkg) => normalizedId.includes(pkg))) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    exclude: ["e2e/**", "node_modules/**"],
    setupFiles: ["./src/__tests__/setup.ts"],
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/__tests__/**",
        "**/*.d.ts",
        "src/types.ts",
        "src/i18n/types.ts",
        "src/main.tsx",
        "src/components/music/**",
        "src/components/MusicPanel.tsx",
        "src/hooks/useMusicEngine.ts",
      ],
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 65,
        functions: 55,
        branches: 50,
        statements: 65,
      },
    },
  },
});
