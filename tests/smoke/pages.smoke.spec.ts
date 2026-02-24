import { expect, test } from "@playwright/test";

interface SmokePage {
  name: string;
  path: string;
  expectGameManager: boolean;
  expectLegacyEngine: boolean;
  expectBootstrapRuntime: boolean;
  expectLegacyAdapterRuntime: boolean;
  expectLegacyAdapterIoRuntime: boolean;
  expectCoreAdapterShadowRuntime: boolean;
  expectCoreRulesRuntime: boolean;
  expectCoreModeRuntime: boolean;
  expectCoreSpecialRulesRuntime: boolean;
  expectCoreDirectionLockRuntime: boolean;
  expectCoreGridScanRuntime: boolean;
  expectCoreMoveScanRuntime: boolean;
  expectCoreMovePathRuntime: boolean;
  expectCoreScoringRuntime: boolean;
  expectCoreMergeEffectsRuntime: boolean;
  expectCorePostMoveRuntime: boolean;
  expectCoreMoveApplyRuntime: boolean;
  expectCorePostMoveRecordRuntime: boolean;
  expectCorePostUndoRecordRuntime: boolean;
  expectCoreUndoRestoreRuntime: boolean;
  expectCoreUndoSnapshotRuntime: boolean;
  expectCoreUndoTileSnapshotRuntime: boolean;
  expectCoreUndoTileRestoreRuntime: boolean;
  expectCoreUndoRestorePayloadRuntime: boolean;
  expectCoreUndoStackEntryRuntime: boolean;
  expectCoreReplayCodecRuntime: boolean;
  expectCoreReplayV4ActionsRuntime: boolean;
  expectCoreReplayLegacyRuntime: boolean;
  expectCoreReplayImportRuntime: boolean;
  expectCoreReplayExecutionRuntime: boolean;
  expectCoreReplayDispatchRuntime: boolean;
  expectCoreReplayLifecycleRuntime: boolean;
  expectCoreReplayTimerRuntime: boolean;
  expectCoreReplayFlowRuntime: boolean;
  expectCoreReplayControlRuntime: boolean;
  expectCoreReplayLoopRuntime: boolean;
}

