import { expect, test } from "@playwright/test";

interface SmokePage {
  name: string;
  path: string;
  expectGameManager: boolean;
  expectLegacyEngine: boolean;
  expectBootstrapRuntime: boolean;
}

const PAGES: SmokePage[] = [
  { name: "index", path: "/index.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true },
  { name: "undo", path: "/undo_2048.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true },
  { name: "capped", path: "/capped_2048.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true },
  { name: "practice", path: "/Practice_board.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true },
  { name: "play", path: "/play.html?mode_key=standard_4x4_pow2_no_undo", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true },
  { name: "replay", path: "/replay.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true },
  { name: "modes", path: "/modes.html", expectGameManager: false, expectLegacyEngine: false, expectBootstrapRuntime: false },
  { name: "history", path: "/history.html", expectGameManager: false, expectLegacyEngine: false, expectBootstrapRuntime: false }
];

function shouldIgnoreConsoleError(text: string): boolean {
  return text.includes("favicon.ico");
}

test.describe("Legacy Multi-Page Smoke", () => {
  for (const entry of PAGES) {
    test(`loads ${entry.name} without runtime errors`, async ({ page }) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];

      page.on("pageerror", (err) => {
        pageErrors.push(err.message);
      });
      page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const text = msg.text();
        if (shouldIgnoreConsoleError(text)) return;
        consoleErrors.push(text);
      });

      const response = await page.goto(entry.path, { waitUntil: "domcontentloaded" });
      expect(response, "Document response should exist").not.toBeNull();
      expect(response?.ok(), "Document response should be 2xx").toBeTruthy();

      await expect(page.locator("body")).toBeVisible();
      await page.waitForTimeout(400);

      const hasGameManager = await page.evaluate(() => Boolean((window as any).game_manager));
      const hasLegacyEngine = await page.evaluate(() => Boolean((window as any).__legacyEngine));
      const hasBootstrapRuntime = await page.evaluate(
        () => Boolean((window as any).LegacyBootstrapRuntime?.startGame)
      );
      const hasLegacyEngineConfig = await page.evaluate(() => {
        const payload = (window as any).__legacyEngine;
        return Boolean(payload && payload.engineConfig && Number(payload.engineConfig.width) > 0);
      });

      expect(
        hasGameManager,
        `${entry.name} game_manager presence mismatch`
      ).toBe(entry.expectGameManager);
      expect(
        hasLegacyEngine,
        `${entry.name} __legacyEngine presence mismatch`
      ).toBe(entry.expectLegacyEngine);
      expect(
        hasBootstrapRuntime,
        `${entry.name} LegacyBootstrapRuntime presence mismatch`
      ).toBe(entry.expectBootstrapRuntime);
      if (entry.expectLegacyEngine) {
        expect(
          hasLegacyEngineConfig,
          `${entry.name} __legacyEngine.engineConfig contract mismatch`
        ).toBe(true);
      }

      expect(pageErrors, `${entry.name} page errors:\n${pageErrors.join("\n")}`).toEqual([]);
      expect(
        consoleErrors,
        `${entry.name} console errors:\n${consoleErrors.join("\n")}`
      ).toEqual([]);
    });
  }
});
