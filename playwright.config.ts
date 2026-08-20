import { defineConfig } from "@playwright/test";

const HOST = "127.0.0.1";
const DEFAULT_PORT = 4173;
const parsedPort = Number.parseInt(process.env.PW_WEB_PORT || "", 10);
const PORT = Number.isFinite(parsedPort) ? parsedPort : DEFAULT_PORT;
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            {
              name: "2048_beta_access_smoke_bypass_v1",
              value: "1"
            },
            {
              name: "guide_seen_v1:practice-board-v1",
              value: "1"
            },
            {
              name: "guide_seen_v1:diagonal-moves-v1",
              value: "1"
            },
            {
              name: "guide_seen_v1:replay-controls-v1",
              value: "1"
            }
          ]
        }
      ]
    },
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
    command: `npm run dev -- --host ${HOST} --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000
  }
});
