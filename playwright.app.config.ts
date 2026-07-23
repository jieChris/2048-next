import { defineConfig } from "@playwright/test";

const HOST = "127.0.0.1";
const DEFAULT_PORT = 4174;
const parsedPort = Number.parseInt(process.env.PW_APP_PORT || "", 10);
const PORT = Number.isFinite(parsedPort) ? parsedPort : DEFAULT_PORT;
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: "./tests/smoke",
  testMatch: "mobile-app-*.smoke.spec.ts",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    headless: true,
    locale: "zh-CN",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium"
      }
    }
  ],
  webServer: {
    command: `npm run dev:app -- --host ${HOST} --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000
  }
});
