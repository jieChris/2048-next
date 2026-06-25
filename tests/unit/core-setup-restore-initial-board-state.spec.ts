import { describe, expect, it, vi } from "vitest";

import {
  createSetupRestoreInitialBoardStateRuntime,
  installSetupRestoreInitialBoardStateRuntime,
  resolveSetupRestoreAndInitialBoardState,
  shouldForceRankedCheckpointRestoreInSetup,
  type SetupRestoreInitialBoardStateRuntime
} from "../../src/core/setup-restore-initial-board-state";

describe("core setup restore and initial board state runtime", () => {
  it("detects forced ranked checkpoint restore query flags for ranked setup", () => {
    const manager = {
      rankPolicy: "ranked",
      getWindowLike: () => ({
        location: {
          search: "?force_ranked_checkpoint=1"
        }
      })
    };

    expect(shouldForceRankedCheckpointRestoreInSetup(manager)).toBe(true);
    expect(
      shouldForceRankedCheckpointRestoreInSetup({
        ...manager,
        getWindowLike: () => ({
          location: {
            search: "?restore_ranked_checkpoint=1"
          }
        })
      })
    ).toBe(true);
  });

  it("does not force ranked checkpoint restore outside ranked setup or when search is unavailable", () => {
    expect(shouldForceRankedCheckpointRestoreInSetup(null)).toBe(false);
    expect(
      shouldForceRankedCheckpointRestoreInSetup({
        rankPolicy: "casual",
        getWindowLike: () => ({
          location: {
            search: "?force_ranked_checkpoint=1"
          }
        })
      })
    ).toBe(false);
    expect(
      shouldForceRankedCheckpointRestoreInSetup({
        rankPolicy: "ranked",
        getWindowLike: () => ({
          get location() {
            throw new Error("location unavailable");
          }
        })
      })
    ).toBe(false);
  });

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

  it("ignores a ranked local mirror from a different active ranked session", () => {
    const manager: Record<string, unknown> = {
      rankPolicy: "ranked",
      modeKey: "board_2x4_pow2_no_undo",
      initialSeed: 222,
      rankedSessionToken: "active-token",
      challengeId: "ranked-active"
    };
    const mirrorSavedState = {
      mode_key: "board_2x4_pow2_no_undo",
      initial_seed: 111,
      ranked_session_token: "old-token",
      challenge_id: "ranked-old"
    };
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

    expect(result).toEqual({ restoredFromSavedState: false });
    expect(operations.applySavedStateRestore).not.toHaveBeenCalled();
    expect(manager.needsRankedCheckpointRestore).toBe(true);
    expect(manager.rankCheckpointRestorePending).toBe(true);
    expect(operations.placeStoneTilesForSetup).toHaveBeenCalledWith(manager);
    expect(operations.seedInitialTilesAndSnapshotBoard).toHaveBeenCalledWith(manager);
  });

  it("restores a ranked local mirror from the current active ranked session", () => {
    const manager: Record<string, unknown> = {
      rankPolicy: "ranked",
      modeKey: "board_2x4_pow2_no_undo",
      initialSeed: 222,
      rankedSessionToken: "active-token",
      challengeId: "ranked-active"
    };
    const mirrorSavedState = {
      mode_key: "board_2x4_pow2_no_undo",
      initial_seed: 222,
      ranked_session_token: "active-token",
      challenge_id: "ranked-active"
    };
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
    expect(runtime.shouldForceRankedCheckpointRestoreInSetup).toBe(
      shouldForceRankedCheckpointRestoreInSetup
    );

    const windowLike: { CoreSetupRestoreInitialBoardStateRuntime?: SetupRestoreInitialBoardStateRuntime } = {};
    expect(installSetupRestoreInitialBoardStateRuntime({ windowLike })).toBe(
      windowLike.CoreSetupRestoreInitialBoardStateRuntime
    );
    expect(windowLike.CoreSetupRestoreInitialBoardStateRuntime?.resolveSetupRestoreAndInitialBoardState).toBe(
      resolveSetupRestoreAndInitialBoardState
    );
    expect(windowLike.CoreSetupRestoreInitialBoardStateRuntime?.shouldForceRankedCheckpointRestoreInSetup).toBe(
      shouldForceRankedCheckpointRestoreInSetup
    );

    const existing = {
      resolveSetupRestoreAndInitialBoardState: vi.fn(),
      shouldForceRankedCheckpointRestoreInSetup: vi.fn()
    };
    expect(
      installSetupRestoreInitialBoardStateRuntime({
        windowLike: { CoreSetupRestoreInitialBoardStateRuntime: existing }
      })
    ).toBe(existing);
  });
});
