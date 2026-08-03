import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerRuntimeStateRuntime,
  initializeGameManagerRuntimeState,
  installGameManagerRuntimeStateRuntime,
  resetRoundStatsState,
  type GameManagerRuntimeStateRuntime
} from "../../src/core/game-manager-runtime-state";

function createOperations() {
  return {
    detectMode: vi.fn(() => "timer"),
    createEmptyItemInventory: vi.fn(() => ({ hammer: 0, swap: 1 }))
  };
}

describe("core game manager runtime state", () => {
  it("resets per-round stats and refreshes item and move-timeout HUD state", () => {
    const manager: Record<string, unknown> = {
      mode: "practice",
      comboStreak: 9,
      successfulMoveCount: 42,
      validInputCount: 21,
      invalidInputCount: 4,
      ipsInputCount: 6,
      ipsInputTimes: [1, 2],
      undoUsed: 5,
      lockConsumedAtMoveCount: 8,
      lockedDirectionTurn: 3,
      lockedDirection: 1,
      spawnValueCounts: { 2: 3 },
      spawnTwos: 11,
      spawnFours: 7,
      itemProgress: 99,
      itemInventory: { hammer: 2 },
      nextSpawnSuppressed: true,
      nextSpawnValueOverride: 4,
      undoEnabled: false,
      loadUndoSettingForMode: vi.fn(() => true)
    };
    const operations = {
      createEmptyItemInventory: vi.fn(() => ({ hammer: 0, swap: 0 })),
      updateItemModeHud: vi.fn(),
      updateMoveTimeoutHud: vi.fn(),
      nowMs: 12345
    };

    resetRoundStatsState(manager, operations);

    expect(operations.createEmptyItemInventory).toHaveBeenCalledTimes(1);
    expect(manager).toMatchObject({
      comboStreak: 0,
      successfulMoveCount: 0,
      validInputCount: 0,
      invalidInputCount: 0,
      ipsInputCount: 0,
      ipsInputTimes: [],
      undoUsed: 0,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null,
      spawnValueCounts: {},
      spawnTwos: 0,
      spawnFours: 0,
      itemProgress: 0,
      itemInventory: { hammer: 0, swap: 0 },
      nextSpawnSuppressed: false,
      nextSpawnValueOverride: null,
      undoEnabled: true
    });
    expect(manager.loadUndoSettingForMode).toHaveBeenCalledWith("practice");
    expect(operations.updateItemModeHud).toHaveBeenCalledWith(manager);
    expect(operations.updateMoveTimeoutHud).toHaveBeenCalledWith(manager, 12345);
  });

  it("initializes the game manager runtime defaults through injected legacy operations", () => {
    const manager: Record<string, unknown> = {
      existing: "preserved"
    };
    const operations = createOperations();

    initializeGameManagerRuntimeState(manager, operations);

    expect(operations.detectMode).toHaveBeenCalledWith(manager);
    expect(operations.createEmptyItemInventory).toHaveBeenCalledTimes(1);
    expect(manager).toMatchObject({
      existing: "preserved",
      startTiles: 2,
      maxTile: Infinity,
      mode: "timer",
      modeConfig: null,
      ruleset: "pow2",
      rankedBucket: "none",
      disableSessionSync: false,
      spawnTable: [
        { value: 2, weight: 90 },
        { value: 4, weight: 10 }
      ],
      sessionSubmitDone: false,
      sessionReplayV3: null,
      timerModuleView: "timer",
      timerLeaderboardLoadId: 0,
      timerModuleBaseHeight: 0,
      timerUpdateIntervalMs: 33,
      lastStatsPanelUpdateAt: 0,
      validInputCount: 0,
      invalidInputCount: 0,
      pendingMoveInput: null,
      moveInputFlushScheduled: false,
      lastMoveInputAt: 0,
      allowedDirections: [0, 1, 2, 3],
      allowedDirectionSet: { "0": true, "1": true, "2": true, "3": true },
      stoneCellsList: [],
      stoneValueSet: {},
      itemModeRules: null,
      itemInventory: { hammer: 0, swap: 1 },
      itemProgress: 0,
      nextSpawnSuppressed: false,
      nextSpawnValueOverride: null,
      moveTimeoutMs: null,
      moveDeadlineAt: null,
      practiceRestartBoardMatrix: null,
      practiceRestartModeConfig: null,
      noXTriggered: false,
      noXTriggeredTile: null,
      noXSelectionPending: false,
      noXPendingDefaultTarget: null,
      timerFrozen: false,
      clientRecordId: "",
      needsRankedCheckpointRestore: false,
      rankCheckpointRestorePending: false,
      rankCheckpointRestoreScheduled: false,
      rankCheckpointApplying: false,
      rankCheckpointSaveConflict: "",
      lastRankedCheckpointSignature: "",
      lastRankedCheckpointSavedAt: 0,
      lastRankedCheckpointSaveError: "",
      singleModePageLockState: null
    });
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerRuntimeStateRuntime();
    expect(runtime.initializeGameManagerRuntimeState).toBe(initializeGameManagerRuntimeState);
    expect(runtime.resetRoundStatsState).toBe(resetRoundStatsState);

    const windowLike: { CoreGameManagerRuntimeStateRuntime?: GameManagerRuntimeStateRuntime } = {};
    expect(installGameManagerRuntimeStateRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerRuntimeStateRuntime
    );
    expect(windowLike.CoreGameManagerRuntimeStateRuntime?.initializeGameManagerRuntimeState).toBe(
      initializeGameManagerRuntimeState
    );
    expect(windowLike.CoreGameManagerRuntimeStateRuntime?.resetRoundStatsState).toBe(
      resetRoundStatsState
    );

    const existing = { initializeGameManagerRuntimeState: vi.fn(), resetRoundStatsState: vi.fn() };
    expect(
      installGameManagerRuntimeStateRuntime({
        windowLike: { CoreGameManagerRuntimeStateRuntime: existing }
      })
    ).toBe(existing);
  });
});
