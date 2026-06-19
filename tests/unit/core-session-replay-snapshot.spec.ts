import { describe, expect, it, vi } from "vitest";

import {
  createSessionReplaySnapshotRuntime,
  initializeSetupSessionReplaySnapshot,
  installSessionReplaySnapshotRuntime,
  resolveReplayV1InitTilesFromBoardMatrix,
  type SessionReplaySnapshotRuntime
} from "../../src/core/session-replay-snapshot";

describe("core session replay snapshot runtime", () => {
  it("resolves replay v1 init tiles from pow2 and fibonacci boards", () => {
    expect(
      resolveReplayV1InitTilesFromBoardMatrix(
        [
          [2, 0, 4],
          [0, 2, 0]
        ],
        3,
        2,
        "pow2"
      )
    ).toEqual([
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 2, valueBit: 1 },
      { cellIndex: 4, valueBit: 0 }
    ]);

    expect(
      resolveReplayV1InitTilesFromBoardMatrix(
        [
          [1, 0],
          [2, 1]
        ],
        2,
        2,
        "fibonacci"
      )
    ).toEqual([
      { cellIndex: 0, valueBit: 0 },
      { cellIndex: 2, valueBit: 1 },
      { cellIndex: 3, valueBit: 0 }
    ]);

    expect(resolveReplayV1InitTilesFromBoardMatrix([[2, 8]], 2, 1, "pow2")).toBeNull();
    expect(resolveReplayV1InitTilesFromBoardMatrix([[1, 4]], 2, 1, "fibonacci")).toBeNull();
    expect(resolveReplayV1InitTilesFromBoardMatrix([[2]], 2, 1, "pow2")).toBeNull();
  });

  it("initializes V3 and V1 replay snapshots from setup manager state", () => {
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1_700_000_000_111)
      .mockReturnValueOnce(1_700_000_000_222);
    const clonePlain = vi.fn((value: unknown) => ({ ...(value as Record<string, unknown>) }));
    const manager = {
      modeKey: "standard_4x4_pow2_no_undo",
      mode: "classic",
      width: 4,
      height: 4,
      ruleset: "pow2",
      modeConfig: { undo_enabled: false },
      modeFamily: "standard",
      rankPolicy: "ranked",
      specialRules: { blocked_cells: [0, 1] },
      challengeId: "rch_daily",
      initialSeed: 987654321,
      clonePlain
    };

    initializeSetupSessionReplaySnapshot(manager);

    expect(clonePlain).toHaveBeenCalledWith({ blocked_cells: [0, 1] });
    expect(manager.sessionReplayV3).toEqual({
      v: 3,
      mode: "classic",
      mode_key: "standard_4x4_pow2_no_undo",
      board_width: 4,
      board_height: 4,
      ruleset: "pow2",
      undo_enabled: false,
      mode_family: "standard",
      rank_policy: "ranked",
      special_rules_snapshot: { blocked_cells: [0, 1] },
      challenge_id: "rch_daily",
      seed: 987654321,
      actions: []
    });
    expect(manager.sessionReplayV1).toEqual({
      v: 1,
      mode_key: "standard_4x4_pow2_no_undo",
      ruleset: "pow2",
      board_width: 4,
      board_height: 4,
      start_unix_ms: 1_700_000_000_111,
      challenge_id: "rch_daily",
      seed: 987654321,
      init_tiles: [],
      records: [],
      last_event_at_ms: 1_700_000_000_222,
      supported: true
    });
  });

  it("preserves replay mode tagging and null challenge fallback semantics", () => {
    const manager = {
      modeKey: "practice",
      mode: "classic",
      width: 5,
      height: 5,
      ruleset: "fibonacci",
      modeConfig: { undo_enabled: true },
      modeFamily: "practice",
      rankPolicy: "casual",
      specialRules: null,
      challengeId: "",
      initialSeed: 123,
      clonePlain: vi.fn(() => ({}))
    };

    initializeSetupSessionReplaySnapshot(manager);

    expect(manager.sessionReplayV3.mode).toBe("practice");
    expect(manager.sessionReplayV3.challenge_id).toBe("");
    expect(manager.sessionReplayV1.challenge_id).toBeNull();
    expect(manager.sessionReplayV1.supported).toBe(true);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSessionReplaySnapshotRuntime();
    expect(runtime.initializeSetupSessionReplaySnapshot).toBe(initializeSetupSessionReplaySnapshot);
    expect(runtime.resolveReplayV1InitTilesFromBoardMatrix).toBe(resolveReplayV1InitTilesFromBoardMatrix);

    const windowLike: { CoreSessionReplaySnapshotRuntime?: SessionReplaySnapshotRuntime } = {};
    expect(installSessionReplaySnapshotRuntime({ windowLike })).toBe(windowLike.CoreSessionReplaySnapshotRuntime);
    expect(windowLike.CoreSessionReplaySnapshotRuntime?.initializeSetupSessionReplaySnapshot).toBe(
      initializeSetupSessionReplaySnapshot
    );
    expect(windowLike.CoreSessionReplaySnapshotRuntime?.resolveReplayV1InitTilesFromBoardMatrix).toBe(
      resolveReplayV1InitTilesFromBoardMatrix
    );

    const existing = {
      initializeSetupSessionReplaySnapshot: vi.fn(),
      resolveReplayV1InitTilesFromBoardMatrix: vi.fn()
    };
    expect(installSessionReplaySnapshotRuntime({ windowLike: { CoreSessionReplaySnapshotRuntime: existing } })).toBe(
      existing
    );
  });
});
