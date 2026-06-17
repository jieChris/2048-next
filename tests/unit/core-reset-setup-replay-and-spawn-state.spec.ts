import { describe, expect, it, vi } from "vitest";

import {
  createResetSetupReplayAndSpawnStateRuntime,
  installResetSetupReplayAndSpawnStateRuntime,
  resetSetupReplayAndSpawnState,
  type ResetSetupReplayAndSpawnStateRuntime
} from "../../src/core/reset-setup-replay-and-spawn-state";

function createDirtyManager(): Record<string, unknown> {
  return {
    moveHistory: [{ direction: 1 }],
    replayCompactLog: "abc",
    initialBoardMatrix: [[2, 0]],
    replayStartBoardMatrix: [[0, 2]],
    rankedSessionToken: "token",
    clientRecordId: "client-1",
    sessionSubmitDone: true,
    needsRankedCheckpointRestore: true,
    rankCheckpointRestorePending: true,
    rankCheckpointRestoreScheduled: true,
    rankCheckpointApplying: true,
    rankCheckpointSaveConflict: "conflict",
    lastRankedCheckpointSignature: "sig",
    lastRankedCheckpointSavedAt: 123,
    lastRankedCheckpointSaveError: "error",
    lastSpawn: { x: 1, y: 2 },
    forcedSpawn: { x: 3, y: 4 }
  };
}

describe("core reset setup replay and spawn state runtime", () => {
  it("resets replay, ranked checkpoint, spawn, and submission state", () => {
    const manager = createDirtyManager();
    const assignManagerClientRecordId = vi.fn((target: Record<string, unknown>, value: string) => {
      target.clientRecordId = value;
    });

    resetSetupReplayAndSpawnState(manager, { assignManagerClientRecordId });

    expect(manager).toMatchObject({
      moveHistory: [],
      replayCompactLog: "",
      initialBoardMatrix: null,
      replayStartBoardMatrix: null,
      rankedSessionToken: "",
      clientRecordId: "",
      sessionSubmitDone: false,
      needsRankedCheckpointRestore: false,
      rankCheckpointRestorePending: false,
      rankCheckpointRestoreScheduled: false,
      rankCheckpointApplying: false,
      rankCheckpointSaveConflict: "",
      lastRankedCheckpointSignature: "",
      lastRankedCheckpointSavedAt: 0,
      lastRankedCheckpointSaveError: "",
      lastSpawn: null,
      forcedSpawn: null
    });
    expect(assignManagerClientRecordId).toHaveBeenCalledWith(manager, "");
  });

  it("falls back to clearing clientRecordId when no assigner is available", () => {
    const manager = createDirtyManager();

    resetSetupReplayAndSpawnState(manager);

    expect(manager.clientRecordId).toBe("");
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createResetSetupReplayAndSpawnStateRuntime();
    expect(runtime.resetSetupReplayAndSpawnState).toBe(resetSetupReplayAndSpawnState);

    const windowLike: {
      CoreResetSetupReplayAndSpawnStateRuntime?: ResetSetupReplayAndSpawnStateRuntime;
    } = {};
    expect(installResetSetupReplayAndSpawnStateRuntime({ windowLike })).toBe(
      windowLike.CoreResetSetupReplayAndSpawnStateRuntime
    );
    expect(windowLike.CoreResetSetupReplayAndSpawnStateRuntime?.resetSetupReplayAndSpawnState).toBe(
      resetSetupReplayAndSpawnState
    );

    const existing = { resetSetupReplayAndSpawnState: vi.fn() };
    expect(
      installResetSetupReplayAndSpawnStateRuntime({
        windowLike: { CoreResetSetupReplayAndSpawnStateRuntime: existing }
      })
    ).toBe(existing);
  });
});
