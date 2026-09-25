import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: ".",
  testMatch: "browser.check.ts",
  outputDir: "../../test-results/de-morgan-lab",
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173/chromalum/",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    url: "http://127.0.0.1:4173/chromalum/",
    reuseExistingServer: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
