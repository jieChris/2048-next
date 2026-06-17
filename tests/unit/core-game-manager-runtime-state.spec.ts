import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerRuntimeStateRuntime,
  initializeGameManagerRuntimeState,
  installGameManagerRuntimeStateRuntime,
  type GameManagerRuntimeStateRuntime
} from "../../src/core/game-manager-runtime-state";

function createOperations() {
  return {
    detectMode: vi.fn(() => "timer"),
    createEmptyItemInventory: vi.fn(() => ({ hammer: 0, swap: 1 }))
  };
}

describe("core game manager runtime state", () => {
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

    const windowLike: { CoreGameManagerRuntimeStateRuntime?: GameManagerRuntimeStateRuntime } = {};
    expect(installGameManagerRuntimeStateRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerRuntimeStateRuntime
    );
    expect(windowLike.CoreGameManagerRuntimeStateRuntime?.initializeGameManagerRuntimeState).toBe(
      initializeGameManagerRuntimeState
    );

    const existing = { initializeGameManagerRuntimeState: vi.fn() };
    expect(
      installGameManagerRuntimeStateRuntime({
        windowLike: { CoreGameManagerRuntimeStateRuntime: existing }
      })
    ).toBe(existing);
  });
});
