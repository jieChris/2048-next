import { describe, expect, it } from "vitest";

import { createUndoSnapshot } from "../../src/core/undo-snapshot";
import {
  createUndoSnapshotRuntime,
  installUndoSnapshotRuntime,
  type UndoSnapshotRuntime
} from "../../src/bootstrap/undo-snapshot-runtime";

describe("bootstrap undo-snapshot runtime", () => {
  it("creates the legacy CoreUndoSnapshotRuntime shape from TypeScript functions", () => {
    const runtime = createUndoSnapshotRuntime();

    expect(runtime.createUndoSnapshot).toBe(createUndoSnapshot);
    expect(
      runtime.createUndoSnapshot({
        score: 2048,
        comboStreak: 3,
        successfulMoveCount: 9,
        lockConsumedAtMoveCount: 8,
        lockedDirectionTurn: 7,
        lockedDirection: 2,
        undoUsed: 1
      })
    ).toEqual({
      score: 2048,
      tiles: [],
      comboStreak: 3,
      successfulMoveCount: 9,
      lockConsumedAtMoveCount: 8,
      lockedDirectionTurn: 7,
      lockedDirection: 2,
      undoUsed: 1
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreUndoSnapshotRuntime?: UndoSnapshotRuntime } = {};

    const installed = installUndoSnapshotRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreUndoSnapshotRuntime);
    expect(installed?.createUndoSnapshot).toBe(createUndoSnapshot);
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createUndoSnapshotRuntime();
    const windowLike = { CoreUndoSnapshotRuntime: existing };

    const installed = installUndoSnapshotRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreUndoSnapshotRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installUndoSnapshotRuntime({ windowLike: null })).toBeNull();
  });
});