const PAGES: SmokePage[] = [
  { name: "index", path: "/index.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectLegacyAdapterRuntime: true, expectLegacyAdapterIoRuntime: true, expectCoreAdapterShadowRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true, expectCorePostMoveRuntime: true, expectCoreMoveApplyRuntime: true, expectCorePostMoveRecordRuntime: true, expectCorePostUndoRecordRuntime: true, expectCoreUndoRestoreRuntime: true, expectCoreUndoSnapshotRuntime: true, expectCoreUndoTileSnapshotRuntime: true, expectCoreUndoTileRestoreRuntime: true, expectCoreUndoRestorePayloadRuntime: true, expectCoreUndoStackEntryRuntime: true, expectCoreReplayCodecRuntime: true, expectCoreReplayV4ActionsRuntime: true, expectCoreReplayLegacyRuntime: true, expectCoreReplayImportRuntime: true, expectCoreReplayExecutionRuntime: true, expectCoreReplayDispatchRuntime: true, expectCoreReplayLifecycleRuntime: true, expectCoreReplayTimerRuntime: true, expectCoreReplayFlowRuntime: true, expectCoreReplayControlRuntime: true, expectCoreReplayLoopRuntime: true },
  { name: "undo", path: "/undo_2048.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectLegacyAdapterRuntime: true, expectLegacyAdapterIoRuntime: true, expectCoreAdapterShadowRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true, expectCorePostMoveRuntime: true, expectCoreMoveApplyRuntime: true, expectCorePostMoveRecordRuntime: true, expectCorePostUndoRecordRuntime: true, expectCoreUndoRestoreRuntime: true, expectCoreUndoSnapshotRuntime: true, expectCoreUndoTileSnapshotRuntime: true, expectCoreUndoTileRestoreRuntime: true, expectCoreUndoRestorePayloadRuntime: true, expectCoreUndoStackEntryRuntime: true, expectCoreReplayCodecRuntime: true, expectCoreReplayV4ActionsRuntime: true, expectCoreReplayLegacyRuntime: true, expectCoreReplayImportRuntime: true, expectCoreReplayExecutionRuntime: true, expectCoreReplayDispatchRuntime: true, expectCoreReplayLifecycleRuntime: true, expectCoreReplayTimerRuntime: true, expectCoreReplayFlowRuntime: true, expectCoreReplayControlRuntime: true, expectCoreReplayLoopRuntime: true },
  { name: "capped", path: "/capped_2048.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectLegacyAdapterRuntime: true, expectLegacyAdapterIoRuntime: true, expectCoreAdapterShadowRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true, expectCorePostMoveRuntime: true, expectCoreMoveApplyRuntime: true, expectCorePostMoveRecordRuntime: true, expectCorePostUndoRecordRuntime: true, expectCoreUndoRestoreRuntime: true, expectCoreUndoSnapshotRuntime: true, expectCoreUndoTileSnapshotRuntime: true, expectCoreUndoTileRestoreRuntime: true, expectCoreUndoRestorePayloadRuntime: true, expectCoreUndoStackEntryRuntime: true, expectCoreReplayCodecRuntime: true, expectCoreReplayV4ActionsRuntime: true, expectCoreReplayLegacyRuntime: true, expectCoreReplayImportRuntime: true, expectCoreReplayExecutionRuntime: true, expectCoreReplayDispatchRuntime: true, expectCoreReplayLifecycleRuntime: true, expectCoreReplayTimerRuntime: true, expectCoreReplayFlowRuntime: true, expectCoreReplayControlRuntime: true, expectCoreReplayLoopRuntime: true },
  { name: "practice", path: "/Practice_board.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectLegacyAdapterRuntime: true, expectLegacyAdapterIoRuntime: true, expectCoreAdapterShadowRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true, expectCorePostMoveRuntime: true, expectCoreMoveApplyRuntime: true, expectCorePostMoveRecordRuntime: true, expectCorePostUndoRecordRuntime: true, expectCoreUndoRestoreRuntime: true, expectCoreUndoSnapshotRuntime: true, expectCoreUndoTileSnapshotRuntime: true, expectCoreUndoTileRestoreRuntime: true, expectCoreUndoRestorePayloadRuntime: true, expectCoreUndoStackEntryRuntime: true, expectCoreReplayCodecRuntime: true, expectCoreReplayV4ActionsRuntime: true, expectCoreReplayLegacyRuntime: true, expectCoreReplayImportRuntime: true, expectCoreReplayExecutionRuntime: true, expectCoreReplayDispatchRuntime: true, expectCoreReplayLifecycleRuntime: true, expectCoreReplayTimerRuntime: true, expectCoreReplayFlowRuntime: true, expectCoreReplayControlRuntime: true, expectCoreReplayLoopRuntime: true },
  { name: "play", path: "/play.html?mode_key=standard_4x4_pow2_no_undo", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectLegacyAdapterRuntime: true, expectLegacyAdapterIoRuntime: true, expectCoreAdapterShadowRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true, expectCorePostMoveRuntime: true, expectCoreMoveApplyRuntime: true, expectCorePostMoveRecordRuntime: true, expectCorePostUndoRecordRuntime: true, expectCoreUndoRestoreRuntime: true, expectCoreUndoSnapshotRuntime: true, expectCoreUndoTileSnapshotRuntime: true, expectCoreUndoTileRestoreRuntime: true, expectCoreUndoRestorePayloadRuntime: true, expectCoreUndoStackEntryRuntime: true, expectCoreReplayCodecRuntime: true, expectCoreReplayV4ActionsRuntime: true, expectCoreReplayLegacyRuntime: true, expectCoreReplayImportRuntime: true, expectCoreReplayExecutionRuntime: true, expectCoreReplayDispatchRuntime: true, expectCoreReplayLifecycleRuntime: true, expectCoreReplayTimerRuntime: true, expectCoreReplayFlowRuntime: true, expectCoreReplayControlRuntime: true, expectCoreReplayLoopRuntime: true },
  { name: "replay", path: "/replay.html", expectGameManager: true, expectLegacyEngine: true, expectBootstrapRuntime: true, expectLegacyAdapterRuntime: true, expectLegacyAdapterIoRuntime: true, expectCoreAdapterShadowRuntime: true, expectCoreRulesRuntime: true, expectCoreModeRuntime: true, expectCoreSpecialRulesRuntime: true, expectCoreDirectionLockRuntime: true, expectCoreGridScanRuntime: true, expectCoreMoveScanRuntime: true, expectCoreMovePathRuntime: true, expectCoreScoringRuntime: true, expectCoreMergeEffectsRuntime: true, expectCorePostMoveRuntime: true, expectCoreMoveApplyRuntime: true, expectCorePostMoveRecordRuntime: true, expectCorePostUndoRecordRuntime: true, expectCoreUndoRestoreRuntime: true, expectCoreUndoSnapshotRuntime: true, expectCoreUndoTileSnapshotRuntime: true, expectCoreUndoTileRestoreRuntime: true, expectCoreUndoRestorePayloadRuntime: true, expectCoreUndoStackEntryRuntime: true, expectCoreReplayCodecRuntime: true, expectCoreReplayV4ActionsRuntime: true, expectCoreReplayLegacyRuntime: true, expectCoreReplayImportRuntime: true, expectCoreReplayExecutionRuntime: true, expectCoreReplayDispatchRuntime: true, expectCoreReplayLifecycleRuntime: true, expectCoreReplayTimerRuntime: true, expectCoreReplayFlowRuntime: true, expectCoreReplayControlRuntime: true, expectCoreReplayLoopRuntime: true },
  { name: "modes", path: "/modes.html", expectGameManager: false, expectLegacyEngine: false, expectBootstrapRuntime: false, expectLegacyAdapterRuntime: false, expectLegacyAdapterIoRuntime: false, expectCoreAdapterShadowRuntime: false, expectCoreRulesRuntime: false, expectCoreModeRuntime: false, expectCoreSpecialRulesRuntime: false, expectCoreDirectionLockRuntime: false, expectCoreGridScanRuntime: false, expectCoreMoveScanRuntime: false, expectCoreMovePathRuntime: false, expectCoreScoringRuntime: false, expectCoreMergeEffectsRuntime: false, expectCorePostMoveRuntime: false, expectCoreMoveApplyRuntime: false, expectCorePostMoveRecordRuntime: false, expectCorePostUndoRecordRuntime: false, expectCoreUndoRestoreRuntime: false, expectCoreUndoSnapshotRuntime: false, expectCoreUndoTileSnapshotRuntime: false, expectCoreUndoTileRestoreRuntime: false, expectCoreUndoRestorePayloadRuntime: false, expectCoreUndoStackEntryRuntime: false, expectCoreReplayCodecRuntime: false, expectCoreReplayV4ActionsRuntime: false, expectCoreReplayLegacyRuntime: false, expectCoreReplayImportRuntime: false, expectCoreReplayExecutionRuntime: false, expectCoreReplayDispatchRuntime: false, expectCoreReplayLifecycleRuntime: false, expectCoreReplayTimerRuntime: false, expectCoreReplayFlowRuntime: false, expectCoreReplayControlRuntime: false, expectCoreReplayLoopRuntime: false },
  { name: "history", path: "/history.html", expectGameManager: false, expectLegacyEngine: false, expectBootstrapRuntime: false, expectLegacyAdapterRuntime: true, expectLegacyAdapterIoRuntime: false, expectCoreAdapterShadowRuntime: false, expectCoreRulesRuntime: false, expectCoreModeRuntime: false, expectCoreSpecialRulesRuntime: false, expectCoreDirectionLockRuntime: false, expectCoreGridScanRuntime: false, expectCoreMoveScanRuntime: false, expectCoreMovePathRuntime: false, expectCoreScoringRuntime: false, expectCoreMergeEffectsRuntime: false, expectCorePostMoveRuntime: false, expectCoreMoveApplyRuntime: false, expectCorePostMoveRecordRuntime: false, expectCorePostUndoRecordRuntime: false, expectCoreUndoRestoreRuntime: false, expectCoreUndoSnapshotRuntime: false, expectCoreUndoTileSnapshotRuntime: false, expectCoreUndoTileRestoreRuntime: false, expectCoreUndoRestorePayloadRuntime: false, expectCoreUndoStackEntryRuntime: false, expectCoreReplayCodecRuntime: false, expectCoreReplayV4ActionsRuntime: false, expectCoreReplayLegacyRuntime: false, expectCoreReplayImportRuntime: false, expectCoreReplayExecutionRuntime: false, expectCoreReplayDispatchRuntime: false, expectCoreReplayLifecycleRuntime: false, expectCoreReplayTimerRuntime: false, expectCoreReplayFlowRuntime: false, expectCoreReplayControlRuntime: false, expectCoreReplayLoopRuntime: false }
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
        () =>
          Boolean(
            (window as any).LegacyBootstrapRuntime?.startGame &&
              (window as any).LegacyBootstrapRuntime?.startGameOnAnimationFrame
          )
      );
      const hasLegacyAdapterRuntime = await page.evaluate(
        () => Boolean((window as any).LegacyAdapterRuntime?.attachLegacyBridgeWithAdapter)
      );
      const hasLegacyAdapterIoRuntime = await page.evaluate(
        () => Boolean((window as any).LegacyAdapterIoRuntime?.writeAdapterSnapshot)
      );
      const hasCoreAdapterShadowRuntime = await page.evaluate(
        () =>
          Boolean(
            (window as any).CoreAdapterShadowRuntime?.attachAdapterMoveResultShadow &&
              (window as any).CoreAdapterShadowRuntime?.buildAdapterSessionParityReport &&
              (window as any).CoreAdapterShadowRuntime?.buildAdapterParityABDiffSummary
          )
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
      const hasCorePostMoveRuntime = await page.evaluate(
        () => Boolean((window as any).CorePostMoveRuntime?.computePostMoveLifecycle)
      );
      const hasCoreMoveApplyRuntime = await page.evaluate(
        () => Boolean((window as any).CoreMoveApplyRuntime?.planTileInteraction)
      );
      const hasCorePostMoveRecordRuntime = await page.evaluate(
        () => Boolean((window as any).CorePostMoveRecordRuntime?.computePostMoveRecord)
      );
      const hasCorePostUndoRecordRuntime = await page.evaluate(
        () => Boolean((window as any).CorePostUndoRecordRuntime?.computePostUndoRecord)
      );
      const hasCoreUndoRestoreRuntime = await page.evaluate(
        () => Boolean((window as any).CoreUndoRestoreRuntime?.computeUndoRestoreState)
      );
      const hasCoreUndoSnapshotRuntime = await page.evaluate(
        () => Boolean((window as any).CoreUndoSnapshotRuntime?.createUndoSnapshot)
      );
      const hasCoreUndoTileSnapshotRuntime = await page.evaluate(
        () => Boolean((window as any).CoreUndoTileSnapshotRuntime?.createUndoTileSnapshot)
      );
      const hasCoreUndoTileRestoreRuntime = await page.evaluate(
        () => Boolean((window as any).CoreUndoTileRestoreRuntime?.createUndoRestoreTile)
      );
      const hasCoreUndoRestorePayloadRuntime = await page.evaluate(
        () => Boolean((window as any).CoreUndoRestorePayloadRuntime?.computeUndoRestorePayload)
      );
      const hasCoreUndoStackEntryRuntime = await page.evaluate(
        () => Boolean((window as any).CoreUndoStackEntryRuntime?.normalizeUndoStackEntry)
      );
      const hasCoreReplayCodecRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayCodecRuntime?.encodeReplay128)
      );
      const hasCoreReplayV4ActionsRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayV4ActionsRuntime?.decodeReplayV4Actions)
      );
      const hasCoreReplayLegacyRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayLegacyRuntime?.decodeLegacyReplay)
      );
      const hasCoreReplayImportRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayImportRuntime?.parseReplayImportEnvelope)
      );
      const hasCoreReplayExecutionRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayExecutionRuntime?.resolveReplayExecution)
      );
      const hasCoreReplayDispatchRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayDispatchRuntime?.planReplayDispatch)
      );
      const hasCoreReplayLifecycleRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayLifecycleRuntime?.planReplayStep)
      );
      const hasCoreReplayTimerRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayTimerRuntime?.computeReplayResumeState)
      );
      const hasCoreReplayFlowRuntime = await page.evaluate(
        () => Boolean(
          (window as any).CoreReplayFlowRuntime?.planReplaySeekRewind &&
          (window as any).CoreReplayFlowRuntime?.planReplaySeekRestart
        )
      );
      const hasCoreReplayControlRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayControlRuntime?.planReplayTickBoundary)
      );
      const hasCoreReplayLoopRuntime = await page.evaluate(
        () => Boolean((window as any).CoreReplayLoopRuntime?.planReplayStepExecution)
      );
      const legacyEngineContract = await page.evaluate(() => {
        const payload = (window as any).__legacyEngine;
        return {
          hasEngineConfig: Boolean(payload && payload.engineConfig && Number(payload.engineConfig.width) > 0),
          managerBound: Boolean(payload && payload.manager && payload.manager === (window as any).game_manager),
          hasAdapterMode: Boolean(
            payload &&
            (payload.adapterMode === "legacy-bridge" || payload.adapterMode === "core-adapter")
          )
        };
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
        hasLegacyAdapterRuntime,
        `${entry.name} LegacyAdapterRuntime presence mismatch`
      ).toBe(entry.expectLegacyAdapterRuntime);
      expect(
        hasLegacyAdapterIoRuntime,
        `${entry.name} LegacyAdapterIoRuntime presence mismatch`
      ).toBe(entry.expectLegacyAdapterIoRuntime);
      expect(
        hasCoreAdapterShadowRuntime,
        `${entry.name} CoreAdapterShadowRuntime presence mismatch`
      ).toBe(entry.expectCoreAdapterShadowRuntime);
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
      expect(
        hasCorePostMoveRuntime,
        `${entry.name} CorePostMoveRuntime presence mismatch`
      ).toBe(entry.expectCorePostMoveRuntime);
      expect(
        hasCoreMoveApplyRuntime,
        `${entry.name} CoreMoveApplyRuntime presence mismatch`
      ).toBe(entry.expectCoreMoveApplyRuntime);
      expect(
        hasCorePostMoveRecordRuntime,
        `${entry.name} CorePostMoveRecordRuntime presence mismatch`
      ).toBe(entry.expectCorePostMoveRecordRuntime);
      expect(
        hasCorePostUndoRecordRuntime,
        `${entry.name} CorePostUndoRecordRuntime presence mismatch`
      ).toBe(entry.expectCorePostUndoRecordRuntime);
      expect(
        hasCoreUndoRestoreRuntime,
        `${entry.name} CoreUndoRestoreRuntime presence mismatch`
      ).toBe(entry.expectCoreUndoRestoreRuntime);
      expect(
        hasCoreUndoSnapshotRuntime,
        `${entry.name} CoreUndoSnapshotRuntime presence mismatch`
      ).toBe(entry.expectCoreUndoSnapshotRuntime);
      expect(
        hasCoreUndoTileSnapshotRuntime,
        `${entry.name} CoreUndoTileSnapshotRuntime presence mismatch`
      ).toBe(entry.expectCoreUndoTileSnapshotRuntime);
      expect(
        hasCoreUndoTileRestoreRuntime,
        `${entry.name} CoreUndoTileRestoreRuntime presence mismatch`
      ).toBe(entry.expectCoreUndoTileRestoreRuntime);
      expect(
        hasCoreUndoRestorePayloadRuntime,
        `${entry.name} CoreUndoRestorePayloadRuntime presence mismatch`
      ).toBe(entry.expectCoreUndoRestorePayloadRuntime);
      expect(
        hasCoreUndoStackEntryRuntime,
        `${entry.name} CoreUndoStackEntryRuntime presence mismatch`
      ).toBe(entry.expectCoreUndoStackEntryRuntime);
      expect(
        hasCoreReplayCodecRuntime,
        `${entry.name} CoreReplayCodecRuntime presence mismatch`
      ).toBe(entry.expectCoreReplayCodecRuntime);
      expect(
        hasCoreReplayV4ActionsRuntime,
        `${entry.name} CoreReplayV4ActionsRuntime presence mismatch`
      ).toBe(entry.expectCoreReplayV4ActionsRuntime);
      expect(
        hasCoreReplayLegacyRuntime,
        `${entry.name} CoreReplayLegacyRuntime presence mismatch`
      ).toBe(entry.expectCoreReplayLegacyRuntime);
      expect(
        hasCoreReplayImportRuntime,
        `${entry.name} CoreReplayImportRuntime presence mismatch`
      ).toBe(entry.expectCoreReplayImportRuntime);
      expect(
        hasCoreReplayExecutionRuntime,
        `${entry.name} CoreReplayExecutionRuntime presence mismatch`
      ).toBe(entry.expectCoreReplayExecutionRuntime);
      expect(
        hasCoreReplayDispatchRuntime,
        `${entry.name} CoreReplayDispatchRuntime presence mismatch`
      ).toBe(entry.expectCoreReplayDispatchRuntime);
      expect(
        hasCoreReplayLifecycleRuntime,
        `${entry.name} CoreReplayLifecycleRuntime presence mismatch`
      ).toBe(entry.expectCoreReplayLifecycleRuntime);
      expect(
        hasCoreReplayTimerRuntime,
        `${entry.name} CoreReplayTimerRuntime presence mismatch`
      ).toBe(entry.expectCoreReplayTimerRuntime);
      expect(
        hasCoreReplayFlowRuntime,
        `${entry.name} CoreReplayFlowRuntime presence mismatch`
      ).toBe(entry.expectCoreReplayFlowRuntime);
      expect(
        hasCoreReplayControlRuntime,
        `${entry.name} CoreReplayControlRuntime presence mismatch`
      ).toBe(entry.expectCoreReplayControlRuntime);
      expect(
        hasCoreReplayLoopRuntime,
        `${entry.name} CoreReplayLoopRuntime presence mismatch`
      ).toBe(entry.expectCoreReplayLoopRuntime);
      if (entry.expectLegacyEngine) {
        expect(
          legacyEngineContract.hasEngineConfig,
          `${entry.name} __legacyEngine.engineConfig contract mismatch`
        ).toBe(true);
        expect(
          legacyEngineContract.managerBound,
          `${entry.name} __legacyEngine.manager binding mismatch`
        ).toBe(true);
        expect(
          legacyEngineContract.hasAdapterMode,
          `${entry.name} __legacyEngine.adapterMode contract mismatch`
        ).toBe(true);
        expect(
          await page.evaluate(() => {
            const payload = (window as any).__legacyEngine;
            const manager = (window as any).game_manager;
            if (
              !payload ||
              typeof payload.syncAdapterSnapshot !== "function" ||
              typeof payload.emitMoveResult !== "function" ||
              typeof payload.readAdapterParityState !== "function" ||
              typeof payload.readAdapterParityReport !== "function" ||
              typeof payload.readAdapterParityABDiff !== "function" ||
              !manager ||
              typeof manager.publishAdapterMoveResult !== "function"
            ) {
              return false;
            }

            const ioApi = (window as any).LegacyAdapterIoRuntime;
            if (!ioApi || typeof ioApi.buildAdapterMoveResultEventName !== "function") {
              return false;
            }

            const eventName = ioApi.buildAdapterMoveResultEventName(payload.modeKey || "");
            let captured: any = null;
            const handler = (event: Event) => {
              captured = (event as CustomEvent).detail || null;
            };
            window.addEventListener(eventName, handler as EventListener);
            try {
              manager.publishAdapterMoveResult({
                reason: "smoke-contract",
                direction: 0,
                moved: false
              });
            } finally {
              window.removeEventListener(eventName, handler as EventListener);
            }

            const snapshot = payload.adapterSnapshot;
            const parityState = payload.readAdapterParityState();
            const parityReport = payload.readAdapterParityReport();
            const parityABDiff = payload.readAdapterParityABDiff();
            return Boolean(
              captured &&
                captured.reason === "smoke-contract" &&
                snapshot &&
                snapshot.lastMoveResult &&
                snapshot.lastMoveResult.reason === "smoke-contract" &&
                (parityState === null || typeof parityState === "object") &&
                (parityReport === null ||
                  (typeof parityReport === "object" &&
                    parityReport.modeKey === (payload.modeKey || "unknown")))
                &&
                (parityABDiff === null ||
                  (typeof parityABDiff === "object" &&
                    parityABDiff.modeKey === (payload.modeKey || "unknown")))
                &&
                (payload.adapterParityReport === null ||
                  typeof payload.adapterParityReport === "object")
            );
          }),
          `${entry.name} __legacyEngine.adapter io contract mismatch`
        ).toBe(true);
      }

      expect(pageErrors, `${entry.name} page errors:\n${pageErrors.join("\n")}`).toEqual([]);
      expect(
        consoleErrors,
        `${entry.name} console errors:\n${consoleErrors.join("\n")}`
      ).toEqual([]);
    });
  }

  test("core-adapter shadow path updates parity state", async ({ page }) => {
    const legacyResponse = await page.goto("/index.html?engine_adapter=legacy-bridge", {
      waitUntil: "domcontentloaded"
    });
    expect(legacyResponse, "Legacy seed response should exist").not.toBeNull();
    expect(legacyResponse?.ok(), "Legacy seed response should be 2xx").toBeTruthy();

    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(300);

    const seededLegacy = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      const manager = (window as any).game_manager;
      if (
        !payload ||
        payload.adapterMode !== "legacy-bridge" ||
        typeof payload.readAdapterParityReport !== "function" ||
        !manager ||
        typeof manager.publishAdapterMoveResult !== "function"
      ) {
        return false;
      }

      manager.publishAdapterMoveResult({
        reason: "smoke-ab-legacy",
        direction: 1,
        moved: true
      });

      const report = payload.readAdapterParityReport();
      return Boolean(report && report.adapterMode === "legacy-bridge");
    });
    expect(seededLegacy, "legacy bridge parity seed failed").toBe(true);

    const response = await page.goto("/index.html?engine_adapter=core-adapter", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Document response should exist").not.toBeNull();
    expect(response?.ok(), "Document response should be 2xx").toBeTruthy();

    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(400);

    const result = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      const manager = (window as any).game_manager;
      if (
        !payload ||
        payload.adapterMode !== "core-adapter" ||
        typeof payload.readAdapterParityState !== "function" ||
        typeof payload.readAdapterParityReport !== "function" ||
        typeof payload.readAdapterParityABDiff !== "function" ||
        !manager ||
        typeof manager.publishAdapterMoveResult !== "function"
      ) {
        return null;
      }

      const before = payload.readAdapterParityState();
      const beforeReport = payload.readAdapterParityReport();
      const beforeABDiff = payload.readAdapterParityABDiff();
      manager.publishAdapterMoveResult({
        reason: "smoke-core-adapter",
        direction: 2,
        moved: true
      });
      const after = payload.readAdapterParityState();
      const afterReport = payload.readAdapterParityReport();
      const afterABDiff = payload.readAdapterParityABDiff();
      return {
        payloadModeKey: payload.modeKey || "unknown",
        payloadParityReport: payload.adapterParityReport || null,
        payloadParityABDiff: payload.adapterParityABDiff || null,
        before,
        after,
        beforeReport,
        afterReport,
        beforeABDiff,
        afterABDiff
      };
    });

    expect(result, "core-adapter payload contract mismatch").not.toBeNull();
    const beforeTotal = result?.before?.counters?.totalEvents || 0;
    const beforeMoved = result?.before?.counters?.movedEvents || 0;
    expect(result?.after?.lastReason).toBe("smoke-core-adapter");
    expect(result?.after?.lastDirection).toBe(2);
    expect(result?.after?.counters?.totalEvents).toBe(beforeTotal + 1);
    expect(result?.after?.counters?.movedEvents).toBe(beforeMoved + 1);
    expect(result?.afterReport?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.afterReport?.adapterMode).toBe("core-adapter");
    expect(result?.afterReport?.undoEvents).toBe(result?.after?.counters?.undoEvents);
    expect(result?.afterReport?.wonEvents).toBe(result?.after?.counters?.wonEvents);
    expect(result?.afterReport?.overEvents).toBe(result?.after?.counters?.overEvents);
    expect(result?.afterReport?.isScoreAligned).toBe(true);
    expect(result?.payloadParityReport?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.payloadParityReport?.isScoreAligned).toBe(true);
    expect(result?.beforeABDiff?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.afterABDiff?.modeKey).toBe(result?.payloadModeKey);
    expect(result?.afterABDiff?.hasCoreReport).toBe(true);
    expect(result?.afterABDiff?.hasLegacyReport).toBe(true);
    expect(result?.afterABDiff?.comparable).toBe(true);
    expect(result?.afterABDiff?.isScoreMatch).toBe(true);
    expect(result?.payloadParityABDiff?.modeKey).toBe(result?.payloadModeKey);
  });

  test("adapter rollout default and rollback switch are respected", async ({ page }) => {
    const defaultCoreResponse = await page.goto("/index.html?engine_adapter_default=core-adapter", {
      waitUntil: "domcontentloaded"
    });
    expect(defaultCoreResponse, "Default-core response should exist").not.toBeNull();
    expect(defaultCoreResponse?.ok(), "Default-core response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const defaultCoreMode = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      return payload && typeof payload.adapterMode === "string" ? payload.adapterMode : null;
    });
    expect(defaultCoreMode).toBe("core-adapter");

    const forcedLegacyResponse = await page.goto(
      "/index.html?engine_adapter_default=core-adapter&engine_adapter_force_legacy=1",
      { waitUntil: "domcontentloaded" }
    );
    expect(forcedLegacyResponse, "Forced-legacy response should exist").not.toBeNull();
    expect(forcedLegacyResponse?.ok(), "Forced-legacy response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const forcedLegacyMode = await page.evaluate(() => {
      const payload = (window as any).__legacyEngine;
      return payload && typeof payload.adapterMode === "string" ? payload.adapterMode : null;
    });
    expect(forcedLegacyMode).toBe("legacy-bridge");
  });

  test("legacy bootstrap resolveModeConfig delegates to mode-catalog runtime", async ({ page }) => {
    const response = await page.goto("/capped_2048.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Capped page response should exist").not.toBeNull();
    expect(response?.ok(), "Capped page response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const bootstrap = (window as any).LegacyBootstrapRuntime;
      const modeCatalogRuntime = (window as any).CoreModeCatalogRuntime;
      if (
        !bootstrap ||
        typeof bootstrap.resolveModeConfig !== "function" ||
        !modeCatalogRuntime ||
        typeof modeCatalogRuntime.resolveCatalogModeWithDefault !== "function"
      ) {
        return null;
      }

      const originalCatalog = (window as any).ModeCatalog;
      const originalResolve = modeCatalogRuntime.resolveCatalogModeWithDefault;
      let callCount = 0;
      modeCatalogRuntime.resolveCatalogModeWithDefault = function (
        catalog: any,
        modeKey: string,
        defaultModeKey: string
      ) {
        callCount += 1;
        return originalResolve(catalog, modeKey, defaultModeKey);
      };

      (window as any).ModeCatalog = {
        getMode(key: string) {
          if (key === "standard_4x4_pow2_no_undo") return { key };
          return null;
        }
      };

      try {
        const resolved = bootstrap.resolveModeConfig("missing_mode", "standard_4x4_pow2_no_undo");
        return {
          callCount,
          key: resolved && resolved.key ? String(resolved.key) : null
        };
      } finally {
        modeCatalogRuntime.resolveCatalogModeWithDefault = originalResolve;
        (window as any).ModeCatalog = originalCatalog;
      }
    });

    expect(snapshot, "resolveModeConfig delegation snapshot should exist").not.toBeNull();
    expect(snapshot?.callCount).toBeGreaterThan(0);
    expect(snapshot?.key).toBe("standard_4x4_pow2_no_undo");
  });

  test("application handle_undo delegates to undo-action runtime", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreUndoActionRuntime;
      const handleUndo = (window as any).handle_undo;
      if (!runtime || typeof runtime.tryTriggerUndo !== "function") {
        return { hasRuntime: false, hasCapabilityApi: false, hasHandler: typeof handleUndo === "function" };
      }
      if (typeof handleUndo !== "function") {
        return {
          hasRuntime: true,
          hasCapabilityApi: Boolean(
            typeof runtime.resolveUndoModeId === "function" &&
            typeof runtime.isUndoCapableMode === "function" &&
            typeof runtime.isUndoInteractionEnabled === "function"
          ),
          hasHandler: false
        };
      }

      const originalManager = (window as any).game_manager;
      const originalTryTriggerUndo = runtime.tryTriggerUndo;
      let callCount = 0;
      let usedDirection: number | null = null;
      let moveDirection: number | null = null;
      const fakeManager = {
        isUndoInteractionEnabled() {
          return true;
        },
        move(direction: number) {
          moveDirection = direction;
        }
      };

      runtime.tryTriggerUndo = function (manager: any, direction: number) {
        callCount += 1;
        usedDirection = direction;
        return originalTryTriggerUndo(manager, direction);
      };
      (window as any).game_manager = fakeManager;

      try {
        handleUndo();
        return {
          hasRuntime: true,
          hasCapabilityApi: Boolean(
            typeof runtime.resolveUndoModeId === "function" &&
            typeof runtime.isUndoCapableMode === "function" &&
            typeof runtime.isUndoInteractionEnabled === "function"
          ),
          hasHandler: true,
          callCount,
          usedDirection,
          moveDirection
        };
      } finally {
        runtime.tryTriggerUndo = originalTryTriggerUndo;
        (window as any).game_manager = originalManager;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasCapabilityApi).toBe(true);
    expect(snapshot.hasHandler).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.usedDirection).toBe(-1);
    expect(snapshot.moveDirection).toBe(-1);
  });

  test("practice transfer flow delegates transfer navigation plan to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CorePracticeTransferRuntime;
      const openPracticeBoardFromCurrent = (window as any).openPracticeBoardFromCurrent;
      if (
        !runtime ||
        typeof runtime.createPracticeTransferNavigationPlan !== "function"
      ) {
        return { hasRuntime: false, hasOpenFn: typeof openPracticeBoardFromCurrent === "function" };
      }
      if (typeof openPracticeBoardFromCurrent !== "function") {
        return { hasRuntime: true, hasOpenFn: false };
      }

      const originalCreatePracticeTransferNavigationPlan = runtime.createPracticeTransferNavigationPlan;
      const originalManager = (window as any).game_manager;
      const originalOpen = window.open;
      let createPlanCallCount = 0;
      let openedUrl = "";

      runtime.createPracticeTransferNavigationPlan = function (opts: any) {
        createPlanCallCount += 1;
        return originalCreatePracticeTransferNavigationPlan(opts);
      };
      (window as any).game_manager = {
        width: 4,
        height: 4,
        modeConfig: {
          ruleset: "pow2",
          spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]
        },
        getFinalBoardMatrix() {
          return [
            [2, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
          ];
        }
      };
      try {
        window.localStorage.setItem("practice_guide_shown_v2", "1");
      } catch (_err) {}
      window.open = function (url?: string | URL | undefined) {
        openedUrl = String(url || "");
        return null as any;
      };

      try {
        openPracticeBoardFromCurrent();
        return {
          hasRuntime: true,
          hasOpenFn: true,
          createPlanCallCount,
          openedUrl
        };
      } finally {
        runtime.createPracticeTransferNavigationPlan = originalCreatePracticeTransferNavigationPlan;
        (window as any).game_manager = originalManager;
        window.open = originalOpen;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasOpenFn).toBe(true);
    expect(snapshot.createPlanCallCount).toBeGreaterThan(0);
    expect(snapshot.openedUrl).toContain("Practice_board.html");
    expect(snapshot.openedUrl).toContain("practice_token=");
    expect(snapshot.openedUrl).toContain("practice_ruleset=pow2");
    expect(snapshot.openedUrl).toContain("practice_guide_seen=1");
  });

  test("index ui delegates mobile hint timerbox undo-top and top-actions logic to runtime helpers", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/play.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(260);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreMobileHintRuntime;
      const uiRuntime = (window as any).CoreMobileHintUiRuntime;
      const modalRuntime = (window as any).CoreMobileHintModalRuntime;
      const timerRuntime = (window as any).CoreMobileTimerboxRuntime;
      const undoTopRuntime = (window as any).CoreMobileUndoTopRuntime;
      const topActionsRuntime = (window as any).CoreTopActionsRuntime;
      if (
        !runtime ||
        typeof runtime.collectMobileHintTexts !== "function" ||
        !uiRuntime ||
        typeof uiRuntime.syncMobileHintTextBlockVisibility !== "function" ||
        !modalRuntime ||
        typeof modalRuntime.ensureMobileHintModalDom !== "function" ||
        !timerRuntime ||
        typeof timerRuntime.resolveStoredMobileTimerboxCollapsed !== "function" ||
        typeof timerRuntime.resolveMobileTimerboxDisplayModel !== "function" ||
        !undoTopRuntime ||
        typeof undoTopRuntime.resolveMobileUndoTopButtonDisplayModel !== "function" ||
        !topActionsRuntime ||
        typeof topActionsRuntime.createGameTopActionsPlacementState !== "function" ||
        typeof topActionsRuntime.createPracticeTopActionsPlacementState !== "function" ||
        typeof topActionsRuntime.syncGameTopActionsPlacement !== "function" ||
        typeof topActionsRuntime.syncPracticeTopActionsPlacement !== "function"
      ) {
        return {
          hasRuntime: false,
          hasUiRuntime: false,
          hasModalRuntime: false,
          hasTimerRuntime: false,
          hasUndoTopRuntime: false,
          hasTopActionsRuntime: false
        };
      }
      const hintBtn = document.getElementById("top-mobile-hint-btn") as HTMLAnchorElement | null;
      if (!hintBtn) {
        return {
          hasRuntime: true,
          hasUiRuntime: true,
          hasModalRuntime: true,
          hasTimerRuntime: true,
          hasUndoTopRuntime: true,
          hasTopActionsRuntime: true,
          hasHintButton: false
        };
      }

      const originalCollect = runtime.collectMobileHintTexts;
      const originalSync = uiRuntime.syncMobileHintTextBlockVisibility;
      const originalEnsureModal = modalRuntime.ensureMobileHintModalDom;
      const originalResolveStored = timerRuntime.resolveStoredMobileTimerboxCollapsed;
      const originalResolveDisplay = timerRuntime.resolveMobileTimerboxDisplayModel;
      const originalUndoTopDisplay = undoTopRuntime.resolveMobileUndoTopButtonDisplayModel;
      const originalSyncGameTop = topActionsRuntime.syncGameTopActionsPlacement;
      const originalSyncPracticeTop = topActionsRuntime.syncPracticeTopActionsPlacement;
      let collectCallCount = 0;
      let syncCallCount = 0;
      let ensureModalCallCount = 0;
      let resolveStoredCallCount = 0;
      let resolveDisplayCallCount = 0;
      let resolveUndoTopCallCount = 0;
      let syncGameTopCallCount = 0;
      let syncPracticeTopCallCount = 0;
      runtime.collectMobileHintTexts = function (opts: any) {
        collectCallCount += 1;
        const lines = originalCollect(opts);
        return Array.isArray(lines) && lines.length ? lines : ["Smoke 提示"];
      };
      uiRuntime.syncMobileHintTextBlockVisibility = function (opts: any) {
        syncCallCount += 1;
        return originalSync(opts);
      };
      modalRuntime.ensureMobileHintModalDom = function (opts: any) {
        ensureModalCallCount += 1;
        return originalEnsureModal(opts);
      };
      timerRuntime.resolveStoredMobileTimerboxCollapsed = function (opts: any) {
        resolveStoredCallCount += 1;
        return originalResolveStored(opts);
      };
      timerRuntime.resolveMobileTimerboxDisplayModel = function (opts: any) {
        resolveDisplayCallCount += 1;
        return originalResolveDisplay(opts);
      };
      undoTopRuntime.resolveMobileUndoTopButtonDisplayModel = function (opts: any) {
        resolveUndoTopCallCount += 1;
        return originalUndoTopDisplay(opts);
      };
      topActionsRuntime.syncGameTopActionsPlacement = function (opts: any) {
        syncGameTopCallCount += 1;
        return originalSyncGameTop(opts);
      };
      topActionsRuntime.syncPracticeTopActionsPlacement = function (opts: any) {
        syncPracticeTopCallCount += 1;
        return originalSyncPracticeTop(opts);
      };

      try {
        const syncMobileHintUI = (window as any).syncMobileHintUI;
        if (typeof syncMobileHintUI === "function") {
          syncMobileHintUI();
        }
        const syncMobileTimerboxUI = (window as any).syncMobileTimerboxUI;
        if (typeof syncMobileTimerboxUI === "function") {
          syncMobileTimerboxUI();
        }
        const syncMobileUndoTopButtonAvailability = (window as any).syncMobileUndoTopButtonAvailability;
        if (typeof syncMobileUndoTopButtonAvailability === "function") {
          syncMobileUndoTopButtonAvailability();
        }
        window.dispatchEvent(new Event("resize"));
        await new Promise((resolve) => setTimeout(resolve, 200));
        hintBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        const overlay = document.getElementById("mobile-hint-overlay");
        const firstLine = document.querySelector("#mobile-hint-body p");
        return {
          hasRuntime: true,
          hasUiRuntime: true,
          hasModalRuntime: true,
          hasTimerRuntime: true,
          hasUndoTopRuntime: true,
          hasTopActionsRuntime: true,
          hasHintButton: true,
          collectCallCount,
          syncCallCount,
          ensureModalCallCount,
          resolveStoredCallCount,
          resolveDisplayCallCount,
          resolveUndoTopCallCount,
          syncGameTopCallCount,
          syncPracticeTopCallCount,
          overlayVisible: Boolean(overlay && overlay.style.display === "flex"),
          firstLineText: firstLine ? (firstLine.textContent || "").trim() : ""
        };
      } finally {
        runtime.collectMobileHintTexts = originalCollect;
        uiRuntime.syncMobileHintTextBlockVisibility = originalSync;
        modalRuntime.ensureMobileHintModalDom = originalEnsureModal;
        timerRuntime.resolveStoredMobileTimerboxCollapsed = originalResolveStored;
        timerRuntime.resolveMobileTimerboxDisplayModel = originalResolveDisplay;
        undoTopRuntime.resolveMobileUndoTopButtonDisplayModel = originalUndoTopDisplay;
        topActionsRuntime.syncGameTopActionsPlacement = originalSyncGameTop;
        topActionsRuntime.syncPracticeTopActionsPlacement = originalSyncPracticeTop;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasUiRuntime).toBe(true);
    expect(snapshot.hasModalRuntime).toBe(true);
    expect(snapshot.hasTimerRuntime).toBe(true);
    expect(snapshot.hasUndoTopRuntime).toBe(true);
    expect(snapshot.hasTopActionsRuntime).toBe(true);
    expect(snapshot.hasHintButton).toBe(true);
    expect(snapshot.collectCallCount).toBeGreaterThan(0);
    expect(snapshot.syncCallCount).toBeGreaterThan(0);
    expect(snapshot.ensureModalCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveStoredCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveDisplayCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveUndoTopCallCount).toBeGreaterThan(0);
    expect(snapshot.syncGameTopCallCount).toBeGreaterThan(0);
    expect(snapshot.syncPracticeTopCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.overlayVisible).toBe(true);
    expect(snapshot.firstLineText.length).toBeGreaterThan(0);
  });

  test("home guide runtime provides homepage auto-start gating", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreHomeGuideRuntime;
      if (
        !runtime ||
        typeof runtime.isHomePagePath !== "function" ||
        typeof runtime.buildHomeGuideSteps !== "function" ||
        typeof runtime.readHomeGuideSeenValue !== "function" ||
        typeof runtime.markHomeGuideSeen !== "function" ||
        typeof runtime.shouldAutoStartHomeGuide !== "function" ||
        typeof runtime.resolveHomeGuideAutoStart !== "function" ||
        typeof runtime.resolveHomeGuideSettingsState !== "function"
      ) {
        return { hasRuntime: false };
      }
      const compactSteps = runtime.buildHomeGuideSteps({ isCompactViewport: true });
      const desktopSteps = runtime.buildHomeGuideSteps({ isCompactViewport: false });
      const compactSelectors = Array.isArray(compactSteps)
        ? compactSteps.map((item: any) => item && item.selector)
        : [];
      const desktopSelectors = Array.isArray(desktopSteps)
        ? desktopSteps.map((item: any) => item && item.selector)
        : [];
      const writes: string[] = [];
      const seenValue = runtime.readHomeGuideSeenValue({
        seenKey: "home_guide_seen_v1",
        storageLike: {
          getItem(key: string) {
            return key === "home_guide_seen_v1" ? "1" : null;
          }
        }
      });
      const markResult = runtime.markHomeGuideSeen({
        seenKey: "home_guide_seen_v1",
        storageLike: {
          getItem() {
            return null;
          },
          setItem(key: string, value: string) {
            writes.push(key + ":" + value);
          }
        }
      });
      const resolvedAutoStart = runtime.resolveHomeGuideAutoStart({
        pathname: "/index.html",
        seenKey: "home_guide_seen_v1",
        storageLike: {
          getItem() {
            return null;
          }
        }
      });
      const settingsOnHome = runtime.resolveHomeGuideSettingsState({
        isHomePage: true,
        guideActive: true,
        fromSettings: true
      });
      const settingsOffHome = runtime.resolveHomeGuideSettingsState({
        isHomePage: false,
        guideActive: true,
        fromSettings: true
      });
      return {
        hasRuntime: true,
        homePath: runtime.isHomePagePath("/index.html"),
        playPath: runtime.isHomePagePath("/play.html"),
        hasCompactHint: compactSelectors.includes("#top-mobile-hint-btn"),
        hasDesktopHint: desktopSelectors.includes("#top-mobile-hint-btn"),
        seenValue,
        markResult,
        writes,
        autoStart: runtime.shouldAutoStartHomeGuide({
          pathname: "/index.html",
          seenValue: "0"
        }),
        blockedSeen: runtime.shouldAutoStartHomeGuide({
          pathname: "/index.html",
          seenValue: "1"
        }),
        blockedPath: runtime.shouldAutoStartHomeGuide({
          pathname: "/play.html",
          seenValue: "0"
        }),
        resolvedAutoStart,
        settingsOnHome,
        settingsOffHome
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.homePath).toBe(true);
    expect(snapshot.playPath).toBe(false);
    expect(snapshot.hasCompactHint).toBe(true);
    expect(snapshot.hasDesktopHint).toBe(false);
    expect(snapshot.seenValue).toBe("1");
    expect(snapshot.markResult).toBe(true);
    expect(snapshot.writes).toEqual(["home_guide_seen_v1:1"]);
    expect(snapshot.autoStart).toBe(true);
    expect(snapshot.blockedSeen).toBe(false);
    expect(snapshot.blockedPath).toBe(false);
    expect(snapshot.resolvedAutoStart).toEqual({
      seenValue: "0",
      shouldAutoStart: true
    });
    expect(snapshot.settingsOnHome).toEqual({
      toggleDisabled: false,
      toggleChecked: true,
      noteText: "打开后将立即进入首页新手引导，完成后自动关闭。"
    });
    expect(snapshot.settingsOffHome).toEqual({
      toggleDisabled: true,
      toggleChecked: false,
      noteText: "该功能仅在首页可用。"
    });
  });

  test("index ui delegates home guide step list build to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("home_guide_seen_v1", "1");
      } catch (_err) {}
    });
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(() => {
      const runtime = (window as any).CoreHomeGuideRuntime;
      if (
        !runtime ||
        typeof runtime.buildHomeGuideSteps !== "function" ||
        typeof runtime.markHomeGuideSeen !== "function"
      ) {
        return { hasRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal !== "function") {
        return { hasRuntime: true, hasSettingsOpen: false };
      }
      const originalBuild = runtime.buildHomeGuideSteps;
      const originalMark = runtime.markHomeGuideSeen;
      let callCount = 0;
      let markCallCount = 0;
      runtime.buildHomeGuideSteps = function (opts: any) {
        callCount += 1;
        return originalBuild(opts);
      };
      runtime.markHomeGuideSeen = function (opts: any) {
        markCallCount += 1;
        return originalMark(opts);
      };
      try {
        openSettingsModal();
        const toggle = document.getElementById("home-guide-toggle") as HTMLInputElement | null;
        if (!toggle) {
          return { hasRuntime: true, hasSettingsOpen: true, hasToggle: false };
        }
        toggle.checked = true;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
        const overlay = document.getElementById("home-guide-overlay");
        const overlayVisibleBeforeSkip = Boolean(overlay && overlay.style.display !== "none");
        const skipBtn = document.getElementById("home-guide-skip");
        if (skipBtn) {
          skipBtn.dispatchEvent(new Event("click", { bubbles: true }));
        }
        const overlayAfterSkip = document.getElementById("home-guide-overlay");
        return {
          hasRuntime: true,
          hasSettingsOpen: true,
          hasToggle: true,
          callCount,
          markCallCount,
          hasOverlay: Boolean(overlay),
          overlayVisibleBeforeSkip,
          overlayHiddenAfterSkip: Boolean(overlayAfterSkip && overlayAfterSkip.style.display === "none")
        };
      } finally {
        runtime.buildHomeGuideSteps = originalBuild;
        runtime.markHomeGuideSeen = originalMark;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasToggle).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.markCallCount).toBeGreaterThan(0);
    expect(snapshot.hasOverlay).toBe(true);
    expect(snapshot.overlayVisibleBeforeSkip).toBe(true);
    expect(snapshot.overlayHiddenAfterSkip).toBe(true);
  });

  test("play custom spawn mode applies query four-rate via runtime helper", async ({ page }) => {
    const response = await page.goto("/play.html?mode_key=spawn_custom_4x4_pow2_no_undo&four_rate=25", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Custom-spawn response should exist").not.toBeNull();
    expect(response?.ok(), "Custom-spawn response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      const introNode = document.getElementById("play-mode-intro");
      return {
        key: cfg && typeof cfg.key === "string" ? cfg.key : null,
        label: cfg && typeof cfg.label === "string" ? cfg.label : null,
        spawnTable: cfg && Array.isArray(cfg.spawn_table) ? cfg.spawn_table : null,
        storedRate: window.localStorage.getItem("custom_spawn_4x4_four_rate_v1"),
        introText: introNode ? String(introNode.textContent || "") : "",
        hasRuntime: Boolean((window as any).CoreCustomSpawnRuntime?.applyCustomFourRateToModeConfig),
        hasPlayCustomSpawnRuntime: Boolean(
          (window as any).CorePlayCustomSpawnRuntime?.resolvePlayCustomSpawnModeConfig
        ),
        hasHeaderRuntime: Boolean((window as any).CorePlayHeaderRuntime?.buildPlayModeIntroText),
        hasModeCatalogRuntime: Boolean((window as any).CoreModeCatalogRuntime?.resolveCatalogModeWithDefault)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPlayCustomSpawnRuntime).toBe(true);
    expect(snapshot.hasHeaderRuntime).toBe(true);
    expect(snapshot.hasModeCatalogRuntime).toBe(true);
    expect(snapshot.key).toBe("spawn_custom_4x4_pow2_no_undo");
    expect(snapshot.label).toContain("4率 25%");
    expect(snapshot.introText).toContain("4率25%");
    expect(snapshot.spawnTable).toEqual([
      { value: 2, weight: 75 },
      { value: 4, weight: 25 }
    ]);
    expect(snapshot.storedRate).toBe("25");
  });

  test("practice page applies fibonacci ruleset via runtime helper", async ({ page }) => {
    const response = await page.goto("/Practice_board.html?practice_ruleset=fibonacci", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Practice-fibonacci response should exist").not.toBeNull();
    expect(response?.ok(), "Practice-fibonacci response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      return {
        key: cfg && typeof cfg.key === "string" ? cfg.key : null,
        ruleset: cfg && typeof cfg.ruleset === "string" ? cfg.ruleset : null,
        spawnTable: cfg && Array.isArray(cfg.spawn_table) ? cfg.spawn_table : null,
        hasRuntime: Boolean((window as any).CorePracticeModeRuntime?.buildPracticeModeConfig),
        hasModeCatalogRuntime: Boolean((window as any).CoreModeCatalogRuntime?.resolveCatalogModeWithDefault),
        hasHomeModeRuntime: Boolean((window as any).CoreHomeModeRuntime?.resolveHomeModeSelection)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasModeCatalogRuntime).toBe(true);
    expect(snapshot.hasHomeModeRuntime).toBe(true);
    expect(snapshot.key).toBe("practice_legacy");
    expect(snapshot.ruleset).toBe("fibonacci");
    expect(snapshot.spawnTable).toEqual([
      { value: 1, weight: 90 },
      { value: 2, weight: 10 }
    ]);
  });

  test("history page renders adapter diagnostics for local records", async ({ page }) => {
    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();

    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.saveRecord !== "function" || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore unavailable");
      }

      store.clearAll();
      window.localStorage.removeItem("engine_adapter_default_mode");
      window.localStorage.removeItem("engine_adapter_force_legacy");
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 256,
        best_tile: 32,
        duration_ms: 12000,
        final_board: [
          [2, 4, 8, 16],
          [32, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 260,
          undoUsedFromSnapshot: 1,
          scoreDelta: 4,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 4,
          undoUsedDelta: 1,
          overEventsDelta: 1,
          undoEventsDelta: 1,
          wonEventsDelta: 0,
          isScoreMatch: false,
          bothScoreAligned: false
        }
      });

      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 512,
        best_tile: 64,
        duration_ms: 18000,
        final_board: [
          [4, 8, 16, 32],
          [64, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 512,
          undoUsedFromSnapshot: 2,
          scoreDelta: 0,
          isScoreAligned: true
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 0,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: true,
          bothScoreAligned: true
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".history-adapter-diagnostics")).toHaveCount(2);
    await expect(page.locator(".history-adapter-badge-mismatch")).toHaveCount(1);
    await expect(page.locator(".history-adapter-badge-match")).toHaveCount(1);
    await expect(page.locator("#history-export-mismatch-btn")).toBeVisible();
    await expect(page.locator("#history-burnin-summary")).toContainText("可比较样本 2");
    await expect(page.locator("#history-burnin-summary")).toContainText("不一致 1");
    await expect(page.locator("#history-burnin-summary")).toContainText("单窗口: 样本不足");
    await expect(page.locator("#history-burnin-summary")).toContainText("连续窗口: 窗口不足");
    await expect(page.locator("#history-burnin-summary")).toContainText("连续门槛: 最近 3 个窗口");
    await expect(page.locator(".history-burnin-focus-mismatch")).toHaveCount(1);

    await page.click(".history-burnin-focus-mismatch");
    await expect(page.locator("#history-adapter-filter")).toHaveValue("mismatch");
    await expect(page.locator(".history-item")).toHaveCount(1);
    await expect(page.locator(".history-adapter-badge-mismatch")).toHaveCount(1);
    await expect(page.locator("#history-summary")).toContainText("共 1 条记录");
    await expect(page.locator("#history-summary")).toContainText("诊断筛选: 仅不一致");

    await expect(page.locator("#history-canary-policy")).toContainText("Canary 策略控制");
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: legacy-bridge");
    await expect(page.locator("#history-canary-policy")).toContainText("生效来源: 默认回退");

    await page.click("[data-action='apply_canary']");
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: core-adapter");
    await expect(page.locator("#history-canary-policy")).toContainText("生效来源: 默认策略");
    await expect(page.locator("#history-canary-policy")).toContainText(
      "storage(engine_adapter_default_mode)=core-adapter"
    );
    await expect(page.locator("#history-canary-policy")).toContainText(
      "storage(engine_adapter_force_legacy)=-"
    );

    await page.click("[data-action='emergency_rollback']");
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: legacy-bridge");
    await expect(page.locator("#history-canary-policy")).toContainText("生效来源: 强制回滚");
    await expect(page.locator("#history-canary-policy")).toContainText(
      "storage(engine_adapter_force_legacy)=1"
    );

    await page.click("[data-action='resume_canary']");
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: core-adapter");
    await expect(page.locator("#history-canary-policy")).toContainText("生效来源: 默认策略");
    await expect(page.locator("#history-canary-policy")).toContainText(
      "storage(engine_adapter_force_legacy)=-"
    );

    await page.click("[data-action='reset_policy']");
    await expect(page.locator("#history-canary-policy")).toContainText("当前有效模式: legacy-bridge");
    await expect(page.locator("#history-canary-policy")).toContainText("生效来源: 默认回退");
    await expect(page.locator("#history-canary-policy")).toContainText(
      "storage(engine_adapter_default_mode)=-"
    );

    const policyKeys = await page.evaluate(() => ({
      defaultMode: window.localStorage.getItem("engine_adapter_default_mode"),
      forceLegacy: window.localStorage.getItem("engine_adapter_force_legacy")
    }));
    expect(policyKeys.defaultMode).toBeNull();
    expect(policyKeys.forceLegacy).toBeNull();
  });
});
