import { defineConfig } from "@playwright/test";

const HOST = "127.0.0.1";
const DEFAULT_PORT = 4174;
const parsedPort = Number.parseInt(process.env.PW_VISUAL_PORT || "", 10);
const PORT = Number.isFinite(parsedPort) ? parsedPort : DEFAULT_PORT;
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: "./tests/visual",
  snapshotPathTemplate: "{testDir}/baselines/{testFilePath}/{arg}{ext}",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.005,
      scale: "css"
    }
  },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    browserName: "chromium",
    colorScheme: "light",
    locale: "zh-CN",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  webServer: {
    command: `npm run dev -- --host ${HOST} --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000
  }
});
