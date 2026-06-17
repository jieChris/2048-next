import { describe, expect, it, vi } from "vitest";

import {
  createRankedCheckpointLocalMirrorSetupRuntime,
  hasRankedCheckpointLocalMirrorForSetup,
  installRankedCheckpointLocalMirrorSetupRuntime,
  readRankedCheckpointLocalMirrorSavedStateForSetup,
  type RankedCheckpointLocalMirrorSetupRuntime
} from "../../src/core/ranked-checkpoint-local-mirror-setup";

const MODE_KEY = "standard_4x4_pow2_no_undo";
const MIRROR_KEY = `ranked_checkpoint_local_mirror:v1:${MODE_KEY}`;

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value))
  };
}

function createManager(storage = createStorage()) {
  const windowLike = { localStorage: storage };
  return {
    rankPolicy: "ranked",
    modeKey: MODE_KEY,
    getWindowLike: () => windowLike
  };
}

function createMirrorRecord(savedState: Record<string, unknown>, ownerUserId = "user-1") {
  return JSON.stringify({
    owner_user_id: ownerUserId,
    ui_state: {
      saved_state: savedState
    }
  });
}

describe("core ranked checkpoint local mirror setup runtime", () => {
  it("creates and installs the legacy runtime namespace", () => {
    const runtime = createRankedCheckpointLocalMirrorSetupRuntime();
    const windowLike: { CoreRankedCheckpointLocalMirrorSetupRuntime?: RankedCheckpointLocalMirrorSetupRuntime } = {};

    expect(runtime.hasRankedCheckpointLocalMirrorForSetup).toBe(hasRankedCheckpointLocalMirrorForSetup);
    expect(runtime.readRankedCheckpointLocalMirrorSavedStateForSetup).toBe(
      readRankedCheckpointLocalMirrorSavedStateForSetup
    );

    const installed = installRankedCheckpointLocalMirrorSetupRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreRankedCheckpointLocalMirrorSetupRuntime);
    expect(installed?.readRankedCheckpointLocalMirrorSavedStateForSetup).toBeTypeOf("function");
  });

  it("returns saved_state from the local mirror when owner and mode match", () => {
    const savedState = { mode_key: MODE_KEY, score: 128, grid: { cells: [] } };
    const storage = createStorage({
      "2048_auth_userId_v1": "user-1",
      [MIRROR_KEY]: createMirrorRecord(savedState)
    });
    const manager = createManager(storage);

    expect(hasRankedCheckpointLocalMirrorForSetup(manager)).toBe(true);
    expect(readRankedCheckpointLocalMirrorSavedStateForSetup(manager)).toStrictEqual(savedState);
  });

  it("rejects a local mirror owned by a different user", () => {
    const storage = createStorage({
      "2048_auth_userId_v1": "user-2",
      [MIRROR_KEY]: createMirrorRecord({ mode_key: MODE_KEY }, "user-1")
    });
    const manager = createManager(storage);

    expect(readRankedCheckpointLocalMirrorSavedStateForSetup(manager)).toBeNull();
  });

  it("rejects a local mirror saved for a different mode", () => {
    const storage = createStorage({
      [MIRROR_KEY]: createMirrorRecord({ mode_key: "classic_4x4_pow2_undo" }, "")
    });
    const manager = createManager(storage);

    expect(readRankedCheckpointLocalMirrorSavedStateForSetup(manager)).toBeNull();
  });
});
