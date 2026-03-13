import { expect, test } from "@playwright/test";

interface SmokePage {
  name: string;
  path: string;
  expectGameManager: boolean;
  expectBootstrapRuntime: boolean;
  expectReplayImportRuntime: boolean;
}

const PAGES: SmokePage[] = [
  { name: "index", path: "/index.html", expectGameManager: true, expectBootstrapRuntime: true, expectReplayImportRuntime: true },
  { name: "undo", path: "/undo_2048.html", expectGameManager: true, expectBootstrapRuntime: true, expectReplayImportRuntime: true },
  { name: "capped", path: "/capped_2048.html", expectGameManager: true, expectBootstrapRuntime: true, expectReplayImportRuntime: true },
  { name: "practice", path: "/Practice_board.html", expectGameManager: true, expectBootstrapRuntime: true, expectReplayImportRuntime: true },
  { name: "play", path: "/play.html?mode_key=standard_4x4_pow2_no_undo", expectGameManager: true, expectBootstrapRuntime: true, expectReplayImportRuntime: true },
  { name: "replay", path: "/replay.html", expectGameManager: true, expectBootstrapRuntime: true, expectReplayImportRuntime: true },
  { name: "modes", path: "/modes.html", expectGameManager: false, expectBootstrapRuntime: false, expectReplayImportRuntime: false },
  { name: "history", path: "/history.html", expectGameManager: false, expectBootstrapRuntime: false, expectReplayImportRuntime: false }
];

function shouldIgnoreConsoleError(text: string): boolean {
  return text.includes("favicon.ico");
}

test.describe("Runtime contract smoke", () => {
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
      await page.waitForFunction(
        (expected) => {
          const hasExpectedGameManager =
            !expected.expectGameManager || Boolean((window as any).game_manager);
          const hasExpectedBootstrapRuntime =
            !expected.expectBootstrapRuntime ||
            Boolean(
              (window as any).CoreBootstrapRuntime?.startGame &&
                (window as any).CoreBootstrapRuntime?.startGameOnAnimationFrame
            );
          const hasExpectedReplayImportRuntime =
            !expected.expectReplayImportRuntime ||
            Boolean((window as any).CoreReplayImportRuntime?.parseReplayImportEnvelope);
          return (
            hasExpectedGameManager && hasExpectedBootstrapRuntime && hasExpectedReplayImportRuntime
          );
        },
        {
          expectGameManager: entry.expectGameManager,
          expectBootstrapRuntime: entry.expectBootstrapRuntime,
          expectReplayImportRuntime: entry.expectReplayImportRuntime
        },
        { timeout: 12_000 }
      );

      const hasGameManager = await page.evaluate(() => Boolean((window as any).game_manager));
      const hasBootstrapRuntime = await page.evaluate(
        () =>
          Boolean(
            (window as any).CoreBootstrapRuntime?.startGame &&
              (window as any).CoreBootstrapRuntime?.startGameOnAnimationFrame
          )
      );
      const hasReplayImportRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayImportRuntime?.parseReplayImportEnvelope)
      );
      const hasLegacyEngine = await page.evaluate(() => Boolean((window as any).__legacyEngine));
      const hasLegacyAdapterRuntime = await page.evaluate(
        () => Boolean((window as any).LegacyAdapterRuntime)
      );
      const hasReplayLegacyRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayLegacyRuntime)
      );

      expect(hasGameManager, `${entry.name} game_manager presence mismatch`).toBe(entry.expectGameManager);
      expect(hasBootstrapRuntime, `${entry.name} CoreBootstrapRuntime presence mismatch`).toBe(
        entry.expectBootstrapRuntime
      );
      expect(hasReplayImportRuntime, `${entry.name} CoreReplayImportRuntime presence mismatch`).toBe(
        entry.expectReplayImportRuntime
      );

      expect(hasLegacyEngine, `${entry.name} should not expose __legacyEngine`).toBe(false);
      expect(hasLegacyAdapterRuntime, `${entry.name} should not expose LegacyAdapterRuntime`).toBe(false);
      expect(hasReplayLegacyRuntime, `${entry.name} should not expose CoreReplayLegacyRuntime`).toBe(false);

      expect(pageErrors, `${entry.name} should not emit pageerror`).toEqual([]);
      expect(consoleErrors, `${entry.name} should not emit console error`).toEqual([]);
    });
  }
});
