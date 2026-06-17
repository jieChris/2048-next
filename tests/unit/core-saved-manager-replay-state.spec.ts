import { describe, expect, it, vi } from "vitest";

import {
  applySavedManagerReplayState,
  createSavedManagerReplayStateRuntime,
  installSavedManagerReplayStateRuntime,
  type SavedManagerReplayStateRuntime
} from "../../src/core/saved-manager-replay-state";

function createManager() {
  return {
    moveHistory: ["stale"],
    ipsInputTimes: [1, 2, 3],
    ipsInputCount: 0,
    undoStack: ["stale"],
    redoStack: ["stale"],
    replayCompactLog: "",
    rescueReplayString: "",
    sessionReplayV1: { stale: true },
    sessionReplayV3: { stale: true },
    spawnValueCounts: null as unknown,
    spawnTwos: 0,
    spawnFours: 0,
    setRuntimeUndoStack(value: unknown) {
      this.undoStack = value;
    },
    setRuntimeRedoStack(value: unknown) {
      this.redoStack = value;
    },
    clonePlain(value: unknown) {
      return JSON.parse(JSON.stringify(value));
    }
  };
}

describe("core saved manager replay state", () => {
  it("restores replay, undo, rescue, session, and spawn state from a full saved payload", () => {
    const manager = createManager();
    const normalizedReplayV1 = {
      v: 1,
      board_width: 4,
      board_height: 4,
      init_tiles: [],
      records: [{ kind: "move", dir: 1 }],
      last_event_at_ms: 12_345,
      supported: true
    };
    const normalizeSavedReplayV1Session = vi.fn(() => normalizedReplayV1);

    applySavedManagerReplayState(
      manager,
      {
        move_history: [0, 1, 2],
        ips_input_count: 3,
        undo_stack: ["u1"],
        redo_stack: ["r1"],
        replay_compact_log: "compact",
        replay_string: "  REPLAY_v1RPL_B64_restored  ",
        session_replay_v1: { v: 1 },
        session_replay_v3: { v: 3, actions: [["m", 1]] },
        spawn_value_counts: { "2": 2, "4": 1 }
      },
      {
        normalizeSavedReplayV1Session,
        shouldRestoreSavedStateUndoHistory: () => true
      }
    );

    expect(manager.moveHistory).toEqual([0, 1, 2]);
    expect(manager.ipsInputTimes).toEqual([]);
    expect(manager.ipsInputCount).toBe(3);
    expect(manager.undoStack).toEqual(["u1"]);
    expect(manager.redoStack).toEqual(["r1"]);
    expect(manager.replayCompactLog).toBe("compact");
    expect(manager.rescueReplayString).toBe("REPLAY_v1RPL_B64_restored");
    expect(manager.sessionReplayV1).toEqual(normalizedReplayV1);
    expect(manager.sessionReplayV3).toEqual({ v: 3, actions: [["m", 1]] });
    expect(manager.sessionReplayV3).not.toBe(manager.sessionReplayV1);
    expect(manager.spawnValueCounts).toEqual({ "2": 2, "4": 1 });
    expect(manager.spawnTwos).toBe(2);
    expect(manager.spawnFours).toBe(1);
  });

  it("clears undo stacks and preserves existing replay when lite payload omits replay data", () => {
    const manager = createManager();
    const existingSessionReplayV1 = {
      v: 1,
      board_width: 4,
      board_height: 4,
      init_tiles: [],
      records: [],
      last_event_at_ms: 99,
      supported: true
    };
    manager.rescueReplayString = "REPLAY_v1RPL_B64_existing";
    manager.sessionReplayV1 = existingSessionReplayV1;

    applySavedManagerReplayState(
      manager,
      {
        move_history: [],
        replay_compact_log: "",
        replay_string: "",
        session_replay_v1: null,
        session_replay_v3: null,
        spawn_value_counts: null
      },
      {
        normalizeSavedReplayV1Session: () => null,
        shouldRestoreSavedStateUndoHistory: () => false
      }
    );

    expect(manager.undoStack).toEqual([]);
    expect(manager.redoStack).toEqual([]);
    expect(manager.rescueReplayString).toBe("REPLAY_v1RPL_B64_existing");
    expect(manager.sessionReplayV1).toBe(existingSessionReplayV1);
    expect(manager.sessionReplayV3).toEqual({ stale: true });
    expect(manager.spawnValueCounts).toEqual({});
    expect(manager.spawnTwos).toBe(0);
    expect(manager.spawnFours).toBe(0);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedManagerReplayStateRuntime();
    expect(runtime.applySavedManagerReplayState).toBe(applySavedManagerReplayState);

    const windowLike: { CoreSavedManagerReplayStateRuntime?: SavedManagerReplayStateRuntime } = {};
    expect(installSavedManagerReplayStateRuntime({ windowLike })).toBe(
      windowLike.CoreSavedManagerReplayStateRuntime
    );
    expect(windowLike.CoreSavedManagerReplayStateRuntime?.applySavedManagerReplayState).toBe(
      applySavedManagerReplayState
    );

    const existing = { applySavedManagerReplayState: vi.fn() };
    expect(
      installSavedManagerReplayStateRuntime({
        windowLike: { CoreSavedManagerReplayStateRuntime: existing }
      })
    ).toBe(existing);
  });
});
