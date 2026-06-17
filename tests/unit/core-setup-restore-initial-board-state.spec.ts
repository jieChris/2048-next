import { describe, expect, it, vi } from "vitest";

import {
  createSetupRestoreInitialBoardStateRuntime,
  installSetupRestoreInitialBoardStateRuntime,
  resolveSetupRestoreAndInitialBoardState,
  type SetupRestoreInitialBoardStateRuntime
} from "../../src/core/setup-restore-initial-board-state";

describe("core setup restore and initial board state runtime", () => {
  it("restores the latest saved state and skips initial board generation", () => {
    const manager: Record<string, unknown> = {};
    const operations = {
      shouldTryRestoreSavedStateInSetup: vi.fn(() => true),
      tryRestoreLatestSavedState: vi.fn(() => true),
      shouldForceRankedCheckpointRestoreInSetup: vi.fn(() => false),
      readRankedCheckpointLocalMirrorSavedStateForSetup: vi.fn(),
      applySavedStateRestore: vi.fn(),
      shouldScheduleRankedCheckpointRestoreInSetup: vi.fn(() => true),
      hasRankedCheckpointAuthTokenForSetup: vi.fn(() => true),
      placeStoneTilesForSetup: vi.fn(),
      seedInitialTilesAndSnapshotBoard: vi.fn()
    };

    const result = resolveSetupRestoreAndInitialBoardState(manager, false, {}, operations);

    expect(result).toEqual({ restoredFromSavedState: true });
    expect(operations.shouldTryRestoreSavedStateInSetup).toHaveBeenCalledWith(manager, false, {});
    expect(operations.tryRestoreLatestSavedState).toHaveBeenCalledWith(manager);
    expect(operations.readRankedCheckpointLocalMirrorSavedStateForSetup).not.toHaveBeenCalled();
    expect(manager.needsRankedCheckpointRestore).toBe(false);
    expect(manager.rankCheckpointRestorePending).toBe(false);
    expect(operations.placeStoneTilesForSetup).not.toHaveBeenCalled();
    expect(operations.seedInitialTilesAndSnapshotBoard).not.toHaveBeenCalled();
  });

  it("restores a ranked local mirror and keeps checkpoint restore pending when auth exists", () => {
    const manager: Record<string, unknown> = {};
    const mirrorSavedState = { mode_key: "standard_4x4_pow2_no_undo" };
    const operations = {
      shouldTryRestoreSavedStateInSetup: vi.fn(() => false),
      tryRestoreLatestSavedState: vi.fn(),
      shouldForceRankedCheckpointRestoreInSetup: vi.fn(() => false),
      readRankedCheckpointLocalMirrorSavedStateForSetup: vi.fn(() => mirrorSavedState),
      applySavedStateRestore: vi.fn(() => true),
      shouldScheduleRankedCheckpointRestoreInSetup: vi.fn(() => true),
      hasRankedCheckpointAuthTokenForSetup: vi.fn(() => true),
      placeStoneTilesForSetup: vi.fn(),
      seedInitialTilesAndSnapshotBoard: vi.fn()
    };

    const result = resolveSetupRestoreAndInitialBoardState(manager, false, {}, operations);

    expect(result).toEqual({ restoredFromSavedState: true });
    expect(operations.applySavedStateRestore).toHaveBeenCalledWith(manager, mirrorSavedState);
    expect(manager.needsRankedCheckpointRestore).toBe(true);
    expect(manager.rankCheckpointRestorePending).toBe(true);
    expect(operations.placeStoneTilesForSetup).not.toHaveBeenCalled();
    expect(operations.seedInitialTilesAndSnapshotBoard).not.toHaveBeenCalled();
  });

  it("generates the initial board when no restore path succeeds", () => {
    const manager: Record<string, unknown> = {};
    const operations = {
      shouldTryRestoreSavedStateInSetup: vi.fn(() => false),
      tryRestoreLatestSavedState: vi.fn(),
      shouldForceRankedCheckpointRestoreInSetup: vi.fn(() => false),
      readRankedCheckpointLocalMirrorSavedStateForSetup: vi.fn(() => null),
      applySavedStateRestore: vi.fn(),
      shouldScheduleRankedCheckpointRestoreInSetup: vi.fn(() => true),
      hasRankedCheckpointAuthTokenForSetup: vi.fn(),
      placeStoneTilesForSetup: vi.fn(),
      seedInitialTilesAndSnapshotBoard: vi.fn()
    };

    const result = resolveSetupRestoreAndInitialBoardState(manager, false, {}, operations);

    expect(result).toEqual({ restoredFromSavedState: false });
    expect(manager.needsRankedCheckpointRestore).toBe(true);
    expect(manager.rankCheckpointRestorePending).toBe(true);
    expect(operations.placeStoneTilesForSetup).toHaveBeenCalledWith(manager);
    expect(operations.seedInitialTilesAndSnapshotBoard).toHaveBeenCalledWith(manager);
  });

  it("respects skipStartTiles by skipping initial board generation and mirror restore", () => {
    const manager: Record<string, unknown> = {};
    const operations = {
      shouldTryRestoreSavedStateInSetup: vi.fn(() => false),
      tryRestoreLatestSavedState: vi.fn(),
      shouldForceRankedCheckpointRestoreInSetup: vi.fn(() => false),
      readRankedCheckpointLocalMirrorSavedStateForSetup: vi.fn(() => ({ id: "mirror" })),
      applySavedStateRestore: vi.fn(() => true),
      shouldScheduleRankedCheckpointRestoreInSetup: vi.fn(() => false),
      hasRankedCheckpointAuthTokenForSetup: vi.fn(),
      placeStoneTilesForSetup: vi.fn(),
      seedInitialTilesAndSnapshotBoard: vi.fn()
    };

    const result = resolveSetupRestoreAndInitialBoardState(
      manager,
      false,
      { skipStartTiles: true },
      operations
    );

    expect(result).toEqual({ restoredFromSavedState: false });
    expect(operations.readRankedCheckpointLocalMirrorSavedStateForSetup).not.toHaveBeenCalled();
    expect(operations.applySavedStateRestore).not.toHaveBeenCalled();
    expect(operations.placeStoneTilesForSetup).not.toHaveBeenCalled();
    expect(operations.seedInitialTilesAndSnapshotBoard).not.toHaveBeenCalled();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSetupRestoreInitialBoardStateRuntime();
    expect(runtime.resolveSetupRestoreAndInitialBoardState).toBe(resolveSetupRestoreAndInitialBoardState);

    const windowLike: { CoreSetupRestoreInitialBoardStateRuntime?: SetupRestoreInitialBoardStateRuntime } = {};
    expect(installSetupRestoreInitialBoardStateRuntime({ windowLike })).toBe(
      windowLike.CoreSetupRestoreInitialBoardStateRuntime
    );
    expect(windowLike.CoreSetupRestoreInitialBoardStateRuntime?.resolveSetupRestoreAndInitialBoardState).toBe(
      resolveSetupRestoreAndInitialBoardState
    );

    const existing = { resolveSetupRestoreAndInitialBoardState: vi.fn() };
    expect(
      installSetupRestoreInitialBoardStateRuntime({
        windowLike: { CoreSetupRestoreInitialBoardStateRuntime: existing }
      })
    ).toBe(existing);
  });
});
