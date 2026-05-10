import { defineConfig, devices } from "playwright/test";

const visualBaseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const visualPort = new URL(visualBaseURL).port || "3100";

export default defineConfig({
  testDir: "./e2e/visual",
  timeout: 30_000,
  use: {
    baseURL: visualBaseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --hostname 127.0.0.1 --port ${visualPort}`,
    url: visualBaseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
