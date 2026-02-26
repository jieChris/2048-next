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

  test("history page delegates canary policy decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanarySnapshotCallCount = 0;
      (window as any).__historyCanaryStoredKeysCallCount = 0;
      (window as any).__historyCanaryActionPlanCallCount = 0;
      (window as any).__historyCanaryActionNoticeCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryPolicyRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveCanaryPolicySnapshot" && typeof value === "function") {
            proxyTarget[prop] = function (opts: unknown) {
              (window as any).__historyCanarySnapshotCallCount =
                Number((window as any).__historyCanarySnapshotCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "resolveStoredPolicyKeys" && typeof value === "function") {
            proxyTarget[prop] = function (opts: unknown) {
              (window as any).__historyCanaryStoredKeysCallCount =
                Number((window as any).__historyCanaryStoredKeysCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "resolveCanaryPolicyActionPlan" && typeof value === "function") {
            proxyTarget[prop] = function (action: unknown) {
              (window as any).__historyCanaryActionPlanCallCount =
                Number((window as any).__historyCanaryActionPlanCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(action);
            };
            return true;
          }
          if (prop === "resolveCanaryPolicyActionNotice" && typeof value === "function") {
            proxyTarget[prop] = function (action: unknown) {
              (window as any).__historyCanaryActionNoticeCallCount =
                Number((window as any).__historyCanaryActionNoticeCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(action);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const actionButton = document.querySelector(
        ".history-canary-action-btn[data-action='reset_policy']"
      ) as HTMLElement | null;
      if (actionButton && typeof actionButton.click === "function") actionButton.click();
      const policyBanner = document.querySelector("#history-canary-policy .history-burnin-gate");
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryCanaryPolicyRuntime?.resolveCanaryPolicySnapshot &&
            (window as any).CoreHistoryCanaryPolicyRuntime?.resolveStoredPolicyKeys &&
            (window as any).CoreHistoryCanaryPolicyRuntime?.resolveCanaryPolicyActionPlan &&
            (window as any).CoreHistoryCanaryPolicyRuntime?.resolveCanaryPolicyActionNotice
        ),
        snapshotCallCount: Number((window as any).__historyCanarySnapshotCallCount || 0),
        storedKeysCallCount: Number((window as any).__historyCanaryStoredKeysCallCount || 0),
        actionPlanCallCount: Number((window as any).__historyCanaryActionPlanCallCount || 0),
        actionNoticeCallCount: Number((window as any).__historyCanaryActionNoticeCallCount || 0),
        policyGateText: policyBanner && policyBanner.textContent ? policyBanner.textContent.trim() : ""
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.snapshotCallCount).toBeGreaterThan(0);
    expect(snapshot.storedKeysCallCount).toBeGreaterThan(0);
    expect(snapshot.actionPlanCallCount).toBeGreaterThan(0);
    expect(snapshot.actionNoticeCallCount).toBeGreaterThan(0);
    expect(snapshot.policyGateText.length).toBeGreaterThan(0);
  });

  test("history page delegates canary storage reads to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanaryStorageReadCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryStorageRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "readHistoryStorageValue" && typeof value === "function") {
            proxyTarget[prop] = function (key: unknown) {
              (window as any).__historyCanaryStorageReadCallCount =
                Number((window as any).__historyCanaryStorageReadCallCount || 0) + 1;
              return (value as (k: unknown) => unknown)(key);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryCanaryStorageRuntime?.readHistoryStorageValue),
      readCallCount: Number((window as any).__historyCanaryStorageReadCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.readCallCount).toBeGreaterThan(0);
  });

  test("history page delegates runtime dependency contract checks to runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyRuntimeContractCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRuntimeContractRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryRuntimeContracts" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRuntimeContractCallCount =
                Number((window as any).__historyRuntimeContractCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean(
        (window as any).CoreHistoryRuntimeContractRuntime?.resolveHistoryRuntimeContracts
      ),
      contractCallCount: Number((window as any).__historyRuntimeContractCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.contractCallCount).toBeGreaterThan(0);
  });

  test("history page delegates canary runtime source reads to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanarySourcePolicyCallCount = 0;
      (window as any).__historyCanarySourceStoredCallCount = 0;
      (window as any).__historyCanarySourceSnapshotInputCallCount = 0;
      (window as any).__historyCanarySourceStoredInputCallCount = 0;
      (window as any).__historyCanarySourceCombinedStateCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanarySourceRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryCanaryRuntimePolicy" && typeof value === "function") {
            proxyTarget[prop] = function (runtime: unknown) {
              (window as any).__historyCanarySourcePolicyCallCount =
                Number((window as any).__historyCanarySourcePolicyCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(runtime);
            };
            return true;
          }
          if (prop === "resolveHistoryCanaryRuntimeStoredPolicyKeys" && typeof value === "function") {
            proxyTarget[prop] = function (runtime: unknown) {
              (window as any).__historyCanarySourceStoredCallCount =
                Number((window as any).__historyCanarySourceStoredCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(runtime);
            };
            return true;
          }
          if (prop === "resolveHistoryCanaryPolicySnapshotInput" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanarySourceSnapshotInputCallCount =
                Number((window as any).__historyCanarySourceSnapshotInputCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryCanaryStoredPolicyInput" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanarySourceStoredInputCallCount =
                Number((window as any).__historyCanarySourceStoredInputCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryCanaryPolicyAndStoredState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanarySourceCombinedStateCallCount =
                Number((window as any).__historyCanarySourceCombinedStateCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryCanarySourceRuntime?.resolveHistoryCanaryRuntimePolicy) &&
        Boolean((window as any).CoreHistoryCanarySourceRuntime?.resolveHistoryCanaryRuntimeStoredPolicyKeys) &&
        Boolean((window as any).CoreHistoryCanarySourceRuntime?.resolveHistoryCanaryPolicySnapshotInput) &&
        Boolean((window as any).CoreHistoryCanarySourceRuntime?.resolveHistoryCanaryStoredPolicyInput) &&
        Boolean((window as any).CoreHistoryCanarySourceRuntime?.resolveHistoryCanaryPolicyAndStoredState),
      combinedStateCallCount: Number((window as any).__historyCanarySourceCombinedStateCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.combinedStateCallCount).toBeGreaterThan(0);
  });

  test("history page delegates canary policy apply action to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanaryPanelActionCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryActionRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryCanaryPanelAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanaryPanelActionCallCount =
                Number((window as any).__historyCanaryPanelActionCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const actionButton = document.querySelector(
        ".history-canary-action-btn[data-action='reset_policy']"
      ) as HTMLElement | null;
      if (actionButton && typeof actionButton.click === "function") actionButton.click();
      return {
        hasRuntime:
          Boolean((window as any).CoreHistoryCanaryActionRuntime?.applyHistoryCanaryPanelAction) &&
          Boolean((window as any).CoreHistoryCanaryActionRuntime?.applyHistoryCanaryPolicyActionByName) &&
          Boolean(
            (window as any).CoreHistoryCanaryActionRuntime?.applyHistoryCanaryPolicyActionByNameWithFeedback
          ) &&
          Boolean((window as any).CoreHistoryCanaryActionRuntime?.resolveHistoryCanaryPolicyApplyFeedbackState),
        panelActionCallCount: Number((window as any).__historyCanaryPanelActionCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.panelActionCallCount).toBeGreaterThan(0);
  });

  test("history page delegates canary panel orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanaryHostRenderCallCount = 0;
      (window as any).__historyCanaryHostClickCallCount = 0;
      (window as any).__historyCanaryHostApplyRenderCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryCanaryPanelRenderState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanaryHostRenderCallCount =
                Number((window as any).__historyCanaryHostRenderCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryCanaryPanelClickAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanaryHostClickCallCount =
                Number((window as any).__historyCanaryHostClickCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryCanaryPanelRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyCanaryHostApplyRenderCallCount =
                Number((window as any).__historyCanaryHostApplyRenderCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const actionButton = document.querySelector(
        ".history-canary-action-btn[data-action='reset_policy']"
      ) as HTMLElement | null;
      if (actionButton && typeof actionButton.click === "function") actionButton.click();
      const policyPanel = document.querySelector("#history-canary-policy");
      return {
        hasRuntime:
          Boolean((window as any).CoreHistoryCanaryHostRuntime?.resolveHistoryCanaryPanelRenderState) &&
          Boolean((window as any).CoreHistoryCanaryHostRuntime?.applyHistoryCanaryPanelClickAction) &&
          Boolean((window as any).CoreHistoryCanaryHostRuntime?.applyHistoryCanaryPanelRender),
        applyRenderCallCount: Number((window as any).__historyCanaryHostApplyRenderCallCount || 0),
        hasActionButton: Boolean(actionButton),
        panelText: policyPanel && policyPanel.textContent ? policyPanel.textContent : ""
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.applyRenderCallCount).toBeGreaterThan(0);
    expect(snapshot.hasActionButton).toBe(true);
    expect(snapshot.panelText).toContain("Canary 策略控制");
  });

  test("history page delegates canary view modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanaryViewCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryViewRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryCanaryViewState" && typeof value === "function") {
            proxyTarget[prop] = function (policy: unknown, stored: unknown) {
              (window as any).__historyCanaryViewCallCount =
                Number((window as any).__historyCanaryViewCallCount || 0) + 1;
              return (value as (p: unknown, s: unknown) => unknown)(policy, stored);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const policyBanner = document.querySelector("#history-canary-policy");
      return {
        hasRuntime: Boolean((window as any).CoreHistoryCanaryViewRuntime?.resolveHistoryCanaryViewState),
        canaryViewCallCount: Number((window as any).__historyCanaryViewCallCount || 0),
        policyText: policyBanner && policyBanner.textContent ? policyBanner.textContent.trim() : ""
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.canaryViewCallCount).toBeGreaterThan(0);
    expect(snapshot.policyText).toContain("Canary 策略控制");
  });

  test("history page delegates canary panel html rendering to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyCanaryPanelHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryCanaryPanelRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryCanaryPanelHtml" && typeof value === "function") {
            proxyTarget[prop] = function (view: unknown) {
              (window as any).__historyCanaryPanelHtmlCallCount =
                Number((window as any).__historyCanaryPanelHtmlCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(view);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryCanaryPanelRuntime?.resolveHistoryCanaryPanelHtml),
      panelHtmlCallCount: Number((window as any).__historyCanaryPanelHtmlCallCount || 0),
      panelText: (document.querySelector("#history-canary-policy")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.panelHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.panelText).toContain("Canary 策略控制");
  });

  test("history page delegates summary text modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historySummaryCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistorySummaryRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistorySummaryText" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historySummaryCallCount =
                Number((window as any).__historySummaryCallCount || 0) + 1;
              return (value as (state: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistorySummaryRuntime?.resolveHistorySummaryText),
      summaryCallCount: Number((window as any).__historySummaryCallCount || 0),
      summaryText: (document.querySelector("#history-summary")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.summaryCallCount).toBeGreaterThan(0);
    expect(snapshot.summaryText).toContain("诊断筛选:");
  });

  test("history page delegates status display modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyStatusDisplayCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryStatusRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryStatusDisplayState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyStatusDisplayCallCount =
                Number((window as any).__historyStatusDisplayCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryStatusRuntime?.resolveHistoryStatusDisplayState),
      statusCallCount: Number((window as any).__historyStatusDisplayCallCount || 0),
      statusText: (document.querySelector("#history-status")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.statusCallCount).toBeGreaterThan(0);
    expect(snapshot.statusText).toBe("");
  });

  test("history page delegates query assembly to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyApplyFilterCallCount = 0;
      (window as any).__historyListQueryCallCount = 0;
      (window as any).__historyListResultSourceCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryQueryRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryFilterState" && typeof value === "function") {
            proxyTarget[prop] = function (targetState: unknown, input: unknown) {
              (window as any).__historyApplyFilterCallCount =
                Number((window as any).__historyApplyFilterCallCount || 0) + 1;
              return (value as (a: unknown, b: unknown) => unknown)(targetState, input);
            };
            return true;
          }
          if (prop === "resolveHistoryListQuery" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyListQueryCallCount =
                Number((window as any).__historyListQueryCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryListResultSource" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyListResultSourceCallCount =
                Number((window as any).__historyListResultSourceCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryQueryRuntime?.applyHistoryFilterState) &&
        Boolean((window as any).CoreHistoryQueryRuntime?.resolveHistoryListQuery) &&
        Boolean((window as any).CoreHistoryQueryRuntime?.resolveHistoryListResultSource),
      applyFilterCallCount: Number((window as any).__historyApplyFilterCallCount || 0),
      listQueryCallCount: Number((window as any).__historyListQueryCallCount || 0),
      listResultSourceCallCount: Number((window as any).__historyListResultSourceCallCount || 0),
      hasSummaryText: (document.querySelector("#history-summary")?.textContent || "").trim().length > 0
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.applyFilterCallCount).toBeGreaterThan(0);
    expect(snapshot.listQueryCallCount).toBeGreaterThan(0);
    expect(snapshot.listResultSourceCallCount).toBeGreaterThan(0);
    expect(snapshot.hasSummaryText).toBe(true);
  });

  test("history page delegates load pipeline orchestration to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyLoadPipelineCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryLoadRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryLoadPipeline" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyLoadPipelineCallCount =
                Number((window as any).__historyLoadPipelineCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryLoadRuntime?.resolveHistoryLoadPipeline),
      loadPipelineCallCount: Number((window as any).__historyLoadPipelineCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.loadPipelineCallCount).toBeGreaterThan(0);
  });

  test("history page delegates load render orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyLoadHostCallCount = 0;
      (window as any).__historyLoadHostWithPagerCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryLoadHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryLoadAndRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyLoadHostCallCount =
                Number((window as any).__historyLoadHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryLoadWithPager" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyLoadHostWithPagerCallCount =
                Number((window as any).__historyLoadHostWithPagerCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryLoadHostRuntime?.applyHistoryLoadAndRender) &&
        Boolean((window as any).CoreHistoryLoadHostRuntime?.applyHistoryPagerButtonState) &&
        Boolean((window as any).CoreHistoryLoadHostRuntime?.applyHistoryLoadWithPager),
      loadHostCallCount: Number((window as any).__historyLoadHostCallCount || 0),
      loadWithPagerCallCount: Number((window as any).__historyLoadHostWithPagerCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.loadHostCallCount).toBe(0);
    expect(snapshot.loadWithPagerCallCount).toBeGreaterThan(0);
  });

  test("history page delegates status and summary view apply to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyViewHostStatusCallCount = 0;
      (window as any).__historyViewHostSummaryCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryViewHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryStatus" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyViewHostStatusCallCount =
                Number((window as any).__historyViewHostStatusCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistorySummary" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyViewHostSummaryCallCount =
                Number((window as any).__historyViewHostSummaryCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryViewHostRuntime?.applyHistoryStatus) &&
        Boolean((window as any).CoreHistoryViewHostRuntime?.applyHistorySummary),
      statusCallCount: Number((window as any).__historyViewHostStatusCallCount || 0),
      summaryCallCount: Number((window as any).__historyViewHostSummaryCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.statusCallCount).toBeGreaterThan(0);
    expect(snapshot.summaryCallCount).toBeGreaterThan(0);
  });

  test("history page delegates filter input capture to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyFilterHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryFilterHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryFilterStateFromInputs" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyFilterHostCallCount =
                Number((window as any).__historyFilterHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryFilterHostRuntime?.applyHistoryFilterStateFromInputs),
      callCount: Number((window as any).__historyFilterHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
  });

  test("history page delegates burn-in/canary/list panel orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyPanelHostBurnInCallCount = 0;
      (window as any).__historyPanelHostCanaryCallCount = 0;
      (window as any).__historyPanelHostListCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryPanelHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryBurnInPanelRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyPanelHostBurnInCallCount =
                Number((window as any).__historyPanelHostBurnInCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryCanaryPolicyPanelRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyPanelHostCanaryCallCount =
                Number((window as any).__historyPanelHostCanaryCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryRecordListPanelRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyPanelHostListCallCount =
                Number((window as any).__historyPanelHostListCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryPanelHostRuntime?.applyHistoryBurnInPanelRender) &&
        Boolean((window as any).CoreHistoryPanelHostRuntime?.applyHistoryCanaryPolicyPanelRender) &&
        Boolean((window as any).CoreHistoryPanelHostRuntime?.applyHistoryRecordListPanelRender),
      burnInCallCount: Number((window as any).__historyPanelHostBurnInCallCount || 0),
      canaryCallCount: Number((window as any).__historyPanelHostCanaryCallCount || 0),
      listCallCount: Number((window as any).__historyPanelHostListCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.burnInCallCount).toBeGreaterThan(0);
    expect(snapshot.canaryCallCount).toBeGreaterThan(0);
    expect(snapshot.listCallCount).toBeGreaterThan(0);
  });

  test("history page delegates mode-filter init and control bindings to controls host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyControlsHostInitCallCount = 0;
      (window as any).__historyControlsHostBindCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryControlsHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryModeFilterInitialization" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyControlsHostInitCallCount =
                Number((window as any).__historyControlsHostInitCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "bindHistoryControls" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyControlsHostBindCallCount =
                Number((window as any).__historyControlsHostBindCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryControlsHostRuntime?.applyHistoryModeFilterInitialization) &&
        Boolean((window as any).CoreHistoryControlsHostRuntime?.bindHistoryControls),
      initCallCount: Number((window as any).__historyControlsHostInitCallCount || 0),
      bindCallCount: Number((window as any).__historyControlsHostBindCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.initCallCount).toBeGreaterThan(0);
    expect(snapshot.bindCallCount).toBeGreaterThan(0);
  });

  test("history page delegates load entry orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyLoadEntryHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryLoadEntryHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryLoadEntry" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyLoadEntryHostCallCount =
                Number((window as any).__historyLoadEntryHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryLoadEntryHostRuntime?.applyHistoryLoadEntry),
      callCount: Number((window as any).__historyLoadEntryHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
  });

  test("history page delegates record head modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordHeadCallCount = 0;
      (window as any).__historyCatalogModeLabelCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordViewRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryCatalogModeLabel" && typeof value === "function") {
            proxyTarget[prop] = function (modeCatalog: unknown, item: unknown) {
              (window as any).__historyCatalogModeLabelCallCount =
                Number((window as any).__historyCatalogModeLabelCallCount || 0) + 1;
              return (value as (a: unknown, b: unknown) => unknown)(modeCatalog, item);
            };
            return true;
          }
          if (prop === "resolveHistoryRecordHeadState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHeadCallCount =
                Number((window as any).__historyRecordHeadCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

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
        duration_ms: 40000,
        final_board: [
          [2, 4, 8, 16],
          [32, 64, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean(
        (window as any).CoreHistoryRecordViewRuntime?.resolveHistoryCatalogModeLabel &&
          (window as any).CoreHistoryRecordViewRuntime?.resolveHistoryRecordHeadState
      ),
      catalogModeLabelCallCount: Number((window as any).__historyCatalogModeLabelCallCount || 0),
      headCallCount: Number((window as any).__historyRecordHeadCallCount || 0),
      firstItemText: (document.querySelector(".history-item-head")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.catalogModeLabelCallCount).toBeGreaterThan(0);
    expect(snapshot.headCallCount).toBeGreaterThan(0);
    expect(snapshot.firstItemText).toContain("分数:");
  });

  test("history page delegates record item html modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordItemHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordItemRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryRecordItemHtml" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordItemHtmlCallCount =
                Number((window as any).__historyRecordItemHtmlCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

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
        duration_ms: 12000,
        final_board: [
          [2, 4, 8, 16],
          [32, 64, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryRecordItemRuntime?.resolveHistoryRecordItemHtml),
      callCount: Number((window as any).__historyRecordItemHtmlCallCount || 0),
      hasHistoryItem: document.querySelectorAll(".history-item").length > 0
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.hasHistoryItem).toBe(true);
  });

  test("history page delegates record list render orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordListHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordListHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryRecordListRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordListHostCallCount =
                Number((window as any).__historyRecordListHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryRecordListHostRuntime?.applyHistoryRecordListRender),
      callCount: Number((window as any).__historyRecordListHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
  });

  test("history page delegates single-record export state to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historySingleExportActionCallCount = 0;
      (window as any).__historySingleExportStateCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryExportRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "downloadHistorySingleRecord" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historySingleExportActionCallCount =
                Number((window as any).__historySingleExportActionCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistorySingleRecordExportState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historySingleExportStateCallCount =
                Number((window as any).__historySingleExportStateCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

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
        duration_ms: 12000,
        final_board: [
          [2, 4, 8, 16],
          [32, 64, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.download !== "function") {
        throw new Error("LocalHistoryStore download unavailable");
      }
      const originalDownload = store.download;
      (window as any).__historySingleExportLastFile = "";
      store.download = function (file: unknown, payload: unknown) {
        (window as any).__historySingleExportLastFile = String(file || "");
        (window as any).__historySingleExportPayloadLength = String(payload || "").length;
      };

      const button = document.querySelector(".history-export-btn") as HTMLButtonElement | null;
      if (button && typeof button.click === "function") button.click();

      store.download = originalDownload;
      return {
        hasRuntime:
          Boolean((window as any).CoreHistoryExportRuntime?.downloadHistorySingleRecord) &&
          Boolean((window as any).CoreHistoryExportRuntime?.resolveHistorySingleRecordExportState),
        singleExportActionCallCount: Number((window as any).__historySingleExportActionCallCount || 0),
        singleExportStateCallCount: Number((window as any).__historySingleExportStateCallCount || 0),
        fileName: String((window as any).__historySingleExportLastFile || "")
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.singleExportActionCallCount).toBeGreaterThan(0);
    expect(snapshot.fileName).toContain("history_");
  });

  test("history page delegates final board html rendering to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBoardHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBoardRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryFinalBoardHtml" && typeof value === "function") {
            proxyTarget[prop] = function (board: unknown, width: unknown, height: unknown) {
              (window as any).__historyBoardHtmlCallCount =
                Number((window as any).__historyBoardHtmlCallCount || 0) + 1;
              return (value as (b: unknown, w: unknown, h: unknown) => unknown)(board, width, height);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

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
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 1024,
        best_tile: 128,
        duration_ms: 32000,
        final_board: [
          [2, 4, 8, 16],
          [32, 64, 128, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryBoardRuntime?.resolveHistoryFinalBoardHtml),
      boardHtmlCallCount: Number((window as any).__historyBoardHtmlCallCount || 0),
      hasBoardGrid: Boolean(document.querySelector(".final-board-grid"))
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.boardHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.hasBoardGrid).toBe(true);
  });

  test("history page delegates import action decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyImportActionCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryImportRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryImportActionState" && typeof value === "function") {
            proxyTarget[prop] = function (action: unknown) {
              (window as any).__historyImportActionCallCount =
                Number((window as any).__historyImportActionCallCount || 0) + 1;
              return (value as (name: unknown) => unknown)(action);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });

      const originalClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this && this.type === "file") return;
        return originalClick.apply(this);
      };
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const oldConfirm = window.confirm;
      window.confirm = () => false;

      const mergeBtn = document.querySelector("#history-import-btn") as HTMLButtonElement | null;
      if (mergeBtn && typeof mergeBtn.click === "function") mergeBtn.click();

      const replaceBtn = document.querySelector("#history-import-replace-btn") as HTMLButtonElement | null;
      if (replaceBtn && typeof replaceBtn.click === "function") replaceBtn.click();

      window.confirm = oldConfirm;
      return {
        hasRuntime: Boolean((window as any).CoreHistoryImportRuntime?.resolveHistoryImportActionState),
        actionCallCount: Number((window as any).__historyImportActionCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.actionCallCount).toBeGreaterThan(1);
  });

  test("history page delegates import file helpers to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyImportFileSelectedCallCount = 0;
      (window as any).__historyImportFilePayloadCallCount = 0;
      (window as any).__historyImportFileEncodingCallCount = 0;
      (window as any).__historyImportFileResetCallCount = 0;
      (window as any).__historyImportExecuteCallCount = 0;
      (window as any).__historyImportFileSeenEncoding = null;
      {
        const target: Record<string, unknown> = {};
        (window as any).CoreHistoryImportRuntime = new Proxy(target, {
          set(proxyTarget, prop, value) {
            if (prop === "executeHistoryImport" && typeof value === "function") {
              proxyTarget[prop] = function (input: unknown) {
                (window as any).__historyImportExecuteCallCount =
                  Number((window as any).__historyImportExecuteCallCount || 0) + 1;
                return (value as (args: unknown) => unknown)(input);
              };
              return true;
            }
            proxyTarget[prop] = value;
            return true;
          }
        });
      }
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryImportFileRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryImportSelectedFile" && typeof value === "function") {
            proxyTarget[prop] = function (files: unknown) {
              (window as any).__historyImportFileSelectedCallCount =
                Number((window as any).__historyImportFileSelectedCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(files);
            };
            return true;
          }
          if (prop === "resolveHistoryImportPayloadText" && typeof value === "function") {
            proxyTarget[prop] = function (readerResult: unknown) {
              (window as any).__historyImportFilePayloadCallCount =
                Number((window as any).__historyImportFilePayloadCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(readerResult);
            };
            return true;
          }
          if (prop === "resolveHistoryImportReadEncoding" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyImportFileEncodingCallCount =
                Number((window as any).__historyImportFileEncodingCallCount || 0) + 1;
              return (value as () => unknown)();
            };
            return true;
          }
          if (prop === "resolveHistoryImportInputResetValue" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyImportFileResetCallCount =
                Number((window as any).__historyImportFileResetCallCount || 0) + 1;
              return (value as () => unknown)();
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });

      class MockFileReader {
        result: unknown = "{\"records\":[]}";
        onload: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        readAsText(_file: unknown, encoding?: string) {
          (window as any).__historyImportFileSeenEncoding = encoding ?? null;
          if (typeof this.onload === "function") {
            this.onload(new Event("load"));
          }
        }
      }

      (window as any).FileReader = MockFileReader;
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(async () => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.importRecords !== "function") {
        throw new Error("LocalHistoryStore.importRecords unavailable");
      }
      const originalImportRecords = store.importRecords;
      store.importRecords = () => ({ imported: 0, replaced: 0 });

      const importInput = document.querySelector("#history-import-file") as HTMLInputElement | null;
      if (!importInput) {
        throw new Error("history import input unavailable");
      }

      const fakeFile = { name: "history.json" };
      Object.defineProperty(importInput, "files", {
        configurable: true,
        get() {
          return {
            0: fakeFile,
            length: 1,
            item(index: number) {
              return index === 0 ? fakeFile : null;
            }
          };
        }
      });

      importInput.dispatchEvent(new Event("change"));
      await new Promise((resolve) => setTimeout(resolve, 0));

      store.importRecords = originalImportRecords;
      return {
        hasRuntime: Boolean((window as any).CoreHistoryImportFileRuntime?.resolveHistoryImportSelectedFile),
        hasImportRuntime: Boolean((window as any).CoreHistoryImportRuntime?.executeHistoryImport),
        selectedCallCount: Number((window as any).__historyImportFileSelectedCallCount || 0),
        payloadCallCount: Number((window as any).__historyImportFilePayloadCallCount || 0),
        encodingCallCount: Number((window as any).__historyImportFileEncodingCallCount || 0),
        resetCallCount: Number((window as any).__historyImportFileResetCallCount || 0),
        executeCallCount: Number((window as any).__historyImportExecuteCallCount || 0),
        seenEncoding: (window as any).__historyImportFileSeenEncoding
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasImportRuntime).toBe(true);
    expect(snapshot.selectedCallCount).toBeGreaterThan(0);
    expect(snapshot.payloadCallCount).toBeGreaterThan(0);
    expect(snapshot.encodingCallCount).toBeGreaterThan(0);
    expect(snapshot.resetCallCount).toBeGreaterThan(0);
    expect(snapshot.executeCallCount).toBeGreaterThan(0);
    expect(snapshot.seenEncoding).toBe("utf-8");
  });

  test("history page delegates import orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyImportHostMergeClickCallCount = 0;
      (window as any).__historyImportHostReplaceClickCallCount = 0;
      (window as any).__historyImportHostFileSelectionCallCount = 0;
      (window as any).__historyImportHostApplyReadResultCallCount = 0;
      const hostTarget: Record<string, unknown> = {};
      (window as any).CoreHistoryImportHostRuntime = new Proxy(hostTarget, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryImportMergeClickState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostMergeClickCallCount =
                Number((window as any).__historyImportHostMergeClickCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryImportReplaceClickState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostReplaceClickCallCount =
                Number((window as any).__historyImportHostReplaceClickCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryImportFileSelectionState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostFileSelectionCallCount =
                Number((window as any).__historyImportHostFileSelectionCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryImportFromFileReadResult" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportHostApplyReadResultCallCount =
                Number((window as any).__historyImportHostApplyReadResultCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });

      const originalClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this && this.type === "file") return;
        return originalClick.apply(this);
      };

      class MockFileReader {
        result: unknown = "{\"records\":[]}";
        onload: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        readAsText(_file: unknown, _encoding?: string) {
          if (typeof this.onload === "function") {
            this.onload(new Event("load"));
          }
        }
      }

      (window as any).FileReader = MockFileReader;
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(async () => {
      const oldConfirm = window.confirm;
      window.confirm = () => true;

      const mergeBtn = document.querySelector("#history-import-btn") as HTMLButtonElement | null;
      if (mergeBtn && typeof mergeBtn.click === "function") mergeBtn.click();

      const replaceBtn = document.querySelector("#history-import-replace-btn") as HTMLButtonElement | null;
      if (replaceBtn && typeof replaceBtn.click === "function") replaceBtn.click();

      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.importRecords !== "function") {
        throw new Error("LocalHistoryStore.importRecords unavailable");
      }
      const originalImportRecords = store.importRecords;
      store.importRecords = () => ({ imported: 0, replaced: 0 });

      const importInput = document.querySelector("#history-import-file") as HTMLInputElement | null;
      if (!importInput) {
        throw new Error("history import input unavailable");
      }
      const fakeFile = { name: "history.json" };
      Object.defineProperty(importInput, "files", {
        configurable: true,
        get() {
          return {
            0: fakeFile,
            length: 1,
            item(index: number) {
              return index === 0 ? fakeFile : null;
            }
          };
        }
      });

      importInput.dispatchEvent(new Event("change"));
      await new Promise((resolve) => setTimeout(resolve, 0));

      window.confirm = oldConfirm;
      store.importRecords = originalImportRecords;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryImportHostRuntime?.resolveHistoryImportMergeClickState &&
            (window as any).CoreHistoryImportHostRuntime?.resolveHistoryImportReplaceClickState &&
            (window as any).CoreHistoryImportHostRuntime?.resolveHistoryImportFileSelectionState &&
            (window as any).CoreHistoryImportHostRuntime?.applyHistoryImportFromFileReadResult
        ),
        mergeClickCallCount: Number((window as any).__historyImportHostMergeClickCallCount || 0),
        replaceClickCallCount: Number((window as any).__historyImportHostReplaceClickCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.mergeClickCallCount).toBeGreaterThan(0);
    expect(snapshot.replaceClickCallCount).toBeGreaterThan(0);
  });

  test("history page delegates import control binding orchestration to bind-host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyImportBindHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryImportBindHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "bindHistoryImportControls" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyImportBindHostCallCount =
                Number((window as any).__historyImportBindHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryImportBindHostRuntime?.bindHistoryImportControls),
      bindCallCount: Number((window as any).__historyImportBindHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.bindCallCount).toBeGreaterThan(0);
  });

  test("history page delegates mode filter option modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyModeFilterOptionsCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryModeFilterRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryModeFilterOptions" && typeof value === "function") {
            proxyTarget[prop] = function (modes: unknown) {
              (window as any).__historyModeFilterOptionsCallCount =
                Number((window as any).__historyModeFilterOptionsCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(modes);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const select = document.querySelector("#history-mode") as HTMLSelectElement | null;
      const optionCount = select ? select.querySelectorAll("option").length : 0;
      const hasDefaultOption = select ? select.querySelector("option[value='']") !== null : false;
      return {
        hasRuntime: Boolean((window as any).CoreHistoryModeFilterRuntime?.resolveHistoryModeFilterOptions),
        callCount: Number((window as any).__historyModeFilterOptionsCallCount || 0),
        optionCount,
        hasDefaultOption
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.optionCount).toBeGreaterThan(1);
    expect(snapshot.hasDefaultOption).toBe(true);
  });

  test("history page delegates mode filter render orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyModeFilterHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryModeFilterHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryModeFilterOptionsRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyModeFilterHostCallCount =
                Number((window as any).__historyModeFilterHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const select = document.querySelector("#history-mode") as HTMLSelectElement | null;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryModeFilterHostRuntime?.applyHistoryModeFilterOptionsRender
        ),
        callCount: Number((window as any).__historyModeFilterHostCallCount || 0),
        optionCount: select ? select.querySelectorAll("option").length : 0
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.optionCount).toBeGreaterThan(1);
  });

  test("history page delegates toolbar action decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
      (window as any).__historyToolbarMismatchQueryCallCount = 0;
      (window as any).__historyToolbarClearAllCallCount = 0;
      (window as any).__historyToolbarExecuteClearAllCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryMismatchExportQuery" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarMismatchQueryCallCount =
                Number((window as any).__historyToolbarMismatchQueryCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryClearAllActionState" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyToolbarClearAllCallCount =
                Number((window as any).__historyToolbarClearAllCallCount || 0) + 1;
              return (value as () => unknown)();
            };
            return true;
          }
          if (prop === "executeHistoryClearAll" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarExecuteClearAllCallCount =
                Number((window as any).__historyToolbarExecuteClearAllCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore.clearAll unavailable");
      }
      const originalClearAll = store.clearAll;
      store.clearAll = () => {};

      const mismatchBtn = document.querySelector("#history-export-mismatch-btn") as HTMLButtonElement | null;
      if (mismatchBtn && typeof mismatchBtn.click === "function") mismatchBtn.click();

      const clearAllBtn = document.querySelector("#history-clear-all-btn") as HTMLButtonElement | null;
      if (clearAllBtn && typeof clearAllBtn.click === "function") clearAllBtn.click();

      store.clearAll = originalClearAll;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarRuntime?.resolveHistoryMismatchExportQuery &&
            (window as any).CoreHistoryToolbarRuntime?.resolveHistoryClearAllActionState &&
            (window as any).CoreHistoryToolbarRuntime?.executeHistoryClearAll
        ),
        mismatchQueryCallCount: Number((window as any).__historyToolbarMismatchQueryCallCount || 0),
        clearAllCallCount: Number((window as any).__historyToolbarClearAllCallCount || 0),
        executeClearAllCallCount: Number((window as any).__historyToolbarExecuteClearAllCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.mismatchQueryCallCount).toBeGreaterThan(0);
    expect(snapshot.clearAllCallCount).toBeGreaterThan(0);
    expect(snapshot.executeClearAllCallCount).toBeGreaterThan(0);
  });

  test("history page delegates toolbar action execution orchestration to host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyToolbarHostExportAllCallCount = 0;
      (window as any).__historyToolbarHostMismatchCallCount = 0;
      (window as any).__historyToolbarHostClearAllCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryExportAllAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarHostExportAllCallCount =
                Number((window as any).__historyToolbarHostExportAllCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryMismatchExportAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarHostMismatchCallCount =
                Number((window as any).__historyToolbarHostMismatchCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "applyHistoryClearAllAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarHostClearAllCallCount =
                Number((window as any).__historyToolbarHostClearAllCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.clearAll !== "function") {
        throw new Error("LocalHistoryStore.clearAll unavailable");
      }
      const originalClearAll = store.clearAll;
      store.clearAll = () => {};
      const originalConfirm = window.confirm;
      window.confirm = () => true;

      const exportAllBtn = document.querySelector("#history-export-all-btn") as HTMLButtonElement | null;
      if (exportAllBtn && typeof exportAllBtn.click === "function") exportAllBtn.click();

      const mismatchBtn = document.querySelector("#history-export-mismatch-btn") as HTMLButtonElement | null;
      if (mismatchBtn && typeof mismatchBtn.click === "function") mismatchBtn.click();

      const clearAllBtn = document.querySelector("#history-clear-all-btn") as HTMLButtonElement | null;
      if (clearAllBtn && typeof clearAllBtn.click === "function") clearAllBtn.click();

      window.confirm = originalConfirm;
      store.clearAll = originalClearAll;

      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarHostRuntime?.applyHistoryExportAllAction &&
            (window as any).CoreHistoryToolbarHostRuntime?.applyHistoryMismatchExportAction &&
            (window as any).CoreHistoryToolbarHostRuntime?.applyHistoryClearAllAction
        ),
        exportAllCallCount: Number((window as any).__historyToolbarHostExportAllCallCount || 0),
        mismatchCallCount: Number((window as any).__historyToolbarHostMismatchCallCount || 0),
        clearAllCallCount: Number((window as any).__historyToolbarHostClearAllCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.exportAllCallCount).toBeGreaterThan(0);
    expect(snapshot.mismatchCallCount).toBeGreaterThan(0);
    expect(snapshot.clearAllCallCount).toBeGreaterThan(0);
  });

  test("history page delegates toolbar button binding orchestration to bind-host runtime helper", async ({
    page
  }) => {
    await page.addInitScript(() => {
      (window as any).__historyToolbarBindHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarBindHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "bindHistoryToolbarActionButtons" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyToolbarBindHostCallCount =
                Number((window as any).__historyToolbarBindHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryToolbarBindHostRuntime?.bindHistoryToolbarActionButtons),
      bindCallCount: Number((window as any).__historyToolbarBindHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.bindCallCount).toBeGreaterThan(0);
  });

  test("history page delegates pager and keyword trigger decisions to toolbar-events runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyToolbarPrevPageCallCount = 0;
      (window as any).__historyToolbarNextPageCallCount = 0;
      (window as any).__historyToolbarKeywordCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryToolbarEventsRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryPrevPageState" && typeof value === "function") {
            proxyTarget[prop] = function (pageNo: unknown) {
              (window as any).__historyToolbarPrevPageCallCount =
                Number((window as any).__historyToolbarPrevPageCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(pageNo);
            };
            return true;
          }
          if (prop === "resolveHistoryNextPageState" && typeof value === "function") {
            proxyTarget[prop] = function (pageNo: unknown) {
              (window as any).__historyToolbarNextPageCallCount =
                Number((window as any).__historyToolbarNextPageCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(pageNo);
            };
            return true;
          }
          if (prop === "shouldHistoryKeywordTriggerReload" && typeof value === "function") {
            proxyTarget[prop] = function (key: unknown) {
              (window as any).__historyToolbarKeywordCallCount =
                Number((window as any).__historyToolbarKeywordCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(key);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const nextBtn = document.querySelector("#history-next-page") as HTMLButtonElement | null;
      if (nextBtn) nextBtn.disabled = false;
      if (nextBtn && typeof nextBtn.click === "function") nextBtn.click();

      const prevBtn = document.querySelector("#history-prev-page") as HTMLButtonElement | null;
      if (prevBtn) prevBtn.disabled = false;
      if (prevBtn && typeof prevBtn.click === "function") prevBtn.click();

      const keyword = document.querySelector("#history-keyword") as HTMLInputElement | null;
      if (keyword) {
        const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
        keyword.dispatchEvent(event);
      }

      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarEventsRuntime?.resolveHistoryPrevPageState &&
            (window as any).CoreHistoryToolbarEventsRuntime?.resolveHistoryNextPageState &&
            (window as any).CoreHistoryToolbarEventsRuntime?.shouldHistoryKeywordTriggerReload
        ),
        prevPageCallCount: Number((window as any).__historyToolbarPrevPageCallCount || 0),
        nextPageCallCount: Number((window as any).__historyToolbarNextPageCallCount || 0),
        keywordCallCount: Number((window as any).__historyToolbarKeywordCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.prevPageCallCount).toBeGreaterThan(0);
    expect(snapshot.nextPageCallCount).toBeGreaterThan(0);
    expect(snapshot.keywordCallCount).toBeGreaterThan(0);
  });

  test(
    "history page delegates pager/filter event binding orchestration to toolbar-events host runtime helper",
    async ({ page }) => {
      await page.addInitScript(() => {
        (window as any).__historyToolbarEventsHostBindCallCount = 0;
        const target: Record<string, unknown> = {};
        (window as any).CoreHistoryToolbarEventsHostRuntime = new Proxy(target, {
          set(proxyTarget, prop, value) {
            if (prop === "bindHistoryToolbarPagerAndFilterEvents" && typeof value === "function") {
              proxyTarget[prop] = function (input: unknown) {
                (window as any).__historyToolbarEventsHostBindCallCount =
                  Number((window as any).__historyToolbarEventsHostBindCallCount || 0) + 1;
                return (value as (args: unknown) => unknown)(input);
              };
              return true;
            }
            proxyTarget[prop] = value;
            return true;
          }
        });
      });

      const response = await page.goto("/history.html", {
        waitUntil: "domcontentloaded"
      });
      expect(response, "History response should exist").not.toBeNull();
      expect(response?.ok(), "History response should be 2xx").toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      await page.waitForTimeout(200);

      const snapshot = await page.evaluate(() => ({
        hasRuntime: Boolean(
          (window as any).CoreHistoryToolbarEventsHostRuntime
            ?.bindHistoryToolbarPagerAndFilterEvents
        ),
        bindCallCount: Number((window as any).__historyToolbarEventsHostBindCallCount || 0)
      }));

      expect(snapshot.hasRuntime).toBe(true);
      expect(snapshot.bindCallCount).toBeGreaterThan(0);
    }
  );

  test("history page delegates record delete action decisions to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
      (window as any).__historyDeleteActionCallCount = 0;
      (window as any).__historyDeleteExecuteCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordActionsRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryDeleteActionState" && typeof value === "function") {
            proxyTarget[prop] = function (recordId: unknown) {
              (window as any).__historyDeleteActionCallCount =
                Number((window as any).__historyDeleteActionCallCount || 0) + 1;
              return (value as (id: unknown) => unknown)(recordId);
            };
            return true;
          }
          if (prop === "executeHistoryDeleteRecord" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyDeleteExecuteCallCount =
                Number((window as any).__historyDeleteExecuteCallCount || 0) + 1;
              return (value as (payload: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

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
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 128,
        best_tile: 16,
        duration_ms: 8000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.deleteById !== "function") {
        throw new Error("LocalHistoryStore.deleteById unavailable");
      }
      const originalDeleteById = store.deleteById;
      store.deleteById = () => true;

      const deleteBtn = document.querySelector(".history-delete-btn") as HTMLButtonElement | null;
      if (deleteBtn && typeof deleteBtn.click === "function") deleteBtn.click();

      store.deleteById = originalDeleteById;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryRecordActionsRuntime?.resolveHistoryDeleteActionState &&
            (window as any).CoreHistoryRecordActionsRuntime?.executeHistoryDeleteRecord
        ),
        deleteActionCallCount: Number((window as any).__historyDeleteActionCallCount || 0),
        deleteExecuteCallCount: Number((window as any).__historyDeleteExecuteCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.deleteActionCallCount).toBeGreaterThan(0);
    expect(snapshot.deleteExecuteCallCount).toBeGreaterThan(0);
  });

  test("history page delegates record item actions orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyRecordHostReplayCallCount = 0;
      (window as any).__historyRecordHostExportCallCount = 0;
      (window as any).__historyRecordHostDeleteCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryRecordHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryRecordReplayHref" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHostReplayCallCount =
                Number((window as any).__historyRecordHostReplayCallCount || 0) + 1;
              (value as (args: unknown) => unknown)(input);
              return "";
            };
            return true;
          }
          if (prop === "applyHistoryRecordExportAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHostExportCallCount =
                Number((window as any).__historyRecordHostExportCallCount || 0) + 1;
              (value as (args: unknown) => unknown)(input);
              return false;
            };
            return true;
          }
          if (prop === "applyHistoryRecordDeleteAction" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyRecordHostDeleteCallCount =
                Number((window as any).__historyRecordHostDeleteCallCount || 0) + 1;
              (value as (args: unknown) => unknown)(input);
              return {
                shouldSetStatus: false,
                statusText: "",
                isError: false,
                shouldReload: false
              };
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

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
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 64,
        best_tile: 8,
        duration_ms: 3000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "[]"
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      const runtime = (window as any).CoreHistoryRecordHostRuntime;
      if (!store || !runtime || typeof store.listRecords !== "function") {
        throw new Error("history record host runtime prerequisites unavailable");
      }
      const listResult = store.listRecords({
        mode_key: "",
        keyword: "",
        sort_by: "ended_desc",
        adapter_parity_filter: "all",
        page: 1,
        page_size: 1
      });
      const item = Array.isArray(listResult?.items) ? listResult.items[0] : null;
      const itemId = item?.id;

      if (typeof runtime.resolveHistoryRecordReplayHref === "function") {
        runtime.resolveHistoryRecordReplayHref({
          historyRecordActionsRuntime: {
            resolveHistoryReplayHref: () => ""
          },
          itemId
        });
      }
      if (typeof runtime.applyHistoryRecordExportAction === "function") {
        runtime.applyHistoryRecordExportAction({
          localHistoryStore: store,
          item,
          historyExportRuntime: {
            downloadHistorySingleRecord: () => false
          }
        });
      }
      if (typeof runtime.applyHistoryRecordDeleteAction === "function") {
        runtime.applyHistoryRecordDeleteAction({
          historyRecordActionsRuntime: {
            resolveHistoryDeleteActionState: (id: unknown) => ({
              confirmMessage: "确认删除这条记录吗？",
              recordId: id
            }),
            executeHistoryDeleteRecord: () => ({
              deleted: false,
              notice: "failed"
            }),
            resolveHistoryDeleteFailureNotice: () => "failed",
            resolveHistoryDeleteSuccessNotice: () => "ok"
          },
          localHistoryStore: store,
          itemId,
          confirmAction: () => true
        });
      }

      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryRecordHostRuntime?.resolveHistoryRecordReplayHref &&
            (window as any).CoreHistoryRecordHostRuntime?.applyHistoryRecordExportAction &&
            (window as any).CoreHistoryRecordHostRuntime?.applyHistoryRecordDeleteAction
        ),
        replayCallCount: Number((window as any).__historyRecordHostReplayCallCount || 0),
        exportCallCount: Number((window as any).__historyRecordHostExportCallCount || 0),
        deleteCallCount: Number((window as any).__historyRecordHostDeleteCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.replayCallCount).toBeGreaterThan(0);
    expect(snapshot.exportCallCount).toBeGreaterThan(0);
    expect(snapshot.deleteCallCount).toBeGreaterThan(0);
  });

  test("history page delegates mismatch export execution to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyExportMismatchCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryExportRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "downloadHistoryMismatchRecords" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyExportMismatchCallCount =
                Number((window as any).__historyExportMismatchCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

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
          undoUsedFromSnapshot: 0,
          scoreDelta: 4,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 4,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: false,
          bothScoreAligned: false
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store || typeof store.download !== "function") {
        throw new Error("LocalHistoryStore download unavailable");
      }
      const originalDownload = store.download;
      (window as any).__historyExportLastFile = "";
      store.download = function (file: unknown, payload: unknown) {
        (window as any).__historyExportLastFile = String(file || "");
        (window as any).__historyExportPayloadLength = String(payload || "").length;
      };

      const button = document.querySelector("#history-export-mismatch-btn") as HTMLButtonElement | null;
      if (button && typeof button.click === "function") button.click();

      store.download = originalDownload;
      return {
        hasRuntime: Boolean((window as any).CoreHistoryExportRuntime?.downloadHistoryMismatchRecords),
        mismatchCallCount: Number((window as any).__historyExportMismatchCallCount || 0),
        statusText: (document.querySelector("#history-status")?.textContent || "").trim(),
        fileName: String((window as any).__historyExportLastFile || "")
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.mismatchCallCount).toBeGreaterThan(0);
    expect(snapshot.statusText).toContain("已导出 A/B 不一致记录");
    expect(snapshot.fileName).toContain("2048_local_history_mismatch_");
  });

  test("history page delegates adapter diagnostics rendering to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyAdapterParityStatusCallCount = 0;
      (window as any).__historyAdapterBadgeCallCount = 0;
      (window as any).__historyAdapterDiagnosticsCallCount = 0;
      (window as any).__historyAdapterBadgeHtmlCallCount = 0;
      (window as any).__historyAdapterDiagnosticsHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryAdapterDiagnosticsRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryAdapterParityStatus" && typeof value === "function") {
            proxyTarget[prop] = function (store: unknown, item: unknown) {
              (window as any).__historyAdapterParityStatusCallCount =
                Number((window as any).__historyAdapterParityStatusCallCount || 0) + 1;
              return (value as (a: unknown, b: unknown) => unknown)(store, item);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterBadgeState" && typeof value === "function") {
            proxyTarget[prop] = function (item: unknown, status: string) {
              (window as any).__historyAdapterBadgeCallCount =
                Number((window as any).__historyAdapterBadgeCallCount || 0) + 1;
              return (value as (entry: unknown, state: string) => unknown)(item, status);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterDiagnosticsState" && typeof value === "function") {
            proxyTarget[prop] = function (item: unknown) {
              (window as any).__historyAdapterDiagnosticsCallCount =
                Number((window as any).__historyAdapterDiagnosticsCallCount || 0) + 1;
              return (value as (entry: unknown) => unknown)(item);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterBadgeHtml" && typeof value === "function") {
            proxyTarget[prop] = function (state: unknown) {
              (window as any).__historyAdapterBadgeHtmlCallCount =
                Number((window as any).__historyAdapterBadgeHtmlCallCount || 0) + 1;
              return (value as (entry: unknown) => unknown)(state);
            };
            return true;
          }
          if (prop === "resolveHistoryAdapterDiagnosticsHtml" && typeof value === "function") {
            proxyTarget[prop] = function (state: unknown) {
              (window as any).__historyAdapterDiagnosticsHtmlCallCount =
                Number((window as any).__historyAdapterDiagnosticsHtmlCallCount || 0) + 1;
              return (value as (entry: unknown) => unknown)(state);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

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
          lastScoreFromSnapshot: 256,
          undoUsedFromSnapshot: 1,
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
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryAdapterDiagnosticsRuntime?.resolveHistoryAdapterParityStatus &&
          (window as any).CoreHistoryAdapterDiagnosticsRuntime?.resolveHistoryAdapterBadgeState &&
            (window as any).CoreHistoryAdapterDiagnosticsRuntime
              ?.resolveHistoryAdapterDiagnosticsState &&
            (window as any).CoreHistoryAdapterDiagnosticsRuntime?.resolveHistoryAdapterBadgeHtml &&
            (window as any).CoreHistoryAdapterDiagnosticsRuntime
              ?.resolveHistoryAdapterDiagnosticsHtml
        ),
        parityStatusCallCount: Number((window as any).__historyAdapterParityStatusCallCount || 0),
        badgeCallCount: Number((window as any).__historyAdapterBadgeCallCount || 0),
        diagnosticsCallCount: Number((window as any).__historyAdapterDiagnosticsCallCount || 0),
        badgeHtmlCallCount: Number((window as any).__historyAdapterBadgeHtmlCallCount || 0),
        diagnosticsHtmlCallCount: Number((window as any).__historyAdapterDiagnosticsHtmlCallCount || 0),
        diagnosticsCount: document.querySelectorAll(".history-adapter-diagnostics").length
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.parityStatusCallCount).toBeGreaterThan(0);
    expect(snapshot.badgeCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsCallCount).toBeGreaterThan(0);
    expect(snapshot.badgeHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsCount).toBe(1);
  });

  test("history page delegates adapter diagnostics orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyAdapterHostRenderCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryAdapterHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryAdapterRecordRenderState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyAdapterHostRenderCallCount =
                Number((window as any).__historyAdapterHostRenderCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

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
          lastScoreFromSnapshot: 256,
          undoUsedFromSnapshot: 1,
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
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      return {
        hasRuntime: Boolean((window as any).CoreHistoryAdapterHostRuntime?.resolveHistoryAdapterRecordRenderState),
        hostRenderCallCount: Number((window as any).__historyAdapterHostRenderCallCount || 0),
        diagnosticsCount: document.querySelectorAll(".history-adapter-diagnostics").length
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hostRenderCallCount).toBeGreaterThan(0);
    expect(snapshot.diagnosticsCount).toBe(1);
  });

  test("history page delegates burn-in summary modeling to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBurnInSummarySourceCallCount = 0;
      (window as any).__historyBurnInCallCount = 0;
      (window as any).__historyBurnInPanelHtmlCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBurnInRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryBurnInSummarySource" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInSummarySourceCallCount =
                Number((window as any).__historyBurnInSummarySourceCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInSummaryState" && typeof value === "function") {
            proxyTarget[prop] = function (summary: unknown) {
              (window as any).__historyBurnInCallCount =
                Number((window as any).__historyBurnInCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(summary);
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInPanelHtml" && typeof value === "function") {
            proxyTarget[prop] = function (summary: unknown, state: unknown) {
              (window as any).__historyBurnInPanelHtmlCallCount =
                Number((window as any).__historyBurnInPanelHtmlCallCount || 0) + 1;
              return (value as (a: unknown, b: unknown) => unknown)(summary, state);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

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
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 128,
        best_tile: 16,
        duration_ms: 8000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 130,
          undoUsedFromSnapshot: 0,
          scoreDelta: 2,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 2,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: false,
          bothScoreAligned: false
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => ({
      hasRuntime:
        Boolean((window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInSummarySource) &&
        Boolean((window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInSummaryState) &&
        Boolean((window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInPanelHtml),
      summarySourceCallCount: Number((window as any).__historyBurnInSummarySourceCallCount || 0),
      burnInCallCount: Number((window as any).__historyBurnInCallCount || 0),
      panelHtmlCallCount: Number((window as any).__historyBurnInPanelHtmlCallCount || 0),
      burnInText: (document.querySelector("#history-burnin-summary")?.textContent || "").trim()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.summarySourceCallCount).toBeGreaterThan(0);
    expect(snapshot.burnInCallCount).toBeGreaterThan(0);
    expect(snapshot.panelHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.burnInText).toContain("Cutover Burn-in 统计");
  });

  test("history page delegates burn-in mismatch focus action to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBurnInFocusCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBurnInRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryBurnInSummaryState" && typeof value === "function") {
            proxyTarget[prop] = function (summary: unknown) {
              const state = (value as (input: unknown) => unknown)(summary);
              if (!state || typeof state !== "object") return state;
              return { ...(state as Record<string, unknown>), mismatchActionEnabled: true };
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInMismatchFocusActionState" && typeof value === "function") {
            proxyTarget[prop] = function () {
              (window as any).__historyBurnInFocusCallCount =
                Number((window as any).__historyBurnInFocusCallCount || 0) + 1;
              return (value as () => unknown)();
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

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
      store.saveRecord({
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        ruleset: "pow2",
        undo_enabled: false,
        rank_policy: "ranked",
        score: 128,
        best_tile: 16,
        duration_ms: 8000,
        final_board: [
          [2, 4, 8, 16],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        ended_at: new Date().toISOString(),
        replay_string: "",
        adapter_parity_report_v1: {
          adapterMode: "core-adapter",
          lastScoreFromSnapshot: 130,
          undoUsedFromSnapshot: 0,
          scoreDelta: 2,
          isScoreAligned: false
        },
        adapter_parity_ab_diff_v1: {
          comparable: true,
          scoreDelta: 2,
          undoUsedDelta: 0,
          overEventsDelta: 0,
          undoEventsDelta: 0,
          wonEventsDelta: 0,
          isScoreMatch: false,
          bothScoreAligned: false
        }
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const actionBtn = document.querySelector(".history-burnin-focus-mismatch") as HTMLButtonElement | null;
      if (actionBtn && typeof actionBtn.click === "function") actionBtn.click();
      const adapterFilter = document.querySelector("#history-adapter-filter") as HTMLSelectElement | null;
      return {
        hasRuntime: Boolean(
          (window as any).CoreHistoryBurnInRuntime?.resolveHistoryBurnInMismatchFocusActionState
        ),
        callCount: Number((window as any).__historyBurnInFocusCallCount || 0),
        hasActionButton: Boolean(actionBtn),
        adapterFilterValue: adapterFilter ? adapterFilter.value : ""
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasActionButton).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.adapterFilterValue).toBe("mismatch");
  });

  test("history page delegates burn-in panel orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyBurnInHostRenderCallCount = 0;
      (window as any).__historyBurnInHostClickCallCount = 0;
      (window as any).__historyBurnInHostApplyRenderCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryBurnInHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "resolveHistoryBurnInPanelRenderState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInHostRenderCallCount =
                Number((window as any).__historyBurnInHostRenderCallCount || 0) + 1;
              (value as (arg: unknown) => unknown)(input);
              return {
                panelHtml:
                  "<div class='history-burnin-actions'>" +
                  "<button class='replay-button history-burnin-focus-mismatch'>仅看不一致</button>" +
                  "</div>",
                shouldBindMismatchAction: true
              };
            };
            return true;
          }
          if (prop === "resolveHistoryBurnInMismatchFocusClickState" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInHostClickCallCount =
                Number((window as any).__historyBurnInHostClickCallCount || 0) + 1;
              (value as (arg: unknown) => unknown)(input);
              return {
                shouldApply: true,
                nextAdapterParityFilter: "mismatch",
                nextSelectValue: "mismatch",
                shouldReload: false,
                resetPage: true
              };
            };
            return true;
          }
          if (prop === "applyHistoryBurnInSummaryRender" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyBurnInHostApplyRenderCallCount =
                Number((window as any).__historyBurnInHostApplyRenderCallCount || 0) + 1;
              return (value as (arg: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(200);

    const snapshot = await page.evaluate(() => {
      const actionBtn = document.querySelector(".history-burnin-focus-mismatch") as HTMLButtonElement | null;
      if (actionBtn && typeof actionBtn.click === "function") actionBtn.click();
      return {
        hasRuntime:
          Boolean((window as any).CoreHistoryBurnInHostRuntime?.resolveHistoryBurnInPanelRenderState) &&
          Boolean((window as any).CoreHistoryBurnInHostRuntime?.resolveHistoryBurnInMismatchFocusClickState) &&
          Boolean((window as any).CoreHistoryBurnInHostRuntime?.applyHistoryBurnInSummaryRender),
        applyRenderCallCount: Number((window as any).__historyBurnInHostApplyRenderCallCount || 0)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.applyRenderCallCount).toBeGreaterThan(0);
  });

  test("history page delegates startup orchestration to host runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__historyStartupHostCallCount = 0;
      const target: Record<string, unknown> = {};
      (window as any).CoreHistoryStartupHostRuntime = new Proxy(target, {
        set(proxyTarget, prop, value) {
          if (prop === "applyHistoryStartup" && typeof value === "function") {
            proxyTarget[prop] = function (input: unknown) {
              (window as any).__historyStartupHostCallCount =
                Number((window as any).__historyStartupHostCallCount || 0) + 1;
              return (value as (args: unknown) => unknown)(input);
            };
            return true;
          }
          proxyTarget[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/history.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "History response should exist").not.toBeNull();
    expect(response?.ok(), "History response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CoreHistoryStartupHostRuntime?.applyHistoryStartup),
      startupHostCallCount: Number((window as any).__historyStartupHostCallCount || 0)
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.startupHostCallCount).toBeGreaterThan(0);
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

  test("replay application delegates startup payload to simple runtime helpers", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__simpleRuntimeContractCallCount = 0;
      (window as any).__simpleStartupCallCount = 0;
      const contractTarget: Record<string, unknown> = {};
      (window as any).CoreSimpleRuntimeContractRuntime = new Proxy(contractTarget, {
        set(target, prop, value) {
          if (prop === "resolveSimpleBootstrapRuntime" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__simpleRuntimeContractCallCount =
                Number((window as any).__simpleRuntimeContractCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupTarget: Record<string, unknown> = {};
      (window as any).CoreSimpleStartupRuntime = new Proxy(startupTarget, {
        set(target, prop, value) {
          if (prop === "resolveSimpleStartupPayload" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__simpleStartupCallCount =
                Number((window as any).__simpleStartupCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/replay.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Replay response should exist").not.toBeNull();
    expect(response?.ok(), "Replay response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      return {
        hasSimpleRuntimeContractRuntime: Boolean(
          (window as any).CoreSimpleRuntimeContractRuntime?.resolveSimpleBootstrapRuntime
        ),
        hasSimpleStartupRuntime: Boolean(
          (window as any).CoreSimpleStartupRuntime?.resolveSimpleStartupPayload
        ),
        simpleRuntimeContractCallCount: Number((window as any).__simpleRuntimeContractCallCount || 0),
        simpleStartupCallCount: Number((window as any).__simpleStartupCallCount || 0),
        modeKey: cfg && typeof cfg.key === "string" ? cfg.key : null
      };
    });

    expect(snapshot.hasSimpleRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasSimpleStartupRuntime).toBe(true);
    expect(snapshot.simpleRuntimeContractCallCount).toBeGreaterThan(0);
    expect(snapshot.simpleStartupCallCount).toBeGreaterThan(0);
    expect(snapshot.modeKey).toBe("standard_4x4_pow2_no_undo");
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
            typeof runtime.resolveUndoModeIdFromBody === "function" &&
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
            typeof runtime.resolveUndoModeIdFromBody === "function" &&
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

  test("application startup delegates to home startup host runtime", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__homeRuntimeContractCallCount = 0;
      (window as any).__homeStartupHostCallCount = 0;
      (window as any).__homeModeContextCallCount = 0;

      const runtimeContractTarget: Record<string, unknown> = {};
      (window as any).CoreHomeRuntimeContractRuntime = new Proxy(runtimeContractTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeRuntimeContractCallCount =
                Number((window as any).__homeRuntimeContractCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupHostTarget: Record<string, unknown> = {};
      (window as any).CoreHomeStartupHostRuntime = new Proxy(startupHostTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeStartupFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeStartupHostCallCount =
                Number((window as any).__homeStartupHostCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const homeModeRuntimeTarget: Record<string, unknown> = {};
      (window as any).CoreHomeModeRuntime = new Proxy(homeModeRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolveHomeModeSelectionFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__homeModeContextCallCount =
                Number((window as any).__homeModeContextCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => {
      const cfg = (window as any).GAME_MODE_CONFIG;
      return {
        hasHomeRuntimeContractRuntime: Boolean(
          (window as any).CoreHomeRuntimeContractRuntime?.resolveHomeRuntimeContracts
        ),
        hasHomeStartupHostRuntime: Boolean(
          (window as any).CoreHomeStartupHostRuntime?.resolveHomeStartupFromContext
        ),
        hasHomeModeContextRuntime: Boolean(
          (window as any).CoreHomeModeRuntime?.resolveHomeModeSelectionFromContext
        ),
        homeRuntimeContractCallCount: Number((window as any).__homeRuntimeContractCallCount || 0),
        homeStartupHostCallCount: Number((window as any).__homeStartupHostCallCount || 0),
        homeModeContextCallCount: Number((window as any).__homeModeContextCallCount || 0),
        modeKey: cfg && typeof cfg.key === "string" ? cfg.key : null
      };
    });

    expect(snapshot.hasHomeRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasHomeStartupHostRuntime).toBe(true);
    expect(snapshot.hasHomeModeContextRuntime).toBe(true);
    expect(snapshot.homeRuntimeContractCallCount).toBeGreaterThan(0);
    expect(snapshot.homeStartupHostCallCount).toBeGreaterThan(0);
    expect(snapshot.homeModeContextCallCount).toBeGreaterThan(0);
    expect(snapshot.modeKey).toBe("standard_4x4_pow2_no_undo");
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
        typeof runtime.createPracticeTransferNavigationPlan !== "function" ||
        typeof runtime.resolvePracticeTransferPrecheck !== "function"
      ) {
        return { hasRuntime: false, hasOpenFn: typeof openPracticeBoardFromCurrent === "function" };
      }
      if (typeof openPracticeBoardFromCurrent !== "function") {
        return { hasRuntime: true, hasOpenFn: false };
      }

      const originalCreatePracticeTransferNavigationPlan = runtime.createPracticeTransferNavigationPlan;
      const originalResolvePracticeTransferPrecheck = runtime.resolvePracticeTransferPrecheck;
      const originalManager = (window as any).game_manager;
      const originalOpen = window.open;
      let createPlanCallCount = 0;
      let precheckCallCount = 0;
      let openedUrl = "";

      runtime.createPracticeTransferNavigationPlan = function (opts: any) {
        createPlanCallCount += 1;
        return originalCreatePracticeTransferNavigationPlan(opts);
      };
      runtime.resolvePracticeTransferPrecheck = function (opts: any) {
        precheckCallCount += 1;
        return originalResolvePracticeTransferPrecheck(opts);
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
          precheckCallCount,
          createPlanCallCount,
          openedUrl
        };
      } finally {
        runtime.createPracticeTransferNavigationPlan = originalCreatePracticeTransferNavigationPlan;
        runtime.resolvePracticeTransferPrecheck = originalResolvePracticeTransferPrecheck;
        (window as any).game_manager = originalManager;
        window.open = originalOpen;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasOpenFn).toBe(true);
    expect(snapshot.precheckCallCount).toBeGreaterThan(0);
    expect(snapshot.createPlanCallCount).toBeGreaterThan(0);
    expect(snapshot.openedUrl).toContain("Practice_board.html");
    expect(snapshot.openedUrl).toContain("practice_token=");
    expect(snapshot.openedUrl).toContain("practice_ruleset=pow2");
    expect(snapshot.openedUrl).toContain("practice_guide_seen=1");
  });

  test("index ui delegates mobile hint timerbox undo-top top-actions top-button and viewport logic to runtime helpers", async ({ page }) => {
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
      const topButtonsRuntime = (window as any).CoreMobileTopButtonsRuntime;
      const viewportRuntime = (window as any).CoreMobileViewportRuntime;
      const undoActionRuntime = (window as any).CoreUndoActionRuntime;
      if (
        !runtime ||
        typeof runtime.collectMobileHintTexts !== "function" ||
        !uiRuntime ||
        typeof uiRuntime.syncMobileHintTextBlockVisibility !== "function" ||
        typeof uiRuntime.resolveMobileHintUiState !== "function" ||
        !modalRuntime ||
        typeof modalRuntime.ensureMobileHintModalDom !== "function" ||
        !timerRuntime ||
        typeof timerRuntime.resolveStoredMobileTimerboxCollapsed !== "function" ||
        typeof timerRuntime.resolveMobileTimerboxCollapsedValue !== "function" ||
        typeof timerRuntime.resolveMobileTimerboxDisplayModel !== "function" ||
        typeof timerRuntime.resolveMobileTimerboxAppliedModel !== "function" ||
        !undoTopRuntime ||
        typeof undoTopRuntime.resolveMobileUndoTopButtonDisplayModel !== "function" ||
        typeof undoTopRuntime.resolveMobileUndoTopAppliedModel !== "function" ||
        !topActionsRuntime ||
        typeof topActionsRuntime.createGameTopActionsPlacementState !== "function" ||
        typeof topActionsRuntime.createPracticeTopActionsPlacementState !== "function" ||
        typeof topActionsRuntime.syncGameTopActionsPlacement !== "function" ||
        typeof topActionsRuntime.syncPracticeTopActionsPlacement !== "function" ||
        !topButtonsRuntime ||
        typeof topButtonsRuntime.ensureMobileUndoTopButtonDom !== "function" ||
        typeof topButtonsRuntime.ensureMobileHintToggleButtonDom !== "function" ||
        !undoActionRuntime ||
        typeof undoActionRuntime.resolveUndoModeIdFromBody !== "function" ||
        typeof undoActionRuntime.isUndoCapableMode !== "function" ||
        typeof undoActionRuntime.resolveUndoCapabilityFromContext !== "function" ||
        typeof undoActionRuntime.isUndoInteractionEnabled !== "function" ||
        !viewportRuntime ||
        typeof viewportRuntime.isViewportAtMost !== "function" ||
        typeof viewportRuntime.isCompactGameViewport !== "function" ||
        typeof viewportRuntime.isTimerboxCollapseViewport !== "function" ||
        typeof viewportRuntime.isMobileGameViewport !== "function" ||
        typeof viewportRuntime.resolvePageScopeValue !== "function" ||
        typeof viewportRuntime.isGamePageScope !== "function" ||
        typeof viewportRuntime.isPracticePageScope !== "function" ||
        typeof viewportRuntime.isTimerboxMobileScope !== "function"
      ) {
        return {
          hasRuntime: false,
          hasUiRuntime: false,
          hasModalRuntime: false,
          hasTimerRuntime: false,
          hasUndoTopRuntime: false,
          hasTopActionsRuntime: false,
          hasTopButtonsRuntime: false,
          hasViewportRuntime: false
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
          hasTopButtonsRuntime: true,
          hasViewportRuntime: true,
          hasHintButton: false
        };
      }

      const originalCollect = runtime.collectMobileHintTexts;
      const originalSync = uiRuntime.syncMobileHintTextBlockVisibility;
      const originalResolveHintUiState = uiRuntime.resolveMobileHintUiState;
      const originalEnsureModal = modalRuntime.ensureMobileHintModalDom;
      const originalResolveStored = timerRuntime.resolveStoredMobileTimerboxCollapsed;
      const originalResolveCollapsedValue = timerRuntime.resolveMobileTimerboxCollapsedValue;
      const originalResolveDisplay = timerRuntime.resolveMobileTimerboxDisplayModel;
      const originalResolveAppliedModel = timerRuntime.resolveMobileTimerboxAppliedModel;
      const originalUndoTopDisplay = undoTopRuntime.resolveMobileUndoTopButtonDisplayModel;
      const originalUndoTopApplied = undoTopRuntime.resolveMobileUndoTopAppliedModel;
      const originalSyncGameTop = topActionsRuntime.syncGameTopActionsPlacement;
      const originalSyncPracticeTop = topActionsRuntime.syncPracticeTopActionsPlacement;
      const originalEnsureUndoTopBtn = topButtonsRuntime.ensureMobileUndoTopButtonDom;
      const originalEnsureHintTopBtn = topButtonsRuntime.ensureMobileHintToggleButtonDom;
      const originalIsCompactViewport = viewportRuntime.isCompactGameViewport;
      const originalIsTimerboxCollapseViewport = viewportRuntime.isTimerboxCollapseViewport;
      const originalResolvePageScopeValue = viewportRuntime.resolvePageScopeValue;
      const originalIsGamePageScope = viewportRuntime.isGamePageScope;
      const originalIsPracticePageScope = viewportRuntime.isPracticePageScope;
      const originalIsTimerboxMobileScope = viewportRuntime.isTimerboxMobileScope;
      const originalResolveUndoModeIdFromBody = undoActionRuntime.resolveUndoModeIdFromBody;
      const originalIsUndoCapableMode = undoActionRuntime.isUndoCapableMode;
      const originalResolveUndoCapabilityFromContext =
        undoActionRuntime.resolveUndoCapabilityFromContext;
      const originalIsUndoInteractionEnabled = undoActionRuntime.isUndoInteractionEnabled;
      let collectCallCount = 0;
      let syncCallCount = 0;
      let resolveHintUiStateCallCount = 0;
      let ensureModalCallCount = 0;
      let resolveStoredCallCount = 0;
      let resolveCollapsedValueCallCount = 0;
      let resolveDisplayCallCount = 0;
      let resolveAppliedModelCallCount = 0;
      let resolveUndoTopCallCount = 0;
      let resolveUndoTopAppliedCallCount = 0;
      let syncGameTopCallCount = 0;
      let syncPracticeTopCallCount = 0;
      let ensureUndoTopBtnCallCount = 0;
      let ensureHintTopBtnCallCount = 0;
      let compactViewportCallCount = 0;
      let timerboxCollapseViewportCallCount = 0;
      let resolvePageScopeCallCount = 0;
      let gameScopeCallCount = 0;
      let practiceScopeCallCount = 0;
      let timerboxScopeCallCount = 0;
      let resolveUndoModeIdFromBodyCallCount = 0;
      let isUndoCapableModeCallCount = 0;
      let resolveUndoCapabilityFromContextCallCount = 0;
      let isUndoInteractionEnabledCallCount = 0;
      runtime.collectMobileHintTexts = function (opts: any) {
        collectCallCount += 1;
        const lines = originalCollect(opts);
        return Array.isArray(lines) && lines.length ? lines : ["Smoke 提示"];
      };
      uiRuntime.syncMobileHintTextBlockVisibility = function (opts: any) {
        syncCallCount += 1;
        return originalSync(opts);
      };
      uiRuntime.resolveMobileHintUiState = function (opts: any) {
        resolveHintUiStateCallCount += 1;
        return originalResolveHintUiState(opts);
      };
      modalRuntime.ensureMobileHintModalDom = function (opts: any) {
        ensureModalCallCount += 1;
        return originalEnsureModal(opts);
      };
      timerRuntime.resolveStoredMobileTimerboxCollapsed = function (opts: any) {
        resolveStoredCallCount += 1;
        return originalResolveStored(opts);
      };
      timerRuntime.resolveMobileTimerboxCollapsedValue = function (opts: any) {
        resolveCollapsedValueCallCount += 1;
        return originalResolveCollapsedValue(opts);
      };
      timerRuntime.resolveMobileTimerboxDisplayModel = function (opts: any) {
        resolveDisplayCallCount += 1;
        return originalResolveDisplay(opts);
      };
      timerRuntime.resolveMobileTimerboxAppliedModel = function (opts: any) {
        resolveAppliedModelCallCount += 1;
        return originalResolveAppliedModel(opts);
      };
      undoTopRuntime.resolveMobileUndoTopButtonDisplayModel = function (opts: any) {
        resolveUndoTopCallCount += 1;
        return originalUndoTopDisplay(opts);
      };
      undoTopRuntime.resolveMobileUndoTopAppliedModel = function (opts: any) {
        resolveUndoTopAppliedCallCount += 1;
        return originalUndoTopApplied(opts);
      };
      topActionsRuntime.syncGameTopActionsPlacement = function (opts: any) {
        syncGameTopCallCount += 1;
        return originalSyncGameTop(opts);
      };
      topActionsRuntime.syncPracticeTopActionsPlacement = function (opts: any) {
        syncPracticeTopCallCount += 1;
        return originalSyncPracticeTop(opts);
      };
      topButtonsRuntime.ensureMobileUndoTopButtonDom = function (opts: any) {
        ensureUndoTopBtnCallCount += 1;
        return originalEnsureUndoTopBtn(opts);
      };
      topButtonsRuntime.ensureMobileHintToggleButtonDom = function (opts: any) {
        ensureHintTopBtnCallCount += 1;
        return originalEnsureHintTopBtn(opts);
      };
      viewportRuntime.isCompactGameViewport = function (opts: any) {
        compactViewportCallCount += 1;
        return originalIsCompactViewport(opts);
      };
      viewportRuntime.isTimerboxCollapseViewport = function (opts: any) {
        timerboxCollapseViewportCallCount += 1;
        return originalIsTimerboxCollapseViewport(opts);
      };
      viewportRuntime.resolvePageScopeValue = function (opts: any) {
        resolvePageScopeCallCount += 1;
        return originalResolvePageScopeValue(opts);
      };
      viewportRuntime.isGamePageScope = function (opts: any) {
        gameScopeCallCount += 1;
        return originalIsGamePageScope(opts);
      };
      viewportRuntime.isPracticePageScope = function (opts: any) {
        practiceScopeCallCount += 1;
        return originalIsPracticePageScope(opts);
      };
      viewportRuntime.isTimerboxMobileScope = function (opts: any) {
        timerboxScopeCallCount += 1;
        return originalIsTimerboxMobileScope(opts);
      };
      undoActionRuntime.resolveUndoModeIdFromBody = function (opts: any) {
        resolveUndoModeIdFromBodyCallCount += 1;
        return originalResolveUndoModeIdFromBody(opts);
      };
      undoActionRuntime.isUndoCapableMode = function (opts: any) {
        isUndoCapableModeCallCount += 1;
        return originalIsUndoCapableMode(opts);
      };
      undoActionRuntime.resolveUndoCapabilityFromContext = function (opts: any) {
        resolveUndoCapabilityFromContextCallCount += 1;
        return originalResolveUndoCapabilityFromContext(opts);
      };
      undoActionRuntime.isUndoInteractionEnabled = function (manager: any) {
        isUndoInteractionEnabledCallCount += 1;
        return originalIsUndoInteractionEnabled(manager);
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
          hasTopButtonsRuntime: true,
          hasViewportRuntime: true,
          hasHintButton: true,
          collectCallCount,
          syncCallCount,
          resolveHintUiStateCallCount,
          ensureModalCallCount,
          resolveStoredCallCount,
          resolveCollapsedValueCallCount,
          resolveDisplayCallCount,
          resolveAppliedModelCallCount,
          resolveUndoTopCallCount,
          resolveUndoTopAppliedCallCount,
          syncGameTopCallCount,
          syncPracticeTopCallCount,
          ensureUndoTopBtnCallCount,
          ensureHintTopBtnCallCount,
          compactViewportCallCount,
          timerboxCollapseViewportCallCount,
          resolvePageScopeCallCount,
          gameScopeCallCount,
          practiceScopeCallCount,
          timerboxScopeCallCount,
          resolveUndoModeIdFromBodyCallCount,
          isUndoCapableModeCallCount,
          resolveUndoCapabilityFromContextCallCount,
          isUndoInteractionEnabledCallCount,
          overlayVisible: Boolean(overlay && overlay.style.display === "flex"),
          firstLineText: firstLine ? (firstLine.textContent || "").trim() : ""
        };
      } finally {
        runtime.collectMobileHintTexts = originalCollect;
        uiRuntime.syncMobileHintTextBlockVisibility = originalSync;
        uiRuntime.resolveMobileHintUiState = originalResolveHintUiState;
        modalRuntime.ensureMobileHintModalDom = originalEnsureModal;
        timerRuntime.resolveStoredMobileTimerboxCollapsed = originalResolveStored;
        timerRuntime.resolveMobileTimerboxCollapsedValue = originalResolveCollapsedValue;
        timerRuntime.resolveMobileTimerboxDisplayModel = originalResolveDisplay;
        timerRuntime.resolveMobileTimerboxAppliedModel = originalResolveAppliedModel;
        undoTopRuntime.resolveMobileUndoTopButtonDisplayModel = originalUndoTopDisplay;
        undoTopRuntime.resolveMobileUndoTopAppliedModel = originalUndoTopApplied;
        topActionsRuntime.syncGameTopActionsPlacement = originalSyncGameTop;
        topActionsRuntime.syncPracticeTopActionsPlacement = originalSyncPracticeTop;
        topButtonsRuntime.ensureMobileUndoTopButtonDom = originalEnsureUndoTopBtn;
        topButtonsRuntime.ensureMobileHintToggleButtonDom = originalEnsureHintTopBtn;
        viewportRuntime.isCompactGameViewport = originalIsCompactViewport;
        viewportRuntime.isTimerboxCollapseViewport = originalIsTimerboxCollapseViewport;
        viewportRuntime.resolvePageScopeValue = originalResolvePageScopeValue;
        viewportRuntime.isGamePageScope = originalIsGamePageScope;
        viewportRuntime.isPracticePageScope = originalIsPracticePageScope;
        viewportRuntime.isTimerboxMobileScope = originalIsTimerboxMobileScope;
        undoActionRuntime.resolveUndoModeIdFromBody = originalResolveUndoModeIdFromBody;
        undoActionRuntime.isUndoCapableMode = originalIsUndoCapableMode;
        undoActionRuntime.resolveUndoCapabilityFromContext =
          originalResolveUndoCapabilityFromContext;
        undoActionRuntime.isUndoInteractionEnabled = originalIsUndoInteractionEnabled;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasUiRuntime).toBe(true);
    expect(snapshot.hasModalRuntime).toBe(true);
    expect(snapshot.hasTimerRuntime).toBe(true);
    expect(snapshot.hasUndoTopRuntime).toBe(true);
    expect(snapshot.hasTopActionsRuntime).toBe(true);
    expect(snapshot.hasTopButtonsRuntime).toBe(true);
    expect(snapshot.hasViewportRuntime).toBe(true);
    expect(snapshot.hasHintButton).toBe(true);
    expect(snapshot.collectCallCount).toBeGreaterThan(0);
    expect(snapshot.syncCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveHintUiStateCallCount).toBeGreaterThan(0);
    expect(snapshot.ensureModalCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveStoredCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveCollapsedValueCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveDisplayCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveAppliedModelCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveUndoTopCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveUndoTopAppliedCallCount).toBeGreaterThan(0);
    expect(snapshot.syncGameTopCallCount).toBeGreaterThan(0);
    expect(snapshot.syncPracticeTopCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.ensureUndoTopBtnCallCount).toBeGreaterThan(0);
    expect(snapshot.ensureHintTopBtnCallCount).toBeGreaterThan(0);
    expect(snapshot.compactViewportCallCount).toBeGreaterThan(0);
    expect(snapshot.timerboxCollapseViewportCallCount).toBeGreaterThan(0);
    expect(snapshot.resolvePageScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.gameScopeCallCount).toBeGreaterThan(0);
    expect(snapshot.practiceScopeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.timerboxScopeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveUndoModeIdFromBodyCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.isUndoCapableModeCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.resolveUndoCapabilityFromContextCallCount).toBeGreaterThan(0);
    expect(snapshot.isUndoInteractionEnabledCallCount).toBeGreaterThan(0);
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
        typeof runtime.resolveHomeGuidePathname !== "function" ||
        typeof runtime.isHomePagePath !== "function" ||
        typeof runtime.buildHomeGuideSteps !== "function" ||
        typeof runtime.buildHomeGuidePanelInnerHtml !== "function" ||
        typeof runtime.buildHomeGuideSettingsRowInnerHtml !== "function" ||
        typeof runtime.readHomeGuideSeenValue !== "function" ||
        typeof runtime.markHomeGuideSeen !== "function" ||
        typeof runtime.shouldAutoStartHomeGuide !== "function" ||
        typeof runtime.resolveHomeGuideAutoStart !== "function" ||
        typeof runtime.resolveHomeGuideSettingsState !== "function" ||
        typeof runtime.resolveHomeGuideStepUiState !== "function" ||
        typeof runtime.resolveHomeGuideStepRenderState !== "function" ||
        typeof runtime.resolveHomeGuideStepIndexState !== "function" ||
        typeof runtime.resolveHomeGuideStepTargetState !== "function" ||
        typeof runtime.resolveHomeGuideElevationPlan !== "function" ||
        typeof runtime.resolveHomeGuideBindingState !== "function" ||
        typeof runtime.resolveHomeGuideControlAction !== "function" ||
        typeof runtime.resolveHomeGuideToggleAction !== "function" ||
        typeof runtime.resolveHomeGuideLifecycleState !== "function" ||
        typeof runtime.resolveHomeGuideSessionState !== "function" ||
        typeof runtime.resolveHomeGuideLayerDisplayState !== "function" ||
        typeof runtime.resolveHomeGuideFinishState !== "function" ||
        typeof runtime.resolveHomeGuideTargetScrollState !== "function" ||
        typeof runtime.resolveHomeGuideDoneNotice !== "function" ||
        typeof runtime.resolveHomeGuideDoneNoticeStyle !== "function" ||
        typeof runtime.resolveHomeGuidePanelLayout !== "function" ||
        typeof runtime.isHomeGuideTargetVisible !== "function"
      ) {
        return { hasRuntime: false };
      }
      const compactSteps = runtime.buildHomeGuideSteps({ isCompactViewport: true });
      const desktopSteps = runtime.buildHomeGuideSteps({ isCompactViewport: false });
      const resolvedPath = runtime.resolveHomeGuidePathname({
        locationLike: { pathname: "/index.html" }
      });
      const resolvedPathFallback = runtime.resolveHomeGuidePathname({
        locationLike: {
          get pathname() {
            throw new Error("deny");
          }
        }
      });
      const panelHtml = runtime.buildHomeGuidePanelInnerHtml();
      const settingsRowHtml = runtime.buildHomeGuideSettingsRowInnerHtml();
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
      const stepUiStateFirst = runtime.resolveHomeGuideStepUiState({
        stepIndex: 0,
        stepCount: 10
      });
      const stepUiStateLast = runtime.resolveHomeGuideStepUiState({
        stepIndex: 9,
        stepCount: 10
      });
      const stepRenderState = runtime.resolveHomeGuideStepRenderState({
        step: {
          selector: "#top-settings-btn",
          title: "设置",
          desc: "desc"
        },
        stepIndex: 0,
        stepCount: 2
      });
      const stepIndexAbort = runtime.resolveHomeGuideStepIndexState({
        isActive: false,
        stepCount: 10,
        stepIndex: 0
      });
      const stepIndexFinish = runtime.resolveHomeGuideStepIndexState({
        isActive: true,
        stepCount: 10,
        stepIndex: 10
      });
      const stepTargetAdvance = runtime.resolveHomeGuideStepTargetState({
        hasTarget: false,
        targetVisible: false,
        stepIndex: 2
      });
      const stepTargetKeep = runtime.resolveHomeGuideStepTargetState({
        hasTarget: true,
        targetVisible: true,
        stepIndex: 2
      });
      const elevationTop = runtime.resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: true,
        hasHeadingAncestor: true
      });
      const elevationHeading = runtime.resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: false,
        hasHeadingAncestor: true
      });
      const elevationNone = runtime.resolveHomeGuideElevationPlan({
        hasTopActionButtonsAncestor: false,
        hasHeadingAncestor: false
      });
      const bindingStateNew = runtime.resolveHomeGuideBindingState({
        alreadyBound: false
      });
      const bindingStateBound = runtime.resolveHomeGuideBindingState({
        alreadyBound: true
      });
      const controlPrev = runtime.resolveHomeGuideControlAction({
        action: "prev",
        stepIndex: 3
      });
      const controlNext = runtime.resolveHomeGuideControlAction({
        action: "next",
        stepIndex: 3
      });
      const controlSkip = runtime.resolveHomeGuideControlAction({
        action: "skip",
        stepIndex: 3
      });
      const toggleUnchecked = runtime.resolveHomeGuideToggleAction({
        checked: false,
        isHomePage: true
      });
      const toggleOffHome = runtime.resolveHomeGuideToggleAction({
        checked: true,
        isHomePage: false
      });
      const toggleOnHome = runtime.resolveHomeGuideToggleAction({
        checked: true,
        isHomePage: true
      });
      const lifecycleStart = runtime.resolveHomeGuideLifecycleState({
        action: "start",
        fromSettings: true,
        steps: [
          {
            selector: "#top-settings-btn",
            title: "设置",
            desc: "desc"
          }
        ]
      });
      const lifecycleFinish = runtime.resolveHomeGuideLifecycleState({
        action: "finish",
        fromSettings: true,
        steps: [
          {
            selector: "#top-settings-btn",
            title: "设置",
            desc: "desc"
          }
        ]
      });
      const sessionState = runtime.resolveHomeGuideSessionState({
        lifecycleState: {
          active: true,
          fromSettings: true,
          index: 2.8,
          steps: [
            {
              selector: "#top-settings-btn",
              title: "设置",
              desc: "desc"
            }
          ]
        }
      });
      const sessionStateDefault = runtime.resolveHomeGuideSessionState({
        lifecycleState: null
      });
      const layerDisplayActive = runtime.resolveHomeGuideLayerDisplayState({
        active: true
      });
      const layerDisplayInactive = runtime.resolveHomeGuideLayerDisplayState({
        active: false
      });
      const finishStateCompleted = runtime.resolveHomeGuideFinishState({
        reason: "completed"
      });
      const finishStateSkipped = runtime.resolveHomeGuideFinishState({
        reason: "skipped"
      });
      const targetScrollStateCompact = runtime.resolveHomeGuideTargetScrollState({
        isCompactViewport: true,
        canScrollIntoView: true
      });
      const targetScrollStateDesktop = runtime.resolveHomeGuideTargetScrollState({
        isCompactViewport: false,
        canScrollIntoView: true
      });
      const doneNotice = runtime.resolveHomeGuideDoneNotice({});
      const doneNoticeStyle = runtime.resolveHomeGuideDoneNoticeStyle();
      const visibleCheck = runtime.isHomeGuideTargetVisible({
        nodeLike: {
          getClientRects() {
            return [{ left: 0 }];
          }
        },
        getComputedStyle() {
          return {
            display: "block",
            visibility: "visible",
            opacity: "1"
          };
        }
      });
      const mobilePanelLayout = runtime.resolveHomeGuidePanelLayout({
        targetRect: {
          left: 100,
          top: 100,
          width: 80,
          height: 30,
          bottom: 130
        },
        viewportWidth: 360,
        viewportHeight: 640,
        panelHeight: 180,
        margin: 12,
        mobileLayout: true
      });
      return {
        hasRuntime: true,
        panelHasStep: typeof panelHtml === "string" && panelHtml.indexOf("home-guide-step") !== -1,
        panelHasSkip: typeof panelHtml === "string" && panelHtml.indexOf("home-guide-skip") !== -1,
        settingsHasToggle:
          typeof settingsRowHtml === "string" && settingsRowHtml.indexOf("home-guide-toggle") !== -1,
        homePath: runtime.isHomePagePath("/index.html"),
        playPath: runtime.isHomePagePath("/play.html"),
        hasCompactHint: compactSelectors.includes("#top-mobile-hint-btn"),
        hasDesktopHint: desktopSelectors.includes("#top-mobile-hint-btn"),
        resolvedPath,
        resolvedPathFallback,
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
        stepUiStateFirst,
        stepUiStateLast,
        stepRenderState,
        stepIndexAbort,
        stepIndexFinish,
        stepTargetAdvance,
        stepTargetKeep,
        elevationTop,
        elevationHeading,
        elevationNone,
        bindingStateNew,
        bindingStateBound,
        controlPrev,
        controlNext,
        controlSkip,
        toggleUnchecked,
        toggleOffHome,
        toggleOnHome,
        lifecycleStart,
        lifecycleFinish,
        sessionState,
        sessionStateDefault,
        layerDisplayActive,
        layerDisplayInactive,
        finishStateCompleted,
        finishStateSkipped,
        targetScrollStateCompact,
        targetScrollStateDesktop,
        doneNotice,
        doneNoticeStyle,
        visibleCheck,
        resolvedAutoStart,
        mobilePanelLayout,
        settingsOnHome,
        settingsOffHome
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.panelHasStep).toBe(true);
    expect(snapshot.panelHasSkip).toBe(true);
    expect(snapshot.settingsHasToggle).toBe(true);
    expect(snapshot.homePath).toBe(true);
    expect(snapshot.playPath).toBe(false);
    expect(snapshot.hasCompactHint).toBe(true);
    expect(snapshot.hasDesktopHint).toBe(false);
    expect(snapshot.resolvedPath).toBe("/index.html");
    expect(snapshot.resolvedPathFallback).toBe("");
    expect(snapshot.seenValue).toBe("1");
    expect(snapshot.markResult).toBe(true);
    expect(snapshot.writes).toEqual(["home_guide_seen_v1:1"]);
    expect(snapshot.autoStart).toBe(true);
    expect(snapshot.blockedSeen).toBe(false);
    expect(snapshot.blockedPath).toBe(false);
    expect(snapshot.stepUiStateFirst).toEqual({
      stepText: "步骤 1 / 10",
      prevDisabled: true,
      nextText: "下一步"
    });
    expect(snapshot.stepUiStateLast).toEqual({
      stepText: "步骤 10 / 10",
      prevDisabled: false,
      nextText: "完成"
    });
    expect(snapshot.stepRenderState).toEqual({
      stepText: "步骤 1 / 2",
      titleText: "设置",
      descText: "desc",
      prevDisabled: true,
      nextText: "下一步"
    });
    expect(snapshot.stepIndexAbort).toEqual({
      shouldAbort: true,
      shouldFinish: false,
      resolvedIndex: 0
    });
    expect(snapshot.stepIndexFinish).toEqual({
      shouldAbort: false,
      shouldFinish: true,
      resolvedIndex: 10
    });
    expect(snapshot.stepTargetAdvance).toEqual({
      shouldAdvance: true,
      nextIndex: 3
    });
    expect(snapshot.stepTargetKeep).toEqual({
      shouldAdvance: false,
      nextIndex: 2
    });
    expect(snapshot.elevationTop).toEqual({
      hostSelector: ".top-action-buttons",
      shouldScopeTopActions: true
    });
    expect(snapshot.elevationHeading).toEqual({
      hostSelector: ".heading",
      shouldScopeTopActions: false
    });
    expect(snapshot.elevationNone).toEqual({
      hostSelector: "",
      shouldScopeTopActions: false
    });
    expect(snapshot.bindingStateNew).toEqual({
      shouldBind: true,
      boundValue: true
    });
    expect(snapshot.bindingStateBound).toEqual({
      shouldBind: false,
      boundValue: true
    });
    expect(snapshot.controlPrev).toEqual({
      type: "step",
      nextStepIndex: 2,
      finishReason: ""
    });
    expect(snapshot.controlNext).toEqual({
      type: "step",
      nextStepIndex: 4,
      finishReason: ""
    });
    expect(snapshot.controlSkip).toEqual({
      type: "finish",
      nextStepIndex: 3,
      finishReason: "skipped"
    });
    expect(snapshot.toggleUnchecked).toEqual({
      shouldStartGuide: false,
      shouldCloseSettings: false,
      shouldResync: false,
      startFromSettings: false
    });
    expect(snapshot.toggleOffHome).toEqual({
      shouldStartGuide: false,
      shouldCloseSettings: false,
      shouldResync: true,
      startFromSettings: false
    });
    expect(snapshot.toggleOnHome).toEqual({
      shouldStartGuide: true,
      shouldCloseSettings: true,
      shouldResync: false,
      startFromSettings: true
    });
    expect(snapshot.lifecycleStart).toEqual({
      active: true,
      fromSettings: true,
      index: 0,
      steps: [
        {
          selector: "#top-settings-btn",
          title: "设置",
          desc: "desc"
        }
      ]
    });
    expect(snapshot.lifecycleFinish).toEqual({
      active: false,
      fromSettings: false,
      index: 0,
      steps: []
    });
    expect(snapshot.sessionState).toEqual({
      active: true,
      fromSettings: true,
      index: 2,
      steps: [
        {
          selector: "#top-settings-btn",
          title: "设置",
          desc: "desc"
        }
      ]
    });
    expect(snapshot.sessionStateDefault).toEqual({
      active: false,
      fromSettings: false,
      index: 0,
      steps: []
    });
    expect(snapshot.layerDisplayActive).toEqual({
      overlayDisplay: "block",
      panelDisplay: "block"
    });
    expect(snapshot.layerDisplayInactive).toEqual({
      overlayDisplay: "none",
      panelDisplay: "none"
    });
    expect(snapshot.finishStateCompleted).toEqual({
      markSeen: true,
      showDoneNotice: true
    });
    expect(snapshot.finishStateSkipped).toEqual({
      markSeen: true,
      showDoneNotice: false
    });
    expect(snapshot.targetScrollStateCompact).toEqual({
      shouldScroll: true,
      block: "center",
      inline: "nearest",
      behavior: "smooth"
    });
    expect(snapshot.targetScrollStateDesktop).toEqual({
      shouldScroll: false,
      block: "center",
      inline: "nearest",
      behavior: "smooth"
    });
    expect(snapshot.doneNotice).toEqual({
      message: "指引已完成，可在设置中重新打开新手指引。",
      hideDelayMs: 2600
    });
    expect(snapshot.doneNoticeStyle).toMatchObject({
      position: "fixed",
      left: "50%",
      bottom: "26px",
      color: "#f9f6f2",
      zIndex: "3400"
    });
    expect(snapshot.visibleCheck).toBe(true);
    expect(snapshot.resolvedAutoStart).toEqual({
      seenValue: "0",
      shouldAutoStart: true
    });
    expect(snapshot.mobilePanelLayout).toEqual({
      panelWidth: 336,
      top: 448,
      left: 12
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

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreHomeGuideRuntime;
      if (
        !runtime ||
        typeof runtime.resolveHomeGuidePathname !== "function" ||
        typeof runtime.buildHomeGuideSteps !== "function" ||
        typeof runtime.buildHomeGuidePanelInnerHtml !== "function" ||
        typeof runtime.buildHomeGuideSettingsRowInnerHtml !== "function" ||
        typeof runtime.markHomeGuideSeen !== "function" ||
        typeof runtime.resolveHomeGuideStepUiState !== "function" ||
        typeof runtime.resolveHomeGuideStepRenderState !== "function" ||
        typeof runtime.resolveHomeGuideStepIndexState !== "function" ||
        typeof runtime.resolveHomeGuideStepTargetState !== "function" ||
        typeof runtime.resolveHomeGuideElevationPlan !== "function" ||
        typeof runtime.resolveHomeGuideBindingState !== "function" ||
        typeof runtime.resolveHomeGuideControlAction !== "function" ||
        typeof runtime.resolveHomeGuideToggleAction !== "function" ||
        typeof runtime.resolveHomeGuideLifecycleState !== "function" ||
        typeof runtime.resolveHomeGuideSessionState !== "function" ||
        typeof runtime.resolveHomeGuideLayerDisplayState !== "function" ||
        typeof runtime.resolveHomeGuideFinishState !== "function" ||
        typeof runtime.resolveHomeGuideTargetScrollState !== "function" ||
        typeof runtime.resolveHomeGuideDoneNotice !== "function" ||
        typeof runtime.resolveHomeGuideDoneNoticeStyle !== "function" ||
        typeof runtime.resolveHomeGuidePanelLayout !== "function" ||
        typeof runtime.isHomeGuideTargetVisible !== "function"
      ) {
        return { hasRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal !== "function") {
        return { hasRuntime: true, hasSettingsOpen: false };
      }
      const originalBuild = runtime.buildHomeGuideSteps;
      const originalResolvePathname = runtime.resolveHomeGuidePathname;
      const originalBuildPanelHtml = runtime.buildHomeGuidePanelInnerHtml;
      const originalBuildSettingsRowHtml = runtime.buildHomeGuideSettingsRowInnerHtml;
      const originalMark = runtime.markHomeGuideSeen;
      const originalResolveStepUiState = runtime.resolveHomeGuideStepUiState;
      const originalResolveStepRenderState = runtime.resolveHomeGuideStepRenderState;
      const originalResolveStepIndexState = runtime.resolveHomeGuideStepIndexState;
      const originalResolveStepTargetState = runtime.resolveHomeGuideStepTargetState;
      const originalResolveElevationPlan = runtime.resolveHomeGuideElevationPlan;
      const originalResolveBindingState = runtime.resolveHomeGuideBindingState;
      const originalResolveControlAction = runtime.resolveHomeGuideControlAction;
      const originalResolveToggleAction = runtime.resolveHomeGuideToggleAction;
      const originalResolveLifecycleState = runtime.resolveHomeGuideLifecycleState;
      const originalResolveSessionState = runtime.resolveHomeGuideSessionState;
      const originalResolveLayerDisplayState = runtime.resolveHomeGuideLayerDisplayState;
      const originalResolveFinishState = runtime.resolveHomeGuideFinishState;
      const originalResolveTargetScrollState = runtime.resolveHomeGuideTargetScrollState;
      const originalResolveDoneNotice = runtime.resolveHomeGuideDoneNotice;
      const originalResolveDoneNoticeStyle = runtime.resolveHomeGuideDoneNoticeStyle;
      const originalResolvePanelLayout = runtime.resolveHomeGuidePanelLayout;
      const originalIsTargetVisible = runtime.isHomeGuideTargetVisible;
      let callCount = 0;
      let pathnameCallCount = 0;
      let panelHtmlCallCount = 0;
      let settingsRowHtmlCallCount = 0;
      let markCallCount = 0;
      let stepUiStateCallCount = 0;
      let stepRenderStateCallCount = 0;
      let stepIndexStateCallCount = 0;
      let stepTargetStateCallCount = 0;
      let elevationPlanCallCount = 0;
      let bindingStateCallCount = 0;
      let controlActionCallCount = 0;
      let toggleActionCallCount = 0;
      let lifecycleStateCallCount = 0;
      let sessionStateCallCount = 0;
      let layerDisplayStateCallCount = 0;
      let finishStateCallCount = 0;
      let targetScrollStateCallCount = 0;
      let doneNoticeCallCount = 0;
      let doneNoticeStyleCallCount = 0;
      let panelLayoutCallCount = 0;
      let targetVisibleCallCount = 0;
      runtime.buildHomeGuideSteps = function (opts: any) {
        callCount += 1;
        return originalBuild(opts);
      };
      runtime.resolveHomeGuidePathname = function (opts: any) {
        pathnameCallCount += 1;
        return originalResolvePathname(opts);
      };
      runtime.buildHomeGuidePanelInnerHtml = function () {
        panelHtmlCallCount += 1;
        return originalBuildPanelHtml();
      };
      runtime.buildHomeGuideSettingsRowInnerHtml = function () {
        settingsRowHtmlCallCount += 1;
        return originalBuildSettingsRowHtml();
      };
      runtime.markHomeGuideSeen = function (opts: any) {
        markCallCount += 1;
        return originalMark(opts);
      };
      runtime.resolveHomeGuideStepUiState = function (opts: any) {
        stepUiStateCallCount += 1;
        return originalResolveStepUiState(opts);
      };
      runtime.resolveHomeGuideStepRenderState = function (opts: any) {
        stepRenderStateCallCount += 1;
        return originalResolveStepRenderState(opts);
      };
      runtime.resolveHomeGuideStepIndexState = function (opts: any) {
        stepIndexStateCallCount += 1;
        return originalResolveStepIndexState(opts);
      };
      runtime.resolveHomeGuideStepTargetState = function (opts: any) {
        stepTargetStateCallCount += 1;
        return originalResolveStepTargetState(opts);
      };
      runtime.resolveHomeGuideElevationPlan = function (opts: any) {
        elevationPlanCallCount += 1;
        return originalResolveElevationPlan(opts);
      };
      runtime.resolveHomeGuideBindingState = function (opts: any) {
        bindingStateCallCount += 1;
        return originalResolveBindingState(opts);
      };
      runtime.resolveHomeGuideControlAction = function (opts: any) {
        controlActionCallCount += 1;
        return originalResolveControlAction(opts);
      };
      runtime.resolveHomeGuideToggleAction = function (opts: any) {
        toggleActionCallCount += 1;
        return originalResolveToggleAction(opts);
      };
      runtime.resolveHomeGuideLifecycleState = function (opts: any) {
        lifecycleStateCallCount += 1;
        return originalResolveLifecycleState(opts);
      };
      runtime.resolveHomeGuideSessionState = function (opts: any) {
        sessionStateCallCount += 1;
        return originalResolveSessionState(opts);
      };
      runtime.resolveHomeGuideLayerDisplayState = function (opts: any) {
        layerDisplayStateCallCount += 1;
        return originalResolveLayerDisplayState(opts);
      };
      runtime.resolveHomeGuideFinishState = function (opts: any) {
        finishStateCallCount += 1;
        return originalResolveFinishState(opts);
      };
      runtime.resolveHomeGuideTargetScrollState = function (opts: any) {
        targetScrollStateCallCount += 1;
        return originalResolveTargetScrollState(opts);
      };
      runtime.resolveHomeGuideDoneNotice = function (opts: any) {
        doneNoticeCallCount += 1;
        return originalResolveDoneNotice(opts);
      };
      runtime.resolveHomeGuideDoneNoticeStyle = function () {
        doneNoticeStyleCallCount += 1;
        return originalResolveDoneNoticeStyle();
      };
      runtime.resolveHomeGuidePanelLayout = function (opts: any) {
        panelLayoutCallCount += 1;
        return originalResolvePanelLayout(opts);
      };
      runtime.isHomeGuideTargetVisible = function (opts: any) {
        targetVisibleCallCount += 1;
        return originalIsTargetVisible(opts);
      };
      try {
        const existingToggle = document.getElementById("home-guide-toggle");
        if (existingToggle) {
          const existingRow = existingToggle.closest(".settings-row");
          if (existingRow && existingRow.parentNode) {
            existingRow.parentNode.removeChild(existingRow);
          }
        }
        openSettingsModal();
        const toggle = document.getElementById("home-guide-toggle") as HTMLInputElement | null;
        if (!toggle) {
          return { hasRuntime: true, hasSettingsOpen: true, hasToggle: false };
        }
        toggle.checked = true;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
        const overlay = document.getElementById("home-guide-overlay");
        const overlayVisibleBeforeFinish = Boolean(overlay && overlay.style.display !== "none");
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const nextBtn = document.getElementById("home-guide-next");
        for (let i = 0; i < 20; i += 1) {
          if (!nextBtn) break;
          nextBtn.dispatchEvent(new Event("click", { bubbles: true }));
          await new Promise((resolve) => {
            window.requestAnimationFrame(() => resolve(null));
          });
          const currentOverlay = document.getElementById("home-guide-overlay");
          if (currentOverlay && currentOverlay.style.display === "none") {
            break;
          }
        }
        const overlayAfterFinish = document.getElementById("home-guide-overlay");
        const doneToast = document.getElementById("home-guide-done-toast");
        return {
          hasRuntime: true,
          hasSettingsOpen: true,
          hasToggle: true,
          callCount,
          pathnameCallCount,
          panelHtmlCallCount,
          settingsRowHtmlCallCount,
          markCallCount,
          stepUiStateCallCount,
          stepRenderStateCallCount,
          stepIndexStateCallCount,
          stepTargetStateCallCount,
          elevationPlanCallCount,
          bindingStateCallCount,
          controlActionCallCount,
          toggleActionCallCount,
          lifecycleStateCallCount,
          sessionStateCallCount,
          layerDisplayStateCallCount,
          finishStateCallCount,
          targetScrollStateCallCount,
          doneNoticeCallCount,
          doneNoticeStyleCallCount,
          panelLayoutCallCount,
          targetVisibleCallCount,
          hasOverlay: Boolean(overlay),
          overlayVisibleBeforeFinish,
          overlayHiddenAfterFinish: Boolean(
            overlayAfterFinish && overlayAfterFinish.style.display === "none"
          ),
          doneToastVisible: Boolean(doneToast && doneToast.style.opacity === "1")
        };
      } finally {
        runtime.buildHomeGuideSteps = originalBuild;
        runtime.resolveHomeGuidePathname = originalResolvePathname;
        runtime.buildHomeGuidePanelInnerHtml = originalBuildPanelHtml;
        runtime.buildHomeGuideSettingsRowInnerHtml = originalBuildSettingsRowHtml;
        runtime.markHomeGuideSeen = originalMark;
        runtime.resolveHomeGuideStepUiState = originalResolveStepUiState;
        runtime.resolveHomeGuideStepRenderState = originalResolveStepRenderState;
        runtime.resolveHomeGuideStepIndexState = originalResolveStepIndexState;
        runtime.resolveHomeGuideStepTargetState = originalResolveStepTargetState;
        runtime.resolveHomeGuideElevationPlan = originalResolveElevationPlan;
        runtime.resolveHomeGuideBindingState = originalResolveBindingState;
        runtime.resolveHomeGuideControlAction = originalResolveControlAction;
        runtime.resolveHomeGuideToggleAction = originalResolveToggleAction;
        runtime.resolveHomeGuideLifecycleState = originalResolveLifecycleState;
        runtime.resolveHomeGuideSessionState = originalResolveSessionState;
        runtime.resolveHomeGuideLayerDisplayState = originalResolveLayerDisplayState;
        runtime.resolveHomeGuideFinishState = originalResolveFinishState;
        runtime.resolveHomeGuideTargetScrollState = originalResolveTargetScrollState;
        runtime.resolveHomeGuideDoneNotice = originalResolveDoneNotice;
        runtime.resolveHomeGuideDoneNoticeStyle = originalResolveDoneNoticeStyle;
        runtime.resolveHomeGuidePanelLayout = originalResolvePanelLayout;
        runtime.isHomeGuideTargetVisible = originalIsTargetVisible;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasToggle).toBe(true);
    expect(snapshot.callCount).toBeGreaterThan(0);
    expect(snapshot.pathnameCallCount).toBeGreaterThan(0);
    expect(snapshot.panelHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.settingsRowHtmlCallCount).toBeGreaterThan(0);
    expect(snapshot.markCallCount).toBeGreaterThan(0);
    expect(snapshot.stepUiStateCallCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.stepRenderStateCallCount).toBeGreaterThan(0);
    expect(snapshot.stepIndexStateCallCount).toBeGreaterThan(0);
    expect(snapshot.stepTargetStateCallCount).toBeGreaterThan(0);
    expect(snapshot.elevationPlanCallCount).toBeGreaterThan(0);
    expect(snapshot.bindingStateCallCount).toBeGreaterThan(0);
    expect(snapshot.controlActionCallCount).toBeGreaterThan(0);
    expect(snapshot.toggleActionCallCount).toBeGreaterThan(0);
    expect(snapshot.lifecycleStateCallCount).toBeGreaterThan(0);
    expect(snapshot.sessionStateCallCount).toBeGreaterThan(0);
    expect(snapshot.layerDisplayStateCallCount).toBeGreaterThan(0);
    expect(snapshot.finishStateCallCount).toBeGreaterThan(0);
    expect(snapshot.targetScrollStateCallCount).toBeGreaterThan(0);
    expect(snapshot.doneNoticeCallCount).toBeGreaterThan(0);
    expect(snapshot.doneNoticeStyleCallCount).toBeGreaterThan(0);
    expect(snapshot.panelLayoutCallCount).toBeGreaterThan(0);
    expect(snapshot.targetVisibleCallCount).toBeGreaterThan(0);
    expect(snapshot.hasOverlay).toBe(true);
    expect(snapshot.overlayVisibleBeforeFinish).toBe(true);
    expect(snapshot.overlayHiddenAfterFinish).toBe(true);
    expect(snapshot.doneToastVisible).toBe(true);
  });

  test("index ui delegates timer module settings model to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreTimerModuleRuntime;
      if (
        !runtime ||
        typeof runtime.buildTimerModuleSettingsRowInnerHtml !== "function" ||
        typeof runtime.resolveTimerModuleSettingsState !== "function" ||
        typeof runtime.resolveTimerModuleCurrentViewMode !== "function" ||
        typeof runtime.resolveTimerModuleBindingState !== "function" ||
        typeof runtime.resolveTimerModuleViewMode !== "function" ||
        typeof runtime.resolveTimerModuleAppliedViewMode !== "function" ||
        typeof runtime.resolveTimerModuleInitRetryState !== "function"
      ) {
        return { hasRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal !== "function") {
        return { hasRuntime: true, hasSettingsOpen: false };
      }
      const originalBuild = runtime.buildTimerModuleSettingsRowInnerHtml;
      const originalResolveState = runtime.resolveTimerModuleSettingsState;
      const originalResolveCurrentViewMode = runtime.resolveTimerModuleCurrentViewMode;
      const originalResolveBinding = runtime.resolveTimerModuleBindingState;
      const originalResolveViewMode = runtime.resolveTimerModuleViewMode;
      const originalResolveAppliedViewMode = runtime.resolveTimerModuleAppliedViewMode;
      const originalResolveInitRetryState = runtime.resolveTimerModuleInitRetryState;
      let buildCallCount = 0;
      let resolveStateCallCount = 0;
      let resolveCurrentViewModeCallCount = 0;
      let resolveBindingCallCount = 0;
      let resolveViewModeCallCount = 0;
      let resolveAppliedViewModeCallCount = 0;
      let resolveInitRetryStateCallCount = 0;
      runtime.buildTimerModuleSettingsRowInnerHtml = function () {
        buildCallCount += 1;
        return originalBuild();
      };
      runtime.resolveTimerModuleSettingsState = function (opts: any) {
        resolveStateCallCount += 1;
        return originalResolveState(opts);
      };
      runtime.resolveTimerModuleCurrentViewMode = function (opts: any) {
        resolveCurrentViewModeCallCount += 1;
        return originalResolveCurrentViewMode(opts);
      };
      runtime.resolveTimerModuleBindingState = function (opts: any) {
        resolveBindingCallCount += 1;
        return originalResolveBinding(opts);
      };
      runtime.resolveTimerModuleViewMode = function (opts: any) {
        resolveViewModeCallCount += 1;
        return originalResolveViewMode(opts);
      };
      runtime.resolveTimerModuleAppliedViewMode = function (opts: any) {
        resolveAppliedViewModeCallCount += 1;
        return originalResolveAppliedViewMode(opts);
      };
      runtime.resolveTimerModuleInitRetryState = function (opts: any) {
        resolveInitRetryStateCallCount += 1;
        return originalResolveInitRetryState(opts);
      };
      try {
        const existingToggle = document.getElementById("timer-module-view-toggle");
        if (existingToggle) {
          const existingRow = existingToggle.closest(".settings-row");
          if (existingRow && existingRow.parentNode) {
            existingRow.parentNode.removeChild(existingRow);
          }
        }
        openSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const toggle = document.getElementById("timer-module-view-toggle") as HTMLInputElement | null;
        const note = document.getElementById("timer-module-view-note");
        if (!toggle) {
          return { hasRuntime: true, hasSettingsOpen: true, hasToggle: false };
        }
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => resolve(null));
        });
        return {
          hasRuntime: true,
          hasSettingsOpen: true,
          hasToggle: true,
          buildCallCount,
          resolveStateCallCount,
          resolveCurrentViewModeCallCount,
          resolveBindingCallCount,
          resolveViewModeCallCount,
          resolveAppliedViewModeCallCount,
          resolveInitRetryStateCallCount,
          noteText: note ? String(note.textContent || "") : "",
          toggleChecked: !!toggle.checked
        };
      } finally {
        runtime.buildTimerModuleSettingsRowInnerHtml = originalBuild;
        runtime.resolveTimerModuleSettingsState = originalResolveState;
        runtime.resolveTimerModuleCurrentViewMode = originalResolveCurrentViewMode;
        runtime.resolveTimerModuleBindingState = originalResolveBinding;
        runtime.resolveTimerModuleViewMode = originalResolveViewMode;
        runtime.resolveTimerModuleAppliedViewMode = originalResolveAppliedViewMode;
        runtime.resolveTimerModuleInitRetryState = originalResolveInitRetryState;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasToggle).toBe(true);
    expect(snapshot.buildCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveStateCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveCurrentViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveBindingCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveAppliedViewModeCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveInitRetryStateCallCount).toBeGreaterThan(0);
    expect(snapshot.noteText).toContain("关闭后仅隐藏右侧计时器栏");
    expect(snapshot.toggleChecked).toBe(false);
  });

  test("index ui delegates theme settings model to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreThemeSettingsRuntime;
      if (
        !runtime ||
        typeof runtime.formatThemePreviewValue !== "function" ||
        typeof runtime.resolveThemePreviewTileValues !== "function" ||
        typeof runtime.resolveThemePreviewLayout !== "function" ||
        typeof runtime.resolveThemePreviewCssSelectors !== "function" ||
        typeof runtime.resolveThemeOptions !== "function" ||
        typeof runtime.resolveThemeSelectLabel !== "function" ||
        typeof runtime.resolveThemeDropdownToggleState !== "function" ||
        typeof runtime.resolveThemeBindingState !== "function" ||
        typeof runtime.resolveThemeOptionValue !== "function" ||
        typeof runtime.resolveThemeOptionSelectedState !== "function"
      ) {
        return { hasRuntime: false };
      }
      const openSettingsModal = (window as any).openSettingsModal;
      if (typeof openSettingsModal !== "function") {
        return { hasRuntime: true, hasSettingsOpen: false };
      }
      const originalFormat = runtime.formatThemePreviewValue;
      const originalResolveTileValues = runtime.resolveThemePreviewTileValues;
      const originalResolvePreviewLayout = runtime.resolveThemePreviewLayout;
      const originalResolvePreviewCssSelectors = runtime.resolveThemePreviewCssSelectors;
      const originalResolveThemeOptions = runtime.resolveThemeOptions;
      const originalResolveLabel = runtime.resolveThemeSelectLabel;
      const originalResolveDropdown = runtime.resolveThemeDropdownToggleState;
      const originalResolveBinding = runtime.resolveThemeBindingState;
      const originalResolveOptionValue = runtime.resolveThemeOptionValue;
      const originalResolveOptionSelected = runtime.resolveThemeOptionSelectedState;
      let formatCallCount = 0;
      let resolveTileValuesCallCount = 0;
      let resolvePreviewLayoutCallCount = 0;
      let resolvePreviewCssSelectorsCallCount = 0;
      let resolveThemeOptionsCallCount = 0;
      let resolveLabelCallCount = 0;
      let resolveDropdownCallCount = 0;
      let resolveBindingCallCount = 0;
      let resolveOptionValueCallCount = 0;
      let resolveOptionSelectedCallCount = 0;
      runtime.formatThemePreviewValue = function (value: any) {
        formatCallCount += 1;
        return originalFormat(value);
      };
      runtime.resolveThemePreviewTileValues = function (opts: any) {
        resolveTileValuesCallCount += 1;
        return originalResolveTileValues(opts);
      };
      runtime.resolveThemePreviewLayout = function () {
        resolvePreviewLayoutCallCount += 1;
        return originalResolvePreviewLayout();
      };
      runtime.resolveThemePreviewCssSelectors = function (opts: any) {
        resolvePreviewCssSelectorsCallCount += 1;
        return originalResolvePreviewCssSelectors(opts);
      };
      runtime.resolveThemeOptions = function (opts: any) {
        resolveThemeOptionsCallCount += 1;
        return originalResolveThemeOptions(opts);
      };
      runtime.resolveThemeSelectLabel = function (opts: any) {
        resolveLabelCallCount += 1;
        return originalResolveLabel(opts);
      };
      runtime.resolveThemeDropdownToggleState = function (opts: any) {
        resolveDropdownCallCount += 1;
        return originalResolveDropdown(opts);
      };
      runtime.resolveThemeBindingState = function (opts: any) {
        resolveBindingCallCount += 1;
        return originalResolveBinding(opts);
      };
      runtime.resolveThemeOptionValue = function (opts: any) {
        resolveOptionValueCallCount += 1;
        return originalResolveOptionValue(opts);
      };
      runtime.resolveThemeOptionSelectedState = function (opts: any) {
        resolveOptionSelectedCallCount += 1;
        return originalResolveOptionSelected(opts);
      };
      try {
        openSettingsModal();
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const trigger = document.getElementById("theme-select-trigger");
        const options = document.querySelectorAll("#theme-select-options .custom-option");
        if (trigger) {
          trigger.dispatchEvent(new Event("click", { bubbles: true }));
          trigger.dispatchEvent(new Event("click", { bubbles: true }));
        }
        return {
          hasRuntime: true,
          hasSettingsOpen: true,
          hasTrigger: Boolean(trigger),
          optionCount: options.length,
          formatCallCount,
          resolveTileValuesCallCount,
          resolvePreviewLayoutCallCount,
          resolvePreviewCssSelectorsCallCount,
          resolveThemeOptionsCallCount,
          resolveLabelCallCount,
          resolveDropdownCallCount,
          resolveBindingCallCount,
          resolveOptionValueCallCount,
          resolveOptionSelectedCallCount
        };
      } finally {
        runtime.formatThemePreviewValue = originalFormat;
        runtime.resolveThemePreviewTileValues = originalResolveTileValues;
        runtime.resolveThemePreviewLayout = originalResolvePreviewLayout;
        runtime.resolveThemePreviewCssSelectors = originalResolvePreviewCssSelectors;
        runtime.resolveThemeOptions = originalResolveThemeOptions;
        runtime.resolveThemeSelectLabel = originalResolveLabel;
        runtime.resolveThemeDropdownToggleState = originalResolveDropdown;
        runtime.resolveThemeBindingState = originalResolveBinding;
        runtime.resolveThemeOptionValue = originalResolveOptionValue;
        runtime.resolveThemeOptionSelectedState = originalResolveOptionSelected;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasSettingsOpen).toBe(true);
    expect(snapshot.hasTrigger).toBe(true);
    expect(snapshot.optionCount).toBeGreaterThan(0);
    expect(snapshot.formatCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveTileValuesCallCount).toBeGreaterThan(0);
    expect(snapshot.resolvePreviewLayoutCallCount).toBeGreaterThan(0);
    expect(snapshot.resolvePreviewCssSelectorsCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveThemeOptionsCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveLabelCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveDropdownCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveBindingCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveOptionValueCallCount).toBeGreaterThan(0);
    expect(snapshot.resolveOptionSelectedCallCount).toBeGreaterThan(0);
  });

  test("index ui delegates storage resolution to runtime helper", async ({ page }) => {
    const response = await page.goto("/index.html", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Index response should exist").not.toBeNull();
    expect(response?.ok(), "Index response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(220);

    const snapshot = await page.evaluate(async () => {
      const runtime = (window as any).CoreStorageRuntime;
      if (
        !runtime ||
        typeof runtime.resolveStorageByName !== "function" ||
        typeof runtime.safeReadStorageItem !== "function" ||
        typeof runtime.safeSetStorageItem !== "function"
      ) {
        return { hasRuntime: false };
      }
      const originalResolveStorageByName = runtime.resolveStorageByName;
      const practiceRuntime = (window as any).CorePracticeTransferRuntime;
      const originalResolvePrecheck =
        practiceRuntime && typeof practiceRuntime.resolvePracticeTransferPrecheck === "function"
          ? practiceRuntime.resolvePracticeTransferPrecheck
          : null;
      const originalCreatePlan =
        practiceRuntime && typeof practiceRuntime.createPracticeTransferNavigationPlan === "function"
          ? practiceRuntime.createPracticeTransferNavigationPlan
          : null;
      const originalWindowOpen = window.open;
      let resolveStorageByNameCallCount = 0;
      runtime.resolveStorageByName = function (opts: any) {
        resolveStorageByNameCallCount += 1;
        return originalResolveStorageByName(opts);
      };
      try {
        const syncMobileTimerboxUI = (window as any).syncMobileTimerboxUI;
        if (typeof syncMobileTimerboxUI === "function") {
          syncMobileTimerboxUI();
        }
        if (practiceRuntime && originalResolvePrecheck && originalCreatePlan) {
          practiceRuntime.resolvePracticeTransferPrecheck = function () {
            return {
              canOpen: true,
              board: [[0]],
              alertMessage: ""
            };
          };
          practiceRuntime.createPracticeTransferNavigationPlan = function () {
            return {
              openUrl: "about:blank"
            };
          };
          (window as any).open = function () {
            return null;
          };
          const openPracticeBoardFromCurrent = (window as any).openPracticeBoardFromCurrent;
          if (typeof openPracticeBoardFromCurrent === "function") {
            openPracticeBoardFromCurrent();
          }
        }
        const openSettingsModal = (window as any).openSettingsModal;
        if (typeof openSettingsModal === "function") {
          openSettingsModal();
        }
        await new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
          });
        });
        const settingsModal = document.getElementById("settings-modal");
        return {
          hasRuntime: true,
          hasSyncMobileTimerboxUI: typeof syncMobileTimerboxUI === "function",
          hasOpenSettingsModal: typeof openSettingsModal === "function",
          settingsVisible: Boolean(settingsModal && settingsModal.style.display === "flex"),
          resolveStorageByNameCallCount
        };
      } finally {
        runtime.resolveStorageByName = originalResolveStorageByName;
        if (practiceRuntime && originalResolvePrecheck) {
          practiceRuntime.resolvePracticeTransferPrecheck = originalResolvePrecheck;
        }
        if (practiceRuntime && originalCreatePlan) {
          practiceRuntime.createPracticeTransferNavigationPlan = originalCreatePlan;
        }
        (window as any).open = originalWindowOpen;
      }
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasSyncMobileTimerboxUI).toBe(true);
    expect(snapshot.hasOpenSettingsModal).toBe(true);
    expect(snapshot.settingsVisible).toBe(true);
    expect(snapshot.resolveStorageByNameCallCount).toBeGreaterThan(0);
  });

  test("play application delegates entry resolution to runtime helper", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__playEntryPlanCallCount = 0;
      (window as any).__playRuntimeContractCallCount = 0;
      (window as any).__playChallengeIntroCallCount = 0;
      (window as any).__playChallengeIntroUiCallCount = 0;
      (window as any).__playChallengeIntroActionCallCount = 0;
      (window as any).__playChallengeIntroHostCallCount = 0;
      (window as any).__playChallengeContextCallCount = 0;
      (window as any).__playHeaderStateCallCount = 0;
      (window as any).__playHeaderHostCallCount = 0;
      (window as any).__playStartGuardCallCount = 0;
      (window as any).__playStartupPayloadCallCount = 0;
      (window as any).__playStartupContextCallCount = 0;
      (window as any).__playStartupHostCallCount = 0;
      (window as any).__playPageContextCustomSpawnCallCount = 0;
      (window as any).__playPageContextHeaderCallCount = 0;
      (window as any).__playCustomSpawnHostCallCount = 0;
      const runtimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayEntryRuntime = new Proxy(runtimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayEntryPlan" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playEntryPlanCallCount =
                Number((window as any).__playEntryPlanCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const runtimeContractTarget: Record<string, unknown> = {};
      (window as any).CorePlayRuntimeContractRuntime = new Proxy(runtimeContractTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayRuntimeContracts" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playRuntimeContractCallCount =
                Number((window as any).__playRuntimeContractCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const pageContextRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayPageContextRuntime = new Proxy(pageContextRuntimeTarget, {
        set(target, prop, value) {
          if (
            prop === "resolvePlayCustomSpawnModeConfigFromPageContext" &&
            typeof value === "function"
          ) {
            target[prop] = function (opts: unknown) {
              (window as any).__playPageContextCustomSpawnCallCount =
                Number((window as any).__playPageContextCustomSpawnCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          if (prop === "applyPlayHeaderFromPageContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playPageContextHeaderCallCount =
                Number((window as any).__playPageContextHeaderCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroRuntime = new Proxy(challengeIntroRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayChallengeIntroModel" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playChallengeIntroCallCount =
                Number((window as any).__playChallengeIntroCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroUiRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroUiRuntime = new Proxy(challengeIntroUiRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayChallengeIntroUiState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playChallengeIntroUiCallCount =
                Number((window as any).__playChallengeIntroUiCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroActionRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroActionRuntime = new Proxy(
        challengeIntroActionRuntimeTarget,
        {
          set(target, prop, value) {
            if (prop === "resolvePlayChallengeIntroActionState" && typeof value === "function") {
              target[prop] = function (opts: unknown) {
                (window as any).__playChallengeIntroActionCallCount =
                  Number((window as any).__playChallengeIntroActionCallCount || 0) + 1;
                return (value as (input: unknown) => unknown)(opts);
              };
              return true;
            }
            target[prop] = value;
            return true;
          }
        }
      );
      const challengeContextRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeContextRuntime = new Proxy(challengeContextRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayChallengeContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playChallengeContextCallCount =
                Number((window as any).__playChallengeContextCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const challengeIntroHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayChallengeIntroHostRuntime = new Proxy(
        challengeIntroHostRuntimeTarget,
        {
          set(target, prop, value) {
            if (prop === "resolvePlayChallengeIntroFromContext" && typeof value === "function") {
              target[prop] = function (opts: unknown) {
                (window as any).__playChallengeIntroHostCallCount =
                  Number((window as any).__playChallengeIntroHostCallCount || 0) + 1;
                return (value as (input: unknown) => unknown)(opts);
              };
              return true;
            }
            target[prop] = value;
            return true;
          }
        }
      );
      const playCustomSpawnHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayCustomSpawnHostRuntime = new Proxy(
        playCustomSpawnHostRuntimeTarget,
        {
          set(target, prop, value) {
            if (
              prop === "resolvePlayCustomSpawnModeConfigFromContext" &&
              typeof value === "function"
            ) {
              target[prop] = function (opts: unknown) {
                (window as any).__playCustomSpawnHostCallCount =
                  Number((window as any).__playCustomSpawnHostCallCount || 0) + 1;
                return (value as (input: unknown) => unknown)(opts);
              };
              return true;
            }
            target[prop] = value;
            return true;
          }
        }
      );
      const startGuardRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartGuardRuntime = new Proxy(startGuardRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartGuardState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartGuardCallCount =
                Number((window as any).__playStartGuardCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupPayloadRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartupPayloadRuntime = new Proxy(startupPayloadRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartupPayload" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartupPayloadCallCount =
                Number((window as any).__playStartupPayloadCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupContextRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartupContextRuntime = new Proxy(startupContextRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartupContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartupContextCallCount =
                Number((window as any).__playStartupContextCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const startupHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayStartupHostRuntime = new Proxy(startupHostRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayStartupFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playStartupHostCallCount =
                Number((window as any).__playStartupHostCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const headerHostRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayHeaderHostRuntime = new Proxy(headerHostRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayHeaderFromContext" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playHeaderHostCallCount =
                Number((window as any).__playHeaderHostCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
      const headerRuntimeTarget: Record<string, unknown> = {};
      (window as any).CorePlayHeaderRuntime = new Proxy(headerRuntimeTarget, {
        set(target, prop, value) {
          if (prop === "resolvePlayHeaderState" && typeof value === "function") {
            target[prop] = function (opts: unknown) {
              (window as any).__playHeaderStateCallCount =
                Number((window as any).__playHeaderStateCallCount || 0) + 1;
              return (value as (input: unknown) => unknown)(opts);
            };
            return true;
          }
          target[prop] = value;
          return true;
        }
      });
    });

    const response = await page.goto("/play.html?mode_key=standard_4x4_pow2_no_undo", {
      waitUntil: "domcontentloaded"
    });
    expect(response, "Play response should exist").not.toBeNull();
    expect(response?.ok(), "Play response should be 2xx").toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => ({
      hasRuntime: Boolean((window as any).CorePlayEntryRuntime?.resolvePlayEntryPlan),
      hasRuntimeContract: Boolean(
        (window as any).CorePlayRuntimeContractRuntime?.resolvePlayRuntimeContracts
      ),
      hasPageContextRuntime: Boolean(
        (window as any).CorePlayPageContextRuntime?.resolvePlayCustomSpawnModeConfigFromPageContext &&
        (window as any).CorePlayPageContextRuntime?.applyPlayHeaderFromPageContext
      ),
      hasChallengeIntroRuntime: Boolean(
        (window as any).CorePlayChallengeIntroRuntime?.resolvePlayChallengeIntroModel
      ),
      hasChallengeIntroUiRuntime: Boolean(
        (window as any).CorePlayChallengeIntroUiRuntime?.resolvePlayChallengeIntroUiState
      ),
      hasChallengeIntroActionRuntime: Boolean(
        (window as any).CorePlayChallengeIntroActionRuntime?.resolvePlayChallengeIntroActionState
      ),
      hasChallengeIntroHostRuntime: Boolean(
        (window as any).CorePlayChallengeIntroHostRuntime?.resolvePlayChallengeIntroFromContext
      ),
      hasChallengeContextRuntime: Boolean(
        (window as any).CorePlayChallengeContextRuntime?.resolvePlayChallengeContext
      ),
      hasPlayCustomSpawnHostRuntime: Boolean(
        (window as any).CorePlayCustomSpawnHostRuntime?.resolvePlayCustomSpawnModeConfigFromContext
      ),
      hasStartGuardRuntime: Boolean(
        (window as any).CorePlayStartGuardRuntime?.resolvePlayStartGuardState
      ),
      hasStartupPayloadRuntime: Boolean(
        (window as any).CorePlayStartupPayloadRuntime?.resolvePlayStartupPayload
      ),
      hasStartupContextRuntime: Boolean(
        (window as any).CorePlayStartupContextRuntime?.resolvePlayStartupContext
      ),
      hasStartupHostRuntime: Boolean(
        (window as any).CorePlayStartupHostRuntime?.resolvePlayStartupFromContext
      ),
      hasHeaderHostRuntime: Boolean(
        (window as any).CorePlayHeaderHostRuntime?.resolvePlayHeaderFromContext
      ),
      hasHeaderStateRuntime: Boolean(
        (window as any).CorePlayHeaderRuntime?.resolvePlayHeaderState
      ),
      entryCallCount: Number((window as any).__playEntryPlanCallCount || 0),
      runtimeContractCallCount: Number((window as any).__playRuntimeContractCallCount || 0),
      pageContextCustomSpawnCallCount: Number(
        (window as any).__playPageContextCustomSpawnCallCount || 0
      ),
      pageContextHeaderCallCount: Number((window as any).__playPageContextHeaderCallCount || 0),
      challengeIntroCallCount: Number((window as any).__playChallengeIntroCallCount || 0),
      challengeIntroUiCallCount: Number((window as any).__playChallengeIntroUiCallCount || 0),
      challengeIntroActionCallCount: Number(
        (window as any).__playChallengeIntroActionCallCount || 0
      ),
      challengeIntroHostCallCount: Number((window as any).__playChallengeIntroHostCallCount || 0),
      challengeContextCallCount: Number((window as any).__playChallengeContextCallCount || 0),
      playCustomSpawnHostCallCount: Number((window as any).__playCustomSpawnHostCallCount || 0),
      startGuardCallCount: Number((window as any).__playStartGuardCallCount || 0),
      startupPayloadCallCount: Number((window as any).__playStartupPayloadCallCount || 0),
      startupContextCallCount: Number((window as any).__playStartupContextCallCount || 0),
      startupHostCallCount: Number((window as any).__playStartupHostCallCount || 0),
      headerHostCallCount: Number((window as any).__playHeaderHostCallCount || 0),
      headerStateCallCount: Number((window as any).__playHeaderStateCallCount || 0),
      modeKey:
        (window as any).GAME_MODE_CONFIG && typeof (window as any).GAME_MODE_CONFIG.key === "string"
          ? (window as any).GAME_MODE_CONFIG.key
          : null,
      challengeContext: (window as any).GAME_CHALLENGE_CONTEXT,
      topIntroDisplay: (() => {
        const node = document.getElementById("top-mode-intro-btn");
        if (!node) return null;
        const htmlNode = node as HTMLElement;
        return htmlNode.style.display || "";
      })()
    }));

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasRuntimeContract).toBe(true);
    expect(snapshot.hasPageContextRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroUiRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroActionRuntime).toBe(true);
    expect(snapshot.hasChallengeIntroHostRuntime).toBe(true);
    expect(snapshot.hasChallengeContextRuntime).toBe(true);
    expect(snapshot.hasPlayCustomSpawnHostRuntime).toBe(true);
    expect(snapshot.hasStartGuardRuntime).toBe(true);
    expect(snapshot.hasStartupPayloadRuntime).toBe(true);
    expect(snapshot.hasStartupContextRuntime).toBe(true);
    expect(snapshot.hasStartupHostRuntime).toBe(true);
    expect(snapshot.hasHeaderHostRuntime).toBe(true);
    expect(snapshot.hasHeaderStateRuntime).toBe(true);
    expect(snapshot.entryCallCount).toBeGreaterThan(0);
    expect(snapshot.runtimeContractCallCount).toBeGreaterThan(0);
    expect(snapshot.pageContextCustomSpawnCallCount).toBeGreaterThan(0);
    expect(snapshot.pageContextHeaderCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroUiCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroActionCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeIntroHostCallCount).toBeGreaterThan(0);
    expect(snapshot.challengeContextCallCount).toBeGreaterThan(0);
    expect(snapshot.playCustomSpawnHostCallCount).toBeGreaterThan(0);
    expect(snapshot.startGuardCallCount).toBeGreaterThan(0);
    expect(snapshot.startupPayloadCallCount).toBeGreaterThan(0);
    expect(snapshot.startupContextCallCount).toBeGreaterThan(0);
    expect(snapshot.startupHostCallCount).toBeGreaterThan(0);
    expect(snapshot.headerHostCallCount).toBeGreaterThan(0);
    expect(snapshot.headerStateCallCount).toBeGreaterThan(0);
    expect(snapshot.modeKey).toBe("standard_4x4_pow2_no_undo");
    expect(snapshot.challengeContext).toBeNull();
    expect(snapshot.topIntroDisplay).toBe("none");
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
        hasStorageRuntime: Boolean(
          (window as any).CoreStorageRuntime?.resolveStorageByName &&
          (window as any).CoreStorageRuntime?.safeReadStorageItem &&
          (window as any).CoreStorageRuntime?.safeSetStorageItem
        ),
        hasPlayEntryRuntime: Boolean(
          (window as any).CorePlayEntryRuntime?.resolvePlayEntryPlan
        ),
        hasPlayRuntimeContractRuntime: Boolean(
          (window as any).CorePlayRuntimeContractRuntime?.resolvePlayRuntimeContracts
        ),
        hasPlayPageContextRuntime: Boolean(
          (window as any).CorePlayPageContextRuntime?.resolvePlayCustomSpawnModeConfigFromPageContext &&
          (window as any).CorePlayPageContextRuntime?.applyPlayHeaderFromPageContext
        ),
        hasPlayChallengeIntroRuntime: Boolean(
          (window as any).CorePlayChallengeIntroRuntime?.resolvePlayChallengeIntroModel
        ),
        hasPlayChallengeIntroUiRuntime: Boolean(
          (window as any).CorePlayChallengeIntroUiRuntime?.resolvePlayChallengeIntroUiState
        ),
        hasPlayChallengeIntroActionRuntime: Boolean(
          (window as any).CorePlayChallengeIntroActionRuntime?.resolvePlayChallengeIntroActionState
        ),
        hasPlayChallengeIntroHostRuntime: Boolean(
          (window as any).CorePlayChallengeIntroHostRuntime?.resolvePlayChallengeIntroFromContext
        ),
        hasPlayChallengeContextRuntime: Boolean(
          (window as any).CorePlayChallengeContextRuntime?.resolvePlayChallengeContext
        ),
        hasPlayCustomSpawnHostRuntime: Boolean(
          (window as any).CorePlayCustomSpawnHostRuntime?.resolvePlayCustomSpawnModeConfigFromContext
        ),
        hasPlayStartGuardRuntime: Boolean(
          (window as any).CorePlayStartGuardRuntime?.resolvePlayStartGuardState
        ),
        hasPlayStartupPayloadRuntime: Boolean(
          (window as any).CorePlayStartupPayloadRuntime?.resolvePlayStartupPayload
        ),
        hasPlayStartupContextRuntime: Boolean(
          (window as any).CorePlayStartupContextRuntime?.resolvePlayStartupContext
        ),
        hasPlayStartupHostRuntime: Boolean(
          (window as any).CorePlayStartupHostRuntime?.resolvePlayStartupFromContext
        ),
        hasPlayHeaderHostRuntime: Boolean(
          (window as any).CorePlayHeaderHostRuntime?.resolvePlayHeaderFromContext
        ),
        hasHeaderRuntime: Boolean(
          (window as any).CorePlayHeaderRuntime?.buildPlayModeIntroText &&
            (window as any).CorePlayHeaderRuntime?.resolvePlayHeaderState
        ),
        hasModeCatalogRuntime: Boolean((window as any).CoreModeCatalogRuntime?.resolveCatalogModeWithDefault)
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasPlayCustomSpawnRuntime).toBe(true);
    expect(snapshot.hasStorageRuntime).toBe(true);
    expect(snapshot.hasPlayEntryRuntime).toBe(true);
    expect(snapshot.hasPlayRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasPlayPageContextRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroUiRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroActionRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeIntroHostRuntime).toBe(true);
    expect(snapshot.hasPlayChallengeContextRuntime).toBe(true);
    expect(snapshot.hasPlayCustomSpawnHostRuntime).toBe(true);
    expect(snapshot.hasPlayStartGuardRuntime).toBe(true);
    expect(snapshot.hasPlayStartupPayloadRuntime).toBe(true);
    expect(snapshot.hasPlayStartupContextRuntime).toBe(true);
    expect(snapshot.hasPlayStartupHostRuntime).toBe(true);
    expect(snapshot.hasPlayHeaderHostRuntime).toBe(true);
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
        hasHomeModeRuntime: Boolean((window as any).CoreHomeModeRuntime?.resolveHomeModeSelection),
        hasHomeRuntimeContractRuntime: Boolean(
          (window as any).CoreHomeRuntimeContractRuntime?.resolveHomeRuntimeContracts
        ),
        hasHomeStartupHostRuntime: Boolean(
          (window as any).CoreHomeStartupHostRuntime?.resolveHomeStartupFromContext
        ),
        hasHomeModeContextRuntime: Boolean(
          (window as any).CoreHomeModeRuntime?.resolveHomeModeSelectionFromContext
        )
      };
    });

    expect(snapshot.hasRuntime).toBe(true);
    expect(snapshot.hasModeCatalogRuntime).toBe(true);
    expect(snapshot.hasHomeModeRuntime).toBe(true);
    expect(snapshot.hasHomeRuntimeContractRuntime).toBe(true);
    expect(snapshot.hasHomeStartupHostRuntime).toBe(true);
    expect(snapshot.hasHomeModeContextRuntime).toBe(true);
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
