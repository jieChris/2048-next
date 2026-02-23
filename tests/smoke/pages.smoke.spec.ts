import { expect, test } from "@playwright/test";

interface SmokePage {
  name: string;
  path: string;
  expectGameManager: boolean;
  expectLegacyEngine: boolean;
  expectBootstrapRuntime: boolean;
  expectCoreRulesRuntime: boolean;
  expectCoreModeRuntime: boolean;
  expectCoreSpecialRulesRuntime: boolean;
  expectCoreDirectionLockRuntime: boolean;
  expectCoreGridScanRuntime: boolean;
  expectCoreMoveScanRuntime: boolean;
  expectCoreMovePathRuntime: boolean;
  expectCoreScoringRuntime: boolean;
  expectCoreMergeEffectsRuntime: boolean;
}

const PAGES: SmokePage[] = [
  { name: "index", path: "/index.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true },
  { name: "undo", path: "/undo_2048.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true },
  { name: "capped", path: "/capped_2048.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true },
  { name: "practice", path: "/Practice_board.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true },
  { name: "play", path: "/play.html?mode_key=standard_4x4_pow2_no_undo", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true },
  { name: "replay", path: "/replay.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true },
  { name: "modes", path: "/modes.html", expectGameManager: false, expectLegacyEngine: false, expectBootstrapRuntime: false, expectCoreRulesRuntime: false, expectCoreModeRuntime: false, expectCoreSpecialRulesRuntime: false, expectCoreDirectionLockRuntime: false, expectCoreGridScanRuntime: false, expectCoreMoveScanRuntime: false, expectCoreMovePathRuntime: false, expectCoreScoringRuntime: false, expectCoreMergeEffectsRuntime: false },
  { name: "history", path: "/history.html", expectGameManager: false, expectLegacyEngine: false, expectBootstrapRuntime: false, expectCoreRulesRuntime: false, expectCoreModeRuntime: false, expectCoreSpecialRulesRuntime: false, expectCoreDirectionLockRuntime: false, expectCoreGridScanRuntime: false, expectCoreMoveScanRuntime: false, expectCoreMovePathRuntime: false, expectCoreScoringRuntime: false, expectCoreMergeEffectsRuntime: false }
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
      const hasCoreRulesRuntime = await page.evaluate(
        () => Boolean((window as any).CoreRulesRuntime?.getMergedValue)
      );
      const hasCoreModeRuntime = await page.evaluate(
        () => Boolean((window as any).CoreModeRuntime?.normalizeModeConfig)
      );
      const hasCoreSpecialRulesRuntime = await page.evaluate(
        () => Boolean((window as any).CoreSpecialRulesRuntime?.computeSpecialRulesState)
      );
      const hasCoreDirectionLockRuntime = await page.evaluate(
        () => Boolean((window as any).CoreDirectionLockRuntime?.getLockedDirectionState)
      );
      const hasCoreGridScanRuntime = await page.evaluate(
        () => Boolean((window as any).CoreGridScanRuntime?.getAvailableCells)
      );
      const hasCoreMoveScanRuntime = await page.evaluate(
        () => Boolean((window as any).CoreMoveScanRuntime?.tileMatchesAvailable)
      );
      const hasCoreMovePathRuntime = await page.evaluate(
        () => Boolean((window as any).CoreMovePathRuntime?.findFarthestPosition)
      );
      const hasCoreScoringRuntime = await page.evaluate(
        () => Boolean((window as any).CoreScoringRuntime?.computePostMoveScore)
      );
      const hasCoreMergeEffectsRuntime = await page.evaluate(
        () => Boolean((window as any).CoreMergeEffectsRuntime?.computeMergeEffects)
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
      expect(
        hasCoreRulesRuntime,
        `${entry.name} CoreRulesRuntime presence mismatch`
      ).toBe(entry.expectCoreRulesRuntime);
      expect(
        hasCoreModeRuntime,
        `${entry.name} CoreModeRuntime presence mismatch`
      ).toBe(entry.expectCoreModeRuntime);
      expect(
        hasCoreSpecialRulesRuntime,
        `${entry.name} CoreSpecialRulesRuntime presence mismatch`
      ).toBe(entry.expectCoreSpecialRulesRuntime);
      expect(
        hasCoreDirectionLockRuntime,
        `${entry.name} CoreDirectionLockRuntime presence mismatch`
      ).toBe(entry.expectCoreDirectionLockRuntime);
      expect(
        hasCoreGridScanRuntime,
        `${entry.name} CoreGridScanRuntime presence mismatch`
      ).toBe(entry.expectCoreGridScanRuntime);
      expect(
        hasCoreMoveScanRuntime,
        `${entry.name} CoreMoveScanRuntime presence mismatch`
      ).toBe(entry.expectCoreMoveScanRuntime);
      expect(
        hasCoreMovePathRuntime,
        `${entry.name} CoreMovePathRuntime presence mismatch`
      ).toBe(entry.expectCoreMovePathRuntime);
      expect(
        hasCoreScoringRuntime,
        `${entry.name} CoreScoringRuntime presence mismatch`
      ).toBe(entry.expectCoreScoringRuntime);
      expect(
        hasCoreMergeEffectsRuntime,
        `${entry.name} CoreMergeEffectsRuntime presence mismatch`
      ).toBe(entry.expectCoreMergeEffectsRuntime);
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
