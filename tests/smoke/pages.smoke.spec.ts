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
  { name: "history", path: "/history.html", expectGameManager: false, expectLegacyEngine: false, expectBootstrapRuntime: false, expectLegacyAdapterRuntime: false, expectLegacyAdapterIoRuntime: false, expectCoreAdapterShadowRuntime: false, expectCoreRulesRuntime: false, expectCoreModeRuntime: false, expectCoreSpecialRulesRuntime: false, expectCoreDirectionLockRuntime: false, expectCoreGridScanRuntime: false, expectCoreMoveScanRuntime: false, expectCoreMovePathRuntime: false, expectCoreScoringRuntime: false, expectCoreMergeEffectsRuntime: false, expectCorePostMoveRuntime: false, expectCoreMoveApplyRuntime: false, expectCorePostMoveRecordRuntime: false, expectCorePostUndoRecordRuntime: false, expectCoreUndoRestoreRuntime: false, expectCoreUndoSnapshotRuntime: false, expectCoreUndoTileSnapshotRuntime: false, expectCoreUndoTileRestoreRuntime: false, expectCoreUndoRestorePayloadRuntime: false, expectCoreUndoStackEntryRuntime: false, expectCoreReplayCodecRuntime: false, expectCoreReplayV4ActionsRuntime: false, expectCoreReplayLegacyRuntime: false, expectCoreReplayImportRuntime: false, expectCoreReplayExecutionRuntime: false, expectCoreReplayDispatchRuntime: false, expectCoreReplayLifecycleRuntime: false, expectCoreReplayTimerRuntime: false, expectCoreReplayFlowRuntime: false, expectCoreReplayControlRuntime: false, expectCoreReplayLoopRuntime: false }
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
              (window as any).CoreAdapterShadowRuntime?.buildAdapterSessionParityReport
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
        !manager ||
        typeof manager.publishAdapterMoveResult !== "function"
      ) {
        return null;
      }

      const before = payload.readAdapterParityState();
      const beforeReport = payload.readAdapterParityReport();
      manager.publishAdapterMoveResult({
        reason: "smoke-core-adapter",
        direction: 2,
        moved: true
      });
      const after = payload.readAdapterParityState();
      const afterReport = payload.readAdapterParityReport();
      return {
        payloadModeKey: payload.modeKey || "unknown",
        before,
        after,
        beforeReport,
        afterReport
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
  });
});
